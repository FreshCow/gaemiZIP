package sw.gaemiZIP.concurrency;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import sw.gaemiZIP.dto.stock.TradeRequest;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.member.Role;
import sw.gaemiZIP.entity.stock.Holding;
import sw.gaemiZIP.entity.stock.ReservedOrder;
import sw.gaemiZIP.entity.stock.Stock;
import sw.gaemiZIP.entity.stock.TradeStatus;
import sw.gaemiZIP.entity.stock.TradeType;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.notification.NotificationRepository;
import sw.gaemiZIP.repository.stock.HoldingRepository;
import sw.gaemiZIP.repository.stock.ReservedOrderRepository;
import sw.gaemiZIP.repository.stock.StockRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;
import sw.gaemiZIP.service.notification.NotificationService;
import sw.gaemiZIP.service.stock.ReservationService;
import sw.gaemiZIP.service.stock.TradeService;
import sw.gaemiZIP.util.MarketHoursUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = "spring.jpa.show-sql=false")
@Tag("concurrency")
class ReservationVsOrderRaceTest {

    private static final Logger log = LoggerFactory.getLogger(ReservationVsOrderRaceTest.class);

    private static final int ITERATIONS = 20;
    private static final long INITIAL_BALANCE = 100_000_000L;
    private static final long TARGET_PRICE = 10_000L;
    private static final int RES_QUANTITY = 5;      // 예약 체결 수량
    private static final int IMM_QUANTITY = 3;      // 즉시 매수 수량
    private static final int EXISTING_QUANTITY = 100;
    private static final long EXISTING_AVG_PRICE = 5_000L;

    @Autowired private ReservationService reservationService;
    @Autowired private TradeService tradeService;
    @Autowired private MemberAntRepository memberAntRepository;
    @Autowired private ReservedOrderRepository reservedOrderRepository;
    @Autowired private HoldingRepository holdingRepository;
    @Autowired private TradeHistoryRepository tradeHistoryRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private StockRepository stockRepository;
    @Autowired private PlatformTransactionManager transactionManager;
    @MockitoSpyBean private NotificationService notificationService;

    private final AtomicBoolean holdNextNotify = new AtomicBoolean(false);
    private volatile CountDownLatch heldReached = new CountDownLatch(1);
    private volatile CountDownLatch release = new CountDownLatch(1);

    /** 다음 notify 호출에서 release 래치가 열릴 때까지 체결 트랜잭션을 멈추도록 설정 */
    private void armHold() {
        heldReached = new CountDownLatch(1);
        release = new CountDownLatch(1);
        holdNextNotify.set(true);
        Mockito.doAnswer(inv -> {
            if (holdNextNotify.compareAndSet(true, false)) {
                heldReached.countDown();
                release.await(30, TimeUnit.SECONDS);
            }
            return inv.callRealMethod();
        }).when(notificationService).notify(any(MemberAnt.class), any(Stock.class), anyString());
    }

    // ---------- S1: 예약 체결 vs 즉시 매수 ----------

    @Test
    @DisplayName("[S1-통계] 예약 매수 체결과 같은 계정 즉시 매수가 동시에 실행되면 잔고·보유 수량이 어긋난다")
    void s1_statistical() throws Exception {
        Assumptions.assumeTrue(MarketHoursUtil.isMarketHours(), "즉시 매수는 장 시간에만 가능");
        int corrupted = 0;
        int withException = 0;

        for (int i = 0; i < ITERATIONS; i++) {
            Seed s = seed("s1s", i, true);
            List<Throwable> errors = runTwo(
                    () -> reservationService.matchAndExecute(s.stockCode(), TARGET_PRICE),
                    () -> tradeService.executeBuy(s.username(), buyRequest(s.stockCode())));
            if (!errors.isEmpty()) withException++;
            String problem = checkS1(s);
            if (problem != null) {
                corrupted++;
                log.warn("[S1-통계 {}회차] 불일치: {} | 예외: {}", i + 1, problem, errors);
            }
            cleanUp(s);
        }

        log.info("==================== [S1-통계] 결과 ====================");
        log.info("불일치 {}/{}회, 예외 발생 {}/{}회", corrupted, ITERATIONS, withException, ITERATIONS);
        assertThat(corrupted).isZero();
    }

    @Test
    @DisplayName("[S1-확정] 체결 트랜잭션을 커밋 직전에 멈춘 사이 즉시 매수가 끝나면 즉시 매수분이 덮어써진다")
    void s1_deterministic() throws Exception {
        Assumptions.assumeTrue(MarketHoursUtil.isMarketHours(), "즉시 매수는 장 시간에만 가능");
        Seed s = seed("s1d", 0, true);
        armHold();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        Future<?> match = pool.submit(() -> reservationService.matchAndExecute(s.stockCode(), TARGET_PRICE));
        assertThat(heldReached.await(15, TimeUnit.SECONDS)).as("체결 트랜잭션이 notify에서 멈춰야 함").isTrue();

        Future<?> buy = pool.submit(() -> tradeService.executeBuy(s.username(), buyRequest(s.stockCode())));
        Throwable buyError = awaitQuietly(buy, 8);   // 즉시 매수가 먼저 커밋되는지 확인
        boolean buyFinishedWhileHeld = buy.isDone();
        release.countDown();
        Throwable matchError = awaitQuietly(match, 30);
        if (buyError == null) buyError = awaitQuietly(buy, 30);
        pool.shutdown();

        String problem = checkS1(s);
        log.info("==================== [S1-확정] 결과 ====================");
        log.info("즉시 매수가 체결 보류 중 먼저 끝남: {} | 체결 예외: {} | 즉시 매수 예외: {}", buyFinishedWhileHeld, matchError, buyError);
        log.info("정합성: {}", problem == null ? "일치" : "불일치 — " + problem);
        cleanUp(s);
        assertThat(problem).isNull();
    }

    // ---------- S2: 예약 체결 vs 예약 취소 ----------

    @Test
    @DisplayName("[S2-통계] 예약 체결과 같은 예약 취소가 동시에 실행되면 최종 상태가 어긋난다")
    void s2_statistical() throws Exception {
        int inconsistent = 0;
        int withException = 0;

        for (int i = 0; i < ITERATIONS; i++) {
            Seed s = seed("s2s", i, false);
            List<Throwable> errors = runTwo(
                    () -> reservationService.matchAndExecute(s.stockCode(), TARGET_PRICE),
                    () -> reservationService.cancelReservation(s.username(), s.orderId()));
            if (errors.stream().anyMatch(this::isUnexpected)) withException++;
            String problem = checkS2(s);
            if (problem != null) {
                inconsistent++;
                log.warn("[S2-통계 {}회차] 불일치: {} | 예외: {}", i + 1, problem, errors);
            }
            cleanUp(s);
        }

        log.info("==================== [S2-통계] 결과 ====================");
        log.info("불일치 {}/{}회, 예외 발생 {}/{}회", inconsistent, ITERATIONS, withException, ITERATIONS);
        assertThat(inconsistent).isZero();
        assertThat(withException).isZero();
    }

    private boolean isUnexpected(Throwable t) {
        return !(t instanceof IllegalStateException); //데드락
    }

    @Test
    @DisplayName("[S2-확정] 체결 트랜잭션을 커밋 직전에 멈춘 사이 취소가 실행되면 체결과 취소가 모두 반영된다")
    void s2_deterministic() throws Exception {
        Seed s = seed("s2d", 0, false);
        armHold();

        ExecutorService pool = Executors.newFixedThreadPool(2);
        Future<?> match = pool.submit(() -> reservationService.matchAndExecute(s.stockCode(), TARGET_PRICE));
        assertThat(heldReached.await(15, TimeUnit.SECONDS)).as("체결 트랜잭션이 notify에서 멈춰야 함").isTrue();

        Future<?> cancel = pool.submit(() -> reservationService.cancelReservation(s.username(), s.orderId()));
        Thread.sleep(1500);   // 취소 트랜잭션이 읽기를 마치고 커밋 단계에서 대기하도록 시간 확보
        release.countDown();
        Throwable matchError = awaitQuietly(match, 30);
        Throwable cancelError = awaitQuietly(cancel, 30);
        pool.shutdown();

        String problem = checkS2(s);
        log.info("==================== [S2-확정] 결과 ====================");
        log.info("체결 예외: {} | 취소 예외: {}", matchError, cancelError);
        log.info("정합성: {}", problem == null ? "일치" : "불일치 — " + problem);
        cleanUp(s);
        assertThat(problem).isNull();
        assertThat(matchError).isNull();
    }

    // ---------- 검증 ----------

    /** S1 기대: 예약+즉시 매수 모두 반영. 일치하면 null, 아니면 불일치 설명 */
    private String checkS1(Seed s) {
        MemberAnt m = memberAntRepository.findById(s.memberId()).orElseThrow();
        Holding h = holdingRepository.findByMember_IdAndStock_Code(s.memberId(), s.stockCode()).orElse(null);
        long buys = tradeHistoryRepository.findByMember_IdOrderByTradeTimeDesc(s.memberId()).stream()
                .filter(t -> "BUY".equals(t.getTradeType())).count();
        ReservedOrder o = reservedOrderRepository.findById(s.orderId()).orElseThrow();

        long expectedBalance = INITIAL_BALANCE - RES_QUANTITY * TARGET_PRICE - IMM_QUANTITY * TARGET_PRICE;
        int expectedQty = EXISTING_QUANTITY + RES_QUANTITY + IMM_QUANTITY;
        List<String> diffs = new ArrayList<>();
        if (m.getBalance() != expectedBalance) diffs.add("잔고 " + m.getBalance() + "(기대 " + expectedBalance + ")");
        if (m.getLockedBalance() != 0L) diffs.add("lockedBalance " + m.getLockedBalance() + "(기대 0)");
        if (h == null || h.getQuantity() != expectedQty) diffs.add("보유수량 " + (h == null ? "없음" : h.getQuantity()) + "(기대 " + expectedQty + ")");
        if (buys != 2) diffs.add("매수 이력 " + buys + "건(기대 2건)");
        if (o.getStatus() != TradeStatus.EXECUTED) diffs.add("주문 상태 " + o.getStatus() + "(기대 EXECUTED)");
        return diffs.isEmpty() ? null : String.join(", ", diffs);
    }

    /** S2 기대: 체결 완료 또는 취소 완료 중 하나로 일관. 일치하면 null */
    private String checkS2(Seed s) {
        MemberAnt m = memberAntRepository.findById(s.memberId()).orElseThrow();
        Holding h = holdingRepository.findByMember_IdAndStock_Code(s.memberId(), s.stockCode()).orElse(null);
        long buys = tradeHistoryRepository.findByMember_IdOrderByTradeTimeDesc(s.memberId()).stream()
                .filter(t -> "BUY".equals(t.getTradeType())).count();
        ReservedOrder o = reservedOrderRepository.findById(s.orderId()).orElseThrow();

        long executedBalance = INITIAL_BALANCE - RES_QUANTITY * TARGET_PRICE;
        boolean executedOk = o.getStatus() == TradeStatus.EXECUTED
                && m.getBalance() == executedBalance && m.getLockedBalance() == 0L
                && h != null && h.getQuantity() == RES_QUANTITY && buys == 1;   // S2는 기존 보유 없이 시작
        boolean cancelledOk = o.getStatus() == TradeStatus.CANCELLED
                && m.getBalance() == INITIAL_BALANCE && m.getLockedBalance() == 0L
                && h == null && buys == 0;
        if (executedOk || cancelledOk) return null;
        return "상태 " + o.getStatus() + ", 잔고 " + m.getBalance() + ", lockedBalance " + m.getLockedBalance()
                + ", 보유수량 " + (h == null ? "없음" : h.getQuantity()) + ", 매수 이력 " + buys + "건";
    }

    // ---------- 실행 보조 ----------

    private TradeRequest buyRequest(String stockCode) {
        TradeRequest r = new TradeRequest();
        r.setStockCode(stockCode);
        r.setStockName("레이스종목");
        r.setTradeType("BUY");
        r.setPrice((int) TARGET_PRICE);
        r.setQuantity(IMM_QUANTITY);
        return r;
    }

    /** 두 작업을 동시에 출발시키고 각자 던진 예외 목록을 반환 */
    private List<Throwable> runTwo(Runnable a, Runnable b) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Throwable> errors = java.util.Collections.synchronizedList(new ArrayList<>());
        List<Future<?>> futures = new ArrayList<>();
        for (Runnable task : List.of(a, b)) {
            futures.add(pool.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    task.run();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Throwable t) {
                    errors.add(t);
                }
            }));
        }
        ready.await(5, TimeUnit.SECONDS);
        start.countDown();
        for (Future<?> f : futures) {
            try {
                f.get(30, TimeUnit.SECONDS);
            } catch (ExecutionException | TimeoutException ignored) {
                // 작업 내부 예외는 errors에 기록됨
            }
        }
        pool.shutdown();
        return errors;
    }

    /** 작업이 제한 시간 안에 끝나면 발생한 예외(없으면 null), 시간 초과면 null을 반환 */
    private Throwable awaitQuietly(Future<?> f, int seconds) {
        try {
            f.get(seconds, TimeUnit.SECONDS);
            return null;
        } catch (ExecutionException e) {
            return e.getCause();
        } catch (TimeoutException | InterruptedException e) {
            return null;
        }
    }

    // ---------- 시딩/정리 ----------

    /** 회원(+보유종목)·종목·PENDING 예약 매수 1건 생성, 예약금액만큼 lockedBalance 설정 */
    private Seed seed(String prefix, int iteration, boolean withHolding) {
        String suffix = prefix + "_" + System.nanoTime() + "_" + iteration;
        String stockCode = "RV_" + suffix;
        String username = "rv_" + suffix;

        Long memberId = memberAntRepository.save(MemberAnt.builder()
                .username(username).password("race").nickname("rv_" + suffix)
                .role(Role.USER).provider("LOCAL").balance(INITIAL_BALANCE).build()).getId();
        stockRepository.save(Stock.builder().code(stockCode).name("레이스종목").initial("ㄹㅅㅈㅁ").market("KOSPI").build());

        MemberAnt member = memberAntRepository.findById(memberId).orElseThrow();
        member.lockBalance(RES_QUANTITY * TARGET_PRICE);
        memberAntRepository.save(member);

        if (withHolding) {
            holdingRepository.save(Holding.builder()
                    .member(memberAntRepository.getReferenceById(memberId))
                    .stock(stockRepository.getReferenceById(stockCode))
                    .stockName("레이스종목").quantity(EXISTING_QUANTITY).lockedQuantity(0)
                    .avgPrice(EXISTING_AVG_PRICE).build());
        }

        Long orderId = reservedOrderRepository.save(ReservedOrder.builder()
                .member(memberAntRepository.getReferenceById(memberId))
                .stock(stockRepository.getReferenceById(stockCode))
                .stockName("레이스종목").tradeType(TradeType.BUY)
                .targetPrice(TARGET_PRICE).quantity(RES_QUANTITY)
                .status(TradeStatus.PENDING).build()).getId();

        return new Seed(memberId, username, stockCode, orderId);
    }

    private void cleanUp(Seed s) {
        Long memberId = s.memberId();
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            for (TradeStatus st : TradeStatus.values()) {
                reservedOrderRepository.deleteAll(reservedOrderRepository.findByMember_IdAndStatus(memberId, st));
            }
            holdingRepository.deleteAllByMember_Id(memberId);
            tradeHistoryRepository.deleteAllByMember_Id(memberId);
            notificationRepository.deleteAllByMember_Id(memberId);
            memberAntRepository.deleteById(memberId);
            stockRepository.deleteById(s.stockCode());
        });
    }

    private record Seed(Long memberId, String username, String stockCode, Long orderId) {}
}

package sw.gaemiZIP.concurrency;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import sw.gaemiZIP.dto.stock.ReservationRequest;
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
import sw.gaemiZIP.service.stock.ReservationService;
import sw.gaemiZIP.service.stock.TradeService;
import sw.gaemiZIP.util.MarketHoursUtil;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 예약 체결 락 순서 통일 이후 남은 항목 측정.
 *  - S3: 예약 매도 체결 vs 같은 계정 즉시 매도 (잔고·보유 수량 정합성)
 *  - O : 같은 계정 예약 매수 2건 동시 생성 시 가용 잔고 초과 예약(check-then-lock)
 *  - R : 한 주문이 예외를 던지면 같은 종목의 다른 정상 주문까지 롤백되는지
 * 즉시 매도·예약 생성은 장 시간(평일 09:00~15:30)에만 가능해 S3·O는 장 시간에만 실행된다.
 * 실행: ./gradlew concurrencyTest --tests "*ReservationEdgeCaseTest"
 */
@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = "spring.jpa.show-sql=false")
@Tag("concurrency")
class ReservationEdgeCaseTest {

    private static final Logger log = LoggerFactory.getLogger(ReservationEdgeCaseTest.class);

    private static final int ITERATIONS = 20;
    private static final long INITIAL_BALANCE = 100_000_000L;
    private static final long PRICE = 10_000L;
    private static final int HOLDING_QUANTITY = 100;
    private static final int RES_SELL_QUANTITY = 5;
    private static final int IMM_SELL_QUANTITY = 3;

    @Autowired private ReservationService reservationService;
    @Autowired private TradeService tradeService;
    @Autowired private MemberAntRepository memberAntRepository;
    @Autowired private ReservedOrderRepository reservedOrderRepository;
    @Autowired private HoldingRepository holdingRepository;
    @Autowired private TradeHistoryRepository tradeHistoryRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private StockRepository stockRepository;
    @Autowired private PlatformTransactionManager transactionManager;

    // ---------- S3: 예약 매도 체결 vs 즉시 매도 ----------

    @Test
    @DisplayName("[S3] 예약 매도 체결과 같은 계정 즉시 매도가 동시에 실행되면 잔고·보유 수량이 어긋난다")
    void s3_reservedSellVsImmediateSell() throws Exception {
        Assumptions.assumeTrue(MarketHoursUtil.isMarketHours(), "즉시 매도는 장 시간에만 가능");
        int corrupted = 0;
        int unexpected = 0;

        for (int i = 0; i < ITERATIONS; i++) {
            String suffix = "s3_" + System.nanoTime() + "_" + i;
            String stockCode = createStock(suffix);
            Long memberId = createMember("ec_" + suffix, INITIAL_BALANCE);
            String username = "ec_" + suffix;
            saveHolding(memberId, stockCode, HOLDING_QUANTITY, RES_SELL_QUANTITY);   // 예약 매도 수량만큼 잠금
            reservedOrderRepository.save(order(memberId, stockCode, TradeType.SELL, RES_SELL_QUANTITY));

            List<Throwable> errors = runTwo(
                    () -> reservationService.matchAndExecute(stockCode, PRICE),
                    () -> tradeService.executeSell(username, sellRequest(stockCode)));
            if (errors.stream().anyMatch(t -> !(t instanceof IllegalStateException))) unexpected++;

            MemberAnt m = memberAntRepository.findById(memberId).orElseThrow();
            Holding h = holdingRepository.findByMember_IdAndStock_Code(memberId, stockCode).orElse(null);
            long sells = tradeHistoryRepository.findByMember_IdOrderByTradeTimeDesc(memberId).stream()
                    .filter(t -> "SELL".equals(t.getTradeType())).count();
            long expectedBalance = INITIAL_BALANCE + (RES_SELL_QUANTITY + IMM_SELL_QUANTITY) * PRICE;
            int expectedQty = HOLDING_QUANTITY - RES_SELL_QUANTITY - IMM_SELL_QUANTITY;
            boolean ok = m.getBalance() == expectedBalance && h != null && h.getQuantity() == expectedQty
                    && h.getLockedQuantity() == 0 && sells == 2;
            if (!ok) {
                corrupted++;
                log.warn("[S3 {}회차] 불일치: 잔고 {}(기대 {}), 보유 {}(기대 {}), locked {}, 매도 이력 {}건(기대 2) | 예외 {}",
                        i + 1, m.getBalance(), expectedBalance, h == null ? "없음" : h.getQuantity(), expectedQty,
                        h == null ? "-" : h.getLockedQuantity(), sells, errors);
            }
            cleanUp(memberId, stockCode);
        }
        log.info("==================== [S3] 결과 ====================");
        log.info("불일치 {}/{}회, 예상 밖 예외 {}/{}회", corrupted, ITERATIONS, unexpected, ITERATIONS);
        assertThat(corrupted).isZero();
        assertThat(unexpected).isZero();
    }

    // ---------- O: 예약 매수 동시 생성 ----------

    @Test
    @DisplayName("[O] 같은 계정이 가용 잔고를 초과하는 예약 매수 2건을 동시에 만들면 둘 다 성공한다")
    void overbooking_createReservationConcurrently() throws Exception {
        Assumptions.assumeTrue(MarketHoursUtil.isMarketHours(), "예약 생성은 장 시간에만 가능");
        int overbooked = 0;

        for (int i = 0; i < ITERATIONS; i++) {
            String suffix = "o_" + System.nanoTime() + "_" + i;
            String stockCode = createStock(suffix);
            String username = "ec_" + suffix;
            Long memberId = createMember(username, 100_000L);   // 가용 잔고 100,000원
            ReservationRequest req = reservationRequest(stockCode, 6);   // 1건당 60,000원

            List<Throwable> errors = runTwo(
                    () -> reservationService.createReservation(username, req),
                    () -> reservationService.createReservation(username, req));

            MemberAnt m = memberAntRepository.findById(memberId).orElseThrow();
            int pending = reservedOrderRepository.findByMember_IdAndStatus(memberId, TradeStatus.PENDING).size();
            boolean ok = pending == 1 && m.getLockedBalance() == 60_000L && errors.size() == 1;
            if (!ok) {
                overbooked++;
                log.warn("[O {}회차] 초과 예약: PENDING {}건(기대 1), lockedBalance {}(기대 60000), 실패 {}건(기대 1)",
                        i + 1, pending, m.getLockedBalance(), errors.size());
            }
            cleanUp(memberId, stockCode);
        }
        log.info("==================== [O] 결과 ====================");
        log.info("초과 예약 {}/{}회", overbooked, ITERATIONS);
        assertThat(overbooked).isZero();
    }

    // ---------- R: 한 주문 예외 시 같은 종목 롤백 ----------

    @Disabled("미해결: 한 주문 예외 시 같은 종목 전체 롤백 — 주문 단위 트랜잭션 분리 브랜치에서 활성화")
    @Test
    @DisplayName("[R] 같은 종목의 한 주문이 예외를 던져도 다른 정상 주문은 체결되어야 한다")
    void oneFailingOrderRollsBackWholeStock() {
        String suffix = "r_" + System.nanoTime();
        String stockCode = createStock(suffix);

        Long goodMember = createMember("ec_good_" + suffix, INITIAL_BALANCE);   // 정상 예약 매수
        memberLock(goodMember, 5 * PRICE);
        ReservedOrder good = reservedOrderRepository.save(order(goodMember, stockCode, TradeType.BUY, 5));

        Long badMember = createMember("ec_bad_" + suffix, INITIAL_BALANCE);     // 보유 종목이 없는 예약 매도 → 체결 시 예외
        ReservedOrder bad = reservedOrderRepository.save(order(badMember, stockCode, TradeType.SELL, 5));

        Throwable thrown = null;
        try {
            reservationService.matchAndExecute(stockCode, PRICE);
        } catch (Throwable t) {
            thrown = t;
        }

        TradeStatus goodStatus = reservedOrderRepository.findById(good.getId()).orElseThrow().getStatus();
        TradeStatus badStatus = reservedOrderRepository.findById(bad.getId()).orElseThrow().getStatus();
        log.info("==================== [R] 결과 ====================");
        log.info("matchAndExecute 예외: {}", thrown == null ? "없음" : thrown.getClass().getSimpleName() + ": " + thrown.getMessage());
        log.info("정상 주문 상태: {} (기대 EXECUTED) | 예외 유발 주문 상태: {}", goodStatus, badStatus);

        cleanUp(goodMember, null);
        cleanUp(badMember, stockCode);
        assertThat(goodStatus).isEqualTo(TradeStatus.EXECUTED);
    }

    // ---------- 보조 ----------

    private TradeRequest sellRequest(String stockCode) {
        TradeRequest r = new TradeRequest();
        r.setStockCode(stockCode);
        r.setStockName("엣지종목");
        r.setTradeType("SELL");
        r.setPrice((int) PRICE);
        r.setQuantity(IMM_SELL_QUANTITY);
        return r;
    }

    private ReservationRequest reservationRequest(String stockCode, int quantity) {
        ReservationRequest r = new ReservationRequest();
        r.setStockCode(stockCode);
        r.setStockName("엣지종목");
        r.setTradeType("BUY");
        r.setPrice((int) PRICE);
        r.setQuantity(quantity);
        return r;
    }

    private ReservedOrder order(Long memberId, String stockCode, TradeType type, int quantity) {
        return ReservedOrder.builder()
                .member(memberAntRepository.getReferenceById(memberId))
                .stock(stockRepository.getReferenceById(stockCode))
                .stockName("엣지종목").tradeType(type)
                .targetPrice(PRICE).quantity(quantity)
                .status(TradeStatus.PENDING).build();
    }

    private String createStock(String suffix) {
        String code = "EC_" + suffix;
        stockRepository.save(Stock.builder().code(code).name("엣지종목").initial("ㅇㅈㅈㅁ").market("KOSPI").build());
        return code;
    }

    private Long createMember(String username, long balance) {
        return memberAntRepository.save(MemberAnt.builder()
                .username(username).password("edge").nickname(username)
                .role(Role.USER).provider("LOCAL").balance(balance).build()).getId();
    }

    private void memberLock(Long memberId, long amount) {
        MemberAnt m = memberAntRepository.findById(memberId).orElseThrow();
        m.lockBalance(amount);
        memberAntRepository.save(m);
    }

    private void saveHolding(Long memberId, String stockCode, int quantity, int locked) {
        holdingRepository.save(Holding.builder()
                .member(memberAntRepository.getReferenceById(memberId))
                .stock(stockRepository.getReferenceById(stockCode))
                .stockName("엣지종목").quantity(quantity).lockedQuantity(locked)
                .avgPrice(5_000L).build());
    }

    private List<Throwable> runTwo(Runnable a, Runnable b) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());
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

    /** stockCode가 null이면 종목은 지우지 않는다(같은 종목을 쓰는 다른 회원이 남아 있을 때) */
    private void cleanUp(Long memberId, String stockCode) {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            for (TradeStatus st : TradeStatus.values()) {
                reservedOrderRepository.deleteAll(reservedOrderRepository.findByMember_IdAndStatus(memberId, st));
            }
            holdingRepository.deleteAllByMember_Id(memberId);
            tradeHistoryRepository.deleteAllByMember_Id(memberId);
            notificationRepository.deleteAllByMember_Id(memberId);
            memberAntRepository.deleteById(memberId);
            if (stockCode != null) stockRepository.deleteById(stockCode);
        });
    }
}

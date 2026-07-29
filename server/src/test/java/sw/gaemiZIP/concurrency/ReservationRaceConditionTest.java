package sw.gaemiZIP.concurrency;

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
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.member.Role;
import sw.gaemiZIP.entity.stock.Holding;
import sw.gaemiZIP.entity.stock.ReservedOrder;
import sw.gaemiZIP.entity.stock.TradeHistory;
import sw.gaemiZIP.entity.stock.TradeStatus;
import sw.gaemiZIP.entity.stock.TradeType;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.notification.NotificationRepository;
import sw.gaemiZIP.repository.stock.HoldingRepository;
import sw.gaemiZIP.repository.stock.ReservedOrderRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;
import sw.gaemiZIP.service.stock.ReservationService;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ReservationService.matchAndExecute()에 동일 종목에 대한 틱이 "동시에" 여러 번 들어오면
 * 어떤 문제가 생기는지 재현하는 테스트.
 *
 * 지금 운영 구조(KiwoomRealtimeService의 WS 세션이 1개)에서는 절대 발생하지 않는 상황이다
 * (틱이 항상 한 스레드에서 순차 처리되므로). 하지만 종목코드 파티셔닝 등으로 병렬화를 도입하면
 * "같은 종목의 틱을 서로 다른 스레드가 동시에 처리"하는 경우가 생길 수 있어, 그 전에 실제로
 * 무엇이 깨지는지 미리 재현해둔다. (PROGRESS.md "[예약 체결 엔진]" TODO, ReservationThroughputBenchmark
 * 의 "후속 계획" 참고)
 *
 * 실행하며 실제로 확인된 결함은 애초에 가설로 세웠던 "잔고 lost update"가 아니라 두 가지 다른
 * 형태였다 (자세한 내용은 server/BENCHMARK.md 참고):
 *  1) 최초 매수(보유종목 없음) 상황에서 동시에 체결되면, 서로 다른 스레드가 동시에 같은
 *     (memberId, stockCode) Holding을 "없음"으로 보고 각자 새로 INSERT — Holding에 유니크
 *     제약이 없어 중복 row가 생기고, 뒤늦게 그 row를 조회하는 스레드는 Optional 단일 결과를
 *     기대하는 findByMemberIdAndStockCode에서 IncorrectResultSizeDataAccessException을 맞고
 *     트랜잭션 전체가 롤백된다 → 동시 호출 4건 중 3건(75%)이 예외로 실패
 *  2) 이미 보유 중인 종목(Holding row 존재)에 동시 매수가 겹치면 예외 없이 전부 성공하지만,
 *     N개의 스레드가 같은 PENDING 주문 목록을 각자 읽어가 독립적으로 처리하면서 거래이력·알림이
 *     스레드 수만큼(N배) 중복 생성됨 — 회원 잔고/보유수량은 모든 스레드가 동일한 시작값에서
 *     동일한 델타를 계산하는 바람에 우연히 숫자가 맞아떨어지지만(고전적 lost update의 결과가
 *     서로 상쇄됨), 거래내역 화면에 같은 체결이 4번 찍히고 체결 알림도 4번 뜨는 실사용자 체감
 *     버그가 발생함
 *
 * 실행: ./gradlew concurrencyTest (일반 ./gradlew test 에는 포함되지 않음 — build.gradle 참고)
 */
@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = "spring.jpa.show-sql=false")
@Tag("concurrency")
class ReservationRaceConditionTest {

    private static final Logger log = LoggerFactory.getLogger(ReservationRaceConditionTest.class);

    private static final int ITERATIONS = 20;         // 반복 횟수(레이스는 매번 재현되지 않을 수 있어 반복 후 재현율로 기록)
    private static final int ORDER_COUNT = 5;          // 종목당 PENDING 주문 수
    private static final int CONCURRENT_CALLERS = 4;   // "동시에 들어온 틱" 수 (matchAndExecute 동시 호출 스레드 수)
    private static final long TARGET_PRICE = 10_000L;
    private static final int QUANTITY = 1;
    private static final long INITIAL_BALANCE = 100_000_000L;
    private static final int EXISTING_QUANTITY = 100;  // 시나리오 2의 기존 보유수량
    private static final long EXISTING_AVG_PRICE = 5_000L;

    @Autowired private ReservationService reservationService;
    @Autowired private MemberAntRepository memberAntRepository;
    @Autowired private ReservedOrderRepository reservedOrderRepository;
    @Autowired private HoldingRepository holdingRepository;
    @Autowired private TradeHistoryRepository tradeHistoryRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("[시나리오1] 최초 매수 시 동시 체결이 겹치면 Holding 중복 생성 예외로 주문이 미체결 상태로 남는다")
    void concurrentFirstBuy_causesDuplicateHoldingExceptionAndStuckOrders() throws InterruptedException {
        int runsWithFailure = 0;
        int totalFailedCalls = 0;

        for (int i = 0; i < ITERATIONS; i++) {
            Seeded seeded = seedOrdersOnly(i);
            int failedCalls = runConcurrently(seeded.stockCode(), i == 0);
            totalFailedCalls += failedCalls;
            if (failedCalls > 0) {
                runsWithFailure++;
            }

            long remainingPending = reservedOrderRepository.findByMemberIdAndStatus(seeded.memberId(), TradeStatus.PENDING).size();
            if (i == 0) {
                log.info("[1회차] 예외로 실패한 동시 호출 수: {}/{} | 그 결과 PENDING으로 남은 주문 수: {}",
                        failedCalls, CONCURRENT_CALLERS, remainingPending);
            }

            cleanUp(seeded.memberId());
        }

        log.info("==================== [시나리오1] 재현 결과 ====================");
        log.info("종목당 PENDING 주문 {}건, 동시 호출 스레드 {}개, {}회 반복", ORDER_COUNT, CONCURRENT_CALLERS, ITERATIONS);
        log.info("예외 발생한 반복: {}/{}회 ({}%) | 실패한 개별 호출 총합: {}/{}",
                runsWithFailure, ITERATIONS, runsWithFailure * 100.0 / ITERATIONS,
                totalFailedCalls, ITERATIONS * CONCURRENT_CALLERS);
        log.info("================================================================");

        // ReservedOrder PENDING 조회에 PESSIMISTIC_WRITE 락 도입 + Holding(memberId, stockCode)
        // 유니크 제약으로 결함 해결 완료 — "결함이 재현되지 않는다"를 증명하는 회귀 테스트로 전환.
        assertThat(runsWithFailure).isEqualTo(0);
    }

    @Test
    @DisplayName("[시나리오2] 이미 보유 중인 종목에 동시 매수가 겹치면 거래이력·알림이 스레드 수만큼 중복 생성된다")
    void concurrentBuyOnExistingHolding_causesDuplicateExecutionRecords() throws InterruptedException {
        int corruptedRuns = 0;

        for (int i = 0; i < ITERATIONS; i++) {
            Seeded seeded = seedWithExistingHolding(i);
            runConcurrently(seeded.stockCode(), false);

            MemberAnt reloaded = memberAntRepository.findById(seeded.memberId()).orElseThrow();
            Holding holding = holdingRepository.findByMemberIdAndStockCode(seeded.memberId(), seeded.stockCode()).orElseThrow();
            List<TradeHistory> histories = tradeHistoryRepository.findByMemberIdOrderByTradeTimeDesc(seeded.memberId());
            long unreadNotifications = notificationRepository.countByMemberIdAndReadFalse(seeded.memberId());

            long expectedBalance = INITIAL_BALANCE - (long) ORDER_COUNT * TARGET_PRICE * QUANTITY;
            int expectedQuantity = EXISTING_QUANTITY + ORDER_COUNT * QUANTITY;
            boolean corrupted = reloaded.getBalance() != expectedBalance
                    || holding.getQuantity() != expectedQuantity
                    || histories.size() != ORDER_COUNT
                    || unreadNotifications != ORDER_COUNT;

            if (corrupted) {
                corruptedRuns++;
                log.warn("[{}회차] 중복 체결기록 재현됨 — 잔고 {}(기대 {}) | 보유수량 {}(기대 {}) | 거래이력 {}건(기대 {}건) | 알림 {}건(기대 {}건)",
                        i + 1, reloaded.getBalance(), expectedBalance, holding.getQuantity(), expectedQuantity,
                        histories.size(), ORDER_COUNT, unreadNotifications, ORDER_COUNT);
            }

            cleanUp(seeded.memberId());
        }

        log.info("==================== [시나리오2] 재현 결과 ====================");
        log.info("기존 보유 {}주 + PENDING 매수 {}건, 동시 호출 스레드 {}개, {}회 반복", EXISTING_QUANTITY, ORDER_COUNT, CONCURRENT_CALLERS, ITERATIONS);
        log.info("중복 체결기록 재현: {}/{}회 ({}%) — 잔고/보유수량은 경쟁하는 스레드들이 동일한 델타를 계산해 우연히 맞아떨어지는 경우가 많고,"
                + " 실제로 드러나는 손상은 거래이력·알림 중복임", corruptedRuns, ITERATIONS, corruptedRuns * 100.0 / ITERATIONS);
        log.info("================================================================");

        // 시나리오1과 동일한 원칙 — PESSIMISTIC_WRITE 락 도입으로 결함 해결 완료.
        assertThat(corruptedRuns).isEqualTo(0);
    }

    /** 동시에 matchAndExecute를 호출하고, 예외를 던지며 실패한 호출 수를 반환한다. */
    private int runConcurrently(String stockCode, boolean logTiming) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(CONCURRENT_CALLERS);
        CountDownLatch ready = new CountDownLatch(CONCURRENT_CALLERS);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(CONCURRENT_CALLERS);
        AtomicInteger failedCalls = new AtomicInteger(0);
        List<long[]> timings = java.util.Collections.synchronizedList(new java.util.ArrayList<>());

        for (int i = 0; i < CONCURRENT_CALLERS; i++) {
            int idx = i;
            pool.submit(() -> {
                ready.countDown();
                try {
                    start.await();
                    long callStart = System.nanoTime();
                    reservationService.matchAndExecute(stockCode, TARGET_PRICE);
                    long callEnd = System.nanoTime();
                    timings.add(new long[]{idx, callStart, callEnd});
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } catch (Exception e) {
                    failedCalls.incrementAndGet();
                    if (logTiming) {
                        log.warn("스레드#{} matchAndExecute 예외 발생: {}: {}", idx, e.getClass().getName(), e.getMessage());
                    }
                } finally {
                    done.countDown();
                }
            });
        }

        ready.await(5, TimeUnit.SECONDS);
        start.countDown(); // 대기 중이던 스레드들을 동시에 출발시켜 겹치도록 유도
        done.await(30, TimeUnit.SECONDS);
        pool.shutdown();

        if (logTiming && !timings.isEmpty()) {
            long base = timings.stream().mapToLong(t -> t[1]).min().orElse(0);
            log.info("--- 동시 호출 타이밍(성공한 호출만, ns를 시작점 기준 ms로 환산) ---");
            for (long[] t : timings) {
                log.info("스레드#{} 시작 +{}ms | 종료 +{}ms | 소요 {}ms",
                        t[0], (t[1] - base) / 1_000_000, (t[2] - base) / 1_000_000, (t[2] - t[1]) / 1_000_000);
            }
        }

        return failedCalls.get();
    }

    private Seeded seedOrdersOnly(int iteration) {
        String suffix = System.nanoTime() + "_" + iteration;
        Long memberId = createMember(suffix);
        String stockCode = "RACE1_" + suffix;
        createOrders(memberId, stockCode);
        return new Seeded(memberId, stockCode);
    }

    private Seeded seedWithExistingHolding(int iteration) {
        String suffix = System.nanoTime() + "_" + iteration;
        Long memberId = createMember(suffix);
        String stockCode = "RACE2_" + suffix;

        holdingRepository.save(Holding.builder()
                .memberId(memberId)
                .stockCode(stockCode)
                .stockName("레이스종목")
                .quantity(EXISTING_QUANTITY)
                .lockedQuantity(0)
                .avgPrice(EXISTING_AVG_PRICE)
                .build());

        createOrders(memberId, stockCode);
        return new Seeded(memberId, stockCode);
    }

    private Long createMember(String suffix) {
        return memberAntRepository.save(MemberAnt.builder()
                .username("race_" + suffix)
                .password("race")
                .nickname("race_" + suffix)
                .role(Role.USER)
                .provider("LOCAL")
                .balance(INITIAL_BALANCE)
                .build()).getId();
    }

    private void createOrders(Long memberId, String stockCode) {
        for (int i = 0; i < ORDER_COUNT; i++) {
            reservedOrderRepository.save(ReservedOrder.builder()
                    .memberId(memberId)
                    .stockCode(stockCode)
                    .stockName("레이스종목")
                    .tradeType(TradeType.BUY)
                    .targetPrice(TARGET_PRICE)
                    .quantity(QUANTITY)
                    .status(TradeStatus.PENDING)
                    .build());
        }
    }

    private void cleanUp(Long memberId) {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            reservedOrderRepository.deleteAll(reservedOrderRepository.findByMemberIdAndStatus(memberId, TradeStatus.PENDING));
            reservedOrderRepository.deleteAll(reservedOrderRepository.findByMemberIdAndStatus(memberId, TradeStatus.EXECUTED));
            holdingRepository.deleteAllByMemberId(memberId);
            tradeHistoryRepository.deleteAllByMemberId(memberId);
            notificationRepository.deleteAllByMemberId(memberId);
            memberAntRepository.deleteById(memberId);
        });
    }

    private record Seeded(Long memberId, String stockCode) {}
}

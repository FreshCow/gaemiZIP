package sw.gaemiZIP.benchmark;

import org.junit.jupiter.api.AfterEach;
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
import sw.gaemiZIP.entity.stock.ReservedOrder;
import sw.gaemiZIP.entity.stock.TradeStatus;
import sw.gaemiZIP.entity.stock.TradeType;
import sw.gaemiZIP.repository.member.MemberAntRepository;
import sw.gaemiZIP.repository.notification.NotificationRepository;
import sw.gaemiZIP.repository.stock.HoldingRepository;
import sw.gaemiZIP.repository.stock.ReservedOrderRepository;
import sw.gaemiZIP.repository.stock.TradeHistoryRepository;
import sw.gaemiZIP.service.stock.ReservationService;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * ReservationService.matchAndExecute 처리량/지연 비교 벤치마크.
 *
 * - "순차": 현재 운영 구조(키움 WS 세션 1개 → 틱을 한 스레드에서 하나씩 처리)를 그대로 재현
 * - "병렬": 종목코드 해시 파티셔닝을 가정한 구조 — 틱을 여러 워커 스레드에 분산 처리
 *
 * 각 틱은 서로 다른 회원 + 서로 다른 종목코드를 사용해 완전히 독립적이므로,
 * 병렬 시나리오에서도 같은 row를 두 스레드가 동시에 건드리는 경우가 없다(락 없이도 안전한 비교 대상).
 * 실제 레이스 컨디션(동일 종목/동일 회원에 대한 동시 접근)은 이 벤치마크의 범위가 아니며 별도 동시성 테스트에서 다룬다.
 *
 * 실행: ./gradlew benchmarkTest (일반 ./gradlew test 에는 포함되지 않음 — build.gradle 참고)
 * 실제 RDS(원격 DB)를 대상으로 하므로 결과는 매 실행마다 네트워크 상황에 따라 달라질 수 있다 — 여러 번 실행해 평균을 기록할 것.
 */
@SpringBootTest
@ActiveProfiles("local")
@TestPropertySource(properties = "spring.jpa.show-sql=false")
@Tag("benchmark")
class ReservationThroughputBenchmark {

    private static final Logger log = LoggerFactory.getLogger(ReservationThroughputBenchmark.class);

    private static final int TOTAL_TICKS = 160;   // 시나리오당 처리할 틱(체결) 수
    private static final int PARALLELISM = 8;     // 병렬 시나리오 워커 스레드 수
    private static final long TARGET_PRICE = 10_000L;

    @Autowired private ReservationService reservationService;
    @Autowired private MemberAntRepository memberAntRepository;
    @Autowired private ReservedOrderRepository reservedOrderRepository;
    @Autowired private HoldingRepository holdingRepository;
    @Autowired private TradeHistoryRepository tradeHistoryRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private PlatformTransactionManager transactionManager;

    private final List<Long> seededMemberIds = new ArrayList<>();
    private final List<Long> seededOrderIds = new ArrayList<>();

    // @Transactional을 @AfterEach 메서드에 직접 붙여도 Spring 테스트 트랜잭션 관리 대상은
    // @Test 메서드 단위라 인식되지 않아 TransactionRequiredException이 남 — TransactionTemplate으로 직접 트랜잭션을 열어서 정리
    @AfterEach
    void cleanUp() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            reservedOrderRepository.deleteAllById(seededOrderIds);
            for (Long memberId : seededMemberIds) {
                holdingRepository.deleteAllByMemberId(memberId);
                tradeHistoryRepository.deleteAllByMemberId(memberId);
                notificationRepository.deleteAllByMemberId(memberId);
            }
            memberAntRepository.deleteAllById(seededMemberIds);
        });
        seededMemberIds.clear();
        seededOrderIds.clear();
    }

    @Test
    @DisplayName("순차 처리 vs 종목코드 파티셔닝 병렬 처리 - 처리량/지연 비교")
    void compareSequentialVsParallel() throws InterruptedException {
        List<Seed> sequentialSeeds = seed("SEQ", TOTAL_TICKS);
        List<Seed> parallelSeeds = seed("PAR", TOTAL_TICKS);

        Result sequential = runSequential(sequentialSeeds);
        Result parallel = runParallel(parallelSeeds, PARALLELISM);

        printReport(sequential, parallel);
    }

    private Result runSequential(List<Seed> seeds) {
        long[] latenciesNs = new long[seeds.size()];
        long start = System.nanoTime();
        for (int i = 0; i < seeds.size(); i++) {
            Seed seed = seeds.get(i);
            long callStart = System.nanoTime();
            reservationService.matchAndExecute(seed.stockCode(), TARGET_PRICE);
            latenciesNs[i] = System.nanoTime() - callStart;
        }
        long totalNs = System.nanoTime() - start;
        return new Result("순차(단일 스레드)", totalNs, latenciesNs);
    }

    private Result runParallel(List<Seed> seeds, int parallelism) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(parallelism);
        long[] latenciesNs = new long[seeds.size()];
        CountDownLatch done = new CountDownLatch(seeds.size());

        long start = System.nanoTime();
        for (int i = 0; i < seeds.size(); i++) {
            int idx = i;
            Seed seed = seeds.get(i);
            pool.submit(() -> {
                long callStart = System.nanoTime();
                reservationService.matchAndExecute(seed.stockCode(), TARGET_PRICE);
                latenciesNs[idx] = System.nanoTime() - callStart;
                done.countDown();
            });
        }
        done.await();
        long totalNs = System.nanoTime() - start;
        pool.shutdown();
        return new Result("병렬(" + parallelism + "스레드, 종목코드별 독립)", totalNs, latenciesNs);
    }

    private List<Seed> seed(String prefix, int count) {
        List<Seed> seeds = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            String suffix = prefix + "_" + System.nanoTime() + "_" + i;

            MemberAnt member = memberAntRepository.save(MemberAnt.builder()
                    .username("bench_" + suffix)
                    .password("bench")
                    .nickname("bench_" + suffix)
                    .role(Role.USER)
                    .provider("LOCAL")
                    .balance(100_000_000L)
                    .build());
            seededMemberIds.add(member.getId());

            String stockCode = "BENCH" + suffix;
            ReservedOrder order = reservedOrderRepository.save(ReservedOrder.builder()
                    .memberId(member.getId())
                    .stockCode(stockCode)
                    .stockName("벤치마크종목")
                    .tradeType(TradeType.BUY)
                    .targetPrice(TARGET_PRICE)
                    .quantity(1)
                    .status(TradeStatus.PENDING)
                    .build());
            seededOrderIds.add(order.getId());

            seeds.add(new Seed(stockCode));
        }
        return seeds;
    }

    private void printReport(Result sequential, Result parallel) {
        log.info("==================== 예약 체결 처리량 벤치마크 ====================");
        log.info("총 틱 수(시나리오당): {}", TOTAL_TICKS);
        report(sequential);
        report(parallel);
        double speedup = (double) sequential.totalNs() / parallel.totalNs();
        log.info("배속(순차 총소요시간 대비 병렬 총소요시간): {}배", String.format("%.2f", speedup));
        log.info("=================================================================");
    }

    private void report(Result r) {
        long[] sorted = r.latenciesNs().clone();
        Arrays.sort(sorted);
        double totalSec = r.totalNs() / 1_000_000_000.0;
        double throughput = TOTAL_TICKS / totalSec;
        log.info("[{}] 총소요 {}ms | 처리량 {}건/s | p50 {}ms | p95 {}ms | p99 {}ms | max {}ms",
                r.label(),
                r.totalNs() / 1_000_000,
                String.format("%.1f", throughput),
                sorted[percentileIndex(sorted.length, 0.50)] / 1_000_000,
                sorted[percentileIndex(sorted.length, 0.95)] / 1_000_000,
                sorted[percentileIndex(sorted.length, 0.99)] / 1_000_000,
                sorted[sorted.length - 1] / 1_000_000);
    }

    private int percentileIndex(int length, double percentile) {
        int idx = (int) (length * percentile);
        return Math.min(idx, length - 1);
    }

    private record Seed(String stockCode) {}

    private record Result(String label, long totalNs, long[] latenciesNs) {}
}

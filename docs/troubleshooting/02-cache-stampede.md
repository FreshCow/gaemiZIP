[← README로 돌아가기](../../README.md) · [트러블슈팅 목록](README.md)

# 2. 종목 상세 조회 실패 - 캐시 스탬피드로 인한 외부 API 오류

> **요약**: 종목 상세·차트 조회의 간헐적 실패 원인이 토큰 레이스가 아니라 외부 API 429(캐시 스탬피드)임을 로그로 확인하고 요청 병합으로 해결. 차트 조회는 같은 부하에서 빈 응답 91.2% → 0%

**증상**
- 종목 상세 페이지 진입 시 간헐적으로 조회 실패, 새로고침하면 정상 동작

**원인 추적**
- 동시 요청이 키움 인증 토큰을 중복 발급받아 충돌하는 문제로 추정 → `synchronized` 추가로 수정했으나 동일한 증상
- 서버 로그 확인 → `429 Too Many Requests`
- 종목 상세의 4개 API(`/info`, `/price`, `/news`, `/ai/stock`)가 콜드 캐시에서 같은 종목을 각자 키움에 중복 조회
- 키움 호출 제한이 URL이 아니라 계정 전역이라 다른 스케줄러(5초 주기 랭킹 갱신)도 한도를 소모
- 예외를 `null`로 반환해 404로 표면화, 하나만 성공해도 캐시되어 새로고침 시 정상으로 보임

**해결**
- 같은 종목코드에 대해 진행 중인 키움 호출이 있으면 새로 호출하지 않고 그 결과를 기다려서 공유
  - 동시 요청 N개가 호출 1번으로 줄어듦
- 랭킹 갱신 스케줄러 주기 5초 → 30초
- 차트 조회도 같은 패턴이라 동일하게 적용

<details>
<summary>코드: 요청 병합 (기존 → 수정)</summary>

기존 (요약)
```java
// StockInfoService.getStockInfo — 4개 API가 각자 호출
// Redis 조회 → 없으면 곧바로 키움 REST 호출 후 Redis 저장
// 콜드 캐시에서 동시 요청 N개 → 429

// StockFetchService
@Scheduled(fixedDelay = 5_000)
```

수정
```java
// StockInfoService: 같은 종목코드의 진행 중 요청을 공유
private final ConcurrentHashMap<String, CompletableFuture<Optional<StockInfoResponse>>> inFlight = new ConcurrentHashMap<>();

public Optional<StockInfoResponse> getStockInfo(String code) {
    Optional<StockInfoResponse> cached = readFromCache(code);
    if (cached.isPresent()) return cached;

    // 진행 중인 요청이 있으면 그 결과를 공유, 없으면 한 번만 키움 호출
    CompletableFuture<Optional<StockInfoResponse>> future = inFlight.computeIfAbsent(
            code, c -> CompletableFuture.supplyAsync(() -> fetchAndCache(c)));
    try {
        return future.join();
    } finally {
        inFlight.remove(code, future);
    }
}

// StockFetchService
@Scheduled(fixedDelay = 30_000)

// ChartService: 같은 패턴을 차트 조회에도 적용
return getCached(cacheKey, () -> fetchDailyChartFromApi(stockCode));
```
</details>

**검증**
- 차트 조회 수정 전/후를 같은 조건으로 k6 비교 (`k6/loadTest/test_chart.js`, 50 VU / 10종목 랜덤 / 2분)
- 수정 전 , 수정 후를 각각 체크아웃해 순차 실행, Redis 차트 캐시를 비운 상태에서 시작
- 첫 측정에서 HTTP 실패율이 양쪽 모두 0%인데 수신량이 4배 차이 → "200이지만 빈 응답"을 의심해 응답 내용 검증(`데이터 있음`) 추가

| 지표 | 수정 전 | 수정 후 |
|---|---|---|
| 총 요청 | 922건 | 1,586건 |
| HTTP 실패율 | 0.00% | 0.00% |
| **빈 응답** | **91.2% (841/922)** | **0.00% (0/1,586)** |
| 평균 응답시간 | 1.46s | 7.45ms |
| p95 | 9.8s | 10.25ms |
| 최대 | 11.14s | 806.81ms |

- 수정 전: 키움 호출이 실패해도 예외를 삼켜 빈 결과를 200으로 반환 → 상태 코드로 감지 불가

[← README로 돌아가기](../../README.md) · [트러블슈팅 목록](README.md)

# 1. 같은 데이터를 동시에 수정할 때 값이 유실되는 동시성 결함

> **요약**: 예약 체결·즉시 주문에서 같은 데이터를 동시에 수정할 때 값이 유실되던 결함을 비관적 락으로 해결 (재현율 20/20회 → 0회). 이후 락과 주문 단위 트랜잭션을 추가하며 병렬 처리량은 일부 감소했지만, 금액이 오가는 로직이라 속도보다 정합성을 우선해 수용

**증상**
- 예약 체결을 종목코드 단위로 병렬화하자 가설(잔고 lost update)과 달리 결함 2건 발견
  - 최초 매수: `Holding` 유니크 제약 부재로 동시 INSERT 예외 (20/20회)
  - 기존 보유 매수: 거래이력·알림이 스레드 수(4배)만큼 중복 생성 (20/20회), 잔고는 우연히 같은 값이라 정상처럼 보임
- 즉시 매수에서도 같은 유형 재현: 응답은 200인데 이력 11건 대비 보유 수량 일부만 반영(2~5), 잔고도 일부만 차감 (20/20회)

**원인**
- 예약 체결(`matchAndExecute`): 같은 종목의 대기 주문을 락 없이 읽어, 동시 호출 시 각 스레드가 같은 주문 목록을 독립적으로 처리
- `Holding`에 (회원, 종목) 유니크 제약이 없어 최초 매수 시 중복 INSERT 가능
- 즉시 매수/매도(`TradeService`): 회원 행에 락이나 `@Version` 없이 "조회 → 잔고 차감 → 보유 갱신"을 수행해 같은 행을 서로 덮어씀

**해결**
- 예약 체결(최초 수정, 커밋): 종목코드 단위 비관적 락(`@Lock(PESSIMISTIC_WRITE)`) + `Holding` 유니크 제약
- 즉시 매수/매도: 회원 행 조회에 `@Lock(PESSIMISTIC_WRITE)` 적용, 같은 계정의 동시 주문 직렬화
- 후속 측정에서 예약 체결 ↔ 즉시 주문 교차 경합(조용한 유실)과 예약 취소 ↔ 체결 데드락이 추가로 확인되어 구조를 변경
  - 예약 체결·취소·생성에 회원 행 락을 추가하고, 락을 함께 잡는 경로는 모두 "주문 행 → 회원 행" 순서로 통일 (즉시 주문과 예약 생성은 회원 행만 잠금)
  - 체결을 "후보 조회(락 없음) → 주문마다 새 트랜잭션(`REQUIRES_NEW`)에서 주문 행 잠금·상태 재확인 → 회원 행 잠금"으로 바꿔, 한 주문의 예외가 같은 종목의 다른 주문을 롤백하지 않게 격리 (현재 `main` 구조)

<details>
<summary>코드: 예약 체결 (기존 → 최초 수정)</summary>

기존
```java
// ReservedOrderRepository
List<ReservedOrder> findByStockCodeAndStatus(String stockCode, TradeStatus status);
```

수정
```java
// ReservedOrderRepository: 종목코드 단위로 대기 주문을 잠그고 조회
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select o from ReservedOrder o where o.stock.code = :stockCode and o.status = :status")
List<ReservedOrder> findByStockCodeAndStatusForUpdate(@Param("stockCode") String stockCode,
                                                      @Param("status") TradeStatus status);

// Holding: 같은 회원·종목의 중복 INSERT를 DB가 막도록 안전망 추가
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "stock_code"}))
public class Holding { ... }
```
</details>

<details>
<summary>코드: 즉시 매수/매도 (기존 → 수정)</summary>

기존
```java
// TradeService.executeBuy / executeSell
MemberAnt member = findMember(email);   // 락 없이 조회 → 동시 요청이 같은 값을 읽음
```

수정
```java
// TradeService.executeBuy / executeSell
MemberAnt member = findMemberForUpdate(email);   // 회원 행을 잠그고 조회

// MemberAntRepository
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select m from MemberAnt m where m.username = :id or m.email = :id")
Optional<MemberAnt> findByLoginIdForUpdate(@Param("id") String id);
```
</details>

**검증**
- 예약 체결: JUnit(`ReservationRaceConditionTest`), `CountDownLatch`로 N스레드 동시 호출, 20회 반복
- 즉시 매수: k6(`k6/loadTest/test_buy.js`)로 같은 계정이 20 VU로 동시 매수, 락 없는 코드와 락 적용 코드를 같은 조건으로 실행하고 DB에서 이력·보유 수량·잔고를 직접 대조
- 즉시 매도: 보유 21주에서 1주씩 매도 요청 30개를 병렬 전송, 20회 반복
- 교차 경합(예약 체결 ↔ 즉시 주문·취소, 동시 예약 생성): JUnit 통합 테스트(`ReservationVsOrderRaceTest`, `ReservationEdgeCaseTest`), 실제 Postgres, `CountDownLatch`와 커밋 직전 지연으로 20회 반복

| 지표 | 수정 전 | 수정 후 |
|---|---|---|
| 예약 체결 결함 재현율 (2건) | 20/20회 (100%) | 0/20회 |
| 병렬 처리량(순차 대비), 종목 단위 락 도입(`0f2ee8c`) | 8.29~8.79배 | 8.18배 |
| 병렬 처리량(순차 대비), 회원 락·주문 순서 통일 (같은 환경, 각 2회) | 5.28 / 4.83배 | 5.12 / 4.79배|
| 병렬 처리량(건/s), 주문 단위 트랜잭션 분리 (같은 환경, 각 2회) | 243.5 / 313.2 | 202.0 / 224.5 (약 20~30% 감소) |
| 즉시 매수 어긋난 회차 | 20/20회 | 0/25회 |
| 즉시 매도 어긋난 회차 | 20/20회 | 0/20회 |
| 예약 체결 ↔ 즉시 매수 불일치 (통계 20회) | 20/20회 | 0/20회 |
| 예약 취소 ↔ 체결 데드락 예외 (통계 20회) | 20/20회 | 0/20회 |
| 예약 매도 체결 ↔ 같은 계정 즉시 매도 (20회) | 20/20회 불일치 | 해결 (회귀 테스트 통과) |
| 한 주문 예외 시 같은 종목 전체 롤백 | 재현됨 | 해결 (정상 주문은 체결, 예외 주문만 대기 유지) |

> 처리량은 측정 환경이 달라 행끼리 절대값을 비교할 수 없고, 각 행의 수정 전/후만 비교해야 한다.

즉시 매수 동시 주문 비교 (20 VU, 같은 계정, 장 시간 실측)

| 지표 | 락 없음 | 락 적용 |
|---|---|---|
| 성공 / 서버 오류 | 11 / 9 | 20 / 0 |
| 매수 이력 / 보유 수량 | 11 / 3 | 20 / 20 |
| 최종 잔고 | 99,790,000 (기대 99,230,000) | 98,600,000 (기대값 일치) |

**선택 이유와 트레이드오프**
- 비관적 락 선택: 같은 계정 안의 충돌이 짧고 드물어 대기 비용이 작고, 낙관적 락은 충돌 시 재시도 코드가 필요. 예약 체결에서 이미 같은 방식 사용
- 트레이드오프 1: 같은 계정의 동시 주문이 직렬화되어 응답 시간 증가 (p95 338ms → 466ms, 20 VU 동시 매수 1회 측정), 정합성을 우선해 수용
- 트레이드오프 2: 체결을 주문마다 새 트랜잭션으로 커밋하도록 바꾸며 병렬 처리량이 약 20~30% 감소 (같은 환경 2회 측정, 변동이 커서 근사치). 한 주문의 예외가 같은 종목의 다른 사용자 주문을 롤백하던 문제를 없애려는 선택이고, 금액이 오가는 로직이라 속도보다 안정성을 우선해 수용

# gaemiZIP 백엔드 아키텍처 학습 문서

> 작성 기준: `feature/stock-search` 브랜치 병합 완료 시점  
> 목적: Spring Boot 백엔드 전체 설계 구조와 동작 방식 이해

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [패키지 구조](#2-패키지-구조)
3. [레이어드 아키텍처](#3-레이어드-아키텍처)
4. [엔티티 설계 (DB 스키마)](#4-엔티티-설계-db-스키마)
5. [인증 시스템 (JWT)](#5-인증-시스템-jwt)
6. [실시간 주식 데이터 파이프라인](#6-실시간-주식-데이터-파이프라인)
7. [스케줄 파이프라인](#7-스케줄-파이프라인)
8. [모의매매 시스템](#8-모의매매-시스템)
9. [AI 테마 분석](#9-ai-테마-분석)
10. [뉴스 수집](#10-뉴스-수집)
11. [캔들차트 서비스](#11-캔들차트-서비스)
12. [게시판 & 댓글](#12-게시판--댓글)
13. [전체 API 목록](#13-전체-api-목록)
14. [핵심 개념 정리](#14-핵심-개념-정리)

---

## 1. 기술 스택

| 분류 | 기술 |
|------|------|
| 프레임워크 | Spring Boot 3.x |
| 언어 | Java 17 |
| ORM | Spring Data JPA (Hibernate) |
| DB | PostgreSQL 18 (Docker) |
| 캐시 | Redis (Spring Data Redis) |
| 인증 | JWT (jjwt 라이브러리) + Google OAuth 2.0 |
| HTTP 클라이언트 | WebClient (Spring WebFlux Reactive) |
| WebSocket 클라이언트 | StandardWebSocketClient (키움 연결) |
| WebSocket 서버 | Spring WebSocket (브라우저 연결) |
| AI | Google Gemini 2.5 Flash REST API |
| 뉴스 | 네이버 검색 API |
| 빌드 | Gradle |

---

## 2. 패키지 구조

```
sw.gaemiZIP/
├── gaemiZIPApplication.java     ← 진입점 (@EnableScheduling, @EnableJpaAuditing)
│
├── config/                      ← Spring 설정
│   ├── SecurityConfig.java      ← Spring Security 규칙, CORS, JWT 필터 등록
│   ├── JwtAuthenticationFilter.java  ← 요청마다 JWT 검증
│   └── WebClientConfig.java     ← WebClient Bean 등록
│
├── websocket/                   ← WebSocket 서버 (브라우저 ↔ 서버)
│   ├── WebSocketConfig.java     ← /ws 엔드포인트 등록
│   └── StockWebSocketHandler.java ← 클라이언트 연결 풀 + 브로드캐스트
│
├── entity/                      ← JPA 엔티티 (DB 테이블과 1:1 매핑)
│   ├── BaseTimeEntity.java
│   ├── MemberAnt.java           ← 회원 (잔고 포함)
│   ├── Holding.java             ← 보유 종목
│   ├── TradeHistory.java        ← 매매 이력
│   ├── Stock.java               ← 종목 마스터
│   ├── StockRanking.java        ← 거래량 순위 스냅샷
│   ├── StockInfo.java           ← 종목 상세 정보
│   ├── Board.java               ← 게시글
│   ├── Comment.java             ← 댓글
│   ├── News.java                ← 뉴스
│   └── Role.java                ← 권한 Enum (USER, ADMIN)
│
├── repository/                  ← Spring Data JPA Repository
│
├── service/                     ← 비즈니스 로직
│   ├── AuthService.java         ← 회원가입, 로그인, Google OAuth
│   ├── KiwoomTokenService.java  ← 키움 API 토큰 발급·갱신
│   ├── KiwoomRealtimeService.java ← 키움 WebSocket 연결·틱 파싱
│   ├── StockFetchService.java   ← 5초 주기 거래량 순위 폴링
│   ├── StockInfoService.java    ← 종목 상세 정보 조회
│   ├── StockSyncService.java    ← 종목 목록 DB 동기화
│   ├── ChartService.java        ← 분봉·일봉·주봉 차트 조회
│   ├── TradeService.java        ← 매수·매도 실행, 잔고·보유 관리
│   ├── NewsService.java         ← 60초 주기 네이버 뉴스 수집
│   └── AiAnalysisService.java   ← Gemini AI 테마 분석 (캐싱)
│
├── controller/                  ← REST API 엔드포인트
│   ├── AuthController.java
│   ├── StockController.java
│   ├── StockRankingController.java
│   ├── ChartController.java
│   ├── TradeController.java
│   ├── BoardController.java
│   ├── CommentController.java
│   ├── NewsController.java
│   └── AiController.java
│
├── dto/                         ← 데이터 전송 객체
│   ├── auth/                    ← 로그인·회원가입 요청/응답
│   ├── kiwoom/                  ← 키움 API 응답 파싱용
│   ├── stock/                   ← 종목·거래·보유 응답
│   ├── news/                    ← 네이버 뉴스 응답
│   └── AiThemeResponse.java
│
└── util/
    ├── JwtUtil.java             ← JWT 생성·검증·파싱
    ├── NicknameGenerator.java   ← "형용사 + 개미" 랜덤 닉네임
    └── InitialUtil.java         ← 한글 초성 추출 (종목 검색용)
```

---

## 3. 레이어드 아키텍처

Spring Boot는 **3계층 구조**를 따릅니다.

```
[HTTP 요청]
     ↓
 Controller     ← @RestController: URL 매핑, 요청/응답 직렬화
     ↓
  Service       ← @Service: 핵심 비즈니스 로직, 트랜잭션 관리
     ↓
 Repository     ← @Repository: DB 쿼리 (Spring Data JPA)
     ↓
[PostgreSQL DB]
```

### 각 계층의 역할

**Controller**
- HTTP 메서드(GET/POST 등)와 URL을 메서드에 매핑
- `@RequestBody`로 JSON 역직렬화, `ResponseEntity`로 JSON 응답
- 인증이 필요한 엔드포인트는 `Authentication` 파라미터로 현재 사용자 정보 주입

**Service**
- `@Transactional` 어노테이션으로 DB 작업을 하나의 트랜잭션으로 묶음
- 실패 시 자동 롤백
- `@Scheduled`로 주기적 작업 실행

**Repository**
- `JpaRepository<엔티티, PK타입>`을 상속
- 메서드 이름으로 SQL 자동 생성: `findByMemberIdOrderByTradeTimeDesc()` → `SELECT * FROM trade_history WHERE member_id = ? ORDER BY trade_time DESC`

---

## 4. 엔티티 설계 (DB 스키마)

### 4-1. MemberAnt (회원)

```java
@Entity
public class MemberAnt extends BaseTimeEntity {
    Long    id;          // PK, 자동 증가
    String  email;       // 로그인 ID (unique)
    String  password;    // BCrypt 암호화
    String  nickname;    // "형용사+개미" 형식
    Role    role;        // USER / ADMIN
    String  provider;    // "LOCAL" / "GOOGLE"
    String  providerId;  // Google 계정 ID
    Long    balance;     // 모의투자 잔고 (초기값 1억)
}
```

**특징:**
- `@PrePersist`: INSERT 직전 자동 실행 → `nickname`이 null이면 랜덤 생성, `balance`가 null이면 1억 설정
- `updateBalance(long delta)`: 매수(음수)/매도(양수) 시 잔고 변경
- `BaseTimeEntity`를 상속해 `createdDate`, `modifiedDate` 자동 관리

### 4-2. Holding (보유 종목)

```java
@Entity
public class Holding {
    Long    id;
    Long    memberId;    // MemberAnt의 PK (FK 역할, 명시적 @ManyToOne 없이 사용)
    String  stockCode;   // 종목코드 6자리
    String  stockName;
    int     quantity;    // 보유 수량
    long    avgPrice;    // 가중평균 매수단가
}
```

**핵심 메서드:**

```java
// 매수 시 가중평균 단가 재계산
public void addPurchase(int qty, long price) {
    long totalCost = (long) this.quantity * this.avgPrice + (long) qty * price;
    this.quantity += qty;
    this.avgPrice = totalCost / this.quantity;
}
// 예: 기존 10주@74500 + 신규 5주@76000
// totalCost = 745,000 + 380,000 = 1,125,000
// avgPrice  = 1,125,000 / 15 = 75,000

// 매도 시 수량만 감소
public void sell(int qty) { this.quantity -= qty; }
```

### 4-3. TradeHistory (거래 이력)

```java
@Entity
public class TradeHistory {
    Long          id;
    Long          memberId;      // 회원 식별 (nullable - 구버전 데이터 호환)
    String        stockCode;
    String        stockName;
    String        tradeType;     // "BUY" / "SELL"
    Integer       price;         // 체결 단가
    Integer       quantity;      // 체결 수량
    Double        profitRate;    // 수익률 (매도 시만 계산, 매수는 null)
    LocalDateTime tradeTime;     // 체결 시각 (기본값: 현재)
}
```

### 4-4. Stock (종목 마스터)

```java
@Entity
public class Stock {
    String code;     // PK: 6자리 종목코드
    String name;     // 종목명
    String initial;  // 한글 초성 (ㅅㅅㅈㅈ → 삼성전자 검색용)
    String market;   // "KOSPI" / "KOSDAQ"
}
```

### 4-5. Board / Comment (게시판)

```java
@Entity
public class Board {
    Long          id;
    String        author;      // 작성자 닉네임
    String        title;
    String        content;
    String        stockCode;   // 관련 종목 (선택)
    LocalDateTime createdAt;
    int           likeCount;
}

@Entity
public class Comment {
    Long    id;
    Long    boardId;
    String  author;
    String  content;
    int     likeCount;
}
```

### 4-6. News

```java
@Entity
public class News {
    Long   id;
    String title;
    String link;        // unique (중복 방지)
    String publisher;
    String publishDate;
    String content;     // TEXT 타입
}
```

### 4-7. 관계 다이어그램

```
MemberAnt 1 ──── N Holding       (memberId로 연결)
MemberAnt 1 ──── N TradeHistory  (memberId로 연결)
Board     1 ──── N Comment       (boardId로 연결)
Stock     1 ──── N StockRanking  (code로 연결)
```

> **참고:** 이 프로젝트는 `@ManyToOne`/`@OneToMany` 같은 JPA 연관관계 매핑 대신, **명시적 FK(Long 타입 ID 필드)**를 직접 저장하는 방식을 사용합니다. 조인이 필요할 때 서비스 코드에서 별도 조회합니다. 연관관계 매핑이 없으면 N+1 문제나 지연 로딩을 신경 쓸 필요가 없어 간단해지지만, 복잡한 조인 쿼리 최적화는 어렵습니다.

---

## 5. 인증 시스템 (JWT)

### 5-1. JWT란?

**JSON Web Token** — 서버가 발급하는 서명된 토큰. 서버가 세션을 저장하지 않아도 됩니다 (Stateless).

```
헤더.페이로드.서명
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyQGVtYWlsLmNvbSJ9.abc123
```

- **헤더**: 알고리즘 정보 (HS256)
- **페이로드**: 실제 데이터 (email, role, 만료시각)
- **서명**: 헤더+페이로드를 서버의 비밀키로 서명 → 위조 방지

### 5-2. 인증 흐름

```
[로그인 요청] POST /api/auth/login
     ↓
AuthController → AuthService.login()
     ↓
DB에서 이메일로 회원 조회
BCrypt.matches(입력 비밀번호, DB 암호화 비밀번호) 검증
     ↓
JwtUtil.generateToken(email, role)
     ↓
[응답] { token, nickname, balance }
     ↓
프론트엔드 → localStorage["gaemi_token"] 저장

[이후 모든 API 요청]
Authorization: Bearer <token>
     ↓
JwtAuthenticationFilter.doFilterInternal()
  1. 헤더에서 토큰 추출
  2. JwtUtil.validateToken() 서명 검증
  3. JwtUtil.getEmailFromToken() 이메일 추출
  4. SecurityContextHolder에 Authentication 저장
     ↓
Controller에서 Authentication.getName() → 이메일 획득
```

### 5-3. JwtUtil 주요 메서드

```java
// 토큰 생성 (로그인 성공 시)
generateToken(email, role)
  → Jwts.builder()
      .setSubject(email)    // 토큰 주인
      .claim("role", role)  // 추가 정보
      .setExpiration(...)   // 만료 시각
      .signWith(key, HS256) // HMAC-SHA256 서명
      .compact()

// 토큰 검증 (매 요청마다)
validateToken(token)
  → Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token)
  → 서명 불일치/만료 → Exception → false 반환

// 이메일 추출
getEmailFromToken(token)
  → claims.getSubject()
```

### 5-4. SecurityConfig 규칙

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**", "/ws/**", "/api/news/**", "/api/ai/**").permitAll()
    .requestMatchers("/api/stocks/search", "/api/stocks/*/price").permitAll()
    .anyRequest().authenticated()  // 그 외 모든 요청은 JWT 필요
)
```

### 5-5. Google OAuth 흐름

```
프론트엔드 → Google 로그인 버튼 클릭
     ↓
Google 인증 서버 → id_token 발급 (Google의 JWT)
     ↓
POST /api/auth/google { idToken: "..." }
     ↓
AuthService.googleLogin()
  1. GoogleIdTokenVerifier로 Google 토큰 검증
  2. 토큰에서 email, name 추출
  3. DB에서 email 조회 → 없으면 새 계정 생성 (balance=1억, 닉네임 자동)
  4. 우리 서비스 JWT 발급
     ↓
[응답] { token, nickname, balance }
```

---

## 6. 실시간 주식 데이터 파이프라인

이 프로젝트의 핵심 구조입니다. 서버가 두 WebSocket의 **중계자(Proxy)** 역할을 합니다.

### 6-1. 전체 흐름

```
[키움증권 Mock API]
wss://mockapi.kiwoom.com:10000/api/dostk/websocket
         ↓  H0STCNT0 틱 데이터 수신
KiwoomRealtimeService (서버 내부 WebSocket 클라이언트)
         ↓  파싱 후 메시지 생성
StockWebSocketHandler (서버 내부 WebSocket 서버)
         ↓  브로드캐스트
[브라우저 클라이언트들]
ws://localhost:8080/ws
```

### 6-2. KiwoomRealtimeService 상세

**연결 설정:**
```java
@EventListener(ApplicationReadyEvent.class)
public void init() {
    // 별도 데몬 스레드에서 연결 (서버 기동을 막지 않기 위해)
    Thread thread = new Thread(this::connect, "kiwoom-ws");
    thread.setDaemon(true);
    thread.start();
}
```

**종목 구독 메시지:**
```json
{
  "header": {
    "authorization": "Bearer <access_token>",
    "tr_type": "1",
    "content-type": "utf-8"
  },
  "body": {
    "input": { "tr_id": "01", "tr_key": "005930" }
  }
}
```
- `tr_type: "1"` = 구독 등록 (`"2"` = 해제)
- `tr_key` = 종목코드

**H0STCNT0 틱 데이터 파싱:**
```
수신 원문: "0|H0STCNT0|001|005930^093500^75200^2^300^1.23^...^1234567^..."
파이프(|)로 분리:
  [0] "0"
  [1] "H0STCNT0"  ← 데이터 타입
  [2] "001"
  [3] "005930^093500^75200^2^300^1.23^...^1234567^..."
          ↑        ↑      ↑   ↑    ↑
      종목코드  체결시간  현재가  등락부호  등락률

캐럿(^)으로 분리한 fields[]:
  [0]  = stockCode (종목코드)
  [1]  = cntrTm   (체결시각 HHmmss)
  [2]  = rawPrice  (현재가, 하락 시 음수)
  [3]  = sign      (1:상한 2:상승 3:보합 4:하한 5:하락)
  [5]  = rawRate   (등락률)
  [13] = volume    (누적거래량)
```

**브로드캐스트 메시지 종류:**
```
1. REALTIME_UPDATE:{"code":"005930","price":"75200","rate":"+1.49","volume":1234567}
   → 현재가·등락률 즉시 반영 (UI 숫자 갱신)

2. TICK_UPDATE:{"code":"005930","time":1234567890,"price":75200}
   → 캔들차트 현재 분봉 실시간 갱신
   → time: 해당 분의 시작 epoch seconds (KST 기준, UTC 오프셋으로 저장)
```

### 6-3. StockWebSocketHandler 상세

```java
// CopyOnWriteArrayList: 멀티스레드 환경에서 안전한 리스트
// - 읽기: 스냅샷 기반 → 락 없이 읽기 가능
// - 쓰기: 전체 배열 복사 후 수정 → 읽기 도중 수정 가능
private static final CopyOnWriteArrayList<WebSocketSession> sessions = new CopyOnWriteArrayList<>();

// 신규 클라이언트 접속 시 → 마지막 메시지 즉시 전송
// 이유: 접속 직후 화면이 비어있지 않도록
afterConnectionEstablished(session) {
    sessions.add(session);
    if (lastBroadcastMessage != null) {
        session.sendMessage(lastBroadcastMessage);
    }
}

broadcast(message) {
    lastBroadcastMessage = message;  // 캐시 갱신
    sessions.forEach(s -> s.sendMessage(message));  // 전체 전송
}
```

---

## 7. 스케줄 파이프라인

`@EnableScheduling`이 활성화되면 Spring이 스레드 풀을 생성하고 `@Scheduled` 메서드를 주기적으로 실행합니다.

### 7-1. 스케줄 목록

| 클래스 | 메서드 | 주기 | 작업 |
|--------|--------|------|------|
| `StockFetchService` | `fetchTopStocks()` | 5초마다 | 거래량 상위 10종목 조회 |
| `KiwoomTokenService` | 토큰 갱신 | 12시간마다 | 키움 OAuth 토큰 갱신 |
| `NewsService` | `fetchNews()` | 60초마다 | 네이버 뉴스 20건 수집 |
| `AiAnalysisService` | `scheduleRefresh()` | 평일 08~15시 매시 정각 | Gemini AI 테마 분석 |

### 7-2. StockFetchService 상세 동작

```
@Scheduled(fixedDelay = 5_000, initialDelay = 5_000)
fetchTopStocks():
  1. 키움 ka00198 API 호출 (거래량 상위 10종목)
     - 인증 실패(returnCode=3) → 토큰 강제 갱신 후 1회 재시도
     - 키움 서버 점검 등 HTML 응답 → Redis 캐시 폴백
  2. 결과를 Redis에 저장 (장애 대비 폴백용)
  3. DB(StockRanking 테이블)에 스냅샷 저장
  4. 메모리 캐시(currentRankings) 갱신
  5. 브라우저에 STOCK_UPDATE 브로드캐스트
  6. 새 종목코드만 키움 실시간 WebSocket 구독 추가
```

**Redis 폴백:**
- 정상 응답: Redis에 JSON 저장 → `stock:ranking:top10` 키
- 오류 발생: Redis에서 마지막 데이터 복원 → 서비스 연속성 유지

### 7-3. fixedDelay vs fixedRate

```java
@Scheduled(fixedDelay = 5_000)   // 이전 작업 완료 후 5초 후 실행 (권장)
@Scheduled(fixedRate = 5_000)    // 이전 작업과 관계없이 5초마다 실행 (중첩 위험)
@Scheduled(cron = "0 0 8-15 * * MON-FRI", zone = "Asia/Seoul")  // cron 표현식
//                 ↑ ↑  ↑      ↑   ↑     ↑
//               초 분  시(범위) 일  월   요일
```

---

## 8. 모의매매 시스템

### 8-1. 전체 흐름

```
[프론트엔드] 매수 버튼 클릭
     ↓
POST /api/trades
  Body: { stockCode, stockName, tradeType:"BUY", price, quantity }
  Header: Authorization: Bearer <JWT>
     ↓
TradeController
  Authentication.getName() → 이메일 추출
  "BUY" → tradeService.executeBuy(email, request)
     ↓
TradeService.executeBuy()
  1. memberRepo.findByEmail(email) → MemberAnt 조회
  2. 잔고 검증: balance >= price × quantity
  3. member.updateBalance(-(price × quantity)) → 잔고 차감
  4. holdingRepo.findByMemberIdAndStockCode() → 기존 보유 조회
     - 없으면 새 Holding 생성 (quantity=0, avgPrice=0)
  5. holding.addPurchase(quantity, price) → 가중평균 단가 갱신
  6. holdingRepo.save(holding)
  7. tradeHistoryRepo.save(TradeHistory{ memberId, BUY, price, qty })
  8. TradeResponse.from(history, newBalance) 반환
     ↓
[응답] { ...거래내역, newBalance: 98,867,500 }
     ↓
프론트엔드: updateBalance(newBalance), getHoldings() 재동기화
```

### 8-2. 매도 흐름

```
TradeService.executeSell()
  1. MemberAnt 조회
  2. holdingRepo.findByMemberIdAndStockCode() → 보유 확인
     - 없으면 IllegalStateException("보유하지 않은 종목")
  3. 수량 검증: holding.quantity >= request.quantity
  4. 수익률 계산:
     profitRate = (체결가 - avgPrice) / avgPrice × 100
  5. member.updateBalance(+(price × quantity)) → 잔고 증가
  6. holding.sell(quantity)
     - quantity == 0 → holdingRepo.delete() (레코드 삭제)
     - quantity > 0  → holdingRepo.save() (수량만 감소)
  7. TradeHistory 저장 (profitRate 포함)
```

### 8-3. @Transactional 동작 원리

```java
@Transactional
public TradeResponse executeBuy(String email, TradeRequest request) {
    MemberAnt member = memberRepo.findByEmail(email).orElseThrow(...);
    member.updateBalance(-totalCost);  // 엔티티 필드 수정
    // ...
}
// 메서드 종료 → Spring이 자동으로 UPDATE member_ant SET balance=? WHERE id=?
// 이것이 JPA의 "Dirty Checking" (변경 감지)
// 개발자가 save()를 명시적으로 호출하지 않아도 됨
```

**왜 @Transactional이 중요한가?**
- 잔고 차감과 거래 이력 저장이 **하나의 원자적 연산**으로 묶임
- 중간에 예외 발생 → 두 작업 모두 롤백 (데이터 일관성 보장)
- 예: 잔고는 줄었는데 거래 이력 저장 실패 → 불가능

### 8-4. 가중평균 단가 계산 예시

```
1차 매수: 10주 × 74,500원 = 745,000원
2차 매수: 5주 × 76,000원 = 380,000원

가중평균 단가 = (745,000 + 380,000) / (10 + 5)
             = 1,125,000 / 15
             = 75,000원

수익률 (현재가 77,000원 기준) = (77,000 - 75,000) / 75,000 × 100 = +2.67%
```

---

## 9. AI 테마 분석

### 9-1. 캐싱 구조

```
[문제] GET /api/ai/theme 요청마다 Gemini API 호출 → 토큰 비용 낭비
[해결] 결과를 메모리에 캐시, 특정 시간에만 갱신
```

```java
private volatile AiThemeResponse cachedTheme;

// 서버 기동 시 1회 초기화
@EventListener(ApplicationReadyEvent.class)
public void initCache() { ... }

// 평일 8~15시 매시 정각 갱신
@Scheduled(cron = "0 0 8-15 * * MON-FRI", zone = "Asia/Seoul")
public void scheduleRefresh() { ... }

// API 엔드포인트 → 캐시만 반환 (API 미호출)
public AiThemeResponse analyzeTodayTheme() {
    return cachedTheme;
}
```

**`volatile` 키워드:**
멀티스레드 환경에서 `cachedTheme`을 읽을 때 항상 메인 메모리에서 최신값을 읽도록 보장합니다. CPU 캐시를 우회해 스레드 간 가시성 문제를 방지합니다.

### 9-2. Gemini API 호출

```java
// 최신 뉴스 10건의 제목을 컨텍스트로 제공
String newsTitles = newsRepository.findTop10ByOrderByIdDesc()
    .stream().map(News::getTitle).collect(Collectors.joining("\n"));

// 프롬프트: JSON 형식으로만 응답하도록 강제
String prompt = "... 반드시 아래 JSON 형식으로만 대답하고 마크다운 코드블록은 절대 쓰지 마...";

// REST 호출
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
  ?key={GEMINI_API_KEY}
Body: { "contents": [{ "parts": [{ "text": prompt }] }] }

// 응답 파싱
rootNode → candidates[0] → content → parts[0] → text
→ 마크다운 코드블록 제거 → ObjectMapper로 AiThemeResponse 역직렬화
```

---

## 10. 뉴스 수집

```java
@Scheduled(fixedDelay = 60_000)
public void fetchNews() {
    // 네이버 검색 API: "주식" 키워드로 최신 20건 조회
    NaverNewsResponse response = webClient.get()
        .uri(".../v1/search/news.json?query=주식&display=20&sort=date")
        .header("X-Naver-Client-Id", ...)
        .retrieve()
        .bodyToMono(NaverNewsResponse.class)
        .block();

    // 중복 방지: originallink가 이미 DB에 있으면 저장 안 함
    for (NaverNewsItem item : response.items()) {
        String link = item.originallink() != null ? item.originallink() : item.link();
        if (newsRepository.existsByLink(link)) continue;  // unique 컬럼으로 중복 체크

        newsRepository.save(News.builder()
            .title(cleanHtml(item.title()))   // <b> 태그, HTML 엔티티 제거
            .link(link)
            .content(cleanHtml(item.description()))
            .publisher("네이버뉴스")
            .publishDate(item.pubDate())
            .build());
    }
}
```

---

## 11. 캔들차트 서비스

### 11-1. API 호출 구조

키움 REST API를 통해 분봉·일봉·주봉 데이터를 조회합니다.

| API ID | 용도 | 주요 파라미터 |
|--------|------|--------------|
| `ka10080` | 분봉 | `stk_cd`(종목코드), `tic_scope`(1/3/5...60) |
| `ka10081` | 일봉 | `stk_cd`, `base_dt`(기준일 YYYYMMDD) |
| `ka10082` | 주봉 | `stk_cd`, `base_dt` |

### 11-2. 시각 변환 (중요)

```
[문제] lightweight-charts는 UTC epoch seconds를 사용
       키움 API는 "20250917132000" (KST 문자열) 또는 "20250917" (날짜) 반환

[분봉 변환]
"20250917132000" → LocalDateTime.parse(...) → toEpochSecond(ZoneOffset.UTC)
→ UTC 기준 epoch이지만 값 자체는 KST 시각 (13:20:00)
→ 차트 라이브러리가 이 값을 "KST 13:20"으로 표시 (의도된 동작)

[일봉/주봉 변환]
"20250917" → LocalDate.parse(...).atStartOfDay(KST).toEpochSecond()
→ KST 자정 기준 epoch
```

### 11-3. 가격 파싱 주의사항

키움 API는 하락 시 현재가를 음수로 내려보냅니다:
```java
private double parsePrice(String val) {
    return Math.abs(Double.parseDouble(val.trim()));  // 절댓값 처리 필수
}
```

---

## 12. 게시판 & 댓글

### 12-1. 구조

```java
// 게시글 목록 조회
GET /api/boards
→ boardRepository.findAll(Sort.by(Direction.DESC, "createdAt"))

// 게시글 작성 (JWT 필요)
POST /api/boards
  Body: { title, content, stockCode?, stockName? }
  Author: Authentication.getName() (이메일) → 실제로는 닉네임 저장 권장

// 추천
POST /api/boards/{id}/like
  entity.setLikeCount(entity.getLikeCount() + 1)

// 댓글 목록
GET /api/boards/{boardId}/comments
→ commentRepository.findByBoardIdOrderByIdAsc(boardId)
```

---

## 13. 전체 API 목록

### 인증

| 메서드 | URL | 인증 | 설명 |
|--------|-----|------|------|
| POST | `/api/auth/signup` | ✗ | 로컬 회원가입 |
| POST | `/api/auth/login` | ✗ | 로그인 → JWT 반환 |
| POST | `/api/auth/google` | ✗ | Google OAuth → JWT |

### 주식

| 메서드 | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/api/stocks/search?keyword=` | ✗ | 종목명/초성 검색 |
| GET | `/api/stocks/{code}/price` | ✗ | 현재가 단건 조회 |
| GET | `/api/stocks/{code}/info` | ✓ | 종목 상세 정보 |
| GET | `/api/stocks/ranking` | ✓ | 거래량 상위 10종목 |
| GET | `/api/stocks/{code}/chart?interval=` | ✓ | 캔들차트 (1/D/W) |

### 거래

| 메서드 | URL | 인증 | 설명 |
|--------|-----|------|------|
| POST | `/api/trades` | ✓ | 매수/매도 실행 |
| GET | `/api/trades` | ✓ | 내 거래 이력 조회 |
| GET | `/api/trades/holdings` | ✓ | 내 보유 종목 조회 |

### 커뮤니티

| 메서드 | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/api/boards` | ✓ | 게시글 목록 |
| POST | `/api/boards` | ✓ | 게시글 작성 |
| GET | `/api/boards/{id}` | ✓ | 게시글 단건 |
| DELETE | `/api/boards/{id}` | ✓ | 게시글 삭제 |
| POST | `/api/boards/{id}/like` | ✓ | 추천 |
| GET | `/api/boards/{id}/comments` | ✓ | 댓글 목록 |
| POST | `/api/boards/{id}/comments` | ✓ | 댓글 작성 |
| POST | `/api/comments/{id}/like` | ✓ | 댓글 추천 |

### 뉴스 & AI

| 메서드 | URL | 인증 | 설명 |
|--------|-----|------|------|
| GET | `/api/news/latest` | ✗ | 최신 뉴스 10건 |
| GET | `/api/ai/theme` | ✗ | AI 테마 분석 (캐시) |

### WebSocket

| 엔드포인트 | 설명 |
|-----------|------|
| `ws://localhost:8080/ws` | 실시간 주가 스트림 수신 |

---

## 14. 핵심 개념 정리

### 14-1. Stateless vs Stateful

| | Stateless (이 프로젝트) | Stateful (세션 방식) |
|---|---|---|
| 서버 저장 | 토큰만 검증, 세션 저장 없음 | DB/메모리에 세션 저장 |
| 확장성 | 서버를 여러 대로 확장해도 동작 | 세션 공유 필요 |
| 인증 정보 | 토큰 자체에 포함 | 서버에서 조회 필요 |

### 14-2. WebClient vs RestTemplate

| | WebClient (이 프로젝트) | RestTemplate |
|---|---|---|
| 방식 | 비동기 논블로킹 (Reactive) | 동기 블로킹 |
| `.block()` | 동기처럼 사용할 때 명시적 대기 | 기본 동작 |
| 권장 | Spring 5+ 이후 공식 권장 | 레거시 |

> 이 프로젝트는 WebClient를 사용하지만 `.block()`을 항상 호출하므로 실질적으로는 동기 방식으로 동작합니다. 완전한 비동기를 원한다면 `.subscribe()` 또는 반환 타입을 `Mono<T>`로 변경해야 합니다.

### 14-3. CopyOnWriteArrayList vs ArrayList

```java
// ArrayList: 멀티스레드 환경에서 ConcurrentModificationException 발생 가능
// - 스레드A가 읽는 중에 스레드B가 요소 추가 → 충돌

// CopyOnWriteArrayList: 쓰기 시 배열 전체를 복사
// - 읽기 스레드는 기존 배열 스냅샷을 그대로 사용
// - 쓰기(add/remove)는 새 복사본에 적용
// - 읽기가 많고 쓰기가 드문 WebSocket 세션 관리에 적합
```

### 14-4. volatile 키워드

```java
private volatile String accessToken;  // KiwoomTokenService
private volatile AiThemeResponse cachedTheme;  // AiAnalysisService
```

- 여러 스레드가 같은 변수를 읽고 쓸 때 CPU 레지스터/캐시 대신 **항상 메인 메모리**에서 읽도록 강제
- 스케줄 스레드가 값을 업데이트 → 다른 스레드(HTTP 요청 처리 스레드)가 즉시 최신값 확인 가능

### 14-5. @EventListener(ApplicationReadyEvent.class)

```java
@EventListener(ApplicationReadyEvent.class)
public void init() { ... }
```

- `@PostConstruct`: 빈(Bean) 초기화 직후 실행 → 서버 완전 기동 전
- `ApplicationReadyEvent`: 서버가 완전히 기동되고 HTTP 요청을 받을 수 있는 상태가 된 후 실행
- 키움 WebSocket 연결, AI 캐시 초기화처럼 서버 기동 후 즉시 수행해야 할 작업에 적합

### 14-6. Dirty Checking (변경 감지)

```java
@Transactional
public void someMethod() {
    MemberAnt member = memberRepo.findById(1L).get();  // 영속 상태
    member.updateBalance(-10000);  // 필드 값만 변경
    // memberRepo.save(member) 호출 없음!
    // 트랜잭션 종료 시 JPA가 변경을 감지하고 자동으로 UPDATE SQL 실행
}
```

JPA는 트랜잭션 시작 시 엔티티의 초기 상태를 스냅샷으로 기억합니다. 트랜잭션 종료 시 현재 상태와 비교해 변경된 필드만 UPDATE합니다.

---

*이 문서는 gaemiZIP 프로젝트 백엔드 학습을 위해 작성되었습니다.*

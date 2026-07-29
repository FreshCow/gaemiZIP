# 🐜 gaemiZIP — Server

> 키움증권 모의투자 API 기반 실시간 주식 거래 시뮬레이션 서버

개인 투자자(개미)를 위한 실시간 주식 데이터 조회, 모의 매매, AI 테마 분석, 커뮤니티 기능을 제공하는 Spring Boot 백엔드입니다.

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| Framework | Spring Boot 4.0.2 · Java 21 |
| Security | Spring Security · JWT (JJWT 0.11.5) · Google OAuth 2.0 |
| DB | PostgreSQL 18 · Spring Data JPA / Hibernate |
| 실시간 통신 | Spring WebSocket (STOMP-less, Raw TextWebSocketHandler) |
| HTTP Client | Spring WebFlux (WebClient) |
| AI | Google Gemini 2.5 Flash API |
| 뉴스 | Naver Search API |
| 주식 데이터 | 키움증권 Open API+ (모의투자) |
| 인프라 | Docker Compose (PostgreSQL) |
| 빌드 | Gradle 8 |

---

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        External APIs                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │   Kiwoom API │  │  Naver API   │  │  Gemini 2.5 Flash │  │
│  │  (모의투자)  │  │  (뉴스검색)  │  │    (AI 분석)      │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
└─────────┼─────────────────┼───────────────────┼─────────────┘
          │ WSS              │ HTTP               │ HTTP
          ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Spring Boot Server                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Scheduled Tasks                        │   │
│  │  · fetchTopStocks()   ── 5초마다  ── 주식 랭킹 갱신 │   │
│  │  · fetchNews()        ── 60초마다 ── 뉴스 수집·저장 │   │
│  │  · refreshToken()     ── 12시간   ── 키움 토큰 갱신 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐   ┌──────────────────────────┐   │
│  │  KiwoomRealtimeService│   │   REST Controllers       │   │
│  │  (WebSocket Client)  │   │   /api/auth              │   │
│  │                      │   │   /api/stocks            │   │
│  │  Kiwoom WSS ──────►  │   │   /api/trades            │   │
│  │  H0STCNT0 파싱      │   │   /api/boards            │   │
│  │  현재가·등락률·거래량 │   │   /api/news              │   │
│  └──────────┬───────────┘   │   /api/ai                │   │
│             │ broadcast      └──────────────────────────┘   │
│             ▼                                               │
│  ┌──────────────────────┐   ┌──────────────────────────┐   │
│  │ StockWebSocketHandler │   │    PostgreSQL (JPA)      │   │
│  │  connected clients   │   │  member_ant / board      │   │
│  │  lastBroadcastMsg    │   │  comment / trade_history │   │
│  └──────────┬───────────┘   │  stock_ranking / news    │   │
│             │                └──────────────────────────┘   │
└─────────────┼───────────────────────────────────────────────┘
              │ WS (/ws)
              ▼
     ┌─────────────────┐
     │  Next.js Client │
     │  (Frontend)     │
     └─────────────────┘
```

---

## 핵심 구동 원리

### 1. 서버 기동 시퀀스

서버가 시작되면 `ApplicationReadyEvent`를 수신해 아래 순서로 초기화됩니다.

```
① KiwoomTokenService
   └─ POST /oauth2/token (App Key + Secret)
   └─ 액세스 토큰 발급 → 메모리 저장
   └─ POST /oauth2/Approval (approval_key 발급) → WebSocket 인증용

② KiwoomRealtimeService
   └─ wss://mockapi.kiwoom.com:10000/api/dostk/websocket 연결 (별도 daemon thread)
   └─ 상위 10개 종목 구독 JSON 전송
   └─ H0STCNT0 tick 데이터 수신 시작

③ Scheduled Tasks 활성화
   └─ 5초 / 60초 / 12시간 주기로 폴링 시작
```

---

### 2. 실시간 주식 데이터 흐름 (핵심)

이 서버의 가장 중요한 구조입니다.  
**키움 WebSocket → 서버 파싱 → 프론트 브로드캐스트** 이중 WebSocket 구조입니다.

```
[키움 모의투자 서버]
      │
      │  wss:// (H0STCNT0 포맷)
      │  "0|H0STCNT0|001|종목코드^체결시간^현재가^등락률^거래량..."
      ▼
[KiwoomRealtimeService] ← Spring의 WebSocketClient로 연결 유지
      │  pipe(|) 분리 → 필드 파싱
      │  종목코드, 현재가, 등락률, 거래량, 체결시간 추출
      │
      ├─► REALTIME_UPDATE 메시지 생성
      │     { type, code, price, rate, volume }
      │     → StockWebSocketHandler.broadcast()
      │
      └─► TICK_UPDATE 메시지 생성
            { type, code, time(epoch), price }
            → StockWebSocketHandler.broadcast()
            → 프론트에서 분봉 차트 실시간 업데이트

[StockWebSocketHandler]
      │  CopyOnWriteArrayList<WebSocketSession> 관리
      │  신규 접속자 → lastBroadcastMessage 즉시 전송 (catch-up)
      │  전체 세션 순회 → 동시 브로드캐스트
      ▼
[Next.js Frontend] /ws 엔드포인트로 수신
```

> **설계 포인트:** 서버가 키움과 프론트 사이에서 **메시지 허브** 역할을 합니다.  
> 키움 → 서버는 외부 WebSocket 클라이언트, 서버 → 프론트는 WebSocket 서버로 동작하여  
> 클라이언트가 키움 API 인증 없이 실시간 데이터를 수신할 수 있습니다.

---

### 3. 인증 구조 (JWT + Google OAuth)

```
[로컬 회원가입]                    [구글 OAuth]
  email + password                  Google ID Token
       │                                 │
       ▼                                 ▼
  BCrypt 해시 저장              GoogleIdTokenVerifier 검증
  닉네임 자동 생성                신규 유저면 DB 자동 등록
  (형용사 + 개미 조합)            초기 잔고: 100,000,000원
       │                                 │
       └──────────────┬──────────────────┘
                      ▼
              JWT 발급 (HS256)
              payload: { sub: email, role: USER }
              만료: 24시간
                      │
                      ▼
              { token, nickname, balance } 응답

[이후 모든 요청]
  Authorization: Bearer <token>
       │
       ▼
  JwtAuthenticationFilter (OncePerRequestFilter)
  └─ 토큰 파싱 → email 추출
  └─ SecurityContextHolder에 Authentication 등록
  └─ 이후 Controller에서 인가 처리

[인증 불필요 경로]
  /api/auth/**  /ws/**  /api/news/**  /api/ai/**
```

---

### 4. AI 테마 분석 흐름 (Gemini 연동)

```
[NewsService] 60초마다 Naver API 호출
    │ 최신 뉴스 20건 수집 → DB 저장 (중복 링크 제외)

[AiAnalysisService] GET /api/ai/theme 요청 시
    │
    ├─ DB에서 최신 뉴스 제목 10건 추출
    │
    ├─ Gemini 2.5 Flash API 호출
    │   Prompt: "퀀트 애널리스트로서 오늘의 시장 테마를 분석하고
    │            키워드 3개와 관련 종목 3개씩 JSON으로 반환"
    │
    └─ 응답 파싱 → { themes: [{ keyword, stocks: [{ name, code, predictedRate }] }] }
                   → 프론트로 반환
```

---

### 5. 스케줄 작업 요약

| 메서드 | 주기 | 동작 |
|---|---|---|
| `StockFetchService.fetchTopStocks()` | **5초** | 키움 ka00198 API → 거래량 상위 10종목 조회 → DB upsert |
| `NewsService.fetchNews()` | **60초** | Naver 뉴스 API → 주식 관련 최신 20건 → 중복 제거 후 DB 저장 |
| `KiwoomTokenService.scheduledTokenRefresh()` | **12시간** | 키움 액세스 토큰 갱신 (만료 전 자동 재발급) |

---

## API 엔드포인트

### 인증 `/api/auth`

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/auth/signup` | ✗ | 로컬 회원가입 |
| POST | `/api/auth/login` | ✗ | 로컬 로그인 → JWT 반환 |
| POST | `/api/auth/google` | ✗ | 구글 OAuth 로그인 |

### 주식 `/api/stocks`

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/stocks/ranking` | ✓ | 거래량 상위 10종목 (캐시) |
| GET | `/api/stocks/{code}/chart?interval=` | ✓ | 캔들 차트 (1·3·5·10·15·30·45·60분·D·W) |

### 거래 `/api/trades`

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/trades` | ✓ | 매수·매도 체결 기록 저장 |
| GET | `/api/trades` | ✓ | 내 거래 이력 조회 |

### 게시판 `/api/boards`

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/boards` | ✓ | 게시글 목록 (최신순) |
| POST | `/api/boards` | ✓ | 게시글 작성 |
| GET | `/api/boards/{id}` | ✓ | 게시글 단건 조회 |
| POST | `/api/boards/{id}/like` | ✓ | 게시글 추천 |
| DELETE | `/api/boards/{id}` | ✓ | 게시글 삭제 |
| GET | `/api/boards/{boardId}/comments` | ✓ | 댓글 목록 조회 |
| POST | `/api/boards/{boardId}/comments` | ✓ | 댓글·대댓글 작성 |
| POST | `/api/comments/{id}/like` | ✓ | 댓글 좋아요 |

### 뉴스·AI `/api/news` `/api/ai`

| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/news/latest` | ✗ | 최신 뉴스 10건 |
| GET | `/api/ai/theme` | ✗ | Gemini AI 시장 테마 분석 |

---

## DB 테이블 구조

```
member_ant     ── 사용자 (email, nickname, balance, role, password)
stock_ranking  ── 실시간 주식 순위 캐시 (code, name, price, changeRate, volume)
trade_history  ── 매매 기록 (userId, stockCode, price, quantity, tradeType, profitRate)
news           ── 뉴스 캐시 (title, link, publisher, publishDate, content)
board          ── 게시글 (author, title, content, likeCount)
comment        ── 댓글·대댓글 (boardId, parentCommentId, author, content, likeCount)
```

---

## 로컬 실행 방법

### 1. DB 실행 (Docker)

```bash
docker-compose up -d
```

`scalper_db` PostgreSQL 컨테이너가 `localhost:5432`에 올라갑니다.

### 2. 환경 변수 설정

`application.properties` 또는 IDE 환경 변수에 아래 값을 설정합니다.

```properties
# 키움 Open API+
KIWOOM_APP_KEY=발급받은_앱키
KIWOOM_APP_SECRET=발급받은_시크릿

# Naver Search API
NAVER_CLIENT_ID=발급받은_클라이언트_ID
NAVER_CLIENT_SECRET=발급받은_시크릿

# Google Gemini API
GEMINI_API_KEY=발급받은_API_키

# JWT
JWT_SECRET=임의의_시크릿_문자열
```

### 3. 서버 실행

```bash
./gradlew bootRun
```

서버가 기동되면 자동으로 키움 WebSocket에 연결하고 실시간 데이터 수신을 시작합니다.

---

## 프로젝트 구조

```
src/main/java/sw/gaemiZIP/
├── config/
│   ├── SecurityConfig.java          # Spring Security · CORS 설정
│   ├── JwtAuthenticationFilter.java # JWT 요청 필터
│   └── WebClientConfig.java         # WebClient Bean 설정
├── controller/                      # REST API 엔드포인트
├── service/
│   ├── KiwoomTokenService.java      # 키움 OAuth 토큰 발급·갱신
│   ├── KiwoomRealtimeService.java   # 키움 WebSocket 클라이언트 (실시간 파싱)
│   ├── StockFetchService.java       # 주식 랭킹 스케줄 수집
│   ├── ChartService.java            # 캔들 차트 조회
│   ├── NewsService.java             # 뉴스 스케줄 수집
│   ├── AiAnalysisService.java       # Gemini AI 연동
│   └── AuthService.java             # 회원가입·로그인
├── entity/                          # JPA 엔티티
├── repository/                      # Spring Data JPA 인터페이스
├── dto/                             # 요청·응답 DTO
├── websocket/
│   ├── StockWebSocketHandler.java   # 프론트 WebSocket 서버 (브로드캐스트)
│   └── WebSocketConfig.java         # /ws 경로 등록
└── util/
    ├── JwtUtil.java                 # JWT 발급·검증
    └── NicknameGenerator.java       # 랜덤 닉네임 생성
```

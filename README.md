# gaemiZIP 🐜

> 키움증권 모의투자 API 기반 실시간 주식 거래 시뮬레이션 플랫폼

개인 투자자("개미")를 위한 실시간 시세, 모의 매매, AI 시장 테마 분석, 커뮤니티 기능을 제공하는
풀스택 프로젝트입니다. **키움 실시간 WebSocket 연동 안정화, DB 레이스 컨디션 재현·해결, 인증/위조
보안 취약점 수정** 등 실제로 부딪히고 고친 문제들을 다루는 데 초점을 맞췄습니다.

**🔗 배포**: [프론트(Vercel)](https://gaemi-zip.vercel.app) · [백엔드(Render)](https://gaemizip-server.onrender.com)
> 백엔드는 무료 티어라 15분 미접속 시 슬립 상태가 됩니다 — 첫 접속 시 콜드스타트로 30~60초 정도 걸릴 수 있습니다.

---

## 기술적 도전과 해결

단순 CRUD가 아니라 실제로 막혔다가 원인을 추적해 해결한 사례들입니다. 전체 기록은
[`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) · [`server/BENCHMARK.md`](./server/BENCHMARK.md) 참고.

### 1. 키움 실시간 WebSocket, 처음부터 한 번도 정상 동작한 적이 없었다
"장중인데 예약 매도가 체결되지 않는다"는 증상으로 시작해 추적한 결과, 지금까지의 "실시간 반영
확인 완료"가 전부 가짜 데이터(`simulateTick()`)로만 검증된 것이었음을 발견했습니다. 공식 문서가
없어 키움 공식 GitHub SDK 소스를 직접 읽어 LOGIN/REG 프로토콜을 확인하는 것부터, 재연결 오판·
PING 미응답·rate limit·잘못된 REAL 데이터 포맷 가정·다종목 폭주 시 버퍼 초과 연결 끊김·세션
동시 쓰기 충돌·브로드캐스트 블로킹으로 인한 write timeout까지, **겹쳐 있던 버그 9개**를 하나씩
벗겨내며 실제 정규장 데이터로 안정화했습니다.
→ [상세 기록](./TROUBLESHOOTING.md#키움-실시간-websocket-연동)

### 2. 동시성 레이스 컨디션 재현율 100% → 0%, 처리량은 8.3배
예약 주문 체결(`ReservationService`)을 종목코드 단위로 병렬화하면 처리량이 얼마나 개선되고,
대가로 무엇이 깨지는지 직접 벤치마크·재현했습니다. "잔고 lost update"라는 가설을 세웠지만 실제
재현 결과는 더 복합적이었습니다 — 최초 매수 시 `Holding` 중복 INSERT로 인한 예외 100% 발생,
기존 보유 종목 매수 시 거래이력·알림이 4배로 중복 생성되는 문제(잔고 숫자만 우연히 맞아떨어져
눈에 안 보이던 버그)까지 두 가지 결함을 20회 반복 재현으로 확정. `SELECT ... FOR UPDATE` 기반
종목코드 단위 비관적 락 하나로 두 결함을 동시에 해결하면서도, 병렬 처리량 개선(8.18배)은 그대로
유지되는 것까지 확인했습니다. 다만 운영 코드(`KiwoomRealtimeService`)는 키움 실시간 WS 세션이
하나뿐이라 모든 틱이 자연스럽게 한 스레드에서 순차 처리되어 이 레이스 컨디션 자체가 발생하지
않는 구조입니다 — 종목코드 파티셔닝 병렬화는 "틱 볼륨이 늘어나면 필요해질 수 있는 확장 방안"을
사전 검증한 것이라, 지금은 벤치마크/락 인프라만 갖춰두고 실제 병렬 처리 전환은 하지 않았습니다.
→ [상세 기록](./server/BENCHMARK.md)

### 3. 인증/위조 보안 취약점 3건
- 게시글 삭제가 로그인 여부조차 확인하지 않아 **누구나 타인의 글을 삭제**할 수 있었던 문제
- 게시글/댓글 작성 시 클라이언트가 보낸 `author` 값을 그대로 신뢰해 **작성자를 위조**할 수 있었던 문제
- 실시간 시세 검증용으로 만들어둔 **무인증 디버그 엔드포인트**(가격 조작 가능)가 실전 코드에 남아있던 문제

전부 JWT 기반 로그인 인증·본인확인(`memberId` 비교)으로 전환하고, 디버그 엔드포인트는 검증 완료 후 제거했습니다.
→ [상세 기록](./TROUBLESHOOTING.md#게시글-작성삭제-보안)

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
│  │ KiwoomRealtimeService │   │   REST Controllers       │   │
│  │  (WebSocket Client)  │   │   /api/auth  /api/stocks  │   │
│  │  Kiwoom WSS ──────►  │   │   /api/trades /api/boards │   │
│  │  LOGIN→REG→REAL 파싱 │   │   /api/favorites /admin   │   │
│  │  0B(체결)/0D(호가)   │   │   /api/notifications ...  │   │
│  └──────────┬───────────┘   └──────────────────────────┘   │
│             │ broadcast                                     │
│             ▼                                               │
│  ┌──────────────────────┐   ┌──────────────────────────┐   │
│  │ StockWebSocketHandler │   │  PostgreSQL (JPA) + Redis│   │
│  │  connected clients   │   │  member/board/trade/...  │   │
│  │  lastBroadcastMsg    │   │  (랭킹·지수는 Redis 캐시) │   │
│  └──────────┬───────────┘   └──────────────────────────┘   │
└─────────────┼───────────────────────────────────────────────┘
              │ WS (/ws)
              ▼
     ┌─────────────────┐
     │  Next.js Client │
     └─────────────────┘
```

**설계 포인트**: 서버가 키움과 프론트 사이에서 **메시지 허브** 역할을 합니다. 키움 → 서버는 외부
WebSocket 클라이언트, 서버 → 프론트는 WebSocket 서버로 동작해, 클라이언트가 키움 API 인증 없이도
실시간 데이터를 수신할 수 있습니다.

### 실시간 데이터 흐름

```
[키움 모의투자 서버]
      │ wss:// LOGIN → REG(종목 배치 구독)
      │ REAL 이벤트: {"trnm":"REAL","data":[{"type":"0B","item":"005930","values":{...}}]}
      ▼
[KiwoomRealtimeService]
      │  type "0B"(체결) → processTick()  → REALTIME_UPDATE / TICK_UPDATE 브로드캐스트
      │  type "0D"(호가) → processQuote() → QUOTE_UPDATE 브로드캐스트
      ▼
[StockWebSocketHandler] — 세션 풀 관리, 신규 접속자에게 lastBroadcastMessage 즉시 전송(catch-up)
      ▼
[Next.js] /ws 수신 → rAF로 프레임당 1회 코얼레싱 후 반영(고빈도 틱 렌더 폭주 방지)
```

---

## 기술 스택

| 분류 | 기술 |
|---|---|
| Backend | Spring Boot 4.0.2 · Java 21 · Gradle 8 |
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript |
| Security | Spring Security · JWT (JJWT 0.11.5) · Google OAuth 2.0 |
| DB / Cache | PostgreSQL 18 · Spring Data JPA/Hibernate · QueryDSL 5 · Redis |
| 실시간 통신 | Spring WebSocket (Raw TextWebSocketHandler) · 클라이언트 rAF 배치 렌더링 |
| 상태관리 | Zustand · TanStack React Query |
| 차트 | lightweight-charts · Recharts |
| UI | Tailwind CSS 4 · shadcn (base-ui) |
| HTTP Client | Spring WebFlux WebClient · Axios |
| 외부 API | 키움증권 Open API+(모의투자) · Google Gemini 2.5 Flash · Naver 뉴스 검색 |
| 인프라 | Docker Compose · Vercel(FE) · Render(BE) · Neon(Postgres) · Upstash(Redis) |

---

## 핵심 기능

- **실시간 시세/차트** — 키움 WS 체결(0B)·호가(0D) 실시간 반영, 캔들 차트(1~60분·D·W), 코스피/코스닥/코스피200 지수
- **모의 매매** — 즉시 체결 매수/매도, 지정가 예약 주문(현재가 도달 시 자동 체결) + 체결 알림(토스트/벨/로그)
- **호가창** — 매수/매도 10단계 잔량, 클릭 시 주문가 자동입력
- **관심종목(즐겨찾기)** — 계정 기반 저장, 다른 기기에서도 동기화
- **AI 시장 분석** — 최신 뉴스 기반 Gemini 시장 테마·종목 분석
- **커뮤니티** — 게시판(태그/인기글/보유종목 공유) + 댓글/대댓글, 추천 1인 1회 토글
- **관리자 모드** — 회원 정지, 콘텐츠 블라인드, 잔고/거래 보정 + 감사 로그, 가입·거래량 통계

---

## API 목록

<details>
<summary>전체 엔드포인트 펼치기</summary>

### 인증 `/api/auth`
| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| POST | `/signup` | ✗ | 회원가입 (닉네임 자동 생성, 초기 잔고 1억) |
| POST | `/login` | ✗ | 로컬 로그인 → JWT |
| POST | `/google` | ✗ | 구글 OAuth 로그인 |
| POST | `/find-password` | ✗ | 비밀번호 찾기(보안코드 검증) |
| POST | `/verify-security-code` | ✗ | 보안코드 검증 |
| POST | `/verify-password` | ✓ | 비밀번호 재확인 |
| DELETE | `/me` | ✓ | 회원 탈퇴 |

### 주식 `/api/stocks`
| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/search?keyword=` | ✓ | 종목명 검색 |
| GET | `/{code}/info` | ✓ | 종목 기본정보(ka10001) |
| GET | `/{code}/price` | ✓ | 현재가 (Redis 캐시 우선) |
| GET | `/{code}/chart?interval=` | ✓ | 캔들 차트 |
| GET | `/{code}/news` | ✓ | 종목 관련 뉴스 |
| POST | `/{code}/subscribe` | ✗ | 실시간 구독 온디맨드 편입 |
| GET | `/{code}/quote` | ✓ | 호가창 초기 스냅샷 |
| GET | `/ranking` | ✓ | 거래량 상위 10종목 |
| GET | `/index` | ✓ | 코스피·코스닥·코스피200 지수 |

### 즐겨찾기 `/api/favorites`
| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/` | ✓ | 내 관심종목 목록 |
| POST | `/{code}` | ✓ | 관심종목 추가 |
| DELETE | `/{code}` | ✓ | 관심종목 제거 |

### 거래 `/api/trades`
| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| POST | `/` | ✓ | 매수/매도 즉시 체결 |
| GET | `/` | ✓ | 내 거래이력 전체 |
| GET | `/paged?page=&size=` | ✓ | 거래이력 페이지네이션 |
| GET | `/holdings` | ✓ | 보유 종목 |
| POST | `/reserve` | ✓ | 지정가 예약 주문 생성 |
| GET | `/reserve` | ✓ | 내 예약 목록 + 잔고 |
| DELETE | `/reserve/{id}` | ✓ | 예약 취소 |

### 게시판 `/api/boards`, `/api/comments`
| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/boards?tag=` | ✗ | 게시글 목록 |
| GET | `/api/boards/{id}` | ✗ | 게시글 단건 |
| GET | `/api/boards/popular?days=` | ✗ | 인기글 |
| POST | `/api/boards` | ✓ | 게시글 작성 |
| PUT | `/api/boards/{id}` | ✓ | 게시글 수정 (본인만) |
| DELETE | `/api/boards/{id}` | ✓ | 게시글 삭제 (본인만) |
| POST | `/api/boards/{id}/like` | ✓ | 추천 토글 |
| GET | `/api/boards/{boardId}/comments` | ✗ | 댓글 목록 |
| POST | `/api/boards/{boardId}/comments` | ✓ | 댓글/대댓글 작성 |
| POST | `/api/comments/{id}/like` | ✓ | 댓글 추천 토글 |

### 알림 `/api/notifications`
| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/` | ✓ | 알림 목록(페이징) |
| GET | `/unread-count` | ✓ | 안읽음 개수 |
| PATCH | `/{id}/read` | ✓ | 개별 읽음 처리 |
| PATCH | `/read-all` | ✓ | 전체 읽음 처리 |

### 뉴스·AI
| Method | Endpoint | 인증 | 설명 |
|---|---|---|---|
| GET | `/api/news/latest?page=&size=` | ✗ | 최신 뉴스 |
| GET | `/api/ai/theme` | ✗ | Gemini 시장 테마 분석 |
| GET | `/api/ai/stock/{code}` | ✗ | Gemini 종목 분석 |

### 관리자 `/admin` (ADMIN 권한 필요)
| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/members` | 회원 목록 |
| PATCH | `/members/{id}/status` | 회원 정지/해제 |
| PATCH | `/members/{id}/balanceAdjust` | 잔고 조정 |
| GET | `/trades` | 전체 거래내역 |
| DELETE | `/trades/{id}` | 거래 삭제(보정) |
| GET | `/audit-logs` | 감사 로그 |
| PATCH | `/board/{id}/blind`, `/comment/{id}/blind` | 콘텐츠 블라인드 |
| GET | `/boards`, `/boards/{boardId}/comments` | 콘텐츠 전체 조회(블라인드 포함) |
| GET | `/stats/signup-trend?days=`, `/stats/trade-volume?days=` | 통계 |

### WebSocket
| 경로 | 설명 |
|---|---|
| `/ws` | 실시간 스트림 — `REALTIME_UPDATE` / `TICK_UPDATE` / `QUOTE_UPDATE` / `INDEX_UPDATE` / `STOCK_UPDATE` |

</details>

---

## 로컬 실행 방법

### 1. 백엔드
```bash
cd server
docker-compose up -d          # PostgreSQL + Redis
./gradlew bootRun             # localhost:8080
```
`application-local.yml`(미커밋)에 키움/네이버/Gemini API 키, JWT 시크릿, Google Client ID 필요 — 자세한 목록은 하단 참고.

### 2. 프론트엔드
```bash
cd web
npm install
npm run dev                   # localhost:3000
```
`.env.local`에 `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` 필요.

---

## 프로젝트 구조

```
gaemiZIP/
├── server/                    # Spring Boot 백엔드
│   └── src/main/java/sw/gaemiZIP/
│       ├── config/            # Security, JWT 필터, WebClient, WebSocket 등록
│       ├── controller/        # admin / ai / auth / board / news / stock / notification
│       ├── service/           # 동일 도메인 구조
│       ├── entity/            # JPA 엔티티
│       ├── repository/        # Spring Data JPA / QueryDSL
│       ├── dto/                # 요청·응답 DTO
│       ├── websocket/         # StockWebSocketHandler, WebSocketConfig
│       └── util/               # JwtUtil, NicknameGenerator
├── web/                        # Next.js 프론트엔드
│   └── src/
│       ├── app/                # App Router 페이지
│       ├── components/         # layout / chart / stock / board / ui
│       ├── services/            # 도메인별 axios 클라이언트
│       ├── hooks/useWebSocket   # WS 연결 + rAF 배치 렌더링
│       └── store/                # Zustand
├── TROUBLESHOOTING.md          # 증상 → 원인 → 해결 기록
└── server/BENCHMARK.md         # 동시성/처리량 벤치마크 기록
```

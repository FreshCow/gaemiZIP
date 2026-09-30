# 🐜 gaemiZIP

> 키움증권 모의투자 API 기반 실시간 주식 거래 시뮬레이션 플랫폼

개인 투자자("개미")를 위한 실시간 시세·모의 매매·커뮤니티·AI 시장 분석을 제공하는 1인 풀스택 프로젝트입니다.
백엔드 설계·구현·인프라를 전담했고, 프론트엔드는 AI 도구로 구현 후 직접 검증·수정했습니다.

<img src="docs/stocksPage_60.gif" alt="종목상세 페이지 — 실시간 시세/호가/AI 종목 분석" width="900" />

**배포**: [프론트(Vercel)](https://gaemi-zip.vercel.app) · [백엔드(Render)](https://gaemizip-server.onrender.com)
> 백엔드는 무료 티어라 15분 미접속 시 슬립 상태가 됩니다 — 첫 접속 시 콜드스타트로 30~60초 정도 걸릴 수 있습니다.

---
## 🛠️ 기술 스택

| 구분 | 스택 |
|---|---|
| 백엔드 | Java 21, Spring Boot 4.0.2, Spring Security + JWT, Spring Data JPA + QueryDSL 5, Spring WebSocket, WebFlux(WebClient), Bucket4j |
| 프론트엔드 | Next.js 16 (App Router) + React 19, TypeScript, Tailwind CSS 4, Zustand, TanStack React Query, lightweight-charts |
| 데이터베이스 | PostgreSQL 18, Redis |
| 인프라 | Docker Compose, GitHub Actions |
| 테스트/부하검증 | JUnit 5, k6 |
| 외부 연동 | 키움증권 Open API+(모의투자, WebSocket/REST), Google Gemini 2.5 Flash, 네이버 뉴스 검색 API, Google OAuth 2.0 |

---
## 🚀 트러블 슈팅

###  1. 외부 API 연동 시 캐시 스탬피드 현상 및 429 에러 이슈

- **증상**: 종목 상세 페이지 진입 시 간헐적으로 데이터를 불러오지 못하고 에러가 발생하며 새로고침 시에만 정상 작동함
<br><br/>
- **원인**: 콜드 캐시 상태에서 다수의 API가 동시에 외부 API를 호출하여 중복 요청이 발생함, 이로 인해 외부 API 계정 전역의 호출 횟수 제한(429 Too Many Requests)에 걸려 조회가 실패함
<br><br/>
- **해결**: `ConcurrentHashMap`과 `CompletableFuture`를 활용하여 종목코드 단위로 진행 중인 요청을 병합(in-flight de-dup)하도록 로직을 개선함
<br><br/>
- **결과**: 최초 1회만 외부 API를 호출하고 나머지 요청은 진행 중인 결과를 공유하게 되어 429 에러를 방지하고 불필요한 네트워크 호출 부하를 최적화함


### 2. 실시간 시세 WebSocket 동시 쓰기 충돌 및 스레드 블로킹 해결

- **증상**: 다종목 동시 구독 시 실시간 틱 데이터가 일부 유실되거나(`TEXT_PARTIAL_WRITING`), 응답 없는 세션 하나로 인해 다른 클라이언트들의 전송까지 타임아웃(`Write timeout`)되는 현상이 발생함[cite: 1].
  <br><br/>
- **원인**: 여러 I/O 스레드가 동기화 없이 같은 세션에 동시에 쓰기를 시도해 WebSocket API 예외가 발생함[cite: 1]. 또한, 순차적 블로킹 방식으로 브로드캐스트가 진행되어 특정 세션의 지연이 전체 서버 스레드를 막음[cite: 1].
  <br><br/>
- **해결**: `session.sendMessage()` 호출을 `synchronized(session)`으로 감싸 세션 단위 쓰기를 직렬화함[cite: 1]. 브로드캐스트 작업은 `Executors.newCachedThreadPool()`을 통해 비동기로 분리하고 예외 발생 시 좀비 세션을 즉시 제거하도록 처리함[cite: 1].
  <br><br/>
- **결과**: 세션 간 전송이 독립적으로 분리되어 하나의 지연이 시스템 전체에 영향을 주지 않게 되었으며, 고부하 환경에서도 실시간 데이터 스트리밍의 안정성 및 처리량이 대폭 향상됨[cite: 1].



### 3. Spring Data JPA 파생 쿼리 해석 오류 및 403 예외 은닉 해결

- **증상**: 순수 스칼라 컬럼을 `@ManyToOne` 연관 관계로 리팩터링한 후, 인가 설정이 전체 허용(`permitAll`)된 엔드포인트임에도 호출 시 403 Forbidden 에러가 발생함[cite: 1].
  <br><br/>
- **원인**: 하위 호환을 위해 유지한 `getBoardId()` 편의 메서드를 Spring Data JPA가 실제 프로퍼티로 오인, 잘못된 JPQL을 생성하여 내부적으로 파싱 에러(500)가 발생함[cite: 1]. 이 예외가 Spring Security의 `ExceptionTranslationFilter`를 거치며 403 에러로 감춰짐[cite: 1].
  <br><br/>
- **해결**: 해당 컬럼을 참조하는 리포지토리 파생 쿼리 메서드명을 `findAllByBoard_Id`와 같이 언더스코어(`_`)를 명시해 중첩 경로임을 프레임워크에 정확히 전달하도록 수정함[cite: 1].
  <br><br/>
- **결과**: 런타임 시점의 쿼리 파싱 오류가 해결되어 정상 응답(200)을 반환하게 됨[cite: 1].

---

## ✨ 핵심 기능

- **실시간 시세/차트**: 키움 WebSocket 체결·호가 실시간 반영, 캔들 차트(1~60분·D·W), 코스피/코스닥/코스피200 지수
- **모의 매매**: 즉시 체결 매수/매도, 지정가 예약 주문(현재가 도달 시 자동 체결) + 체결 알림
- **인증**: JWT 기반 인증 + Google OAuth, 신규 가입 시 1억 원 초기 잔고와 랜덤 닉네임 자동 부여
- **커뮤니티**: 게시판(태그·인기글·보유종목 공유) + 댓글/대댓글, 추천 1인 1회 제한
- **AI 시장 분석**: 최신 뉴스 기반 Gemini 2.5 Flash 시장 테마·관련 종목 분석
- **관리자 모드**: 회원 정지, 콘텐츠 블라인드, 잔고/거래 수동 보정 + 감사 로그, 통계 대시보드

---

## 🏗️ 아키텍처

서버가 **키움증권과 프론트엔드 사이의 실시간 메시지 허브** 역할을 합니다. 키움에는 WebSocket 클라이언트로,
프론트에는 WebSocket 서버로 동시에 동작해 브라우저가 키움 API 인증 정보 없이도 실시간 시세를 받을 수 있는
구조입니다 — 키움 앱키/시크릿이 서버에만 있고 클라이언트에 절대 노출되지 않습니다.

```
키움 WSS (LOGIN → REG → REAL)
      │
      ▼
KiwoomRealtimeService   ── 체결(0B)/호가(0D) 틱 파싱
      │ broadcast
      ▼
StockWebSocketHandler   ── 클라이언트 연결 풀 관리, 신규 접속자 catch-up
      │ /ws
      ▼
Next.js 클라이언트       ── rAF 배치 렌더링으로 고빈도 틱 처리
```

<img src="docs/diagram_r4.png" alt="종목상세 페이지 — 실시간 시세/호가/AI 종목 분석" width="600" />  

### 🗂️ ERD

<img src="docs/Database_ERD.png" alt="종목상세 페이지 — 실시간 시세/호가/AI 종목 분석" width="600" />

---

## 📁 프로젝트 구조

```
server/src/main/java/sw/gaemiZIP/
├── config/       # Security, JWT, WebClient, WebSocket 설정
├── controller/   # REST API (admin/ai/auth/board/news/stock)
├── service/      # 도메인 서비스 (kiwoom/ai/news/stock/admin/auth)
├── entity/       # JPA 엔티티
├── repository/   # 리포지토리 (일부 QueryDSL)
├── dto/          # 요청/응답 DTO
└── websocket/    # StockWebSocketHandler

web/src/
├── app/          # Next.js App Router 페이지
├── components/   # UI/도메인 컴포넌트
├── services/     # 도메인별 axios API 클라이언트
├── store/        # Zustand 스토어
└── hooks/        # useWebSocket 등
```

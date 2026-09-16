# 🐜 gaemiZIP

> 키움증권 모의투자 API 기반 실시간 주식 거래 시뮬레이션 플랫폼

개인 투자자("개미")를 위한 실시간 시세·모의 매매·커뮤니티·AI 시장 분석을 제공하는 1인 풀스택 프로젝트입니다.
백엔드 설계·구현·인프라를 전담했고, 프론트엔드는 AI 도구로 구현 후 직접 검증·수정했습니다.

<img src="docs/stocksPage_60.gif" alt="종목상세 페이지 — 실시간 시세/호가/AI 종목 분석" width="900" />

**배포**: [프론트(Vercel)](https://gaemi-zip.vercel.app) · [백엔드(Render)](https://gaemizip-server.onrender.com)
> 백엔드는 무료 티어라 15분 미접속 시 슬립 상태가 됩니다 — 첫 접속 시 콜드스타트로 30~60초 정도 걸릴 수 있습니다.

---

## 🚀 트러블 슈팅

단순 CRUD가 아니라 실제로 막혔다가 원인을 추적해 해결한 사례들입니다.

### 1. 키움 rest api 관련 문제

**증상**:

**원인**:

**해결**:

**결과**:

### 2. 동시성 레이스 컨디션 재현율 100% → 0%, 처리량은 8.18배

예약 주문 체결(`ReservationService`)을 종목코드 단위로 병렬화하면 처리량이 얼마나 개선되고, 대가로 무엇이 깨지는지 직접 벤치마크·재현했습니다.

**가설과 실제**:
- 최초 매수 시: 
- 기존 보유 종목 매수 시: 

**해결**: 

**결과**: 
### 3. 종목상세 조회 간헐 실패 — 캐시 스탬피드로 인한 키움 API 429

**증상**: 

**1차 가설과 반증**: 

**진짜 원인**: 

**해결**: 

**결과**: 

### 4. 인증/위조 보안 취약점 3건

- 게시글 삭제가 로그인 여부조차 확인하지 않아 **누구나 타인의 글을 삭제**할 수 있었던 문제
- 게시글/댓글 작성 시 클라이언트가 보낸 `author` 값을 그대로 신뢰해 **작성자를 위조**할 수 있었던 문제
- 실시간 시세 검증용으로 만들어둔 **무인증 디버그 엔드포인트**(가격 조작 가능)가 실전 코드에 남아있던 문제

전부 JWT 기반 로그인 인증·본인확인(`memberId` 비교)으로 전환하고, 디버그 엔드포인트는 검증 완료 후 제거했습니다.

---

## 핵심 기능

- **실시간 시세/차트**: 키움 WebSocket 체결·호가 실시간 반영, 캔들 차트(1~60분·D·W), 코스피/코스닥/코스피200 지수
- **모의 매매**: 즉시 체결 매수/매도, 지정가 예약 주문(현재가 도달 시 자동 체결) + 체결 알림
- **인증**: JWT 기반 인증 + Google OAuth, 신규 가입 시 1억 원 초기 잔고와 랜덤 닉네임 자동 부여
- **커뮤니티**: 게시판(태그·인기글·보유종목 공유) + 댓글/대댓글, 추천 1인 1회 제한
- **AI 시장 분석**: 최신 뉴스 기반 Gemini 2.5 Flash 시장 테마·관련 종목 분석
- **관리자 모드**: 회원 정지, 콘텐츠 블라인드, 잔고/거래 수동 보정 + 감사 로그, 통계 대시보드

---

## 아키텍처

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

### ERD

<img src="docs/Database_ERD.png" alt="종목상세 페이지 — 실시간 시세/호가/AI 종목 분석" width="600" />


**스케줄 파이프라인**

| 주기 | 작업 |
|---|---|
| 5초 | 거래량 상위 10종목 갱신 |
| 60초 | 네이버 뉴스 헤드라인 수집 |
| 12시간 | 키움 OAuth 토큰 갱신 |
| 요청 시 | Gemini 기반 시장 테마 분석 |

---

## 기술 스택

| 구분 | 스택 |
|---|---|
| 백엔드 | Java 21, Spring Boot 4.0.2, Spring Security + JWT, Spring Data JPA + QueryDSL 5, Spring WebSocket, WebFlux(WebClient), Bucket4j |
| 프론트엔드 | Next.js 16 (App Router) + React 19, TypeScript, Tailwind CSS 4, Zustand, TanStack React Query, lightweight-charts |
| 데이터베이스 | PostgreSQL 18, Redis |
| 인프라 | Docker Compose, GitHub Actions |
| 테스트/부하검증 | JUnit 5, k6 |
| 외부 연동 | 키움증권 Open API+(모의투자, WebSocket/REST), Google Gemini 2.5 Flash, 네이버 뉴스 검색 API, Google OAuth 2.0 |

---

## 프로젝트 구조

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

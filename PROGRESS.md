# PROGRESS

## 관리자 모드 (1~8단계 진행 중)

### 백엔드 (`server/`)
- 권한 인프라: `entity/MemberStatus`(ACTIVE/SUSPENDED) 추가, 기존 `Role`(USER/ADMIN)과 별도 축으로 관리
  - `JwtUtil.getRoleFromToken`: 토큰의 role claim 추출
  - `JwtAuthenticationFilter`: 토큰 role을 `SimpleGrantedAuthority`로 변환해 `SecurityContext`에 부여 (기존 `Collections.emptyList()` 버그 수정)
  - `SecurityConfig`: `/admin/**` → `hasRole("ADMIN")` 인가 규칙 추가
  - `AuthService.login`/`googleLogin`: SUSPENDED 계정 로그인 차단
- 회원 정지 API: `controller/admin/AdminMemberController` `PATCH /admin/members/{id}/status` → `service/admin/AdminMemberService.updateStatus`
- 콘텐츠 블라인드 API (완료): `Board`/`Comment`에 `blind()`/`unblind()` 도메인 메서드 추가
  - `service/admin/AdminContentService.blindBoard`/`blindComment` — 토글 방식(현재 상태 반전), 별도 요청 바디 없음
  - `controller/admin/AdminContentController` — `PATCH /admin/board/{id}/blind`, `PATCH /admin/comment/{id}/blind`
- 예수금 수동 증감 / 거래 보정 API (완료, 범위 한정): `controller/admin/AdminTradeController` + `service/admin/AdminTradeService`
  - `adjustBalance` — `PATCH /admin/members/{id}/balanceAdjust`, 음수 잔고 방지 검증 포함
  - `deleteTrade` — `DELETE /admin/trades/{id}`, **단순 기록 삭제만** (잔고/`Holding` 롤백 없음). `TradeHistory`에 거래 시점 평단가 스냅샷이 없어 완전 롤백은 불가능 → 의도적으로 범위를 감사/정정용 기록 삭제로 한정
- QueryDSL 셋업: `build.gradle`에 `querydsl-jpa:jakarta` 의존성 추가, `config/QuerydslConfig`에 `JPAQueryFactory` 빈 정상 등록 완료. `repository/admin/AdminStatsRepository`(인터페이스) + `AdminStatsRepositoryImpl`(빈 구현체)는 아직 실제 쿼리 없음

### 패키지 구조
- `controller/admin/`, `service/admin/`, `dto/admin/`, `repository/admin/` 신설 — 기존 유저용 API와 격리

### 남은 TODO
- 실제 통계 쿼리 (`AdminStatsRepositoryImpl` 내부 — 가입자 추이, 거래량 집계 등) 미구현, QueryDSL 인프라만 준비된 상태
- 프론트엔드 관리자 화면 전혀 없음 (백엔드 API만 구현됨)
- `config/SecurityConfig.java`의 `corsConfigurationSource()` `allowedMethods`에 `PATCH`가 빠져 있음 — `/admin/**`의 PATCH 엔드포인트(회원 정지, 블라인드, 잔고 증감)들이 프론트 연동 시 CORS preflight에서 막힐 수 있음. 프론트엔드 작업 전에 수정 필요
- `ddl-auto: update`는 enum 값 변경 시 CHECK 제약조건을 자동 갱신하지 않고, 기존 row가 있는 테이블에 `NOT NULL` 컬럼 추가도 silent하게 실패시킬 수 있음 — `MemberStatus`/`isBlinded` 추가 시 실제로 겪었음, 수동 `ALTER TABLE` 필요했음
- `entity/TradeHistory.java`의 `profitRate` 타입이 `Double`(래퍼) → `double`(기본형)로 변경된 변경분이 별도로 존재(미커밋) — `TradeService.buildHistory`가 매수 시 `profitRate`로 `null`을 넘기는데, 기본형으로 바뀌면 오토언박싱 시 NPE 위험. admin mode와 무관한 변경이라 이번 커밋에서 제외함, 확인 후 별도 처리 필요

## 코스피·코스닥 실시간 지수 (완료)

### 백엔드 (`server/`)
- `service/IndexFetchService`: 키움 `ka20001`(업종현재가요청)을 7초 주기로 호출해 코스피(`mrkt_tp=0, inds_cd=001`)/코스닥(`mrkt_tp=1, inds_cd=101`) 지수를 조회, 인메모리 캐시 갱신 후 `StockWebSocketHandler.broadcast("INDEX_UPDATE:" + json)`로 브로드캐스트
  - 코스피/코스닥 두 호출 사이에 `Thread.sleep(1000)` 필요 — mock API가 짧은 간격의 연속 호출에 429(Too Many Requests)를 반환함을 확인
- `dto/kiwoom/KiwoomIndexResponse`: ka20001 응답 DTO (`cur_prc`, `pred_pre_sig`, `pred_pre`, `flu_rt`, `return_code`, `return_msg`)
- `dto/stock/IndexResponse`: 프론트 응답용 DTO (`code`, `name`, `price`, `rate`)
- `controller/IndexController`: `GET /api/stocks/index` — 캐시된 지수 목록 반환

### 프론트엔드 (`web/`)
- `types/stock.ts`: `IndexItem` 타입 추가
- `store/useAppStore.ts`: `indices` 상태 + `setIndices` 액션 추가
- `hooks/useWebSocket.ts`: `INDEX_UPDATE:` 메시지 분기 처리 추가
- `app/stocks/page.tsx`: "오늘의 AI 테마" 우측에 코스피/코스닥 탭 패널 추가
  - KOSPI/KOSDAQ 탭 전환, 선택된 지수의 현재가(중앙, 큰 글씨)·등락률(우하단) 표시
  - 등락률 부호에 따라 지수 값 텍스트를 빨강(상승)/파랑(하락)으로 표시

### 남은 TODO
- `ka20001`의 실제 요청 URI(`/api/dostk/sect`)·파라미터(`mrkt_tp`/`inds_cd`)·응답 필드명은 추정값으로 구현됨 — 실제 키움 문서/응답으로 검증 필요
- `return_code == 3`(인증 실패) 시 토큰 강제 갱신 후 재시도하는 로직 미구현 (`StockFetchService.fetchKiwoomRankingWithRetry` 패턴 참고 가능)
- DB 영속화 없음 — 인메모리 캐시만 사용 (서버 재시작 시 초기화)

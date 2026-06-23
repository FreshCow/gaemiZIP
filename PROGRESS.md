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
- 통계 쿼리 API (완료): `controller/admin/AdminStatsController` + `service/admin/AdminStatsService` + `repository/admin/AdminStatsRepositoryImpl`(QueryDSL)
  - `GET /admin/stats/signup-trend?days=30` — 일별 가입자 수 (`MemberAnt.createdDate` 조회 후 Java `Collectors.groupingBy(LocalDateTime::toLocalDate, ...)`로 그룹핑)
  - `GET /admin/stats/trade-volume?days=30` — 일별 거래 건수 + 거래대금 합계(`price * quantity`, `TradeHistory.tradeTime` 기준 Java 그룹핑)
  - 둘 다 `days` 파라미터로 조회 기간 조절(기본 30일), 응답은 `List<SignupTrendResponse>` / `List<TradeVolumeResponse>`
  - DB 단 `CAST(... AS date)` 그룹핑은 QueryDSL+JDBC 타입 캐스팅 문제로 포기 (아래 버그 수정 항목 참고)

- CORS PATCH 허용 (완료): `config/SecurityConfig.java` `corsConfigurationSource()` `allowedMethods`에 `PATCH` 추가 — 회원 정지·블라인드·잔고 증감 PATCH 요청이 preflight에서 막히던 문제 해결
- 로그인 응답에 role 포함 (완료): `dto/auth/LoginResponseDto`에 `role` 필드 추가, `AuthService.login`/`googleLogin` 양쪽에서 `member.getRole().getKey()`(예: `ROLE_ADMIN`) 전달 — JWT claim과 동일한 값
- 회원 목록 조회 API (완료): `GET /admin/members` → `dto/admin/MemberResponse`(비밀번호 해시 제외) 리스트 반환
- 전체 거래 조회 API (완료): `GET /admin/trades` → `TradeHistory` 엔티티 리스트 그대로 반환 (기존 `findAllByOrderByTradeTimeDesc()` 재사용)

### 실행 검증 중 발견한 버그 4건 수정 (완료)
- **블라인드해도 공개 화면에 그대로 노출**: 애초에 `isBlinded` 플래그를 "소비"하는 필터 로직이 없었음(토글만 하고 아무도 거르지 않음). `BoardRepository`/`CommentRepository`에 `findAllByIsBlindedFalseOrderBy...` 파생 쿼리 추가 → `BoardController.getAllBoards()`/`CommentController.getComments()`(공개 `/api/boards`, `/api/boards/{id}/comments`)가 이걸 쓰도록 변경해 블라인드 콘텐츠를 일반 사용자에게 아예 안 내려줌. 단, 관리자 화면은 블라인드 글도 봐야 토글 해제가 가능하므로 `AdminContentController`에 `GET /admin/boards`, `GET /admin/boards/{boardId}/comments`(전체 조회, 미필터)를 신설하고 `app/admin/content/page.tsx`가 공개 API 대신 이걸 쓰도록 분리
- **매수 시 NPE** (`Cannot invoke Double.doubleValue() because profitRate is null`): `entity/TradeHistory.profitRate`가 `double`(기본형)로 바뀌어 있던 상태에서 `TradeService.buildHistory`가 매수 시 `null`을 넘겨 오토언박싱 NPE 발생. `Double`(래퍼)로 되돌려서 해결
- **댓글 작성 시 SQL 오류** (`"is_blinded" 칼럼이 comment 릴레이션에 없음`): `ddl-auto: update`가 기존 row가 있는 `comment` 테이블에 `NOT NULL` 컬럼 추가를 silent하게 실패시킨 사례. DB에 수동 `ALTER TABLE comment ADD COLUMN is_blinded boolean NOT NULL DEFAULT false;` 실행으로 해결
- **통계 API `Cannot cast java.sql.Date to java.time.LocalDate`**: `AdminStatsRepositoryImpl`이 QueryDSL `Expressions.dateTemplate(LocalDate.class, "CAST({0} AS date)", ...)`로 DB 단에서 날짜 그룹핑을 시도했는데, JDBC가 실제로는 `java.sql.Date`를 반환해서 캐스팅 실패 — DB 그룹핑을 포기하고 raw row만 가져온 뒤 Java `Collectors.groupingBy(LocalDateTime::toLocalDate, ...)`로 그룹핑하는 방식으로 교체. 응답 JSON 모양은 동일해서 프론트 변경 불필요

### 패키지 구조
- `controller/admin/`, `service/admin/`, `dto/admin/`, `repository/admin/` 신설 — 기존 유저용 API와 격리

### 프론트엔드 (`web/`) — 관리자 화면 (완료)
- `middleware.ts`: `/admin/**` 경로 가드 추가 — 쿠키의 JWT payload를 base64 디코드해 `role` claim이 `ROLE_ADMIN`이 아니면 `/`로 리다이렉트 (서명 검증은 안 함, UX용 가드일 뿐 실제 인가는 서버 `SecurityConfig`가 처리)
- `store/useAuthStore.ts`: `role`/`isAdmin` 상태 추가, `gaemi_role` localStorage 키로 영속화
- `services/adminApi.ts`: admin API 전용 클라이언트. 백엔드 admin 라우트가 `/api`가 아닌 `/admin` 하위라 `services/api.ts`의 baseURL(`.../api`)과 다름 — 절대경로 URL로 호출해 baseURL을 우회(axios는 절대경로 url이면 baseURL을 무시하지만 인터셉터의 JWT 첨부는 그대로 적용됨)
- `types/admin.ts`: `MemberResponse`/`AdminTradeItem`/`SignupTrendItem`/`TradeVolumeItem` 타입
- `types/board.ts`: `BoardPost`/`Comment`에 `blinded` 필드 추가 — 서버 `isBlinded()` 게터가 Jackson 직렬화 시 `blinded`로 변환되는 점 주의(boolean getter "is" 접두사는 Jackson이 자동으로 제거)
- `app/admin/layout.tsx`: 회원/콘텐츠/거래/통계 4개 탭 공용 네비게이션
- `app/admin/members/page.tsx`: 회원 목록, 정지/활성 토글, 잔고 수동 조정 모달
- `app/admin/content/page.tsx`: 게시글 목록(`GET /admin/boards`, 블라인드 포함 전체) + 행 확장 시 댓글 조회(`GET /admin/boards/{id}/comments`), 게시글/댓글 블라인드 토글
- `app/admin/trades/page.tsx`: 전체 거래 내역 + 삭제(보정) 액션
- `app/admin/stats/page.tsx`: `recharts`로 가입자 추이(LineChart)/거래량+거래대금(ComposedChart) 시각화
- `components/layout/Sidebar.tsx`: `isAdmin`일 때만 상단 네비게이션에 "관리자" 탭 노출

### 남은 TODO
- `ddl-auto: update`는 기존 row가 있는 테이블에 `NOT NULL` 컬럼 추가를 silent하게 실패시킬 수 있음 — `MemberStatus`/`board.is_blinded`/`comment.is_blinded` 추가 시 전부 겪었음(특히 `comment`는 이번 세션에 실제 운영 오류로 터짐). 앞으로 엔티티에 `NOT NULL` 컬럼 추가할 때마다 DB에서 컬럼 존재 여부를 직접 확인하는 습관 필요
- `app/admin/content`는 게시글당 댓글을 펼칠 때마다 개별 요청(N+1 패턴) — 트래픽이 커지면 전체 댓글 조회 API 신설 고려
- 실제 DB(PostgreSQL) 기준 로그인/회원목록/블라인드/잔고조정/통계/트레이딩 화면 전체 실행 검증 완료

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

# PROGRESS

## 관리자 모드 (핵심 백엔드/프론트엔드 구현 완료, 일부 검증·정리 남음)

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

**우선순위 1 — 실행 검증 마무리**
- 이번 세션에 보고된 버그(콘텐츠 블라인드 미반영, 매수 NPE, 댓글 작성 SQL 오류, 통계 LocalDate 캐스팅)는 전부 수정 후 실제 DB로 재검증 완료
- 단, **`app/admin/members` 화면(회원 정지/활성 토글, 잔고 수동 조정 모달)은 이번 버그 수정 라운드에서 직접 재검증하지 않음** — 다음 작업 시작 시 이것부터 확인할 것
  - 체크리스트: 정지 처리한 계정으로 로그인 시도 시 `AuthService.login`/`googleLogin`이 실제로 차단하는지, `AdminTradeService.adjustBalance`의 음수 잔고 방지 검증이 실제로 막아주는지, 잔고 조정 후 회원 목록에 즉시 반영되는지

**우선순위 2 — 정리할 기술 부채**
- `repository/CommentRepository.java`의 `findAllByBoardIdAndIsBlindedFalseOrderByCreatedAtAsc` 파라미터명이 `memberId`로 되어 있음(실제로는 boardId를 받는 자리) — 파생 쿼리라 동작에는 문제 없지만 가독성 문제, `boardId`로 이름만 정정 권장
- `app/admin/content`는 게시글 행을 펼칠 때마다 댓글을 개별 요청(N+1 패턴) — 트래픽이 커지면 댓글 수만 미리 포함하거나 일괄 조회 API 검토
- `ddl-auto: update`가 기존 row 있는 테이블에 `NOT NULL` 컬럼 추가를 silent하게 실패시키는 패턴을 이번 세션에 `board.is_blinded`/`comment.is_blinded` 두 번 겪음(`comment`는 실제 운영 오류로 터짐) — 앞으로 엔티티에 컬럼 추가할 때마다 DB에 실제 반영됐는지 직접 확인하는 습관 필요. 같은 사고가 반복되면 Flyway/Liquibase 같은 마이그레이션 도구 도입도 고려

**우선순위 3 — admin mode 범위 밖이라 손 안 댔지만 코드 읽다가 발견한 이슈**
- `controller/BoardController.java`의 `deleteBoard`가 `password` 쿼리 파라미터를 받지만, 실제로 `board.getPassword()`와 비교 검증하는 코드가 없음(주석은 "비밀번호 검증 후 삭제"라고 되어 있는데 무조건 삭제됨) — 익명 게시글 삭제 권한 검증이 비어있는 보안 구멍
- `BoardController`가 `Board` 엔티티를 DTO 없이 그대로 `GET /api/boards`/`GET /api/boards/{id}` 응답으로 반환하고 있어서, `password` 필드(평문/해시 여부 별도 확인 필요)가 모든 사용자에게 그대로 노출됨
- `AdminTradeService.deleteTrade`/`adjustBalance`에 "누가 언제 무엇을 변경했는지" 감사 로그가 없음 — 운영 단계 진입 전에 필요 여부 결정 필요

**우선순위 4 — 다음 세션 시작 전에 확인할 것**
- 이전 헤더에 있던 "1~8단계"라는 표현은 저장소 어디에도 구체적인 단계 정의가 없는 텍스트였음(누가/언제 적었는지 추적 안 됨) — 다음에 작업 이어받을 때 "8단계가 정확히 뭘 가리키는지"를 사용자에게 먼저 확인하고 시작할 것. 현재까지 구현된 범위는 권한 인프라·회원 정지·콘텐츠 블라인드(+공개 필터링)·잔고 증감/거래 보정·통계 API·관리자 프론트엔드 4화면(회원/콘텐츠/거래/통계)으로, 사실상 "관리자 모드"의 핵심 기능은 다 구현된 상태. 추가 단계가 있다면 위 우선순위 1~3 정리 후 새로 논의 필요

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

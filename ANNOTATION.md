# 사용 어노테이션 정리

`server/src/main/java/sw/gaemiZIP` 백엔드 코드에서 실제로 사용한 어노테이션을 카테고리별로 정리한 문서입니다.

## 1. 컴포넌트 등록 / DI

| 어노테이션 | 역할 |
|---|---|
| `@SpringBootApplication` | 스프링 부트 애플리케이션의 진입점(메인 클래스)을 지정. `@Configuration`+`@EnableAutoConfiguration`+`@ComponentScan` 결합 |
| `@Configuration` | 해당 클래스가 스프링 설정(빈 정의) 클래스임을 선언 |
| `@Component` | 해당 클래스를 스프링 빈으로 등록 (범용) |
| `@Service` | 서비스 계층 빈임을 명시하는 `@Component`의 특수화 |
| `@Repository` | 데이터 접근 계층 빈임을 명시, 예외를 스프링 DataAccessException으로 변환 |
| `@Bean` | 메서드가 반환하는 객체를 스프링 빈으로 등록 |
| `@Value` | `application.yml` 등 설정 값을 필드에 주입 |
| `@RequiredArgsConstructor` | (Lombok) `final` 필드를 인자로 받는 생성자를 자동 생성해 생성자 주입(DI) 구현 |

## 2. 웹 MVC (Spring Web)

| 어노테이션 | 역할 |
|---|---|
| `@RestController` | `@Controller`+`@ResponseBody`, JSON 등 응답 본문을 직접 반환하는 REST 컨트롤러 선언 |
| `@RequestMapping` | 클래스/메서드 단위의 공통 요청 경로(prefix) 매핑 |
| `@GetMapping` | HTTP GET 요청 매핑 |
| `@PostMapping` | HTTP POST 요청 매핑 |
| `@PutMapping` | HTTP PUT 요청 매핑 |
| `@PatchMapping` | HTTP PATCH 요청 매핑 |
| `@DeleteMapping` | HTTP DELETE 요청 매핑 |
| `@RequestParam` | 쿼리스트링(요청 파라미터) 값을 메서드 인자로 바인딩 |
| `@RequestBody` | HTTP 요청 본문(JSON)을 객체로 역직렬화해 바인딩 |
| `@PathVariable` | URL 경로 변수(`{id}` 등)를 메서드 인자로 바인딩 |

## 3. 트랜잭션 / 스케줄링 / 이벤트

| 어노테이션 | 역할 |
|---|---|
| `@Transactional` | 메서드(또는 클래스) 실행을 하나의 DB 트랜잭션으로 묶음. `readOnly=true` 옵션으로 조회 전용 최적화 |
| `@EnableScheduling` | 스프링의 `@Scheduled` 어노테이션 기반 스케줄링 기능을 활성화 |
| `@Scheduled` | 지정 주기(`fixedDelay`, `cron` 등)로 메서드를 자동 실행 (5초 시세 조회, 60초 뉴스 수집 등) |
| `@EventListener` | 스프링 애플리케이션 이벤트(예: WebSocket 연결 이벤트)를 구독해 메서드 실행 |
| `@PostConstruct` | 빈 생성 및 의존성 주입 완료 직후 초기화 로직 실행 |
| `@PreDestroy` | 빈 소멸(컨테이너 종료) 직전 정리 로직 실행 |

## 4. 보안 (Spring Security)

| 어노테이션 | 역할 |
|---|---|
| `@EnableWebSecurity` | 스프링 시큐리티의 웹 보안 설정을 활성화 |

## 5. WebSocket

| 어노테이션 | 역할 |
|---|---|
| `@EnableWebSocket` | 스프링 WebSocket 기능을 활성화하고 핸들러를 등록 |

## 6. JPA 엔티티 매핑 (jakarta.persistence)

| 어노테이션 | 역할 |
|---|---|
| `@Entity` | 해당 클래스가 JPA 엔티티(테이블과 매핑되는 객체)임을 선언 |
| `@Table` | 매핑할 테이블명, 유니크 제약 등 테이블 세부 속성 지정 |
| `@Id` | 엔티티의 기본 키(PK) 필드 지정 |
| `@GeneratedValue` | 기본 키 값을 자동 생성하는 전략 지정(auto increment 등) |
| `@Column` | 필드와 매핑할 컬럼명, 제약조건(nullable, length 등) 지정 |
| `@ManyToOne` | N:1 연관관계 매핑 |
| `@JoinColumn` | 연관관계의 외래 키(FK) 컬럼 지정 |
| `@Enumerated` | Enum 타입 필드를 DB에 저장하는 방식 지정(주로 `STRING`) |
| `@MappedSuperclass` | 공통 매핑 정보(생성일 등)를 하위 엔티티에 상속하는 부모 클래스 지정 |
| `@PrePersist` | 엔티티가 처음 저장(insert)되기 직전 실행되는 콜백 |
| `@PreUpdate` | 엔티티가 수정(update)되기 직전 실행되는 콜백 |
| `@PersistenceContext` | `EntityManager`를 주입받기 위한 어노테이션 |

## 7. Spring Data JPA / Querydsl

| 어노테이션 | 역할 |
|---|---|
| `@Query` | JPQL/네이티브 쿼리를 직접 작성해 리포지토리 메서드에 매핑 |
| `@Param` | `@Query`의 바인드 파라미터(`:name`)와 메서드 인자를 연결 |
| `@Lock` | 조회 쿼리에 락(예: `PESSIMISTIC_WRITE`) 적용, 동시성 제어용 |
| `@EnableJpaAuditing` | 생성일/수정일 자동 기록(Auditing) 기능을 활성화 |
| `@EntityListeners` | 엔티티 생명주기 이벤트를 감지하는 리스너(`AuditingEntityListener` 등) 등록 |
| `@CreatedDate` | 엔티티 최초 생성 시각을 자동으로 채워주는 필드 지정 |
| `@LastModifiedDate` | 엔티티 최종 수정 시각을 자동으로 채워주는 필드 지정 |

## 8. Lombok

| 어노테이션 | 역할 |
|---|---|
| `@Getter` | 모든 필드의 getter 메서드를 자동 생성 |
| `@Setter` | 모든 필드의 setter 메서드를 자동 생성 |
| `@NoArgsConstructor` | 매개변수 없는 기본 생성자를 자동 생성 |
| `@AllArgsConstructor` | 모든 필드를 매개변수로 받는 생성자를 자동 생성 |
| `@Builder` | 빌더 패턴 코드를 자동 생성 |
| `@Data` | `@Getter`+`@Setter`+`@ToString`+`@EqualsAndHashCode` 등을 한 번에 적용 |
| `@Slf4j` | `log`라는 이름의 SLF4J 로거 필드를 자동 생성 |

## 9. Jackson (JSON 직렬화/역직렬화)

| 어노테이션 | 역할 |
|---|---|
| `@JsonProperty` | JSON 필드명과 자바 필드명을 매핑(키움 API 등 외부 응답 DTO에서 다수 사용) |
| `@JsonIgnoreProperties` | 매핑되지 않은 JSON 필드가 있어도 무시하고 역직렬화 |

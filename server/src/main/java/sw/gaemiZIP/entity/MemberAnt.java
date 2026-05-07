package sw.gaemiZIP.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import sw.gaemiZIP.util.NicknameGenerator;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberAnt extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email; //로그인 아이디 겸용

    private String password;

    @Column(nullable = false)
    private String nickname;

    @Enumerated(EnumType.STRING)
    private Role role; //user, admin

    private String provider; //Local, kakao, google

    private String providerId;

    private Long balance;

    @PrePersist // - DB에 INSERT 쿼리가 실행되기 직전에 JPA가 자동으로 호출
    public void prePersist() {
        // 1. 닉네임이 비어있으면 랜덤 닉네임 강제 부여
        if (this.nickname == null) {
            this.nickname = NicknameGenerator.generate();
        }

        // 2. 예수금이 비어있으면 기본금 1억 원 강제 부여
        if (this.balance == null) {
            this.balance = 100000000L;
        }
    }

    @Builder
    public MemberAnt(String email, String password, String nickname, Role role, String provider, String providerId, Long balance) {
        this.email = email;
        this.password = password;
        this.role = role;
        this.provider = provider;
        this.providerId = providerId;
    }
}

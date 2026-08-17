package sw.gaemiZIP.entity.member;

import sw.gaemiZIP.entity.BaseTimeEntity;
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
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 자동 증가
    private Long id;

    @Column(unique = true)
    private String email; // GOOGLE 계정 식별용 (LOCAL은 null)

    @Column(unique = true)
    private String username; // LOCAL 계정 로그인 아이디 (GOOGLE은 null)

    private String password;

    @Column(nullable = false)
    private String nickname;

    @Enumerated(EnumType.STRING)
    private Role role; //user, admin

    @Enumerated(EnumType.STRING)
    private MemberStatus status;

    private String provider; //Local, google

    private String providerId;

    private Long balance;

    @Column(nullable = false, columnDefinition = "bigint default 0")
    private Long lockedBalance;

    private String securityCodeHash; // 비밀번호 재설정용 보안코드 해시 (GOOGLE 계정·마이그레이션 이전 로컬 계정은 null)


    @PrePersist // - DB에 INSERT 쿼리가 실행되기 직전에 JPA가 자동으로 호출
    public void prePersist() {
        //닉네임이 비어있으면 랜덤 닉네임 강제 부여
        if (this.nickname == null) {
            this.nickname = NicknameGenerator.generate();
        }

        //예수금이 비어있으면 기본금 1억 부여
        if (this.balance == null) {
            this.balance = 100000000L;
        }

        if(this.status == null) {
            this.status = MemberStatus.ACTIVE;
        }

        if(this.lockedBalance == null) {
            this.lockedBalance = 0L;
        }
    }

    @Builder
    public MemberAnt(String email, String username, String password, String nickname, Role role, String provider, String providerId, Long balance, String securityCodeHash) {
        this.email = email;
        this.username = username;
        this.password = password;
        this.nickname = nickname;
        this.role = role;
        this.provider = provider;
        this.providerId = providerId;
        this.balance = balance;
        this.securityCodeHash = securityCodeHash;
    }

    public void lockBalance(long amount) {
        this.lockedBalance += amount;
    }

    public void unlockBalance(long amount) {
        this.lockedBalance = Math.max(0, this.lockedBalance - amount);
    }

    public void updateBalance(long delta) {
        this.balance += delta;
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }
    public void suspend() {this.status = MemberStatus.SUSPENDED;}
    public void activate() {this.status = MemberStatus.ACTIVE;}
}

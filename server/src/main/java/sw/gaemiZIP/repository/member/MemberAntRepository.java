package sw.gaemiZIP.repository.member;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sw.gaemiZIP.entity.member.MemberAnt;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

@Repository //리포지토리 계층 명시 - 스프링 빈 자동 등록
public interface MemberAntRepository extends JpaRepository<MemberAnt, Long> {

    Optional<MemberAnt> findByEmail(String email);

    Optional<MemberAnt> findByUsername(String username);

    // LOCAL(username) 또는 GOOGLE(email) 어느 쪽으로도 조회 가능
    Optional<MemberAnt> findByUsernameOrEmail(String username, String email);

    //카카오 필수인 회원번호로 찾기
    Optional<MemberAnt> findByProviderAndProviderId(String provider, String providerId);

    boolean existsByNickname(String nickname);

    // 주문 동시성 제어용 - 회원 행 비관적 락
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from MemberAnt m where m.username = :id or m.email = :id")
    Optional<MemberAnt> findByLoginIdForUpdate(@Param("id") String id);

}

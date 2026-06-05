package sw.gaemiZIP.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sw.gaemiZIP.entity.MemberAnt;

import java.util.Optional;

@Repository //리포지토리 계층 명시 - 스프링 빈 자동 등록
public interface MemberAntRepository extends JpaRepository<MemberAnt, Long> {

    Optional<MemberAnt> findByEmail(String email);

    Optional<MemberAnt> findByUsername(String username);

    // LOCAL(username) 또는 GOOGLE(email) 어느 쪽으로도 조회 가능
    Optional<MemberAnt> findByUsernameOrEmail(String username, String email);

    boolean existsByNickname(String nickname);

}

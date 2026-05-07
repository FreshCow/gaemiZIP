package sw.gaemiZIP.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import sw.gaemiZIP.entity.MemberAnt;

import java.util.Optional;

@Repository //리포지토리 계층 명시 - 스프링 빈 자동 등록
public interface MemberAntRepository extends JpaRepository<MemberAnt, Long> {

    //이메일로 회원 찾기 (로그인 시 사용)
    Optional<MemberAnt> findByEmail(String email);

    //닉네임 중복 체크 (선택 사항)
    boolean existsByNickname(String nickname);

}

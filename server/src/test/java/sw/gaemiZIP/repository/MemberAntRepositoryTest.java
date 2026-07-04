package sw.gaemiZIP.repository;

import jakarta.transaction.Transactional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import sw.gaemiZIP.entity.MemberAnt;
import sw.gaemiZIP.entity.Role;
import sw.gaemiZIP.repository.member.MemberAntRepository;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest //통합테스트 환경 제공
@ActiveProfiles("local")
@Transactional // 테스트 완료 후 DB 롤백 처리
class MemberAntRepositoryTest {

    @Autowired
    MemberAntRepository memberAntRepository;

    @Test
    @DisplayName("회원 저장 및 랜덤 닉네임 생성 확인")
    void saveMemberAntTest() {
        MemberAnt memberAnt = MemberAnt.builder()
                .email("test@ant.com")
                .password("1234")
                .role(Role.USER)
                .provider("LOCAL")
                .build();

        //실행
        MemberAnt savedMemberAnt = memberAntRepository.save(memberAnt);

        //검증
        MemberAnt findMemberAnt = memberAntRepository.findById(savedMemberAnt.getId()).orElseThrow();

        assertThat(findMemberAnt.getEmail()).isEqualTo("test@ant.com");
        assertThat(findMemberAnt.getNickname()).isNotNull();
        System.out.println("생성된 닉네임 : " + findMemberAnt.getNickname());
        System.out.println("기본 지급 예수금 : " + findMemberAnt.getBalance());
    }
}
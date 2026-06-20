package sw.gaemiZIP.service.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.entity.MemberAnt;
import sw.gaemiZIP.entity.MemberStatus;
import sw.gaemiZIP.repository.MemberAntRepository;

@Service
@RequiredArgsConstructor
public class AdminMemberService {

    private final MemberAntRepository memberAntRepository;

    @Transactional
    public void updateStatus(Long memberId, MemberStatus status) {
        MemberAnt member = memberAntRepository.findById(memberId)
                .orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        if (status == MemberStatus.SUSPENDED) {
            member.suspend();
        }else{
            member.activate();
        }
    }
}

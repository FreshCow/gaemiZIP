package sw.gaemiZIP.service.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.admin.MemberResponse;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.entity.member.MemberStatus;
import sw.gaemiZIP.repository.member.MemberAntRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminMemberService {

    private final MemberAntRepository memberAntRepository;

    @Transactional(readOnly = true)
    public List<MemberResponse> getAllMembers() {
        return memberAntRepository.findAll().stream()
                .map(MemberResponse::from)
                .toList();
    }

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

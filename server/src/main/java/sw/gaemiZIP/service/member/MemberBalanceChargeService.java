package sw.gaemiZIP.service.member;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sw.gaemiZIP.dto.member.ChargeRequestStatusResponse;
import sw.gaemiZIP.entity.member.BalanceChargeRequest;
import sw.gaemiZIP.entity.member.ChargeAmount;
import sw.gaemiZIP.entity.member.ChargeRequestStatus;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.repository.member.BalanceChargeRequestRepository;
import sw.gaemiZIP.repository.member.MemberAntRepository;

import java.time.LocalDateTime;

@Service
@AllArgsConstructor
public class MemberBalanceChargeService {

    private final MemberAntRepository memberAntRepository;
    private final BalanceChargeRequestRepository chargeRequestRepository;

    private record Availability(boolean canRequest, LocalDateTime nextAvailable) {}

    //신청 가능 판단
    private Availability checkAvailability(Long memberId) {

        //이미 요청이 있으면 신청 불가
        if (chargeRequestRepository.existsByMember_IdAndStatus(memberId, ChargeRequestStatus.PENDING)) {
            return new Availability(false, null);
        }

        //승인 시간 기준 7일 쿨다운
        return chargeRequestRepository.findTopByMember_IdAndStatusOrderByProcessedAtDesc(memberId, ChargeRequestStatus.APPROVED)
                .map(r -> r.getProcessedAt().plusDays(7))
                .filter(nextAvailable -> nextAvailable.isAfter(LocalDateTime.now()))
                .map(nextAvailable -> new Availability(false, nextAvailable))
                .orElse(new Availability(true, null));
    }

    //예수금 충전 요청
    @Transactional
    public void createChargeRequest(String usernameOrEmail, ChargeAmount amount) {
        MemberAnt member = memberAntRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail).orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        if (!checkAvailability(member.getId()).canRequest()) {
            throw new IllegalStateException("예수금 충전은 일주일에 한 번, 대기중인 요청이 없을 때만 신청할 수 있습니다.");
        }

        chargeRequestRepository.save(BalanceChargeRequest.builder().member(member).amount(amount).build());
    }

    @Transactional(readOnly = true)
    public ChargeRequestStatusResponse getMyChargeStatus(String usernameOrEmail) {
        MemberAnt member = memberAntRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail).orElseThrow(() -> new IllegalStateException("회원을 찾을 수 없습니다."));

        //신청 체크
        Availability availability = checkAvailability(member.getId());

        return ChargeRequestStatusResponse.builder()
                .canRequest(availability.canRequest())
                .nextAvailableAt(availability.nextAvailable())
                .build();

    }
}

package sw.gaemiZIP.repository.member;

import org.springframework.data.jpa.repository.JpaRepository;
import sw.gaemiZIP.entity.member.BalanceChargeRequest;
import sw.gaemiZIP.entity.member.ChargeRequestStatus;

import java.util.List;
import java.util.Optional;

public interface BalanceChargeRequestRepository extends JpaRepository<BalanceChargeRequest, Long> {

    boolean existsByMember_IdAndStatus(Long memberId, ChargeRequestStatus status);

    //
    Optional<BalanceChargeRequest>findTopByMember_IdAndStatusOrderByProcessedAtDesc(Long memberId, ChargeRequestStatus status);

    //요청시간 오름차순 기준으로 요청상태 전부 찾기
    List<BalanceChargeRequest> findAllByStatusOrderByRequestedAtAsc(ChargeRequestStatus status);

}

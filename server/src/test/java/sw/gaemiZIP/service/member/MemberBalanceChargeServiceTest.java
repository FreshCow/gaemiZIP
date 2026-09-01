package sw.gaemiZIP.service.member;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import sw.gaemiZIP.entity.member.BalanceChargeRequest;
import sw.gaemiZIP.entity.member.ChargeAmount;
import sw.gaemiZIP.entity.member.ChargeRequestStatus;
import sw.gaemiZIP.entity.member.MemberAnt;
import sw.gaemiZIP.repository.member.BalanceChargeRequestRepository;
import sw.gaemiZIP.repository.member.MemberAntRepository;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MemberBalanceChargeServiceTest {

    @Mock
    private MemberAntRepository memberAntRepository;

    @Mock
    private BalanceChargeRequestRepository chargeRequestRepository;

    @InjectMocks
    private MemberBalanceChargeService memberBalanceChargeService;

    private MemberAnt member() {
        MemberAnt member = MemberAnt.builder().username("testant1").build();
        ReflectionTestUtils.setField(member, "id", 1L);
        return member;
    }

    @Test
    @DisplayName("충전 신청 성공")
    void createChargeRequestSuccess() {
        MemberAnt member = member();

        given(memberAntRepository.findByUsernameOrEmail("testant1", "testant1")).willReturn(Optional.of(member));

        given(chargeRequestRepository.existsByMember_IdAndStatus(1L, ChargeRequestStatus.PENDING)).willReturn(false);

        given(chargeRequestRepository.findTopByMember_IdAndStatusOrderByProcessedAtDesc(1L, ChargeRequestStatus.APPROVED)).willReturn(Optional.empty());

        memberBalanceChargeService.createChargeRequest("testant1", ChargeAmount.ONE_BILLION);

        verify(chargeRequestRepository).save(any(BalanceChargeRequest.class));
    }

    @Test
    @DisplayName("충전 신청 실패 - 이미 대기중인 요청있음")
    void failCreateChargeRequestSuccess() {
        MemberAnt member = member();

        given(memberAntRepository.findByUsernameOrEmail("testant1", "testant1")).willReturn(Optional.of(member));

        given(chargeRequestRepository.existsByMember_IdAndStatus(1L, ChargeRequestStatus.PENDING)).willReturn(true);

        assertThatThrownBy(() -> memberBalanceChargeService.createChargeRequest("testant1", ChargeAmount.ONE_BILLION)).isInstanceOf(IllegalStateException.class);

        verify(chargeRequestRepository, never()).save(any());
    }

}
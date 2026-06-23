package sw.gaemiZIP.service.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import sw.gaemiZIP.dto.admin.SignupTrendResponse;
import sw.gaemiZIP.dto.admin.TradeVolumeResponse;
import sw.gaemiZIP.repository.admin.AdminStatsRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminStatsService {

    private final AdminStatsRepository adminStatsRepository;

    public List<SignupTrendResponse> getSignupTrend(int days) {
        return adminStatsRepository.findSignupTrend(days);
    }

    public List<TradeVolumeResponse> getTradeVolume(int days) {
        return adminStatsRepository.findTradeVolume(days);
    }
}

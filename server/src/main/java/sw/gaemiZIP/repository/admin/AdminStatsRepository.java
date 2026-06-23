package sw.gaemiZIP.repository.admin;

import sw.gaemiZIP.dto.admin.SignupTrendResponse;
import sw.gaemiZIP.dto.admin.TradeVolumeResponse;

import java.util.List;

public interface AdminStatsRepository {
    List<SignupTrendResponse> findSignupTrend(int days);
    List<TradeVolumeResponse> findTradeVolume(int days);
}

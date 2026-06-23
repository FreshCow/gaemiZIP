package sw.gaemiZIP.controller.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import sw.gaemiZIP.dto.admin.SignupTrendResponse;
import sw.gaemiZIP.dto.admin.TradeVolumeResponse;
import sw.gaemiZIP.service.admin.AdminStatsService;

import java.util.List;

@RestController
@RequestMapping("/admin/stats")
@RequiredArgsConstructor
public class AdminStatsController {

    private final AdminStatsService adminStatsService;

    @GetMapping("/signup-trend")
    public List<SignupTrendResponse> signupTrend(@RequestParam(defaultValue = "30") int days) {
        return adminStatsService.getSignupTrend(days);
    }

    @GetMapping("/trade-volume")
    public List<TradeVolumeResponse> tradeVolume(@RequestParam(defaultValue = "30") int days) {
        return adminStatsService.getTradeVolume(days);
    }
}

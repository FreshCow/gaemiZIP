package sw.gaemiZIP.controller.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sw.gaemiZIP.dto.ai.AiThemeResponse;
import sw.gaemiZIP.service.ai.AiAnalysisService;

@RestController
@RequestMapping("api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiAnalysisService aiAnalysisService;

    @GetMapping("/theme")
    public AiThemeResponse getAiTheme() {
        return aiAnalysisService.analyzeTodayTheme();
    }
}

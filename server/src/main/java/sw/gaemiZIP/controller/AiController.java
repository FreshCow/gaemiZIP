package sw.gaemiZIP.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sw.gaemiZIP.dto.AiThemeResponse;
import sw.gaemiZIP.service.AiAnalysisService;

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

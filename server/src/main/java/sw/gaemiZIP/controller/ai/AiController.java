package sw.gaemiZIP.controller.ai;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import sw.gaemiZIP.dto.ai.AiStockAnalysisResponse;
import sw.gaemiZIP.dto.ai.AiThemeResponse;
import sw.gaemiZIP.service.ai.AiAnalysisService;
import sw.gaemiZIP.service.ai.AiStockAnalysisService;

@RestController
@RequestMapping("api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiAnalysisService aiAnalysisService;
    private final AiStockAnalysisService aiStockAnalysisService;

    @GetMapping("/theme")
    public AiThemeResponse getAiTheme() {
        return aiAnalysisService.analyzeTodayTheme();
    }

    @GetMapping("/stock/{code}")
    public ResponseEntity<AiStockAnalysisResponse> getStockAnalysis(@PathVariable String code) {
        return aiStockAnalysisService.analyzeStock(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}

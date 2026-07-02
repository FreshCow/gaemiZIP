package sw.gaemiZIP.controller.stock;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import sw.gaemiZIP.dto.stock.CandleResponse;
import sw.gaemiZIP.service.stock.ChartService;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class ChartController {

    private final ChartService chartService;

    // GET /api/stocks/{code}/chart?interval=1   → 1분봉
    // GET /api/stocks/{code}/chart?interval=D   → 일봉
    // GET /api/stocks/{code}/chart?interval=W   → 주봉
    @GetMapping("/{code}/chart")
    public ResponseEntity<List<CandleResponse>> getChart(
            @PathVariable String code,
            @RequestParam(defaultValue = "D") String interval
    ) {
        List<CandleResponse> candles = switch (interval) {
            case "D"                          -> chartService.getDailyChart(code);
            case "W"                          -> chartService.getWeeklyChart(code);
            case "T1","T3","T5","T10","T30"   -> chartService.getTickChart(code, interval.substring(1));
            default                           -> chartService.getMinuteChart(code, interval);  // "1","3","5",...
        };
        return ResponseEntity.ok(candles);
    }
}

package sw.gaemiZIP.dto.ai;

import lombok.Data;

@Data
public class AiStockAnalysisResponse {
    private String summary;
    private String trend; //UP | DOWN | NEUTRAL
}

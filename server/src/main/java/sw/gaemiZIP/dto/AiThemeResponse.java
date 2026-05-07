package sw.gaemiZIP.dto;

import lombok.Data;
import java.util.List;

@Data
public class AiThemeResponse {
    private List<KeywordGroup> keywords;

    @Data
    public static class KeywordGroup {
        private String keyword;
        private List<ThemeStock> stocks;
    }

    @Data
    public static class ThemeStock {
        private String stockCode;
        private String stockName;
        private String changeRate;
    }
}

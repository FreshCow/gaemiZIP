package sw.gaemiZIP.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import sw.gaemiZIP.dto.ai.AiStockAnalysisResponse;
import sw.gaemiZIP.dto.stock.StockInfoResponse;
import sw.gaemiZIP.entity.news.News;
import sw.gaemiZIP.service.news.NewsService;
import sw.gaemiZIP.service.stock.StockInfoService;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiStockAnalysisService {
    private static final String CACHE_PREFIX = "ai:analysis:";
    private static final Duration CACHE_TTL  = Duration.ofHours(3);

    private final StockInfoService stockInfoService;
    private final NewsService newsService;
    private final StringRedisTemplate redisTemplate;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public Optional<AiStockAnalysisResponse> analyzeStock(String code) {

        String cacheKey = CACHE_PREFIX + code;
        String cached = redisTemplate.opsForValue().get(cacheKey);

        if(cached != null) {
            try {
                return Optional.of(objectMapper.readValue(cached, AiStockAnalysisResponse.class));
            } catch (Exception e) {
                log.warn("AI 분석 캐시 역직렬화 실패 [{}]: {}", code, e.getMessage());
            }
        }

        Optional<StockInfoResponse> infoOpt = stockInfoService.getStockInfo(code);
        if (infoOpt.isEmpty()) return Optional.empty();

        StockInfoResponse info = infoOpt.get();
        List<News> news = newsService.getStockNews(code, info.getName());

        AiStockAnalysisResponse result = callGeminiApi(info, news);
        if(result == null) return Optional.empty();

        try{
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(result), CACHE_TTL);
        }catch (Exception e){
            log.warn("AI 분석 캐시 저장 실패 [{}]: {}", code, e.getMessage());
        }
        return Optional.of(result);
    }

    private AiStockAnalysisResponse callGeminiApi(StockInfoResponse info, List<News> news) {
        String newsTitles = news.stream()
                .map(News::getTitle)
                .limit(5)
                .collect(Collectors.joining("\n"));

        String prompt = """
        너는 주식을 처음 접하는 사람에게도 쉽게 설명해주는 한국 주식 시장 애널리스트야.
        다음은 한 종목의 정보야:
        종목명: %s (%s)
        등락률: %s%%
        PER: %s, EPS: %s, ROE: %s, 거래량: %s, 시가총액: %s억

        관련 최신 뉴스 제목:
        [%s]

        위 정보를 종합해서 이 종목의 최근 흐름과 단기 전망을 2~3문장으로 분석해줘.

        작성 규칙:
        - 등락률 수치는 trend 판단에만 참고하고, summary 문장에는 언급하지 마.
        - 주식을 처음 보는 사람도 이해할 수 있게 쉬운 말로 써. 어려운 용어는 피하고, PER/EPS/ROE 같은 지표를 쓸 때는 의미를 짧게 풀어서 설명해(예: "이익 대비 주가가 높은 편").
        - 지표 수치를 나열하지 말고, 수치가 의미하는 바와 뉴스 내용을 연결해 한 흐름으로 설명해.
        - 뉴스가 없으면 지표만으로 판단하되, 확실하지 않은 내용은 단정하지 마.
        - 특정 행동(매수/매도)을 권유하지 마.

        반드시 아래 JSON 형식으로만 대답하고, 마크다운 코드블록 기호는 절대 쓰지 마:
        {"summary":"...", "trend":"UP 또는 DOWN 또는 NEUTRAL 중 하나"}
        """.formatted(
                info.getName(), info.getCode(), info.getFluRt(),
                info.getPer(), info.getEps(), info.getRoe(), info.getTrdeQty(), info.getMac(),
                newsTitles.isBlank() ? "관련 뉴스 없음" : newsTitles
        );

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

        try {
            String requestJson = objectMapper.writeValueAsString(Map.of(
                    "contents", List.of(Map.of(
                            "parts", List.of(Map.of("text", prompt))
                    ))
            ));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String response = restTemplate.postForObject(url, new HttpEntity<>(requestJson, headers), String.class);
            JsonNode rootNode = objectMapper.readTree(response);
            String generatedText = rootNode
                    .path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();

            generatedText = generatedText.replace("```json", "").replace("```", "").trim();
            log.debug("Gemini 종목 분석 응답 [{}]: {}", info.getCode(), generatedText);

            return objectMapper.readValue(generatedText, AiStockAnalysisResponse.class);
        } catch (Exception e) {
            log.error("Gemini API 호출 중 에러 [{}]: {}", info.getCode(), e.getMessage());
            return null;
        }
    }
}

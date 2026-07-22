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
                너는 한국 주식 시장의 날카로운 퀀트 애널리스트야.
                다음은 한 종목의 정보야:
                종목명: %s (%s)
                등락률: %s%%
                PER: %s, EPS: %s, ROE: %s, 거래량: %s, 시가총액: %s억

                관련 최신 뉴스 제목:
                [%s]

                위 정보를 종합해서 이 종목의 최근 흐름과 단기 전망을 2~3문장으로 분석해줘.
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

package sw.scalperagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import sw.scalperagent.dto.AiThemeResponse;
import sw.scalperagent.entity.News;
import sw.scalperagent.repository.NewsRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiAnalysisService {

    private final NewsRepository newsRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public AiThemeResponse analyzeTodayTheme() {
        List<News> recentNews = newsRepository.findTop10ByOrderByIdDesc();
        if (recentNews.isEmpty()) return null;

        String newsTitles = recentNews.stream()
                .map(News::getTitle)
                .collect(Collectors.joining("\n"));

        String prompt = """
                너는 한국 주식 시장의 날카로운 퀀트 애널리스트야.
                다음은 오늘의 최신 경제/금융 뉴스 제목들이야:
                [%s]

                이 뉴스들을 분석해서 오늘 시장을 주도할 핵심 키워드 3개와, 각 키워드별로 관련 테마주 3개씩을 추천해줘.
                등락률은 뉴스 뉘앙스에 따라 가상의 예상치(예: +3.20%%, -1.50%%)로 적어줘.
                종목코드는 실제 한국 거래소(KRX) 6자리 코드로 적어줘.
                반드시 아래 JSON 형식으로만 대답하고, 마크다운 코드블록 기호는 절대 쓰지 마:
                {"keywords":[{"keyword":"#키워드1","stocks":[{"stockCode":"005930","stockName":"삼성전자","changeRate":"+1.20%%"}]}]}
                """.formatted(newsTitles);

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;

        try {
            // Jackson으로 요청 JSON 직렬화 (수동 escape 제거)
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
            log.debug("Gemini 응답: {}", generatedText);

            return objectMapper.readValue(generatedText, AiThemeResponse.class);
        } catch (Exception e) {
            log.error("Gemini API 호출/파싱 에러: {}", e.getMessage());
            return null;
        }
    }
}

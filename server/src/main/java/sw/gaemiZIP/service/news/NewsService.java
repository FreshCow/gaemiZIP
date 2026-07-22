package sw.gaemiZIP.service.news;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.dto.news.NaverNewsItem;
import sw.gaemiZIP.dto.news.NaverNewsResponse;
import sw.gaemiZIP.entity.news.News;
import sw.gaemiZIP.repository.news.NewsRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// 네이버 뉴스 검색 API를 60초마다 호출해 주식 관련 뉴스를 DB에 저장하는 서비스
@Slf4j
@Service
@RequiredArgsConstructor
public class NewsService {

    private static final String NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json";
    private static final String SEARCH_QUERY   = "주식";
    private static final int    DISPLAY_COUNT  = 20;
    private static final Duration STOCK_NEWS_TTL = Duration.ofMinutes(20);

    @Value("${naver.api.client-id}")
    private String clientId;

    @Value("${naver.api.client-secret}")
    private String clientSecret;

    private final NewsRepository newsRepository;
    private final WebClient.Builder webClientBuilder;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Scheduled(fixedDelay = 60_000)
    public void fetchNews() {
       fetchFromNaver(SEARCH_QUERY);
    }

    public List<News>getStockNews(String code, String stockName){
        String cacheKey = "news:stock:" + code;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, new TypeReference<List<News>>() {});
            } catch (Exception e) {
                log.warn("종목 뉴스 캐시 역직렬화 실패 [{}]: {}", code, e.getMessage());
            }
        }

        List<News> news = fetchFromNaver(stockName);
        try {
            redisTemplate.opsForValue().set(cacheKey, objectMapper.writeValueAsString(news), STOCK_NEWS_TTL);
        } catch (JsonProcessingException e) {
            log.warn("종목 뉴스 캐시 저장 실패 [{}]: {}", code, e.getMessage());
        }
        return news;
    }

    private List<News> fetchFromNaver(String keyword) {
        try {
            NaverNewsResponse response = webClientBuilder.build()
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("openapi.naver.com")
                            .path("/v1/search/news.json")
                            .queryParam("query", keyword)
                            .queryParam("display", DISPLAY_COUNT)
                            .queryParam("sort", "date")
                            .build())
                    .header("X-Naver-Client-Id", clientId)
                    .header("X-Naver-Client-Secret", clientSecret)
                    .retrieve()
                    .bodyToMono(NaverNewsResponse.class)
                    .block();

            if (response == null || response.items() == null || response.items().isEmpty()) {
                log.warn("네이버 뉴스 API 결과 없음: {}", keyword);
                return List.of();
            }

            List<News> result = new ArrayList<>();
            int savedCount = 0;
            for (NaverNewsItem item : response.items()) {
                String link = (item.originallink() != null && !item.originallink().isBlank())
                        ? item.originallink()
                        : item.link();

                News news = News.builder()
                        .title(cleanHtml(item.title()))
                        .link(link)
                        .content(cleanHtml(item.description()))
                        .publisher("네이버뉴스")
                        .publishDate(item.pubDate())
                        .build();

                if (!newsRepository.existsByLink(link)) {
                    try {
                        newsRepository.save(news);
                        savedCount++;
                    } catch (DataIntegrityViolationException e) {
                        // 동시 요청으로 인한 중복 저장 시도 — 무시하고 계속 진행
                    }
                }
                result.add(news);
            }

            log.info("[{}] 뉴스 조회 완료: {}건 (신규 {}건)", keyword, result.size(), savedCount);
            return result;
        } catch (Exception e) {
            log.error("네이버 뉴스 API 호출 실패 [{}]: {}", keyword, e.getMessage());
            return List.of();
        }
    }

    @Transactional(readOnly = true)
    public Page<News> getLatestNews(Pageable pageable) {
        return newsRepository.findAllByOrderByIdDesc(pageable);
    }

    // 네이버 API 응답의 <b> 하이라이트 태그와 HTML 엔티티 제거
    private String cleanHtml(String text) {
        if (text == null) return "";
        return text.replaceAll("<[^>]+>", "")
                   .replace("&lt;",  "<")
                   .replace("&gt;",  ">")
                   .replace("&amp;", "&")
                   .replace("&quot;","\"")
                   .replace("&#39;", "'")
                   .trim();
    }

    @Scheduled(cron = "0 0 4 * * *")
    @Transactional
    public void cleanupOldNews() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        long deleted = newsRepository.deleteByCreatedDateBefore(cutoff);
        log.info("{}일 이전 뉴스 {}건 삭제", 7, deleted);
    }
}

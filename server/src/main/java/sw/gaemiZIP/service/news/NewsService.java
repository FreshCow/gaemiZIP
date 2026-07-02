package sw.gaemiZIP.service.news;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.dto.news.NaverNewsItem;
import sw.gaemiZIP.dto.news.NaverNewsResponse;
import sw.gaemiZIP.entity.news.News;
import sw.gaemiZIP.repository.news.NewsRepository;

import java.util.List;

// 네이버 뉴스 검색 API를 60초마다 호출해 주식 관련 뉴스를 DB에 저장하는 서비스
@Slf4j
@Service
@RequiredArgsConstructor
public class NewsService {

    private static final String NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json";
    private static final String SEARCH_QUERY   = "주식";
    private static final int    DISPLAY_COUNT  = 20;

    @Value("${naver.api.client-id}")
    private String clientId;

    @Value("${naver.api.client-secret}")
    private String clientSecret;

    private final NewsRepository newsRepository;
    private final WebClient.Builder webClientBuilder;

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void fetchNews() {
        try {
            NaverNewsResponse response = webClientBuilder.build()
                    .get()
                    .uri(uriBuilder -> uriBuilder
                            .scheme("https")
                            .host("openapi.naver.com")
                            .path("/v1/search/news.json")
                            .queryParam("query", SEARCH_QUERY)
                            .queryParam("display", DISPLAY_COUNT)
                            .queryParam("sort", "date")
                            .build())
                    .header("X-Naver-Client-Id", clientId)
                    .header("X-Naver-Client-Secret", clientSecret)
                    .retrieve()
                    .bodyToMono(NaverNewsResponse.class)
                    .block();

            if (response == null || response.items() == null || response.items().isEmpty()) {
                log.warn("네이버 뉴스 API 결과 없음");
                return;
            }

            int saved = 0;
            for (NaverNewsItem item : response.items()) {
                // originallink가 있으면 우선 사용 (실제 기사 URL)
                String link = (item.originallink() != null && !item.originallink().isBlank())
                        ? item.originallink()
                        : item.link();

                if (newsRepository.existsByLink(link)) continue;

                newsRepository.save(News.builder()
                        .title(cleanHtml(item.title()))
                        .link(link)
                        .content(cleanHtml(item.description()))
                        .publisher("네이버뉴스")
                        .publishDate(item.pubDate())
                        .build());
                saved++;
            }

            log.info("뉴스 저장 완료: {}건 신규", saved);
        } catch (Exception e) {
            log.error("네이버 뉴스 API 호출 실패: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<News> getLatestNews() {
        return newsRepository.findTop10ByOrderByIdDesc();
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
}

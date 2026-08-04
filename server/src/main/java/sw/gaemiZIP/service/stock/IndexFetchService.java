package sw.gaemiZIP.service.stock;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import sw.gaemiZIP.service.kiwoom.KiwoomTokenService;
import sw.gaemiZIP.dto.kiwoom.KiwoomIndexResponse;
import sw.gaemiZIP.dto.stock.IndexResponse;
import sw.gaemiZIP.websocket.StockWebSocketHandler;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.annotation.PostConstruct;
import org.springframework.data.redis.core.StringRedisTemplate;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class IndexFetchService {
    private final ObjectMapper objectMapper = new ObjectMapper();
    @Value("${kiwoom.api.url}")
    private String baseUrl;

    private final StringRedisTemplate redisTemplate;
    private static final String INDEX_CACHE_KEY = "stock:index:current";

    private final KiwoomTokenService tokenService; //토큰
    private final StockWebSocketHandler  webSocketHandler; //브로드캐스트
    private final WebClient.Builder webClientBuilder; //Rest 호출

    //volatile은 자바 코드의 변수를 메인 메모리에 저장 할 것을 명시하기 위해 쓰임
    //메인 메모리로부터 읽히고, 쓰기 작업은 메인 메모리로 직접 이루어짐 / Cpu캐시 쓰이지 않는다.
    private  volatile List<IndexResponse> currentIndices = Collections.emptyList();

    //컨트롤러 전달용
    public  List<IndexResponse> getCurrentIndices() { return currentIndices;}

    //현재 코스피, 코스닥 지수 요청
    private KiwoomIndexResponse callKa20001(String mrkttp, String indscd) {
        try {
            return webClientBuilder.build()
                    .post()
                    .uri(baseUrl + "/api/dostk/sect")
                    .header("authorization", "Bearer " + tokenService.getAccessToken())
                    .header("api-id", "ka20001")
                    .header("Content-Type", "application/json;charset=UTF-8")
                    .bodyValue(Map.of("mrkt_tp", mrkttp, "inds_cd", indscd))
                    .retrieve()
                    .bodyToMono(KiwoomIndexResponse.class)
                    .block();


        } catch (Exception e) {
            log.error("ka20001 mrkt_tp 호출 실패 [{}]: {}", mrkttp, e.getMessage());
            log.error("ka20001 inds_cd 호출 실패 [{}]: {}", indscd, e.getMessage());

            return null;
        }
    }

    //키움증권 dto를 필요한 dto로 변경
    private IndexResponse toIndexResponse(KiwoomIndexResponse kr, String code, String name) {
        String price = parseAbsPrice(kr.getCurPrc());
        String rate = builderRate(kr.getPredPreSig(), kr.getFluRt());
        return new IndexResponse(code, name, price, rate);
    }

    private String builderRate(String sign, String rate) {
        if(rate == null || rate.isBlank()) return "0";
        String raw = rate.trim();
        return switch (sign) {
            case "1", "2" -> raw;
            case "4", "5" -> raw;
            default -> "0";
        };
    }

    private String parseAbsPrice(String val) {
        if(val == null || val.isBlank()) return "0";

        try{
            return String.valueOf(Math.abs(Long.parseLong(val.trim())));
        }catch (NumberFormatException e){
            return val.trim().replaceFirst("^[+-]", "");
        }
    }

    @Scheduled(fixedDelay = 7_000, initialDelay = 7_000)
    public void fetchIndices() throws InterruptedException {
        KiwoomIndexResponse kospi = callKa20001("0","001"); //코스피
        Thread.sleep(1000);
        KiwoomIndexResponse kosdaq = callKa20001("1","101"); //코스닥
        Thread.sleep(1000);
        KiwoomIndexResponse kospi200 =  callKa20001("2","201"); //코스피 200

        if(kospi == null || kosdaq == null || kospi200 == null) {
            log.warn("지수 조회 실패 - 이전 캐시 유지");
            return;
        }

        List<IndexResponse> indices = List.of(
                toIndexResponse(kospi, "001", "코스피"),
                toIndexResponse(kosdaq, "101", "코스닥" ),
                toIndexResponse(kospi200, "201", "코스피200")
        );

        currentIndices = indices;

        try{
            String indiceload = objectMapper.writeValueAsString(indices);
            redisTemplate.opsForValue().set(INDEX_CACHE_KEY, indiceload);
            webSocketHandler.broadcast("INDEX_UPDATE:" + indiceload);
            log.warn("코스피/코스닥/코스피200 요청결과 : "+indiceload);
        }catch (Exception e){
            log.error("지수 브로드캐스트 실패 : {}", e.getMessage());
        }
    }

    @PostConstruct
    public void initCache(){
        Optional<List<IndexResponse>> recent = loadIndicesFromRedis();
        if(recent.isPresent()) {
            currentIndices = recent.get();
            log.info("Redis에서 초기 지수 {}개 로드 완료", currentIndices.size());
            try{
                String payload = "INDEX_UPDATE:" + objectMapper.writeValueAsString(currentIndices);
                webSocketHandler.broadcast(payload);
            }catch (Exception e){
                log.warn("초기 지수 캐시 브로드캐스트 실패 ; {}", e.getMessage());
            }
        }
    }

    private Optional<List<IndexResponse>> loadIndicesFromRedis() {
        try {
            String cached = redisTemplate.opsForValue().get(INDEX_CACHE_KEY);
            if (cached == null) return Optional.empty();
            return Optional.of(objectMapper.readValue(cached, new TypeReference<List<IndexResponse>>() {}));
        } catch (Exception e) {
            log.warn("Redis 지수 역직렬화 실패 : {}", e.getMessage());
            return Optional.empty();
        }
    }
}

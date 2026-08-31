package sw.gaemiZIP.service.stock;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import sw.gaemiZIP.dto.stock.IndexResponse;
import sw.gaemiZIP.websocket.StockWebSocketHandler;

import java.util.*;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.annotation.PostConstruct;
import org.springframework.data.redis.core.StringRedisTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class IndexFetchService {
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final StringRedisTemplate redisTemplate;
    private static final String INDEX_CACHE_KEY = "stock:index:current";

    private final StockWebSocketHandler  webSocketHandler; //브로드캐스트

    //volatile은 자바 코드의 변수를 메인 메모리에 저장 할 것을 명시하기 위해 쓰임 , 메인 메모리로부터 읽히고, 쓰기 작업은 메인 메모리로 직접 이루어짐
    private  volatile List<IndexResponse> currentIndices = Collections.emptyList();

    //컨트롤러 전달용
    public  List<IndexResponse> getCurrentIndices() { return currentIndices;}

    //코스피,코스닥,코스피200 분류
    public synchronized void updateFromRealtime(String code, String index, String price, String rate){
        IndexResponse updated = new IndexResponse(code, index, price, rate);

        List<IndexResponse> next = currentIndices.stream()
                .map(i -> i.getCode().equals(code) ? updated : i)
                .toList();

        // 초기 REST 로드 전에 실시간이 먼저 들어올 수도 있으니 방어
        if (next.stream().noneMatch(i -> i.getCode().equals(code))) {
            next = new ArrayList<>(next);
            next.add(updated);
        }
        publish(next);
    }

    private synchronized void publish(List<IndexResponse> indices) {
        currentIndices = indices;

        try {

            String payload = objectMapper.writeValueAsString(indices);
            redisTemplate.opsForValue().set(INDEX_CACHE_KEY, payload);
            webSocketHandler.broadcast("INDEX_UPDATE:" + payload);

        } catch (Exception e) {

            log.error("지수 브로드캐스트 실패 : {}", e.getMessage());
        }
    }

    //초기 실행 시 지수(코스피,코스닥,코스피200) 값 가져오기
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
                log.warn("초기 지수 브로드캐스트 실패 ; {}", e.getMessage());
            }
        }
    }

    //레디스에서 지수 불러오기
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

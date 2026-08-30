package sw.gaemiZIP.service.kiwoom;


import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Slf4j
@Component
public class KiwoomRateLimiter {

    //초당 최대 4개
    private static final int permitsPerSecond = 3;

    //최대 5초
    private static final Duration maxWait = Duration.ofSeconds(10);

    private final Bucket bucket = Bucket.builder()
            .addLimit(Bandwidth.classic(permitsPerSecond, Refill.greedy(permitsPerSecond, Duration.ofSeconds(1))))
            .build();

    // 호출 직전에 부르면 토큰 있을 때까지 블로킹, 초과하면 false
    public boolean acquire() {
        try {
            boolean ok = bucket.asBlocking().tryConsume(1, maxWait);
            if(!ok) log.warn("키움 API 호출 대기 초과 {}초 - 요청 포기", maxWait.getSeconds());
            return ok;
        }
        catch (InterruptedException e){
            Thread.currentThread().interrupt();
            return false;
        }
    }

}

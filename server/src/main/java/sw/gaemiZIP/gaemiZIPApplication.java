package sw.gaemiZIP;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableJpaAuditing //시간 자동 저장
@EnableScheduling
@SpringBootApplication
public class gaemiZIPApplication {

    public static void main(String[] args) {
        SpringApplication.run(gaemiZIPApplication.class, args);
    }

}

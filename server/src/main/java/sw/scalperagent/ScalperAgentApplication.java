package sw.scalperagent;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class ScalperAgentApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScalperAgentApplication.class, args);
    }

}

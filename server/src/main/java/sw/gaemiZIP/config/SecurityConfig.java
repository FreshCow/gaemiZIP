package sw.gaemiZIP.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration // 스프링의 환경설정 파일임을 명시
@EnableWebSecurity //스프링 시큐리티 필터 체인을 활성화
public class SecurityConfig {

    @Bean // 리턴되는 암호화 객체를 스프링 빈에 등록해서 AuthService에서 꺼내 쓸 수 있게 함
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean //전체적인 보안 규칙 설정
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable) // - JWT를 사용하므로 CSRF 방어 비활성화
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // - 세션을 사용하지 않음 (무상태성 유지)
            .authorizeHttpRequests(auth -> auth
                    // 아래 주소들은 로그인 없이도 누구나 접근 가능하도록 허용
                    .requestMatchers("/api/auth/**", "/ws/**").permitAll()
                    // 그 외의 모든 요청은 토큰이 있어야만(인증되어야만) 접근 가능
                    .anyRequest().authenticated()
            );
        return http.build();
    }
}

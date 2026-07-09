package sw.gaemiZIP.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import sw.gaemiZIP.util.JwtUtil;

import java.util.List;

@Configuration // 스프링의 환경설정 파일임을 명시
@EnableWebSecurity //스프링 시큐리티 필터 체인을 활성화
@RequiredArgsConstructor //JwtUtil을 주입받기 위해 추가
public class SecurityConfig {

    private final JwtUtil jwtUtil;

    @Bean // 리턴되는 암호화 객체를 스프링 빈에 등록해서 AuthService에서 꺼내 쓸 수 있게 함
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean //전체적인 보안 규칙 설정
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable) // - JWT를 사용하므로 CSRF 방어 비활성화
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // - 세션을 사용하지 않음 (무상태성 유지)
                .authorizeHttpRequests(auth -> auth
                        // 탈퇴·비밀번호 확인은 반드시 인증 필요 (permitAll인 /api/auth/** 보다 먼저 선언)
                        .requestMatchers(HttpMethod.DELETE, "/api/auth/me").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/auth/verify-password").authenticated()
                        .requestMatchers("/api/auth/**", "/ws/**", "/api/news/**", "/api/ai/**").permitAll()
                        .requestMatchers("/api/boards/**", "/api/comments/**").permitAll()
                        .requestMatchers("/api/stocks/search", "/api/stocks/*/price", "/api/stocks/*/info", "/api/stocks/*/chart", "/api/stocks/*/news").permitAll()
                        .requestMatchers("/admin/**").hasRole("ADMIN")
                        // 그 외의 모든 요청은 토큰이 있어야만(인증되어야만) 접근 가능
                        .anyRequest().authenticated()
                )

                .addFilterBefore(new JwtAuthenticationFilter(jwtUtil), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // 1. 허용할 프론트엔드 도메인 (Next.js 주소)
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));

        // 2. 허용할 HTTP 메서드
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // 3. 허용할 헤더
        configuration.setAllowedHeaders(List.of("*"));

        // 4. 인증 정보(토큰, 쿠키 등)를 포함한 요청을 허용할지 여부
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration); // 모든 API 경로("/**")에 위 규칙 적용
        return source;
    }
}

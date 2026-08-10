package sw.gaemiZIP.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import sw.gaemiZIP.util.JwtUtil;

import java.io.IOException;
import java.util.List;

@RequiredArgsConstructor //final이 붙은 생성자에 자동 주입
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;
    private static final String LOGIN_CACHE_KEY = "auth:session:";


    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String path = request.getRequestURI();
        // 인증이 필요 없는 공개 엔드포인트만 JWT 필터 스킵
        // verify-password, /me 등 인증 필요 엔드포인트는 필터를 통과해야 함
        return path.equals("/api/auth/login")
                || path.equals("/api/auth/signup")
                || path.equals("/api/auth/google");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {

        // HTTP헤더에서 토큰 꺼내기
        String token = resolveToken(request);

        if(token != null && jwtUtil.validateToken(token)){
            String subject = jwtUtil.getSubjectFromToken(token);
            String activeToken = redisTemplate.opsForValue().get(LOGIN_CACHE_KEY + subject);

            if(token.equals(activeToken)){
                String role = jwtUtil.getRoleFromToken(token);
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(subject, null, List.of(new SimpleGrantedAuthority(role)));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request, response);
    }


    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if(StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")){
            return bearerToken.substring(7);
        }
        return null;
    }
}

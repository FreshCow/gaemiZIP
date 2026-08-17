package sw.gaemiZIP.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component // 스프링 빈으로 등록하여 어디서든 주입받아 사용 가능하게 함
public class JwtUtil {

    @Value("${jwt.secret}") //application.yml에 설정한 jwt.secret 값을 가져옴
    private String secretKey;

    private Key key;

    @PostConstruct //의존성 주입 완료 후 메서드를 자동 실행하여 초기화 진행
    public void init(){
        this.key = Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    public  String generateToken(String subject, String role, long expirationMillis){
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMillis);

        return Jwts.builder()
                .setSubject(subject)
                .claim("role", role) // 추가 정보를 키-밸류 형태로 저장
                .setIssuedAt(now)// 토큰 발행 시간
                .setExpiration(expiryDate) //토큰 만료 시간
                .signWith(key, SignatureAlgorithm.HS256) // 비밀키와 HS256 알고리즘으로 암호화
                .compact();
    }


    public String getSubjectFromToken(String token){
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getSubject();
    }

    public String getRoleFromToken(String token){
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("role", String.class);
    }

    //토큰 유효성 검증
    public boolean validateToken(String token){
        try{
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        }catch (Exception e){
            return false;
        }
    }
}

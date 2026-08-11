package sw.gaemiZIP.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 이 프로젝트의 다른 에러 응답들(AuthController 등)과 동일하게 순수 문자열로 반환
    @ExceptionHandler(InappropriateContentException.class)
    public ResponseEntity<String> handleInappropriateContent(InappropriateContentException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }
}

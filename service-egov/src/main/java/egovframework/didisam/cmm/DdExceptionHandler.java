package egovframework.didisam.cmm;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class DdExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(DdExceptionHandler.class);

    public static ResponseEntity<Map<String, Object>> body(int status, String code, String message) {
        Map<String, Object> m = new LinkedHashMap<>(); m.put("error", code); m.put("message", message);
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON).body(m);
    }
    @ExceptionHandler(DdException.class)
    public ResponseEntity<Map<String, Object>> dd(DdException e) { return body(e.getStatus(), e.getCode(), e.getMessage()); }
    /* Node 서버: 등록되지 않은 "메서드 경로" 조합은 모두 404 */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> method(Exception e) { return body(404, "not_found", "없는 주소입니다."); }
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> nores(Exception e) { return body(404, "not_found", "없는 주소입니다."); }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> any(Exception e) {
        log.error("api error: {}", e.toString());
        return body(500, "server", "서버 오류가 발생했습니다.");
    }
}

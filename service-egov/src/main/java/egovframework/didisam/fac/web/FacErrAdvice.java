package egovframework.didisam.fac.web;

import egovframework.didisam.fac.service.impl.FacErr;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** v40 오류에 덧붙이는 값(until · expected · auto · candidates 등) — Node {error, message, ...e.extra}와 같은 응답 */
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FacErrAdvice {
    @ExceptionHandler(FacErr.class)
    public ResponseEntity<Map<String, Object>> fac(FacErr e) {
        Map<String, Object> m = new LinkedHashMap<>(); m.put("error", e.getCode()); m.put("message", e.getMessage()); m.putAll(e.extra);
        return ResponseEntity.status(e.getStatus()).contentType(MediaType.APPLICATION_JSON).body(m);
    }
}

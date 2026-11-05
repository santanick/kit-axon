package egovframework.didisam.cmm;

import java.util.LinkedHashMap;
import java.util.Map;
import jakarta.annotation.Resource;
import org.egovframe.rte.fdl.cmmn.exception.EgovBizException;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
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
    @Resource(name = "egovIdGnrService") private EgovIdGnrService idGnr;

    /** 업무 예외(표준프레임워크 EgovBizException): 메시지 키 dd.{상태}.{코드}[.구분] → {error: 코드, message: 문구} */
    @ExceptionHandler(EgovBizException.class)
    public ResponseEntity<Map<String, Object>> biz(EgovBizException e) {
        String[] k = String.valueOf(e.getMessageKey()).split("\\.");
        int st = 500; String code = "server";
        if (k.length >= 3 && "dd".equals(k[0])) { try { st = Integer.parseInt(k[1]); code = k[2]; } catch (NumberFormatException ignore) { } }
        return body(st, code, e.getMessage());
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
        String tid; try { tid = idGnr.getNextStringId(); } catch (Exception x) { tid = "-"; }
        log.error("api error [{}]: {}", tid, e.toString());
        return body(500, "server", "서버 오류가 발생했습니다.");
    }
}

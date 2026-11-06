package egovframework.didisam.lms.l.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;

/** 학사 LMS 묶음 L 서비스 — Node mod-l.js와 같은 규격 */
public interface LmsLService {
    ResponseEntity<String> run(String op, String method, byte[] body, HttpServletRequest req) throws Exception;
}

package egovframework.didisam.lms.p.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;

/** 학사 LMS 묶음 P 서비스 — Node mod-p.js와 같은 규격 */
public interface LmsPService {
    ResponseEntity<String> run(String op, String method, byte[] body, HttpServletRequest req) throws Exception;
}

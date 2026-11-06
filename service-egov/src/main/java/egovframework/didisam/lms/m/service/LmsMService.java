package egovframework.didisam.lms.m.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;

/** 학사 LMS 묶음 M 서비스 — Node mod-m.js와 같은 규격 */
public interface LmsMService {
    ResponseEntity<String> run(String op, String method, byte[] body, HttpServletRequest req) throws Exception;
}

package egovframework.didisam.lms.g.service;

import jakarta.servlet.http.HttpServletRequest;

/** 묶음 G 서비스 — 경로 키("메서드 경로")로 선언된 처리 실행 */
public interface LmsGService {
    Object call(String route, HttpServletRequest req, byte[] body) throws Exception;
}

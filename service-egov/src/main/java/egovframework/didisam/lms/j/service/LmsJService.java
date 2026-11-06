package egovframework.didisam.lms.j.service;

import jakarta.servlet.http.HttpServletRequest;

/** 묶음 J 서비스 — 경로 키("메서드 경로")로 선언된 처리 실행 */
public interface LmsJService {
    Object call(String route, HttpServletRequest req, byte[] body) throws Exception;
}

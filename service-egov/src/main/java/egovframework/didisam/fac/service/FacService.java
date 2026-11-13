package egovframework.didisam.fac.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** v40 시설 · 장비 예약 — Node service/server/fac와 같은 /api(02 명세 5절) */
public interface FacService {
    /** 학습자 인증 함수(PubServiceImpl.lauth): 로그인 세션 또는 null */
    @FunctionalInterface interface LAuth { Map<String, Object> get() throws Exception; }
    /** /api/pub/{tid}/fac-* — key = "{메서드} {act}" */
    Object pub(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception;
    /** /api/fac/* — op는 경로 이름(예: "POST bookings/approve"), id는 경로의 :id */
    Object admin(HttpServletRequest req, HttpServletResponse res, String op, String id, byte[] body) throws Exception;
}

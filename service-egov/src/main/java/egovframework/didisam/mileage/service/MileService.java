package egovframework.didisam.mileage.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** v42 학습 마일리지 — Node service/server/mileage와 같은 /api(04-data-api 5절). 업무 규칙은 SQL 함수 mil_*(Node 마이그레이션 소유)를 부르기만 한다 */
public interface MileService {
    @FunctionalInterface interface LAuth { Map<String, Object> get() throws Exception; }
    /** /api/pub/{tid}/mile-* — key = "{메서드} {act}" */
    Object pub(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception;
    /** /api/mileage/* — op는 경로 이름(예: "POST approvals/decide"), id는 경로의 :id */
    Object admin(HttpServletRequest req, HttpServletResponse res, String op, String id, byte[] body) throws Exception;
}

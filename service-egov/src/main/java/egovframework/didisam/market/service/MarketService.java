package egovframework.didisam.market.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** 디디쌤 콘텐츠 마켓 v1.1 — Node service/server/market와 같은 /api/market/* · /api/pub/{tid}/mk-*(서비스 기획서 v1.1 8장 · dev-addendum 3절) */
public interface MarketService {
    @FunctionalInterface interface LAuth { Map<String, Object> get() throws Exception; }
    /** /api/market/** — 경로 표는 서비스가 판정(없으면 404 not_found) */
    Object admin(HttpServletRequest req, HttpServletResponse res, byte[] body) throws Exception;
    /** /api/pub/{tid}/mk-* — key = "{메서드} {act}" */
    Object pub(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception;
}

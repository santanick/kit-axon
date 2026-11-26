package egovframework.didisam.group.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** 디디쌤 통합 센터(여러 기관 묶음 관리 · 통합 모니터링) — Node service/server/group와 같은 /api/group/* (기획서 F/grp/spec.md 1 · 2절) */
public interface GroupService {
    /** /api/group/** — 경로 표는 서비스가 판정(없으면 404 not_found) */
    Object route(HttpServletRequest req, HttpServletResponse res, byte[] body) throws Exception;
}

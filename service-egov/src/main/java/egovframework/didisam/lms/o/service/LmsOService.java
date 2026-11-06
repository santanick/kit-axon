package egovframework.didisam.lms.o.service;

import jakarta.servlet.http.HttpServletRequest;

/** 묶음 O(AI) — Node service/server/lms/mod-o.js와 같은 경로 · 같은 JSON. key = "메서드 /api/lms/o/…" */
public interface LmsOService {
    Object handle(String key, HttpServletRequest req, byte[] body) throws Exception;
}

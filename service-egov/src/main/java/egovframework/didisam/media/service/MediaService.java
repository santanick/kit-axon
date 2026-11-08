package egovframework.didisam.media.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** 홈페이지 이미지(Node media.js /api/media 와 같은 규격) */
public interface MediaService {
    Map<String, Object> upload(Map<String, Object> a, byte[] raw, String name) throws Exception;
    Map<String, Object> list(Map<String, Object> a, String limit) throws Exception;
    /** 공개 조회 — 응답을 직접 쓴다 */
    void get(String id, HttpServletRequest req, HttpServletResponse res) throws Exception;
    Map<String, Object> delete(Map<String, Object> a, String id) throws Exception;
}

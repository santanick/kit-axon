package egovframework.didisam.lms.d.service;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/** 학사 LMS 묶음 D 서비스 — 강의 게시판(공지 · Q&A · 자료실 · 1:1 상담 · 댓글 · 발송 대기) */
public interface LmsDService {
    Object call(Map<String, Object> a, String op, HttpServletRequest req, byte[] body) throws Exception;
}

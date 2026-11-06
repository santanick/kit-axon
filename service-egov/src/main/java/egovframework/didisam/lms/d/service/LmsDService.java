package egovframework.didisam.lms.d.service;

import jakarta.servlet.http.HttpServletRequest;

/** 학사 LMS 묶음 D 서비스 — 강의 게시판(공지 · Q&A · 자료실 · 1:1 상담 · 댓글 · 발송 대기) */
public interface LmsDService {
    /** 신원(스튜디오 세션 또는 학습자 포털 세션)은 공용 처리(LmsBcdCore)가 확인한다 */
    Object call(String op, HttpServletRequest req, byte[] body) throws Exception;
}

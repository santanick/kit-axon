package egovframework.didisam.lms.b.service;

import jakarta.servlet.http.HttpServletRequest;

/** 학사 LMS 묶음 B 서비스 — 강의실 구성(주차 · 차시 · 자원 · SCORM · 조건부/순차/수준별/적응형 · 템플릿 · 복사 · 백업 · 휴지통 · 버전 · 공유 · 역할/메뉴) */
public interface LmsBService {
    /** 신원(스튜디오 세션 또는 학습자 포털 세션)은 공용 처리(LmsBcdCore)가 확인한다 */
    Object call(String op, HttpServletRequest req, byte[] body) throws Exception;
}

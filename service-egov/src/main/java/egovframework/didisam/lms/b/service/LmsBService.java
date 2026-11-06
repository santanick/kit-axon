package egovframework.didisam.lms.b.service;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/** 학사 LMS 묶음 B 서비스 — 강의실 구성(주차 · 차시 · 자원 · SCORM · 조건부/순차/수준별/적응형 · 템플릿 · 복사 · 백업 · 휴지통 · 버전 · 공유 · 역할/메뉴) */
public interface LmsBService {
    Object call(Map<String, Object> a, String op, HttpServletRequest req, byte[] body) throws Exception;
}

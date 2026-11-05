package egovframework.didisam.lms.i.service.impl;

import java.util.List;
import java.util.Map;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 묶음 I 매퍼(lms_i.xml) — 문장마다 응답 JSON 문자열(첫 행을 쓴다 — Node rows[0]과 같음) */
@EgovMapper
public interface LmsIMapper {
    List<String> seed(Map<String, Object> p);
    List<String> contents(Map<String, Object> p);
    List<String> contentAdd(Map<String, Object> p);
    List<String> playStart(Map<String, Object> p);
    List<String> beatCheck(Map<String, Object> p);
    List<String> beatEvents(Map<String, Object> p);
    List<String> beatSave(Map<String, Object> p);
    List<String> playEnd(Map<String, Object> p);
    List<String> progress(Map<String, Object> p);
    List<String> subParse(Map<String, Object> p);
    List<String> subCues(Map<String, Object> p);
    List<String> subs(Map<String, Object> p);
    List<String> quizAdd(Map<String, Object> p);
    List<String> quizzes(Map<String, Object> p);
    List<String> quizAnswer(Map<String, Object> p);
    List<String> workload(Map<String, Object> p);
    List<String> history(Map<String, Object> p);
    List<String> activity(Map<String, Object> p);
}

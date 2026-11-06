package egovframework.didisam.lms.j.service.impl;

import java.util.List;
import java.util.Map;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 묶음 J 매퍼(lms_j.xml) — 문장마다 응답 JSON 문자열(첫 행을 쓴다 — Node rows[0]과 같음) */
@EgovMapper
public interface LmsJMapper {
    List<String> risk(Map<String, Object> p);
    List<String> snapshot(Map<String, Object> p);
    List<String> rules(Map<String, Object> p);
    List<String> ruleSet(Map<String, Object> p);
    List<String> ruleDel(Map<String, Object> p);
    List<String> targets(Map<String, Object> p);
    List<String> insights(Map<String, Object> p);
    List<String> feedback(Map<String, Object> p);
    List<String> feedbackSave(Map<String, Object> p);
    List<String> feedbacks(Map<String, Object> p);
    List<String> reflAdd(Map<String, Object> p);
    List<String> reflList(Map<String, Object> p);
    List<String> reflComment(Map<String, Object> p);
    List<String> report(Map<String, Object> p);
}

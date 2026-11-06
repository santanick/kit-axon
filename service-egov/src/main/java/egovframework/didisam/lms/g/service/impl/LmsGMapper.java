package egovframework.didisam.lms.g.service.impl;

import java.util.List;
import java.util.Map;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 묶음 G 매퍼(lms_g.xml) — 문장마다 응답 JSON 문자열(첫 행을 쓴다 — Node rows[0]과 같음) */
@EgovMapper
public interface LmsGMapper {
    List<String> seedTerm(Map<String, Object> p);
    List<String> seedCourse(Map<String, Object> p);
    List<String> seedPersons(Map<String, Object> p);
    List<String> seedSection(Map<String, Object> p);
    List<String> seedSessions(Map<String, Object> p);
    List<String> seedEnroll(Map<String, Object> p);
    List<String> seedRule(Map<String, Object> p);
    List<String> sections(Map<String, Object> p);
    List<String> sessions(Map<String, Object> p);
    List<String> sessionSet(Map<String, Object> p);
    List<String> makeup(Map<String, Object> p);
    List<String> ruleGet(Map<String, Object> p);
    List<String> ruleSet(Map<String, Object> p);
    List<String> ruleCheck(Map<String, Object> p);
    List<String> codeIssue(Map<String, Object> p);
    List<String> qr(Map<String, Object> p);
    List<String> checkin(Map<String, Object> p);
    List<String> mark(Map<String, Object> p);
    List<String> adjust(Map<String, Object> p);
    List<String> copy(Map<String, Object> p);
    List<String> online(Map<String, Object> p);
    List<String> roster(Map<String, Object> p);
    List<String> export(Map<String, Object> p);
    List<String> beacons(Map<String, Object> p);
    List<String> beaconSet(Map<String, Object> p);
    List<String> anomalies(Map<String, Object> p);
    List<String> my(Map<String, Object> p);
    List<String> log(Map<String, Object> p);
}

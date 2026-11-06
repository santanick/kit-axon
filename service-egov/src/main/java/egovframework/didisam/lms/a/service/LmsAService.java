package egovframework.didisam.lms.a.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;

/** v30 묶음 A 학사 LMS(강좌 · 분반) — Node service/server/lms/mod-a.js /api/lms/a/* 와 같은 규격(service/lms-domain/API-a.md) */
public interface LmsAService {
    Object overview(HttpServletRequest req) throws Exception;
    Object term(JsonNode b, HttpServletRequest req) throws Exception;
    Object termDelete(JsonNode b, HttpServletRequest req) throws Exception;
    Object unit(JsonNode b, HttpServletRequest req) throws Exception;
    Object unitDelete(JsonNode b, HttpServletRequest req) throws Exception;
    Object course(JsonNode b, HttpServletRequest req) throws Exception;
    Object courseDelete(JsonNode b, HttpServletRequest req) throws Exception;
    Object section(JsonNode b, HttpServletRequest req) throws Exception;
    Object sectionDelete(JsonNode b, HttpServletRequest req) throws Exception;
    Object staff(JsonNode b, HttpServletRequest req) throws Exception;
    Object staffDelete(JsonNode b, HttpServletRequest req) throws Exception;
    Object enrollments(String sectionId, String grading, HttpServletRequest req) throws Exception;
    Object enroll(JsonNode b, HttpServletRequest req) throws Exception;
    Object enrollDrop(JsonNode b, HttpServletRequest req) throws Exception;
    Object persons(String q, String kind, HttpServletRequest req) throws Exception;
    Object person(JsonNode b, HttpServletRequest req) throws Exception;
    Object importCsv(JsonNode b, HttpServletRequest req) throws Exception;
    Object sync(JsonNode b, HttpServletRequest req) throws Exception;
    Object syncHistory(String sectionId, HttpServletRequest req) throws Exception;
    Object merge(JsonNode b, HttpServletRequest req) throws Exception;
    Object unmerge(JsonNode b, HttpServletRequest req) throws Exception;
    Object request(JsonNode b, HttpServletRequest req) throws Exception;
    Object requestDecide(JsonNode b, HttpServletRequest req) throws Exception;
    Object scope(JsonNode b, HttpServletRequest req) throws Exception;
    Object my(byte[] body, boolean post, HttpServletRequest req) throws Exception;
}

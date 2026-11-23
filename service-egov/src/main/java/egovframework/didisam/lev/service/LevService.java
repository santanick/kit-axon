package egovframework.didisam.lev.service;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;

/** v46 학습 이벤트 표준 — Node service/server/lev.js와 같은 규칙 */
public interface LevService {
    /** 학습자 묶음(최대 50건, 신뢰 C) — POST /api/pub/{tid}/lev */
    Map<String, Object> ingest(String tid, String sid, byte[] body) throws Exception;
    /** 이벤트 저장(검증 포함) — 호출부의 기관 범위 트랜잭션(inTenant) 안에서 부른다. src client|server, trust A|C */
    int insert(String tid, String sid, java.util.List<com.fasterxml.jackson.databind.node.ObjectNode> ev, String src, String trust) throws Exception;
    /** GET /api/lev?cls=&sid=&verb=&after= — 운영자 전체, 교수자는 담당 반만 */
    Map<String, Object> list(Map<String, Object> a, HttpServletRequest q) throws Exception;
}

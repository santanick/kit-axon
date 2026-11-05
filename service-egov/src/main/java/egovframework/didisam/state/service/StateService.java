package egovframework.didisam.state.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;

/** 기관 상태(데이터룸 문서) 저장 · 조회 — 낙관적 잠금(rev) + 기관 범위 RLS */
public interface StateService {
    Map<String, Object> get(Map<String, Object> a);
    Map<String, Object> put(Map<String, Object> a, JsonNode b);
}

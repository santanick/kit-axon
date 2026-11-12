package egovframework.didisam.state.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;

/** 기관 상태(데이터룸 문서) 저장 · 조회 — 낙관적 잠금(rev) + 기관 범위 RLS */
public interface StateService {
    Map<String, Object> get(Map<String, Object> a) throws Exception;
    Map<String, Object> put(Map<String, Object> a, JsonNode b) throws Exception;
    /** v36 남은 학습자 로그인 계정(접근코드 해시)을 배치로 마저 만든다 — { pending } */
    Map<String, Object> syncPending(Map<String, Object> a) throws Exception;
    /** 교강사 담당 범위(배정 과정 · 수강생) */
    egovframework.didisam.cmm.DdModule.Scope scope(Map<String, Object> a) throws Exception;
}

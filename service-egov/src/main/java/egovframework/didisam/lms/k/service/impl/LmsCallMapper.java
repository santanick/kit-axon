package egovframework.didisam.lms.k.service.impl;

import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 학사 LMS 묶음 K · N · Q 공통 호출 매퍼(lms_k.xml) — 업무 규칙은 DB 함수 lms_{묶음}_{op}에 있고 Node mod-*.js와 같은 함수를 부른다 */
@EgovMapper
public interface LmsCallMapper {
    String call(@Param("pfx") String pfx, @Param("op") String op, @Param("actor") String actor, @Param("args") String args);
    java.util.Map<String, Object> selectLearner(@Param("id") String id);
    void insertAudit(@Param("tid") String tid, @Param("actor") String actor, @Param("action") String action, @Param("detail") String detail);
}

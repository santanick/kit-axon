package egovframework.didisam.lms.b.service.impl;

import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 매퍼 XML: egovframework/mapper/lms_b.xml — 업무 규칙은 SQL 함수 lms_b_api(sql/20_b.sql) */
@EgovMapper
public interface LmsBMapper {
    String api(@Param("op") String op, @Param("args") String args, @Param("actor") String actor);
    /** SFR-038 강의자료 관리(sql/99_b_material.sql lms_bm_api) */
    String apiM(@Param("op") String op, @Param("args") String args, @Param("actor") String actor);
    /** 학습자 포털 세션(기관 역할 밖에서 조회) */
    java.util.Map<String, Object> selectLearner(@Param("hash") String hash);
}

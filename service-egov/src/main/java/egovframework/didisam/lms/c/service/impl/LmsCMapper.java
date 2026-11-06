package egovframework.didisam.lms.c.service.impl;

import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 매퍼 XML: egovframework/mapper/lms_c.xml — 업무 규칙은 SQL 함수 lms_c_api(sql/25_c.sql) */
@EgovMapper
public interface LmsCMapper {
    String api(@Param("op") String op, @Param("args") String args, @Param("actor") String actor);
}

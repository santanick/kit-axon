package egovframework.didisam.lms.d.service.impl;

import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 매퍼 XML: egovframework/mapper/lms_d.xml — 업무 규칙은 SQL 함수 lms_d_api(sql/28_d.sql) */
@EgovMapper
public interface LmsDMapper {
    String api(@Param("op") String op, @Param("args") String args, @Param("actor") String actor);
}

package egovframework.didisam.lms.m.service.impl;

import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

@EgovMapper
public interface LmsMMapper {
    /** SQL 디스패처 lms_m(op, me, q) — 결과 jsonb를 문자열로 */
    String call(@Param("op") String op, @Param("me") String me, @Param("q") String q);
}

package egovframework.didisam.lms.g.service.impl;

import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 묶음 G · I · J 학습자 포털 세션 조회(lms_g_auth.xml) — 기관 범위 밖(plain)에서 쓴다 */
@EgovMapper
public interface LmsAuthMapper {
    Map<String, Object> learnerSession(@Param("id") String id);
}

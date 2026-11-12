package egovframework.didisam.lms.g.service.impl;

import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** x3 · SFR-016 본인 확인 SQL 함수 호출(lms_g_idv.xml) — fn은 LmsGIdvServiceImpl 라우트 표의 고정 이름만 들어온다(사용자 입력 아님) */
@EgovMapper
public interface LmsGIdvMapper {
    String call(@Param("fn") String fn, @Param("ctx") String ctx, @Param("a") String a);
}

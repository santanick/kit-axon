package egovframework.didisam.lms.e.service.impl;

import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 묶음 E SQL 함수 호출 — fn은 LmsEServiceImpl 라우트 표의 고정 이름만 들어온다(사용자 입력 아님) */
@EgovMapper
public interface LmsEMapper {
    String call(@Param("fn") String fn, @Param("ctx") String ctx, @Param("a") String a);
}

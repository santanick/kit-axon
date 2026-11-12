package egovframework.didisam.lms.live.service.impl;

import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** x2 실시간 수업 SQL 함수 호출 — fn은 LmsLiveServiceImpl 라우트 표의 고정 이름만 들어온다(사용자 입력 아님) */
@EgovMapper
public interface LmsLiveMapper {
    String call(@Param("fn") String fn, @Param("ctx") String ctx, @Param("a") String a);
}

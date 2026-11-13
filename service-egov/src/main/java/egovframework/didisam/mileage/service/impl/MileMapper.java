package egovframework.didisam.mileage.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** v42 학습 마일리지 — MileMapper.xml(모두 기관 범위 inTenant 안에서 호출). 표 · 함수 정의는 service/server/mileage/sql/*(Node 마이그레이션 소유) */
@EgovMapper
public interface MileMapper {
    List<String> selectTenantIds();
    Map<String, Object> selectOn(@Param("tid") String tid);
    /** 업무 규칙 SQL 함수 호출 — fn은 MileServiceImpl.FN 허용 목록만(이름은 문자열 치환이므로 외부 값 금지) */
    String call(@Param("fn") String fn, @Param("tid") String tid, @Param("a") String argsJson);
}

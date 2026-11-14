package egovframework.didisam.mileage.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** v42 학습 마일리지 — MileMapper.xml. 표 · 업무 규칙 함수(mil_*)는 service/server/mileage/sql/*(Node 마이그레이션 소유).
 *  Node mod-admin · mod-pub와 같은 SQL 문장을 그대로 쓰도록 문장은 MileSql 상수(코드 안 고정 문자열)로 두고, 값은 언제나 바인딩(#{p.pN})으로만 넘긴다. */
@EgovMapper
public interface MileMapper {
    /** 행 조회 — sql은 MileSql 상수만(외부 값 금지), p는 {p1, p2, …} */
    List<Map<String, Object>> rows(@Param("sql") String sql, @Param("p") Map<String, Object> p);
    /** 변경 — 영향 행 수 */
    int exec(@Param("sql") String sql, @Param("p") Map<String, Object> p);
}

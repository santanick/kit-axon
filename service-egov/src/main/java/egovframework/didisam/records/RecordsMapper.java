package egovframework.didisam.records;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 가디언 4차 기록 · 데이터 — Node service/server/records.js와 같은 SQL. 표 · 함수는 Node 마이그레이션(core/records_v1)이 만든다 */
@EgovMapper
public interface RecordsMapper {
    List<Map<String, Object>> selectStaff(@Param("tid") String tid);
    Map<String, Object> selectLastReview(@Param("tid") String tid);
    String selectKrOnly(@Param("tid") String tid);
    int updateKrOnly(@Param("tid") String tid, @Param("on") boolean on);
    String purge();
}

package egovframework.didisam.cpl.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

@EgovMapper
public interface CplMapper {
    Map<String, Object> selectPolicy(@Param("tid") String tid);
    int countAttendToday(@Param("tid") String tid, @Param("sid") String sid, @Param("cls") String cls);
    long selectToday(@Param("tid") String tid, @Param("sid") String sid);
    void insertLog(@Param("tid") String tid, @Param("sid") String sid, @Param("kind") String kind, @Param("cls") String cls, @Param("item") String item, @Param("secs") int secs, @Param("ip") String ip, @Param("ua") String ua);
    List<Map<String, Object>> selectSummary(@Param("tid") String tid);
    List<Map<String, Object>> selectLogs(@Param("tid") String tid, @Param("sid") String sid, @Param("n") int n);
    int deleteOtherSessions(@Param("tid") String tid, @Param("sid") String sid, @Param("keep") String keep);
}

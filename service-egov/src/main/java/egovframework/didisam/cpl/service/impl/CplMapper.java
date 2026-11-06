package egovframework.didisam.cpl.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

@EgovMapper
public interface CplMapper {
    Map<String, Object> selectPolicy(@Param("tid") String tid);
    int countAttendToday(@Param("tid") String tid, @Param("sid") String sid, @Param("cls") String cls);
    Double selectBeatElapsed(@Param("tid") String tid, @Param("sid") String sid);
    Map<String, Object> selectExamClass(@Param("tid") String tid, @Param("cls") String cls);
    Map<String, Object> selectOpenExam(@Param("tid") String tid, @Param("sid") String sid, @Param("cls") String cls, @Param("item") String item);
    int expireExam(@Param("id") String id);
    List<Integer> selectExamScores(@Param("tid") String tid, @Param("sid") String sid, @Param("cls") String cls, @Param("item") String item);
    void insertExam(@Param("id") String id, @Param("tid") String tid, @Param("sid") String sid, @Param("cls") String cls, @Param("item") String item, @Param("order") String order, @Param("ends") Long ends);
    Map<String, Object> selectExamAttempt(@Param("id") String id, @Param("tid") String tid, @Param("sid") String sid);
    int submitExam(@Param("id") String id, @Param("answers") String answers, @Param("score") int score, @Param("pass") Boolean pass, @Param("late") boolean late);
    List<Map<String, Object>> selectExams(@Param("tid") String tid);
    long selectToday(@Param("tid") String tid, @Param("sid") String sid);
    void insertLog(@Param("tid") String tid, @Param("sid") String sid, @Param("kind") String kind, @Param("cls") String cls, @Param("item") String item, @Param("secs") int secs, @Param("ip") String ip, @Param("ua") String ua);
    List<Map<String, Object>> selectSummary(@Param("tid") String tid);
    List<Map<String, Object>> selectLogs(@Param("tid") String tid, @Param("sid") String sid, @Param("n") int n);
    int deleteOtherSessions(@Param("tid") String tid, @Param("sid") String sid, @Param("keep") String keep);
}

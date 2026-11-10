package egovframework.didisam.pub.service.impl;

import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

@EgovMapper
public interface PubMapper {
    Map<String, Object> selectSitePub(@Param("tid") String tid);
    Map<String, Object> selectOg(@Param("tid") String tid); /* v37 L2 og 메타 */
    Map<String, Object> selectLearner(@Param("tid") String tid, @Param("sid") String sid);
    String selectIdleH(@Param("tid") String tid);
    void touchLearnerSession(@Param("id") String id);
    Map<String, Object> selectLearnerDept(@Param("tid") String tid, @Param("sid") String sid);
    int touchLearner(@Param("tid") String tid, @Param("sid") String sid);
    Map<String, Object> selectLp(@Param("tid") String tid, @Param("sid") String sid);
    Map<String, Object> selectDoc(@Param("tid") String tid);
    Map<String, Object> selectMeExtra(@Param("tid") String tid, @Param("sid") String sid);
    void upsertProgress(@Param("tid") String tid, @Param("sid") String sid, @Param("lp") String lp, @Param("bytes") int bytes);
    Map<String, Object> selectTutorCtx(@Param("tid") String tid);
    int incUsage(@Param("tid") String tid, @Param("day") String day);
    int addTokens(@Param("tid") String tid, @Param("day") String day, @Param("tin") long tin, @Param("tout") long tout);
    void insertLearnerSession(@Param("id") String id, @Param("tid") String tid, @Param("sid") String sid);
    Map<String, Object> selectLearnerSession(@Param("id") String id);
    int deleteLearnerSession(@Param("id") String id);
    /* v33 요청함 · 첫 로그인 동의 */
    java.util.List<java.util.Map<String, Object>> selectEvents(@org.apache.ibatis.annotations.Param("tid") String tid, @org.apache.ibatis.annotations.Param("after") long after);
    Long insertEventX(@org.apache.ibatis.annotations.Param("tid") String tid, @org.apache.ibatis.annotations.Param("sid") String sid, @org.apache.ibatis.annotations.Param("type") String type, @org.apache.ibatis.annotations.Param("xid") String xid, @org.apache.ibatis.annotations.Param("data") String data);
    int tenantStateExists(@org.apache.ibatis.annotations.Param("tid") String tid);
    int deleteOldEvents(@org.apache.ibatis.annotations.Param("tid") String tid);
    java.util.Map<String, Object> selectConsent(@org.apache.ibatis.annotations.Param("tid") String tid, @org.apache.ibatis.annotations.Param("sid") String sid);
    int setConsent(@org.apache.ibatis.annotations.Param("tid") String tid, @org.apache.ibatis.annotations.Param("sid") String sid, @org.apache.ibatis.annotations.Param("v") String v);
}

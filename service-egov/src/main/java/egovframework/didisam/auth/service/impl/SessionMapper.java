package egovframework.didisam.auth.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 가디언 4차 운영자 세션 정책(Node session.js와 같은 SQL) */
@EgovMapper
public interface SessionMapper {
    int deleteById(@Param("id") String id);
    void insert(@Param("id") String id, @Param("uid") String uid, @Param("tid") String tid, @Param("min") int min, @Param("agent") String agent, @Param("band") String band);
    int evict(@Param("uid") String uid, @Param("keep") int keep);
    String selectEmail(@Param("uid") String uid);
    int countOthers(@Param("uid") String uid, @Param("id") String id, @Param("maxH") int maxH);
    Map<String, Object> selectAuth(@Param("id") String id, @Param("maxH") int maxH);
    void slide(@Param("id") String id, @Param("maxH") int maxH, @Param("idle") int idle);
    Map<String, Object> selectInfo(@Param("id") String id, @Param("maxH") int maxH);
    void workEnd(@Param("id") String id);
    void workStart(@Param("id") String id, @Param("maxH") int maxH, @Param("min") int min, @Param("reason") String reason);
    List<Map<String, Object>> selectList(@Param("uid") String uid, @Param("maxH") int maxH);
    int deleteOthers(@Param("uid") String uid, @Param("id") String id);
    String selectSec(@Param("tid") String tid);
    int mergeSec(@Param("tid") String tid, @Param("json") String json);
}

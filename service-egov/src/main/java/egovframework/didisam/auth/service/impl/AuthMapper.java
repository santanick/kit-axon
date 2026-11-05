package egovframework.didisam.auth.service.impl;

import java.util.Map;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;
import org.apache.ibatis.annotations.Param;

@EgovMapper
public interface AuthMapper {
    int ping();
    int countEmail(@Param("email") String email);
    void insertTenant(@Param("id") String id, @Param("name") String name, @Param("type") String type);
    String insertUser(@Param("tid") String tid, @Param("email") String email, @Param("pw") String pw, @Param("role") String role);
    Map<String, Object> selectUserByEmail(@Param("email") String email);
    void insertSession(@Param("id") String id, @Param("uid") String uid, @Param("tid") String tid, @Param("hours") int hours);
    Map<String, Object> selectAuth(@Param("sid") String sid, @Param("slideH") int slideH, @Param("days") int days);
    void slideSession(@Param("sid") String sid, @Param("days") int days, @Param("idleH") int idleH);
    void updateLastLogin(@Param("uid") String uid);
    void deleteExpiredSessions(@Param("uid") String uid);
    void deleteSession(@Param("sid") String sid);
    Map<String, Object> selectMe(@Param("uid") String uid, @Param("email") String email);
}

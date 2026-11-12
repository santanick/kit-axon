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
    void setPwTemp(@Param("uid") String uid);
    String selectPw(@Param("uid") String uid);
    void updatePw(@Param("uid") String uid, @Param("pw") String pw);
    void deleteOtherSessions(@Param("uid") String uid, @Param("sid") String sid);
    java.util.List<Map<String, Object>> selectStaff(@Param("tid") String tid);
    int deleteStaff(@Param("tid") String tid, @Param("email") String email);
    /* v32.4 소셜 로그인 */
    Map<String, Object> selectOAuthUser(@Param("provider") String provider, @Param("sub") String sub);
    Map<String, Object> selectUserByEmailFull(@Param("email") String email);
    void insertOAuth(@Param("provider") String provider, @Param("sub") String sub, @Param("uid") String uid);
    void insertOAuthStrict(@Param("provider") String provider, @Param("sub") String sub, @Param("uid") String uid);
    Map<String, Object> selectMe(@Param("uid") String uid, @Param("email") String email);
}

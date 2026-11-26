package egovframework.didisam.auth.service.impl;

import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 보안 4차 #1 관리자 추가 인증(mfa_tickets · user_totp · mfa_fresh) — Node mfa.js와 같은 SQL */
@EgovMapper
public interface MfaMapper {
    void deleteOld(@Param("uid") String uid);
    void insertTicket(@Param("id") String id, @Param("uid") String uid, @Param("tid") String tid, @Param("kind") String kind, @Param("via") String via);
    void setCode(@Param("id") String id, @Param("h") String h);
    Map<String, Object> selectTicket(@Param("id") String id);
    Map<String, Object> selectResend(@Param("id") String id);
    Integer incTries(@Param("id") String id);
    int deleteTicket(@Param("id") String id);
    Map<String, Object> selectTotp(@Param("uid") String uid);
    int updateStep(@Param("uid") String uid, @Param("st") long st);
    void upsertPend(@Param("uid") String uid, @Param("pend") String pend);
    void activate(@Param("uid") String uid, @Param("st") long st);
    String deleteTotp(@Param("uid") String uid);
    String selectPolicy(@Param("tid") String tid);
    String selectTenantName(@Param("tid") String tid);
    String selectPw(@Param("uid") String uid);
    void upsertFresh(@Param("uid") String uid);
    Integer selectFresh(@Param("uid") String uid, @Param("s") long s);
}

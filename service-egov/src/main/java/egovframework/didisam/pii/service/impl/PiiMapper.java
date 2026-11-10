package egovframework.didisam.pii.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

@EgovMapper
public interface PiiMapper {
    int countIdentity(@org.apache.ibatis.annotations.Param("tid") String tid, @org.apache.ibatis.annotations.Param("lid") String lid);
    String selectIdentityPw(@org.apache.ibatis.annotations.Param("tid") String tid, @org.apache.ibatis.annotations.Param("lid") String lid);
    void updateIdentityPw(@org.apache.ibatis.annotations.Param("tid") String tid, @org.apache.ibatis.annotations.Param("lid") String lid, @org.apache.ibatis.annotations.Param("hash") String hash);
    /* L */
    Map<String, Object> selectOrg(@Param("tid") String tid);
    boolean selectInviteOk(@Param("tid") String tid, @Param("tok") String tok);
    String insertAccount(@Param("tid") String tid, @Param("login") String login, @Param("nick") String nick, @Param("stu") String stu, @Param("dept") String dept,
                         @Param("st") String st, @Param("minor") boolean minor, @Param("mkt") boolean mkt);
    int withdrawRefused(@Param("tid") String tid, @Param("lid") String lid);
    int activateGuardian(@Param("tid") String tid, @Param("lid") String lid);
    String selectStatus(@Param("tid") String tid, @Param("lid") String lid);
    Map<String, Object> selectAcct(@Param("tid") String tid, @Param("sid") String sid);
    int withdraw(@Param("tid") String tid, @Param("lid") String lid);
    int setIdv(@Param("tid") String tid, @Param("lid") String lid);
    List<Map<String, Object>> selectAccounts(@Param("tid") String tid);
    int purgeWithdraw(@Param("tid") String tid, @Param("lid") String lid);
    /* v33 */
    void insertEvent(@Param("tid") String tid, @Param("sid") String sid, @Param("type") String type, @Param("data") String data);
    Map<String, Object> selectApproval(@Param("tid") String tid, @Param("lid") String lid);
    String selectOrgName(@Param("tid") String tid);
    Map<String, Object> selectAcctBrief(@Param("tid") String tid, @Param("lid") String lid);
    String selectEmailMask(@Param("tid") String tid, @Param("lid") String lid);
    /* P */
    void upsertOtp(@Param("tid") String tid, @Param("b") String b, @Param("purpose") String purpose, @Param("hash") String hash);
    Map<String, Object> selectOtp(@Param("tid") String tid, @Param("b") String b, @Param("purpose") String purpose);
    int incOtp(@Param("tid") String tid, @Param("b") String b, @Param("purpose") String purpose);
    int deleteOtp(@Param("tid") String tid, @Param("b") String b, @Param("purpose") String purpose);
    int deleteOtpAll(@Param("tid") String tid, @Param("b") String b);
    int deleteOtpExpired(@Param("tid") String tid);
    void insertIdentity(@Param("tid") String tid, @Param("lid") String lid, @Param("provider") String provider, @Param("sub") String sub, @Param("ebidx") String ebidx,
                        @Param("eenc") String eenc, @Param("emask") String emask, @Param("pw") String pw, @Param("consent") String consent);
    void insertGuardian(@Param("tid") String tid, @Param("lid") String lid, @Param("contact") String contact, @Param("th") String th);
    void insertLog(@Param("tid") String tid, @Param("actor") String actor, @Param("action") String action, @Param("lid") String lid, @Param("purpose") String purpose, @Param("fields") String fields);
    Map<String, Object> selectGuardianPending(@Param("tid") String tid, @Param("th") String th);
    int deleteGuardianById(@Param("id") String id);
    int deleteGuardianOf(@Param("tid") String tid, @Param("lid") String lid);
    int deleteIdentity(@Param("tid") String tid, @Param("lid") String lid);
    int guardianOk(@Param("id") String id);
    Map<String, Object> selectByEmail(@Param("tid") String tid, @Param("e") String e);
    String selectBySub(@Param("tid") String tid, @Param("prov") String prov, @Param("sub") String sub);
    Map<String, Object> selectUniv(@Param("tid") String tid, @Param("sub") String sub);
    Map<String, Object> selectMine(@Param("tid") String tid, @Param("sid") String sid);
    String updateField(@Param("tid") String tid, @Param("sid") String sid, @Param("f") String f, @Param("v") String v);
    Map<String, Object> selectEmailBidx(@Param("tid") String tid, @Param("lid") String lid);
    List<Map<String, Object>> selectMasks(@Param("tid") String tid);
    Map<String, Object> selectField(@Param("tid") String tid, @Param("lid") String lid, @Param("f") String f);
    List<Map<String, Object>> selectLogs(@Param("tid") String tid);
    List<String> purgeGuardians(@Param("tid") String tid);
    /* plain */
    void insertLearnerSession(@Param("id") String id, @Param("tid") String tid, @Param("sid") String sid);
    int deleteLearnerSessionsOf(@Param("tid") String tid, @Param("sid") String sid);
    List<String> selectTenantIds();
    int deleteExpiredSessions();
    int deleteExpiredLearnerSessions();
}

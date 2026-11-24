package egovframework.didisam.sec.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 가디언 security 스키마(SecMapper.xml) — Node security.js와 같은 SQL · 같은 JSON 행 */
@EgovMapper
public interface SecMapper {
    String lock(@Param("k") long k);
    String lastHash();
    void insertAudit(@Param("ts") String ts, @Param("actor") String actor, @Param("kind") String kind, @Param("action") String action, @Param("target") String target, @Param("detail") String detail, @Param("ip") String ip, @Param("prev") String prev, @Param("hash") String hash);
    List<Map<String, Object>> chainRows();
    List<String> auditRows();
    String selectPw(@Param("uid") String uid);
    Integer tenantExists(@Param("tid") String tid);
    List<Map<String, Object>> expireKills();
    List<String> liveActions(@Param("tid") String tid);
    int killCountDay(@Param("day") String day);
    int killActiveLive();
    Integer killDup(@Param("tid") String tid, @Param("action") String action);
    void insertKill(@Param("id") String id, @Param("action") String action, @Param("tid") String tid, @Param("mode") String mode, @Param("trigger") String trigger, @Param("rule") String rule, @Param("reason") String reason, @Param("signals") String signals, @Param("actor") String actor, @Param("ttl") Integer ttl, @Param("day") String day);
    String killJson(@Param("id") String id);
    List<String> killList();
    List<String> killActive();
    Map<String, Object> summaryExtra();
    int rejectPr(@Param("id") String id, @Param("reason") String reason);
    Map<String, Object> killForUpdate(@Param("id") String id);
    int releaseKill(@Param("id") String id, @Param("by") String by, @Param("note") String note);
    void tenantAudit(@Param("tid") String tid, @Param("actor") String actor, @Param("action") String action, @Param("detail") String detail);
    List<Map<String, Object>> openByPriority();
    Double mttd();
    Double mttr();
    List<String> todoFindings();
    List<String> findings(@Param("st") String st, @Param("sv") String sv);
    String findingStatusForUpdate(@Param("id") String id);
    int updateFinding(@Param("id") String id, @Param("st") String st, @Param("note") String note);
    String findingJson(@Param("id") String id);
    List<String> threats(@Param("n") int n);
    Map<String, Object> threatRow(@Param("id") String id);
    String cardOfThreat(@Param("tid") String tid);
    int cardReuse(@Param("id") String id);
    int cardMax();
    void insertCard(@Param("id") String id, @Param("threat") String threat, @Param("title") String title, @Param("pattern") String pattern, @Param("controls") String controls, @Param("tests") String tests, @Param("skills") String skills, @Param("playbook") String playbook, @Param("body") String body);
    String cardJson(@Param("id") String id);
    List<String> cardList();
    List<String> prList(@Param("open") boolean open);
    Map<String, Object> prForUpdate(@Param("id") String id);
    Integer prExists(@Param("id") String id);
    Map<String, Object> linkRow(@Param("id") String id);
    int useLink(@Param("id") String id);
    void insertLink(@Param("id") String id, @Param("secret") String secret, @Param("pr") String pr, @Param("uid") String uid, @Param("email") String email, @Param("min") int min);
    String linkExpires(@Param("id") String id);
    int insertApproval(@Param("pr") String pr, @Param("by") String by, @Param("method") String method);
    int approvalCount(@Param("pr") String pr);
    List<String> approvers(@Param("pr") String pr);
    int setPrStatus(@Param("id") String id, @Param("st") String st);
    Boolean upFinding(@Param("id") String id, @Param("key") String key, @Param("origin") String origin, @Param("title") String title, @Param("sev") String sev, @Param("pri") String pri, @Param("score") double score, @Param("scope") String scope, @Param("owner") String owner, @Param("sla") String sla, @Param("threat") String threat, @Param("ev") String ev);
    Boolean upThreat(@Param("id") String id, @Param("src") String src, @Param("ext") String ext, @Param("title") String title, @Param("cvss") Double cvss, @Param("epss") Double epss, @Param("kev") boolean kev, @Param("affected") String affected, @Param("attack") String attack, @Param("url") String url, @Param("pub") String pub, @Param("verdict") String verdict, @Param("hash") String hash, @Param("summary") String summary);
    void insScan(@Param("type") String type, @Param("target") String target, @Param("tool") String tool, @Param("sha") String sha, @Param("n") int n, @Param("raw") String raw);
    Boolean upPr(@Param("id") String id, @Param("num") Integer num, @Param("title") String title, @Param("fids") String fids, @Param("sev") String sev, @Param("ct") String ct, @Param("files") String files, @Param("vr") String vr, @Param("risk") String risk, @Param("rb") String rb, @Param("url") String url);
    Boolean upCard(@Param("id") String id, @Param("threat") String threat, @Param("title") String title, @Param("pattern") String pattern, @Param("controls") String controls, @Param("tests") String tests, @Param("skills") String skills, @Param("playbook") String playbook, @Param("body") String body);
}

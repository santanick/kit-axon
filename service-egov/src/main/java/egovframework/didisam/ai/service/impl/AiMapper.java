package egovframework.didisam.ai.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

@EgovMapper
public interface AiMapper {
    String selectRoom(@Param("tid") String tid);
    int incUsage(@Param("tid") String tid, @Param("day") String day);
    int addTokens(@Param("tid") String tid, @Param("day") String day, @Param("tin") long tin, @Param("tout") long tout);
    List<Map<String, Object>> selectUsage(@Param("tid") String tid);
    String selectAipol(@Param("tid") String tid);
    int incUsageF(@Param("tid") String tid, @Param("day") String day, @Param("f") String f);
    int addTokensF(@Param("tid") String tid, @Param("day") String day, @Param("f") String f, @Param("tin") long tin, @Param("tout") long tout);
    List<Map<String, Object>> selectByFeature();
    /* v47 AI 월 포함량 · 추가 충전(ai_credit) — Node aiprice.js monthState · app.js topup과 같은 문장 */
    String selectAiplan(@Param("tid") String tid);
    String selectPlan(@Param("tid") String tid); /* v47 요금제 기능 묶음 */
    long monthUsed(@Param("tid") String tid, @Param("from") String from);
    /* 충전량 1년 이월: 쓸 수 있는 충전 행 · 사용 기록(DdAiPrice.sim) */
    List<Map<String, Object>> selectCreditRows(@Param("tid") String tid, @Param("from") String from);
    List<Map<String, Object>> selectUsageFrom(@Param("tid") String tid, @Param("from") String from);
    String selectPlan(@Param("tid") String tid);
    List<Map<String, Object>> selectMonthFeature(@Param("from") String from);
    int insertCredit(@Param("id") String id, @Param("tid") String tid, @Param("month") String month, @Param("pack") String pack, @Param("tokens") long tokens, @Param("amount") long amount, @Param("orderId") String orderId, @Param("by") String by);
    Map<String, Object> selectCredit(@Param("tid") String tid, @Param("orderId") String orderId);
    int failCredit(@Param("tid") String tid, @Param("id") String id);
    int payCredit(@Param("tid") String tid, @Param("id") String id, @Param("pk") String pk, @Param("days") int days);
    /* v47 산타 관리(SANTA_ADMIN_EMAILS) — tenants · santa_plan_log는 기관 역할 밖(plain), tenant_state는 기관 범위 */
    List<Map<String, Object>> searchTenants(@Param("q") String q);
    int tenantExists(@Param("tid") String tid);
    Map<String, Object> selectPlanRow(@Param("tid") String tid);
    int updatePlan(@Param("tid") String tid, @Param("plan") String plan, @Param("aiplan") String aiplan);
    int insertSantaLog(@Param("tid") String tid, @Param("actor") String actor, @Param("before") String before, @Param("after") String after, @Param("memo") String memo);
    List<Map<String, Object>> selectSantaLog(@Param("tid") String tid);
}

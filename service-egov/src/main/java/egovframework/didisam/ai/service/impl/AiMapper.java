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
    long monthUsed(@Param("tid") String tid, @Param("from") String from);
    long monthCredit(@Param("tid") String tid, @Param("month") String month);
    List<Map<String, Object>> selectMonthFeature(@Param("from") String from);
    List<Map<String, Object>> selectCredits(@Param("tid") String tid, @Param("month") String month);
    int insertCredit(@Param("id") String id, @Param("tid") String tid, @Param("month") String month, @Param("pack") String pack, @Param("tokens") long tokens, @Param("amount") long amount, @Param("orderId") String orderId, @Param("by") String by);
    Map<String, Object> selectCredit(@Param("tid") String tid, @Param("orderId") String orderId);
    int failCredit(@Param("tid") String tid, @Param("id") String id);
    int payCredit(@Param("tid") String tid, @Param("id") String id, @Param("pk") String pk);
}

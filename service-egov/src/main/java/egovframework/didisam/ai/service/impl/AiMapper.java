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
}

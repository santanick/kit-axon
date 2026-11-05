package egovframework.didisam.state.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface StateMapper {
    Map<String, Object> selectState(@Param("tid") String tid);
    Integer insertState(@Param("tid") String tid, @Param("doc") String doc, @Param("bytes") int bytes);
    Integer updateState(@Param("tid") String tid, @Param("doc") String doc, @Param("bytes") int bytes, @Param("rev") int rev);
    List<Map<String, Object>> selectLearnerFps(@Param("tid") String tid);
    void upsertLearner(@Param("tid") String tid, @Param("sid") String sid, @Param("dept") String dept, @Param("fp") String fp, @Param("hash") String hash);
    void deleteLearners(@Param("tid") String tid, @Param("sids") List<String> sids);
    void deleteLearnerSessions(@Param("tid") String tid, @Param("sids") List<String> sids);
    void updateTenantMode(@Param("tid") String tid, @Param("mode") String mode, @Param("name") String name);
}

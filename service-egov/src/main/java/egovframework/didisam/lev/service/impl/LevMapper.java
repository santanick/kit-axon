package egovframework.didisam.lev.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** v46 학습 이벤트(learning_event) — LevMapper.xml */
@EgovMapper
public interface LevMapper {
    int insertEv(@Param("tid") String tid, @Param("sid") String sid, @Param("verb") String verb, @Param("obj") String obj, @Param("lvl") String lvl,
                 @Param("val") String val, @Param("src") String src, @Param("trust") String trust, @Param("at") String at);
    List<Map<String, Object>> list(@Param("tid") String tid, @Param("clsLike") String clsLike, @Param("sid") String sid, @Param("verb") String verb, @Param("after") long after);
}

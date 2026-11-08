package egovframework.didisam.media.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

@EgovMapper
public interface MediaMapper {
    Map<String, Object> selectMeta(@Param("tid") String tid, @Param("id") String id);
    Map<String, Object> selectUsage(@Param("tid") String tid);
    int insertMedia(@Param("tid") String tid, @Param("id") String id, @Param("mime") String mime, @Param("bytes") int bytes, @Param("w") Integer w, @Param("h") Integer h, @Param("name") String name, @Param("data") byte[] data, @Param("by") String by);
    List<Map<String, Object>> selectList(@Param("tid") String tid, @Param("n") int n);
    Map<String, Object> selectData(@Param("tid") String tid, @Param("id") String id);
    int deleteMedia(@Param("tid") String tid, @Param("id") String id);
}

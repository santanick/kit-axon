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
    /* v35 강의 파일 */
    int fileDeleteStale(@Param("tid") String tid);
    Map<String, Object> fileUsage(@Param("tid") String tid);
    int fileInsert(@Param("tid") String tid, @Param("id") String id, @Param("mime") String mime, @Param("bytes") long bytes, @Param("name") String name, @Param("kind") String kind, @Param("parts") int parts, @Param("chunk") int chunk, @Param("by") String by);
    Map<String, Object> fileMeta(@Param("tid") String tid, @Param("id") String id);
    int partUpsert(@Param("tid") String tid, @Param("id") String id, @Param("seq") int seq, @Param("data") byte[] data);
    Map<String, Object> partStat(@Param("tid") String tid, @Param("id") String id);
    Map<String, Object> partSlice(@Param("tid") String tid, @Param("id") String id, @Param("seq") int seq, @Param("off") int off, @Param("len") int len);
    Map<String, Object> partData(@Param("tid") String tid, @Param("id") String id, @Param("seq") int seq);
    int fileOk(@Param("tid") String tid, @Param("id") String id);
    int fileDrop(@Param("tid") String tid, @Param("id") String id);
    List<Map<String, Object>> fileList(@Param("tid") String tid, @Param("n") int n);
}

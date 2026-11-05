package egovframework.didisam.mcp.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

@EgovMapper
public interface McpMapper {
    List<Map<String, Object>> selectKeys(@Param("tid") String tid);
    int countActiveKeys(@Param("tid") String tid);
    void insertKey(@Param("id") String id, @Param("tid") String tid, @Param("name") String name, @Param("prefix") String prefix, @Param("hash") String hash, @Param("scope") String scope, @Param("by") String by);
    int revokeKey(@Param("tid") String tid, @Param("id") String id);
    Map<String, Object> selectKeyAuth(@Param("hash") String hash);
    int touchKey(@Param("id") String id);
    Map<String, Object> selectDoc(@Param("tid") String tid);
    Map<String, Object> selectDocForUpdate(@Param("tid") String tid);
    int updateDoc(@Param("tid") String tid, @Param("doc") String doc, @Param("bytes") int bytes);
}

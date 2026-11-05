package egovframework.didisam.tenant.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

@EgovMapper
public interface TenantMapper {
    List<Map<String, Object>> selectAudit(@Param("tid") String tid);
    List<Map<String, Object>> selectProgress(@Param("tid") String tid);
    String selectPw(@Param("uid") String uid);
    int deleteTenant(@Param("tid") String tid);
}

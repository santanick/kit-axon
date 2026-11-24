package egovframework.didisam.auth.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 보안 2차: 운영자 로그인 기기(user_devices) — Node devices.js와 같은 SQL */
@EgovMapper
public interface DeviceMapper {
    List<Map<String, Object>> selectPrev(@Param("uid") String uid);
    void upsert(@Param("uid") String uid, @Param("h") String h, @Param("agent") String agent, @Param("band") String band, @Param("country") String country);
    void trim(@Param("uid") String uid);
    String selectEmail(@Param("uid") String uid);
    String selectTenantName(@Param("tid") String tid);
    List<Map<String, Object>> selectList(@Param("uid") String uid);
}

package egovframework.didisam.group.service.impl;

import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 통합 센터 — 기관 범위(inTenant, RLS) 질의만 여기에 둔다(소속 기관 문서 · AI 사용량 · 수납 합계 · 공통 설정 적용). 교차 표 grp_* 질의는 MkDb(Node와 같은 SQL 문장, didisam_group 트랜잭션) */
@EgovMapper
public interface GroupMapper {
    Map<String, Object> selectDoc(@Param("tid") String tid);
    Map<String, Object> selectAiDay(@Param("tid") String tid, @Param("day") String day);
    Long selectRevDay(@Param("tid") String tid, @Param("day") String day);
    Map<String, Object> selectDocLock(@Param("tid") String tid);
    Integer selectFresh(@Param("sid") String sid);
    int updateDoc(@Param("tid") String tid, @Param("doc") String docJson, @Param("bytes") int bytes);
}

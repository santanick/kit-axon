package egovframework.didisam.market.service.impl;

import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** 콘텐츠 마켓 — 기관 범위(inTenant, RLS) 질의만 여기에 둔다(기관 문서 · 이름). 교차 표 mk_* 질의는 MkDb(Node 문장 그대로, 로그인 계정 트랜잭션) */
@EgovMapper
public interface MarketMapper {
    Map<String, Object> selectOrgDoc(@Param("tid") String tid);
    Map<String, Object> selectTenant(@Param("tid") String tid);
    int updatePilot(@Param("tid") String tid, @Param("on") boolean on);
}

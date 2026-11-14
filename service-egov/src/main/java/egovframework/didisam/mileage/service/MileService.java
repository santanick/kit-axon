package egovframework.didisam.mileage.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;

/** v42 학습 마일리지 — Node service/server/mileage와 같은 /api(04-data-api 5절). 업무 규칙은 SQL 함수 mil_*(Node 마이그레이션 소유)를 부르기만 한다 */
public interface MileService {
    @FunctionalInterface interface LAuth { Map<String, Object> get() throws Exception; }
    /** /api/pub/{tid}/mile-* — key = "{메서드} {act}" */
    Object pub(HttpServletRequest req, HttpServletResponse res, String tid, String key, byte[] body, LAuth lauth) throws Exception;
    /** /api/mileage/* — op는 경로 이름(예: "POST approvals/decide"), id는 경로의 :id */
    Object admin(HttpServletRequest req, HttpServletResponse res, String op, String id, byte[] body) throws Exception;
    /* 수집 훅 — 부르는 쪽의 기관 범위 트랜잭션(TenantTx.inTenant) 안에서 부른다 */
    /** 제도가 켜진 기관만 mil_emit(세이브포인트, 실패해도 본 작업은 계속). null = 기록 안 함 */
    com.fasterxml.jackson.databind.JsonNode hook(String tid, String sid, String trigger, String srcType, String srcId, Object value, String trust, String cls, String at);
    /** PUT progress 차이분(신뢰 C) — 새로 완료된 차시 · 오늘 목표 · 학습한 날 */
    int emitDiff(String tid, String sid, com.fasterxml.jackson.databind.JsonNode prev, com.fasterxml.jackson.databind.JsonNode next);
    /** 저장 전 학습 기록(lp) — 차이분 계산용(for update) */
    com.fasterxml.jackson.databind.JsonNode prevLp(String tid, String sid);
    /** 개인 쿠폰(1회용, 본인만). null = 개인 쿠폰 아님 */
    com.fasterxml.jackson.databind.node.ObjectNode personalCoupon(String tid, String sid, String code, String cls);
    /** v41 원장 환불 확정 훅. ratio = 환불액 / 실납부액 */
    com.fasterxml.jackson.databind.JsonNode onRefund(String tid, String receiptId, double ratio);
}

package egovframework.didisam.fac.service.impl;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import org.egovframe.rte.psl.dataaccess.mapper.EgovMapper;

/** v40 시설 · 장비 예약 — FacMapper.xml(모두 기관 범위 inTenant 안에서 호출) */
@EgovMapper
public interface FacMapper {
    String selectDoc(@Param("tid") String tid);
    List<String> selectTenantIds();
    String lock(@Param("k") String k);

    int insertBooking(@Param("tid") String tid, @Param("id") String id, @Param("fac") String fac, @Param("res") String res, @Param("sid") String sid, @Param("aud") String aud, @Param("memberNo") String memberNo, @Param("day") String day,
                      @Param("slot") int slot, @Param("slots") int slots, @Param("startAt") long startAt, @Param("endAt") long endAt, @Param("noShowMin") Integer noShowMin, @Param("byStaff") String byStaff, @Param("status") String status, @Param("payMode") String payMode, @Param("amount") long amount, @Param("payStatus") String payStatus,
                      @Param("passId") String passId, @Param("note") String note, @Param("extra") String extra, @Param("holdMin") int holdMin);
    Map<String, Object> selectBooking(@Param("tid") String tid, @Param("id") String id);
    int insertSlot(@Param("tid") String tid, @Param("fac") String fac, @Param("res") String res, @Param("day") String day, @Param("slot") int slot, @Param("seat") int seat, @Param("bk") String bk, @Param("sid") String sid, @Param("excl") String excl);
    int deleteSlots(@Param("tid") String tid, @Param("bk") String bk);
    List<Map<String, Object>> selectTaken(@Param("tid") String tid, @Param("fac") String fac, @Param("day") String day);
    int updateBooking(@Param("tid") String tid, @Param("id") String id, @Param("status") String status, @Param("pay") String pay, @Param("reason") String reason, @Param("holdMin") int holdMin);
    int countActive(@Param("tid") String tid, @Param("sid") String sid);
    List<String> selectNoShowDays(@Param("tid") String tid, @Param("sid") String sid);
    List<Map<String, Object>> selectMine(@Param("tid") String tid, @Param("sid") String sid, @Param("past") boolean past);
    List<Map<String, Object>> selectBookings(@Param("tid") String tid, @Param("from") String from, @Param("to") String to, @Param("fac") String fac, @Param("status") String status, @Param("q") String q, @Param("facs") List<String> facs);
    List<Map<String, Object>> selectSweep(@Param("tid") String tid, @Param("fac") String fac, @Param("day") String day);
    List<Map<String, Object>> selectSweepDays(@Param("tid") String tid);
    List<Map<String, Object>> selectAffected(@Param("tid") String tid, @Param("fac") String fac, @Param("from") String from, @Param("to") String to);

    int insertPass(@Param("tid") String tid, @Param("id") String id, @Param("sid") String sid, @Param("aud") String aud, @Param("amount") long amount, @Param("product") String product, @Param("fac") String fac, @Param("kind") String kind, @Param("total") long total,
                   @Param("starts") String starts, @Param("ends") String ends, @Param("status") String status, @Param("cls") String cls);
    String selectLastEnd(@Param("tid") String tid, @Param("sid") String sid, @Param("product") String product);
    List<Map<String, Object>> selectRentals(@Param("tid") String tid, @Param("status") String status, @Param("facs") List<String> facs);
    List<Map<String, Object>> selectPasses(@Param("tid") String tid);
    String selectSubRefund(@Param("tid") String tid);
    Map<String, Object> selectPass(@Param("tid") String tid, @Param("id") String id);
    List<Map<String, Object>> selectMyPasses(@Param("tid") String tid, @Param("sid") String sid);
    int usePass(@Param("tid") String tid, @Param("id") String id);
    int unusePass(@Param("tid") String tid, @Param("id") String id);
    int adjustPass(@Param("tid") String tid, @Param("id") String id, @Param("delta") int delta);
    int updatePass(@Param("tid") String tid, @Param("id") String id, @Param("status") String status, @Param("payId") String payId);
    int extendPasses(@Param("tid") String tid, @Param("fac") String fac, @Param("from") String from, @Param("to") String to, @Param("days") int days);

    int insertCheckin(@Param("tid") String tid, @Param("bk") String bk, @Param("pass") String pass, @Param("rental") String rental, @Param("sid") String sid, @Param("fac") String fac, @Param("day") String day, @Param("via") String via, @Param("by") String by, @Param("jti") String jti);
    int countCheckins(@Param("tid") String tid);

    int insertRental(@Param("tid") String tid, @Param("id") String id, @Param("sid") String sid, @Param("aud") String aud, @Param("payMode") String payMode, @Param("payStatus") String payStatus, @Param("fac") String fac, @Param("res") String res, @Param("product") String product, @Param("from") String from, @Param("due") String due,
                     @Param("deposit") long deposit, @Param("depStatus") String depStatus, @Param("amount") long amount, @Param("status") String status);
    Map<String, Object> selectRental(@Param("tid") String tid, @Param("id") String id);
    List<Map<String, Object>> selectMyRentals(@Param("tid") String tid, @Param("sid") String sid);
    List<String> selectRentedRes(@Param("tid") String tid, @Param("fac") String fac);
    int updateRental(@Param("tid") String tid, @Param("id") String id, @Param("status") String status, @Param("lateFee") Long lateFee, @Param("depStatus") String depStatus, @Param("note") String note);
    int markOverdue(@Param("tid") String tid);

    int insertPayment(@Param("tid") String tid, @Param("id") String id, @Param("bk") String bk, @Param("pass") String pass, @Param("rental") String rental, @Param("method") String method, @Param("amount") long amount,
                      @Param("list") Long list, @Param("order") String order, @Param("receipt") String receipt, @Param("by") String by, @Param("note") String note, @Param("status") String status);
    Map<String, Object> selectPayment(@Param("tid") String tid, @Param("id") String id);
    Map<String, Object> selectPaymentFor(@Param("tid") String tid, @Param("ref") String ref);
    int updatePayment(@Param("tid") String tid, @Param("id") String id, @Param("status") String status, @Param("key") String key);
    int insertRefund(@Param("tid") String tid, @Param("id") String id, @Param("payment") String payment, @Param("target") String target, @Param("rule") String rule, @Param("calc") String calc,
                     @Param("auto") long auto, @Param("amount") long amount, @Param("reason") String reason, @Param("by") String by, @Param("cancelKey") String cancelKey, @Param("status") String status);
    List<Map<String, Object>> selectRefunds(@Param("tid") String tid, @Param("status") String status);

    Map<String, Object> selectOverview(@Param("tid") String tid);
    List<Map<String, Object>> selectStats(@Param("tid") String tid, @Param("from") String from, @Param("to") String to);
    Map<String, Object> selectRevenue(@Param("tid") String tid, @Param("from") String from, @Param("to") String to);
}

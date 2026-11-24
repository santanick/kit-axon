package egovframework.didisam.auth.service.impl;

import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import egovframework.didisam.cmm.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** 보안 2차(SEC-0008 보완 통제 — 2단계 인증 대신): 새 기기 · IP 대역 · 국가 로그인 알림. Node service/server/devices.js와 같은 규칙 · 같은 audit 형태.
 *  기기 표식 쿠키(무작위 32바이트, 400일)는 해시만 저장. 기록이 없는 계정의 첫 로그인은 기준만 만든다. 실패해도 로그인은 진행한다. */
@Component
public class LoginDevices {
    static final Pattern TOK = Pattern.compile("^[A-Za-z0-9_-]{43}$"), V4 = Pattern.compile("^(\\d{1,3})\\.(\\d{1,3})\\.\\d{1,3}\\.\\d{1,3}$"), CC = Pattern.compile("^[A-Z]{2}$");
    private final DeviceMapper m; private final TenantTx tx; private final DdProps p; private final DdWeb web; private final DdMail mail; private final String geoHdr;
    public LoginDevices(DeviceMapper m, TenantTx tx, DdProps p, DdWeb web, DdMail mail, @Value("${GEO_COUNTRY_HEADER:}") String geo) {
        this.m = m; this.tx = tx; this.p = p; this.web = web; this.mail = mail; this.geoHdr = geo.trim().toLowerCase(Locale.ROOT);
    }
    String name() { return p.secure ? "__Host-dd_dev" : "dd_dev"; }

    static String agent(String ua) {
        String u = ua == null ? "" : ua;
        String b = u.contains("Edg/") ? "Edge" : u.contains("Whale/") ? "Whale" : u.contains("SamsungBrowser/") ? "Samsung Internet" : u.contains("Firefox/") ? "Firefox" : u.contains("Chrome/") ? "Chrome" : u.contains("Safari/") ? "Safari" : "기타 브라우저";
        String o = u.contains("Windows") ? "Windows" : (u.contains("iPhone") || u.contains("iPad")) ? "iOS" : u.contains("Android") ? "Android" : (u.contains("Mac OS X") || u.contains("Macintosh")) ? "macOS" : u.contains("Linux") ? "Linux" : "기타 OS";
        return b + " · " + o;
    }
    static String band(String ip) {
        String s = (ip == null ? "" : ip).replaceFirst("(?i)^::ffff:", "");
        Matcher v = V4.matcher(s); if (v.matches()) return v.group(1) + "." + v.group(2) + ".x.x";
        if (s.contains(":")) { String[] g = s.split(":", -1); return (g.length > 0 && !g[0].isEmpty() ? g[0] : "0").toLowerCase(Locale.ROOT) + ":" + (g.length > 1 && !g[1].isEmpty() ? g[1] : "0").toLowerCase(Locale.ROOT) + "::"; }
        return "";
    }
    String cookie(HttpServletRequest req) { Cookie[] cs = req.getCookies(); if (cs == null) return ""; for (Cookie c : cs) if (name().equals(c.getName())) return String.valueOf(c.getValue()); return ""; }
    static String hash(String t) { return DdCrypto.sha("dd-dev|" + t); }
    String country(HttpServletRequest req) { if (geoHdr.isEmpty() || p.hops == 0) return ""; String v = String.valueOf(Objects.toString(req.getHeader(geoHdr), "")).trim().toUpperCase(Locale.ROOT); return CC.matcher(v).matches() ? v : ""; }

    /** 세션을 만든 직후(AuthServiceImpl · OAuthServiceImpl newSession). req는 현재 요청에서 찾는다 */
    public void seen(HttpServletResponse res, String uid, String tid) {
        try {
            ServletRequestAttributes at = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes(); if (at == null || res == null) return;
            HttpServletRequest req = at.getRequest();
            String tok = cookie(req); if (!TOK.matcher(tok).matches()) tok = "";
            if (tok.isEmpty()) tok = DdCrypto.newToken();
            String h = hash(tok), ag = agent(req.getHeader("user-agent")), bd = band(web.ip(req)), cc = country(req);
            List<Map<String, Object>> prev = m.selectPrev(uid);
            boolean known = prev.stream().anyMatch(r -> h.equals(r.get("dev_hash")));
            boolean newBand = !bd.isEmpty() && prev.stream().noneMatch(r -> bd.equals(r.get("band"))), newCountry = !cc.isEmpty() && prev.stream().noneMatch(r -> cc.equals(r.get("country")));
            m.upsert(uid, h, ag, bd, cc); m.trim(uid);
            res.addHeader("set-cookie", name() + "=" + tok + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + (400 * 86400) + (p.secure ? "; Secure" : ""));
            if (prev.isEmpty() || (known && !newBand && !newCountry)) return;
            List<String> why = new ArrayList<>(); if (!known) why.add("device"); if (newBand) why.add("band"); if (newCountry) why.add("country");
            String email = Objects.toString(m.selectEmail(uid), ""); boolean mailed = mail.on && !email.isEmpty();
            ObjectNode d = Js.F.objectNode(); ArrayNode w = d.putArray("why"); why.forEach(w::add); d.put("agent", ag); d.put("band", bd); d.put("country", cc); d.put("mailed", mailed);
            tx.audit(tid, email, "login.newdevice", Js.stringify(d));
            if (mailed) {
                String org = Objects.toString(m.selectTenantName(tid), "디디쌤"); if (org.length() > 40) org = org.substring(0, 40);
                Map<String, String> lab = Map.of("device", "처음 사용하는 기기 · 브라우저", "band", "처음 보는 접속 위치(IP 대역)", "country", "처음 보는 국가");
                String what = String.join(", ", why.stream().map(lab::get).toList());
                String when = ZonedDateTime.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
                String subject = "[" + org + "] 디디쌤 스튜디오 새 환경 로그인 알림";
                String text = email + " 계정이 새 환경에서 로그인했습니다.\n\n- 시각: " + when + " (한국 시간)\n- 사유: " + what + "\n- 기기: " + ag + "\n- 접속 대역: " + (bd.isEmpty() ? "알 수 없음" : bd) + (cc.isEmpty() ? "" : "\n- 국가: " + cc)
                    + "\n\n본인이 로그인했다면 이 메일은 무시하셔도 됩니다.\n본인이 아니라면 즉시 비밀번호를 변경하십시오(비밀번호를 바꾸면 다른 기기의 로그인이 모두 끊깁니다).";
                final String to = email;
                java.util.concurrent.CompletableFuture.runAsync(() -> { try { mail.send(to, subject, text); } catch (Exception ignore) {} }); /* 로그인 응답을 기다리게 하지 않는다 */
            }
        } catch (Exception ignore) { /* 알림 실패가 로그인을 막지 않는다 */ }
    }

    public Map<String, Object> list(Map<String, Object> a, HttpServletRequest req) {
        String cur = cookie(req); String ch = cur.isEmpty() ? "" : hash(cur); List<Map<String, Object>> rows = new ArrayList<>();
        for (Map<String, Object> r : m.selectList((String) a.get("uid"))) {
            Map<String, Object> o = new LinkedHashMap<>(); o.put("agent", r.get("agent")); o.put("band", r.get("band")); o.put("country", r.get("country")); o.put("firstAt", r.get("first_at")); o.put("lastAt", r.get("last_at")); o.put("current", ch.equals(r.get("dev_hash"))); rows.add(o);
        }
        return Map.of("rows", rows);
    }
}

package egovframework.didisam.cmm;

import java.net.InetAddress;
import java.net.URI;

/**
 * 가디언 4차 #19 SSRF — Node service/server/ssrf.js와 같은 판정.
 * 학내 LLM(openai_compat) 주소는 서버 허용 목록 호스트만 부르고(LmsOServiceImpl), 여기서 추가로
 * 메타데이터(169.254.169.254 · 169.254.170.2 · 100.100.100.200 · fd00:ec2::254) · 링크 로컬 · 미지정 주소와
 * 계정 정보(user@host) · http/https 외 방식을 막는다. 리다이렉트는 HttpClient 기본값(NEVER)으로 따르지 않는다.
 */
public final class DdSsrf {
    private DdSsrf() { }
    public static final String MSG = "학내 LLM 서버 주소가 허용되지 않는 주소(메타데이터 · 링크 로컬 · 계정 정보 포함)로 확인되어 호출하지 않았습니다.";

    /** 허용 목록과 상관없이 막는 주소 */
    public static boolean isMetaOrLinkLocal(byte[] ip) {
        if (ip == null) return true;
        if (ip.length == 16) {
            boolean v4 = true; for (int i = 0; i < 10; i++) if (ip[i] != 0) { v4 = false; break; }
            if (v4 && ((ip[10] == 0 && ip[11] == 0) || (ip[10] == (byte) 0xff && ip[11] == (byte) 0xff))) {
                boolean allZero = true; for (int i = 10; i < 16; i++) if (ip[i] != 0) { allZero = false; break; }
                if (allZero) return true; // ::
                return isMetaOrLinkLocal(new byte[] { ip[12], ip[13], ip[14], ip[15] });
            }
            int first = ((ip[0] & 0xff) << 8) | (ip[1] & 0xff);
            if ((first & 0xffc0) == 0xfe80) return true;
            // fd00:ec2::254
            byte[] ec2 = { (byte) 0xfd, 0, 0x0e, (byte) 0xc2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x02, 0x54 };
            return java.util.Arrays.equals(ip, ec2);
        }
        if (ip.length != 4) return true;
        int a = ip[0] & 0xff, b = ip[1] & 0xff, c = ip[2] & 0xff, d = ip[3] & 0xff;
        if (a == 0 || (a == 169 && b == 254)) return true;
        return a == 100 && b == 100 && c == 100 && d == 200;
    }

    /** 통과하면 true. DNS 실패 · 형식 오류도 false(차단) */
    public static boolean selfUrlOk(String raw) {
        try {
            URI u = URI.create(raw == null ? "" : raw.trim());
            String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase(java.util.Locale.ROOT);
            if (!sc.equals("https") && !sc.equals("http")) return false;
            if (u.getRawUserInfo() != null || u.getHost() == null) return false;
            String h = u.getHost().replaceAll("^\\[|\\]$", "");
            InetAddress[] L = InetAddress.getAllByName(h);
            if (L.length == 0) return false;
            for (InetAddress x : L) if (isMetaOrLinkLocal(x.getAddress())) return false;
            return true;
        } catch (Exception e) { return false; }
    }
}

package egovframework.didisam.cmm;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Node 서버와 같은 환경변수 이름을 그대로 쓴다(운영 설정 공유) */
@Component
public class DdProps {
    public final boolean secure; public final int hops; public final int idleH; public final String cookieName;
    /** 학습자 포털 세션 쿠키(Node lcookieName) */
    public final String lcookieName;
    public final String signupCode; public final boolean allowSignup; public final String pepper; public final int aiDaily; public final boolean ai;
    /** 외부 AI(Anthropic Messages API) — 키가 sk-ant-로 시작할 때만 켜짐. 주소는 ANTHROPIC_URL로 바꿀 수 있다(시험용 모의 서버 등) */
    public final String aiKey; public final String aiUrl;
    /** 개발 · 시험 전용 플래그(Node pii.js와 같은 이름): 인증번호 · 보호자 토큰 응답 포함, SNS dev_sub 허용, 본인확인 모의 성공 */
    public final boolean devOtp, devOauth, devIdv;
    /** v31 환급 에디션: 모듈(learner|tutor|admin, 비면 통합), 관리자 접속 허용 IP, 학습자 첫 화면의 기관 */
    public final String module, learnerTid; public final java.util.List<String> adminIps;
    public DdProps(@Value("${COOKIE_SECURE:1}") String cs, @Value("${TRUST_PROXY_HOPS:1}") int hops, @Value("${SESSION_IDLE_H:12}") int idle,
                   @Value("${SIGNUP_CODE:}") String code, @Value("${SIGNUP:on}") String signup, @Value("${SESSION_PEPPER:}") String pepper,
                   @Value("${AI_DAILY_CALLS:400}") int aiDaily, @Value("${ANTHROPIC_API_KEY:}") String aiKey, @Value("${NODE_ENV:}") String env,
                   @Value("${ANTHROPIC_URL:}") String aiUrl, @Value("${PII_KEY:}") String piiKey,
                   @Value("${PII_DEV_OTP:}") String devOtp, @Value("${OAUTH_DEV:}") String devOauth, @Value("${IDV_DEV:}") String devIdv,
                   @Value("${MODULE:}") String module, @Value("${ADMIN_IPS:}") String adminIps, @Value("${LEARNER_TID:}") String learnerTid) {
        this.module = module.trim(); if (!this.module.isEmpty() && !DdModule.PAGE.containsKey(this.module)) throw new IllegalStateException("MODULE은 learner, tutor, admin 중 하나여야 합니다.");
        this.adminIps = DdModule.parseIps(adminIps); this.learnerTid = learnerTid.trim();
        this.secure = !"0".equals(cs);
        this.hops = Math.max(0, Math.min(5, hops));
        this.idleH = Math.max(1, Math.min(24 * 14, idle));
        this.cookieName = (secure ? "__Host-dd_sid" : "dd_sid") + (this.module.isEmpty() ? "" : "_" + this.module);
        this.lcookieName = secure ? "__Host-dd_lsid" : "dd_lsid";
        this.signupCode = code.trim(); this.allowSignup = !"off".equals(signup);
        this.pepper = !pepper.isEmpty() ? pepper : !code.isEmpty() ? code : "didisam-learner";
        this.aiDaily = aiDaily; this.ai = aiKey.startsWith("sk-ant-");
        this.aiKey = this.ai ? aiKey.trim() : ""; this.aiUrl = aiUrl.isEmpty() ? "https://api.anthropic.com/v1/messages" : aiUrl;
        this.devOtp = "1".equals(devOtp); this.devOauth = "1".equals(devOauth); this.devIdv = "1".equals(devIdv);
        if ("production".equals(env)) {
            java.util.List<String> miss = new java.util.ArrayList<>();
            if (pepper.trim().length() < 32) miss.add("SESSION_PEPPER");
            if (piiKey.trim().length() < 32) miss.add("PII_KEY");
            if (!miss.isEmpty()) throw new IllegalStateException("운영 필수 비밀값이 없거나 짧습니다(32자 이상): " + String.join(", ", miss));
            if (!secure) throw new IllegalStateException("운영에서는 COOKIE_SECURE=0을 쓸 수 없습니다.");
        }
    }
}

package egovframework.didisam.cmm;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * v33 메일 발송 어댑터 — Node service/server/mail.js와 같은 환경변수 · 같은 규격.
 *  MAIL_PROVIDER=webhook : MAIL_WEBHOOK_URL(운영은 https만) + 선택 MAIL_WEBHOOK_TOKEN(Bearer) → POST {from,to,subject,text}
 *  MAIL_PROVIDER=smtp    : SMTP_URL = smtps://user:pass@host:465 또는 smtp://user:pass@host:587(STARTTLS 필수)
 *  MAIL_FROM             : 보내는 주소(기본 no-reply@didisam.com)
 *  설정이 없으면 on=false — 호출하는 쪽이 "메일 발송이 아직 설정되지 않았습니다" 안내로 처리한다. 계정 값은 로그 · 응답에 남기지 않는다.
 */
@Component
public class DdMail {
    public final boolean on; final String kind, url, token, from; final URI smtp;
    public DdMail(@Value("${MAIL_PROVIDER:}") String prov, @Value("${MAIL_WEBHOOK_URL:}") String url, @Value("${MAIL_WEBHOOK_TOKEN:}") String token,
                  @Value("${SMTP_URL:}") String smtpUrl, @Value("${MAIL_FROM:}") String from, @Value("${NODE_ENV:}") String env) {
        String p = prov.trim().toLowerCase(java.util.Locale.ROOT); boolean prod = "production".equals(env);
        this.from = from.trim().isEmpty() ? "no-reply@didisam.com" : from.trim(); this.token = token.trim(); String u = url.trim(); URI s = null; boolean ok = false;
        if ("webhook".equals(p)) ok = u.startsWith("https://") || (!prod && u.startsWith("http://"));
        else if ("smtp".equals(p)) { try { s = URI.create(smtpUrl.trim()); ok = ("smtp".equals(s.getScheme()) || "smtps".equals(s.getScheme())) && s.getHost() != null; } catch (Exception e) { ok = false; } }
        this.on = ok; this.kind = ok ? p : ""; this.url = u; this.smtp = s;
    }

    public void send(String to, String subject, String text) throws Exception {
        if (!on) throw new IllegalStateException("mail off");
        if ("webhook".equals(kind)) {
            com.fasterxml.jackson.databind.node.ObjectNode b = Js.F.objectNode(); b.put("from", from); b.put("to", to); b.put("subject", subject); b.put("text", text);
            HttpRequest.Builder rq = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(10)).header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(Js.stringify(b), StandardCharsets.UTF_8));
            if (!token.isEmpty()) rq.header("authorization", "Bearer " + token);
            HttpResponse<String> r = HttpClient.newBuilder().proxy(HttpClient.Builder.NO_PROXY).connectTimeout(Duration.ofSeconds(10)).build().send(rq.build(), HttpResponse.BodyHandlers.ofString());
            if (r.statusCode() < 200 || r.statusCode() >= 300) throw new IllegalStateException("mail webhook " + r.statusCode());
            return;
        }
        smtpSend(to, subject, text);
    }

    private void smtpSend(String to, String subject, String text) throws Exception {
        boolean implicit = "smtps".equals(smtp.getScheme()); int port = smtp.getPort() > 0 ? smtp.getPort() : implicit ? 465 : 587; String host = smtp.getHost();
        String ui = smtp.getRawUserInfo() == null ? "" : smtp.getRawUserInfo(); int c = ui.indexOf(':');
        String user = URLDecoder.decode(c < 0 ? ui : ui.substring(0, c), StandardCharsets.UTF_8), pass = c < 0 ? "" : URLDecoder.decode(ui.substring(c + 1), StandardCharsets.UTF_8);
        SSLSocketFactory tls = (SSLSocketFactory) SSLSocketFactory.getDefault();
        Socket s = implicit ? tls.createSocket() : new Socket(java.net.Proxy.NO_PROXY); s.connect(new InetSocketAddress(host, port), 15000); s.setSoTimeout(15000);
        if (implicit) ((SSLSocket) s).startHandshake();
        try {
            Io io = new Io(s); io.expect(null, 220); String ehlo = io.expect("EHLO didisam", 250);
            if (!implicit) {
                if (!ehlo.toUpperCase(java.util.Locale.ROOT).contains("STARTTLS")) throw new IllegalStateException("smtp starttls unsupported");
                io.expect("STARTTLS", 220); SSLSocket t = (SSLSocket) tls.createSocket(s, host, port, true); t.startHandshake(); s = t; io = new Io(s); io.expect("EHLO didisam", 250);
            }
            if (!user.isEmpty()) io.expect("AUTH PLAIN " + Base64.getEncoder().encodeToString(("\0" + user + "\0" + pass).getBytes(StandardCharsets.UTF_8)), 235);
            io.expect("MAIL FROM:<" + from.replaceAll("^.*<|>.*$", "") + ">", 250); io.expect("RCPT TO:<" + to + ">", 250, 251); io.expect("DATA", 354);
            String subj = subject.matches("[\\x20-\\x7e]*") ? subject : "=?UTF-8?B?" + Base64.getEncoder().encodeToString(subject.getBytes(StandardCharsets.UTF_8)) + "?=";
            String body = Base64.getMimeEncoder(76, "\r\n".getBytes(StandardCharsets.US_ASCII)).encodeToString(text.getBytes(StandardCharsets.UTF_8));
            String msg = String.join("\r\n", "From: " + from, "To: " + to, "Subject: " + subj, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64",
                "Date: " + ZonedDateTime.now().format(DateTimeFormatter.RFC_1123_DATE_TIME), "", body);
            io.expect(msg.replace("\r\n.", "\r\n..") + "\r\n.", 250);
            try { io.expect("QUIT", 221); } catch (Exception e) { /* 무시 */ }
        } finally { try { s.close(); } catch (Exception e) { /* 무시 */ } }
    }
    private static final class Io {
        final BufferedReader in; final OutputStream out;
        Io(Socket s) throws Exception { in = new BufferedReader(new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8)); out = s.getOutputStream(); }
        String expect(String line, int... codes) throws Exception {
            if (line != null) { out.write((line + "\r\n").getBytes(StandardCharsets.UTF_8)); out.flush(); }
            StringBuilder all = new StringBuilder(); String l;
            while ((l = in.readLine()) != null) { all.append(l).append('\n'); if (l.length() >= 4 && l.charAt(3) == ' ') break; if (l.length() == 3) break; }
            if (l == null) throw new IllegalStateException("smtp closed");
            int code = Integer.parseInt(l.substring(0, 3)); for (int x : codes) if (x == code) return all.toString();
            throw new IllegalStateException("smtp " + code);
        }
    }
}

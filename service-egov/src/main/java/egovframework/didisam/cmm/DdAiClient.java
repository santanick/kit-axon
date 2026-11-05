package egovframework.didisam.cmm;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.stereotype.Component;

/**
 * 외부 AI(Anthropic Messages API) 호출 — Node fetch(aiUrl, …)와 같은 요청 헤더 · 시간 제한.
 * 주소는 ANTHROPIC_URL(기본 https://api.anthropic.com/v1/messages), 키는 ANTHROPIC_API_KEY. 키 값은 로그에 남기지 않는다.
 * Node 내장 fetch처럼 시스템 프록시를 쓰지 않는다(직접 연결).
 */
@Component
public class DdAiClient {
    public record Res(int status, JsonNode json) { public boolean ok() { return status >= 200 && status < 300; } }
    /** 연결 실패(timeout=true면 시간 초과) */
    public static final class NetErr extends Exception { public final boolean timeout; NetErr(boolean t) { super(t ? "timeout" : "net"); timeout = t; } }

    private final DdProps p;
    private final HttpClient http = HttpClient.newBuilder().proxy(HttpClient.Builder.NO_PROXY).version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(30)).build();
    public DdAiClient(DdProps p) { this.p = p; }

    public Res post(String json, long timeoutMs) throws NetErr {
        HttpRequest rq;
        try {
            rq = HttpRequest.newBuilder(URI.create(p.aiUrl)).POST(HttpRequest.BodyPublishers.ofString(json))
                .header("content-type", "application/json").header("x-api-key", p.aiKey).header("anthropic-version", "2023-06-01").build();
        } catch (Exception e) { throw new NetErr(false); }
        CompletableFuture<HttpResponse<byte[]>> f = http.sendAsync(rq, HttpResponse.BodyHandlers.ofByteArray());
        HttpResponse<byte[]> r;
        try { r = f.get(timeoutMs, TimeUnit.MILLISECONDS); }
        catch (TimeoutException e) { f.cancel(true); throw new NetErr(true); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new NetErr(false); }
        catch (Exception e) { throw new NetErr(false); }
        JsonNode j; // r.json().catch(() => ({}))
        try { j = DdWeb.JSON.readTree(r.body()); if (j == null || j.isMissingNode()) j = Js.F.objectNode(); } catch (Exception e) { j = Js.F.objectNode(); }
        return new Res(r.statusCode(), j);
    }
}

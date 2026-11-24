import egovframework.didisam.cmm.DdAiGuard;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** 레드팀 Java 대조(run.js --java가 호출) — 표준입력 한 줄 = base64(op \t tag \t text \t markers…), 출력 한 줄 = base64(결과) */
public class GuardParity {
    public static void main(String[] a) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        Base64.Decoder D = Base64.getDecoder(); Base64.Encoder E = Base64.getEncoder(); String l;
        while ((l = in.readLine()) != null) {
            String[] f = new String(D.decode(l.trim()), StandardCharsets.UTF_8).split("\t", -1); String r;
            switch (f[0]) {
                case "score" -> r = String.valueOf(DdAiGuard.injectScore(f[2]));
                case "fence" -> r = DdAiGuard.fence(f[1], f[2]);
                case "redact" -> { DdAiGuard.Red x = DdAiGuard.redact(f[2]); r = DdAiGuard.hitN(x.hits()) + "\t" + x.text(); }
                case "leak" -> r = String.valueOf(DdAiGuard.leakCheck(f[2], Arrays.asList(f).subList(3, f.length)));
                default -> r = "";
            }
            System.out.println(E.encodeToString(r.getBytes(StandardCharsets.UTF_8)));
        }
    }
}

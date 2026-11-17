import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import egovframework.didisam.pub.service.impl.PubServiceImpl;
import java.nio.file.Files;
import java.nio.file.Path;

/** v43.6 셀프러닝 노트 lp.notes · 학습자 연결 lp.conn — tests/lpnotes-vectors.json을 PubServiceImpl.cleanNotes · cleanConn에 돌려 Node(lpnotes.js)와 같은지 대조한다.
 *  실행: (mvn -q -o compile 후) cd service-egov && java -cp "target/classes:$(find ~/.m2/repository/com/fasterxml/jackson -name "*.jar" | tr "\n" :)" test/NotesVectors.java ../tests/lpnotes-vectors.json */
public class NotesVectors {
    public static void main(String[] a) throws Exception {
        ObjectMapper M = new ObjectMapper(); JsonNode V = M.readTree(Files.readString(Path.of(a.length > 0 ? a[0] : "../tests/lpnotes-vectors.json")));
        int ok = 0, bad = 0;
        for (JsonNode v : V) {
            JsonNode r = "conn".equals(v.get("kind").asText()) ? PubServiceImpl.cleanConn(v.get("in")) : PubServiceImpl.cleanNotes(v.get("in"));
            JsonNode exp = v.get("out"); JsonNode act = r == null ? M.nullNode() : M.readTree(r.toString());
            if (exp.equals(act)) ok++; else { bad++; System.err.println("✗ " + v.get("name").asText() + "\n  기대 " + exp + "\n  실제 " + act); }
        }
        System.out.println("NotesVectors: " + ok + " 통과, " + bad + " 실패"); System.exit(bad > 0 ? 1 : 0);
    }
}

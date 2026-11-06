package egovframework.didisam.lms.o.web;

import egovframework.didisam.lms.o.service.LmsOService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** 묶음 O(AI) 경로 — 처리는 LmsOServiceImpl(Node mod-o.js와 같은 순서 · 같은 오류) */
@RestController
@RequestMapping("/api/lms/o")
public class LmsOController {
    private final LmsOService svc;
    public LmsOController(LmsOService svc) { this.svc = svc; }
    private Object h(String m, String p, HttpServletRequest req, byte[] body) throws Exception { return svc.handle(m + " /api/lms/o/" + p, req, body); }

    @GetMapping("/llm/providers") public Object providers(HttpServletRequest r) throws Exception { return h("GET", "llm/providers", r, null); }
    @PostMapping("/llm/provider") public Object provider(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "llm/provider", r, b); }
    @DeleteMapping("/llm/provider") public Object providerDel(HttpServletRequest r) throws Exception { return h("DELETE", "llm/provider", r, null); }
    @PostMapping("/llm/route") public Object route(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "llm/route", r, b); }
    @PutMapping("/llm/embed") public Object embed(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("PUT", "llm/embed", r, b); }
    @GetMapping("/llm/metrics") public Object metrics(HttpServletRequest r) throws Exception { return h("GET", "llm/metrics", r, null); }
    @GetMapping("/llm/quota") public Object quota(HttpServletRequest r) throws Exception { return h("GET", "llm/quota", r, null); }
    @PutMapping("/llm/quota") public Object quotaPut(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("PUT", "llm/quota", r, b); }

    @GetMapping("/rag/sources") public Object sources(HttpServletRequest r) throws Exception { return h("GET", "rag/sources", r, null); }
    @PostMapping("/rag/source") public Object source(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "rag/source", r, b); }
    @PutMapping("/rag/source") public Object sourcePut(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("PUT", "rag/source", r, b); }
    @DeleteMapping("/rag/source") public Object sourceDel(HttpServletRequest r) throws Exception { return h("DELETE", "rag/source", r, null); }
    @PostMapping("/rag/upload") public Object upload(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "rag/upload", r, b); }
    @GetMapping("/rag/docs") public Object docs(HttpServletRequest r) throws Exception { return h("GET", "rag/docs", r, null); }
    @GetMapping("/rag/doc") public Object doc(HttpServletRequest r) throws Exception { return h("GET", "rag/doc", r, null); }
    @DeleteMapping("/rag/doc") public Object docDel(HttpServletRequest r) throws Exception { return h("DELETE", "rag/doc", r, null); }
    @PostMapping("/rag/search") public Object search(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "rag/search", r, b); }
    @GetMapping("/sections") public Object sections(HttpServletRequest r) throws Exception { return h("GET", "sections", r, null); }
    @GetMapping("/my/scope") public Object scope(HttpServletRequest r) throws Exception { return h("GET", "my/scope", r, null); }

    @GetMapping("/qa/threads") public Object threads(HttpServletRequest r) throws Exception { return h("GET", "qa/threads", r, null); }
    @PostMapping("/qa/thread") public Object thread(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "qa/thread", r, b); }
    @GetMapping("/qa/thread") public Object threadGet(HttpServletRequest r) throws Exception { return h("GET", "qa/thread", r, null); }
    @PutMapping("/qa/thread") public Object threadPut(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("PUT", "qa/thread", r, b); }
    @DeleteMapping("/qa/thread") public Object threadDel(HttpServletRequest r) throws Exception { return h("DELETE", "qa/thread", r, null); }
    @PutMapping("/qa/message") public Object message(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("PUT", "qa/message", r, b); }
    @PostMapping("/qa/ask") public Object ask(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "qa/ask", r, b); }
    @GetMapping("/qa/faq") public Object faq(HttpServletRequest r) throws Exception { return h("GET", "qa/faq", r, null); }
    @PostMapping("/qa/faq") public Object faqAdd(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "qa/faq", r, b); }
    @DeleteMapping("/qa/faq") public Object faqDel(HttpServletRequest r) throws Exception { return h("DELETE", "qa/faq", r, null); }

    @PostMapping("/gen/summary") public Object summary(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "gen/summary", r, b); }
    @PostMapping("/gen/translate") public Object translate(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "gen/translate", r, b); }
    @PostMapping("/gen/quiz") public Object quiz(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "gen/quiz", r, b); }
    @PostMapping("/gen/rubric") public Object rubric(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "gen/rubric", r, b); }
    @PostMapping("/gen/classify") public Object classify(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "gen/classify", r, b); }
    @GetMapping("/gen/list") public Object genList(HttpServletRequest r) throws Exception { return h("GET", "gen/list", r, null); }
    @GetMapping("/gen/item") public Object genItem(HttpServletRequest r) throws Exception { return h("GET", "gen/item", r, null); }
    @PutMapping("/gen/item") public Object genPut(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("PUT", "gen/item", r, b); }
    @PostMapping("/gen/review") public Object review(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "gen/review", r, b); }

    @PostMapping("/an/discussion") public Object discussion(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "an/discussion", r, b); }
    @GetMapping("/an/activity") public Object activity(HttpServletRequest r) throws Exception { return h("GET", "an/activity", r, null); }
    @PostMapping("/editor") public Object editor(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "editor", r, b); }
    @PostMapping("/eval") public Object eval(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "eval", r, b); }
    @GetMapping("/eval/list") public Object evalList(HttpServletRequest r) throws Exception { return h("GET", "eval/list", r, null); }
    @PostMapping("/eval/confirm") public Object evalConfirm(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "eval/confirm", r, b); }

    @GetMapping("/caption/rooms") public Object rooms(HttpServletRequest r) throws Exception { return h("GET", "caption/rooms", r, null); }
    @PostMapping("/caption/room") public Object room(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "caption/room", r, b); }
    @PutMapping("/caption/room") public Object roomPut(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("PUT", "caption/room", r, b); }
    @PostMapping("/caption/line") public Object line(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("POST", "caption/line", r, b); }
    @PutMapping("/caption/line") public Object linePut(@RequestBody(required = false) byte[] b, HttpServletRequest r) throws Exception { return h("PUT", "caption/line", r, b); }
    @GetMapping("/caption/lines") public Object lines(HttpServletRequest r) throws Exception { return h("GET", "caption/lines", r, null); }
    @GetMapping("/caption/view") public Object view(HttpServletRequest r) throws Exception { return h("GET", "caption/view", r, null); }
}

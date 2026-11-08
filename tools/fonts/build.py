#!/usr/bin/env python3
"""v34.5 F2 — 한글 웹폰트 unicode-range 분할 빌드 (fonttools · brotli)

원본 글꼴(OFL 1.1, 예약 글꼴 이름 없음)을 받아 굵기별로 고정한 뒤, 한글 11,172자 + 라틴 + 기호를
약 95개 조각 woff2로 나눈다. 조각 순서는 tools/fonts/slices-ko.json(자주 쓰는 글자가 앞 조각).

산출물(didisam/fonts/<id>/):
  <weight>-<n>.woff2   조각 글꼴
  font.css             @font-face 목록(unicode-range · font-display: swap) + 크기 보정 폴백 '<이름> Fallback'
  OFL.txt              라이선스 원문
그리고 didisam/fonts/hpf.json(글꼴 · 굵기 · 조각 · 용량 · 메트릭)과 didisam/fonts/slices.json(글자 → 조각, 미리 받기 계산용).

원본 파일은 저장소에 넣지 않는다. 받는 주소와 SHA-256은 아래 FAMILIES에 기록한다.
사용:  pip install --break-system-packages fonttools brotli
       python3 tools/fonts/build.py [--cache DIR] [--only id,id] [--jobs 2]
RFN(예약 글꼴 이름)이 있는 글꼴(Pretendard · Wanted Sans · SUIT · IBM Plex · Nanum 등)은 분할 = 수정본이 되어
원래 이름을 쓸 수 없으므로 여기서 빌드하지 않는다. Pretendard · Wanted Sans는 원저작자 배포본(jsdelivr)을 그대로 쓴다.
v34.5 H4: LINE Seed Sans KR(OFL · RFN 없음) 추가, 함렛 800 → 700. 다시 빌드: --only line-seed-kr,hahmlet
"""
import argparse, hashlib, io, json, os, sys, urllib.request
from concurrent.futures import ProcessPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'didisam', 'fonts')
GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'

# id: 사이트 데이터 · HPF.list에 쓰는 이름(소문자-하이픈). fam: CSS font-family(원래 이름 — RFN 없음 확인).
FAMILIES = {
    'noto-serif-kr': {
        'fam': 'Noto Serif KR', 'kind': 'serif', 'ver': 'google/fonts ofl/notoserifkr (2.003, 2026-11-08 받음)',
        'src': {'NotoSerifKR[wght].ttf': (GF + 'notoserifkr/NotoSerifKR%5Bwght%5D.ttf', '11f8d5de6f1b79195efba3828aaa2ec95c1178f5ae976fb23c8d53250a9938f3')},
        'lic': GF + 'notoserifkr/OFL.txt',
        'weights': {400: ('NotoSerifKR[wght].ttf', 400, '100 549'), 700: ('NotoSerifKR[wght].ttf', 700, '550 900')},
        'local': ['Noto Serif CJK KR', 'Noto Serif KR', 'AppleMyungjo', 'Batang', 'BatangChe'], 'generic': 'serif'},
    'gowun-dodum': {
        'fam': 'Gowun Dodum', 'kind': 'round', 'ver': 'google/fonts ofl/gowundodum (1.000)',
        'src': {'GowunDodum-Regular.ttf': (GF + 'gowundodum/GowunDodum-Regular.ttf', 'a6e457933227483a11758fd0947bc74422a106d46f0bf057fdaa5af94a30067d')},
        'lic': GF + 'gowundodum/OFL.txt',
        'weights': {400: ('GowunDodum-Regular.ttf', None, '100 900')},
        'local': ['Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans CJK KR'], 'generic': 'sans-serif'},
    'hahmlet': {
        'fam': 'Hahmlet', 'kind': 'display', 'ver': 'google/fonts ofl/hahmlet (1.002)',
        'src': {'Hahmlet[wght].ttf': (GF + 'hahmlet/Hahmlet%5Bwght%5D.ttf', '892bffe530255770a7435226154a02f519055ff6bedf64254f37f21d15a59279')},
        'lic': GF + 'hahmlet/OFL.txt',
        # v34.5 H4(R2 N5): 800은 포스터 글씨처럼 무거워 700으로 내린다(700 이상 요청은 700 인스턴스)
        'weights': {600: ('Hahmlet[wght].ttf', 600, '100 649'), 700: ('Hahmlet[wght].ttf', 700, '650 900')},
        'local': ['Noto Serif CJK KR', 'AppleMyungjo', 'Batang'], 'generic': 'serif'},
    'do-hyeon': {
        'fam': 'Do Hyeon', 'kind': 'display', 'ver': 'google/fonts ofl/dohyeon (3.100)',
        'src': {'DoHyeon-Regular.ttf': (GF + 'dohyeon/DoHyeon-Regular.ttf', '35644be7f28e0a68a447b1f7af351dcde5674b870f24f7b5f43e26d00b4ab653')},
        'lic': GF + 'dohyeon/OFL.txt',
        'weights': {400: ('DoHyeon-Regular.ttf', None, '100 900')},
        'local': ['Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans CJK KR'], 'generic': 'sans-serif'},
    # v34.5 H4(R2 H7 · N5): 고딕 제목에 개성 — 기하형(원형 ㅇ · 넓은 속공간) 고딕, 굵기 2개(400 · 700), 한글 11,172자.
    # 라이선스: SIL OFL 1.1, 저작권 줄 '© LY Corporation' — 예약 글꼴 이름(RFN) 없음(2026-11-08 OFL.txt · name 13/0 확인) → 원래 이름으로 분할 가능.
    # 원본은 LINE 공식 배포 zip(seed.line.me, 2023.09.06판)의 TTF. zip 안 파일은 (주소, zip SHA-256, zip 안 경로)로 적는다.
    'line-seed-kr': {
        'fam': 'LINE Seed Sans KR', 'kind': 'sans', 'ver': 'LINE Seed Sans KR 1.000 (seed.line.me LINE_SeedKR_2023.09.06, 2026-11-08 받음)',
        'src': {'LINESeedKR-Rg.ttf': ('https://seed.line.me/src/images/fonts/LINE_Seed_Sans_KR.zip', 'bfc3d5f737a47be1d9fc6cc971d8f78c7b6688f327501b522071f306dcdcf3e1', 'LINE_SeedKR_2023.09.06/TTF/LINESeedKR-Rg.ttf', '52fdbf502f57c2652461eee99c8c71a9f85850f93ed411e5ed08e24327e33003'),
                'LINESeedKR-Bd.ttf': ('https://seed.line.me/src/images/fonts/LINE_Seed_Sans_KR.zip', 'bfc3d5f737a47be1d9fc6cc971d8f78c7b6688f327501b522071f306dcdcf3e1', 'LINE_SeedKR_2023.09.06/TTF/LINESeedKR-Bd.ttf', 'df6d817f60814528922a0e2911b76a1252db0697c2de78a7283ea7a3c8e70e21')},
        'lic': 'https://raw.githubusercontent.com/line/seed/main/OFL.txt',
        'weights': {400: ('LINESeedKR-Rg.ttf', None, '100 549'), 700: ('LINESeedKR-Bd.ttf', None, '550 900')},
        'local': ['Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans CJK KR'], 'generic': 'sans-serif'},
    'gowun-batang': {
        'fam': 'Gowun Batang', 'kind': 'serif', 'ver': 'google/fonts ofl/gowunbatang (1.000)',
        'src': {'GowunBatang-Regular.ttf': (GF + 'gowunbatang/GowunBatang-Regular.ttf', '466c593e7147412e748af4856d5ad14709b5a860bdf62b9c2546f2c5874e9849'),
                'GowunBatang-Bold.ttf': (GF + 'gowunbatang/GowunBatang-Bold.ttf', 'dbfcaa646e5831e7478524924f02906f550285a5050699b4e38c9950b3ec4b94')},
        'lic': GF + 'gowunbatang/OFL.txt',
        'weights': {400: ('GowunBatang-Regular.ttf', None, '100 549'), 700: ('GowunBatang-Bold.ttf', None, '550 900')},
        'local': ['Noto Serif CJK KR', 'AppleMyungjo', 'Batang'], 'generic': 'serif'},
}

# 유지할 레이아웃 기능(G1 기준과 같음) · 힌팅 제거
FEATURES = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'tnum', 'pnum', 'lnum', 'ljmo', 'vjmo', 'tjmo']


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def fetch(url, dst, want=None):
    if not os.path.exists(dst):
        print('  받는 중', url, file=sys.stderr)
        with urllib.request.urlopen(url, timeout=120) as r, open(dst + '.part', 'wb') as f:
            f.write(r.read())
        os.replace(dst + '.part', dst)
    if want and sha(dst) != want:
        raise SystemExit(f'SHA-256 불일치: {dst} (원본이 바뀌었으면 FAMILIES의 해시를 확인 후 갱신)')
    return dst


def ranges(cps):
    cps = sorted(set(cps)); out = []; i = 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        out.append(f'U+{cps[i]:x}' if i == j else f'U+{cps[i]:x}-{cps[j]:x}'); i = j + 1
    return ','.join(out)


def instance(path, wght):
    from fontTools.ttLib import TTFont
    f = TTFont(path)
    if wght is not None and 'fvar' in f:
        from fontTools.varLib import instancer
        f = instancer.instantiateVariableFont(f, {'wght': wght}, updateFontNames=True)
    return f


def job(args):
    """한 굵기: 고정 → 전체 조각 합집합으로 1차 축소 → 조각별 woff2"""
    fid, w, path, wght, slices, outdir = args
    from fontTools import subset
    from fontTools.ttLib import TTFont
    f = instance(path, wght)
    cmap = set(f.getBestCmap().keys())
    allc = sorted(cmap & set(c for s in slices for c in s))
    o = subset.Options(); o.layout_features = FEATURES; o.hinting = False; o.desubroutinize = True
    o.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]; o.notdef_outline = True; o.drop_tables += ['DSIG', 'STAT']
    s = subset.Subsetter(o); s.populate(unicodes=allc); s.subset(f)
    buf = io.BytesIO(); f.save(buf); base = buf.getvalue()
    upm = f['head'].unitsPerEm; hh = f['hhea']; os2 = f['OS/2']
    hm = f['hmtx']; cm = f.getBestCmap()
    adv = [hm[cm[ord(ch)]][0] for ch in '가나다라마바사아자차카타파하이의는을' if ord(ch) in cm]
    lat = [hm[cm[ord(ch)]][0] for ch in 'abcdefghijklmnopqrstuvwxyz' if ord(ch) in cm]
    met = {'upm': upm, 'asc': hh.ascent, 'desc': -hh.descent, 'gap': hh.lineGap,
           'han': round(sum(adv) / len(adv) / upm, 4) if adv else 1, 'lat': round(sum(lat) / len(lat) / upm, 4) if lat else 0.5}
    files = []
    o2 = subset.Options(); o2.layout_features = FEATURES; o2.hinting = False; o2.desubroutinize = True; o2.flavor = 'woff2'
    o2.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]; o2.notdef_outline = True
    for i, sl in enumerate(slices):
        u = sorted(cmap & set(sl))
        if not u:
            continue
        g = TTFont(io.BytesIO(base)); ss = subset.Subsetter(o2); ss.populate(unicodes=u); ss.subset(g)
        fn = f'{w}-{i}.woff2'; p = os.path.join(outdir, fn); g.flavor = 'woff2'; g.save(p)
        files.append([i, os.path.getsize(p), ranges(u), sha(p)[:8]])
    # 한글 음절이 모자란 글꼴(함렛 2,788 · 도현 2,437)은 가진 음절 목록을 hpf.json에 남긴다 → HPF.gaps(글자, id)로 '빠진 글자 수'를 셈(R2 N5 · 품질 점수)
    ko = ''.join(chr(c) for c in sorted(cmap) if 0xac00 <= c <= 0xd7a3)
    met['ko'] = ko if len(ko) < 11172 else ''
    return fid, w, files, met


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', default=os.path.expanduser('~/.cache/hpfonts'))
    ap.add_argument('--only', default='')
    ap.add_argument('--jobs', type=int, default=2)
    a = ap.parse_args(); os.makedirs(a.cache, exist_ok=True)
    slices = json.load(open(os.path.join(ROOT, 'tools', 'fonts', 'slices-ko.json')))['slices']
    only = [x for x in a.only.split(',') if x]
    man_p = os.path.join(OUT, 'hpf.json')
    man = json.load(open(man_p)) if os.path.exists(man_p) else {}
    tasks = []
    for fid, F in FAMILIES.items():
        if only and fid not in only:
            continue
        d = os.path.join(OUT, fid); os.makedirs(d, exist_ok=True)
        for x in os.listdir(d):
            if x.endswith('.woff2'):
                os.remove(os.path.join(d, x))
        for fn, src in F['src'].items():
            if len(src) == 2:
                fetch(src[0], os.path.join(a.cache, fn), src[1])
            else:  # (zip 주소, zip 해시, zip 안 경로, 파일 해시) — 공식 배포가 zip뿐인 글꼴
                dst = os.path.join(a.cache, fn)
                if not os.path.exists(dst) or sha(dst) != src[3]:
                    import zipfile
                    z = fetch(src[0], os.path.join(a.cache, os.path.basename(src[0])), src[1])
                    with zipfile.ZipFile(z) as zf, open(dst, 'wb') as f:
                        f.write(zf.read(src[2]))
                if sha(dst) != src[3]:
                    raise SystemExit(f'SHA-256 불일치: {dst}')
        fetch(F['lic'], os.path.join(d, 'OFL.txt'))
        for w, (fn, wght, rng) in F['weights'].items():
            tasks.append((fid, w, os.path.join(a.cache, fn), wght, slices, d))
    res = {}
    with ProcessPoolExecutor(max_workers=a.jobs) as ex:
        for fid, w, files, met in ex.map(job, tasks):
            res.setdefault(fid, {})[w] = (files, met); print(f'{fid} {w}: {len(files)}조각 {sum(x[1] for x in files) // 1024}KB', file=sys.stderr)
    for fid, W in res.items():
        F = FAMILIES[fid]; css = [f'/* {F["fam"]} — SIL Open Font License 1.1 (OFL.txt) · {F["ver"]} · tools/fonts/build.py 분할 */']
        met = W[min(W)][1]
        # 크기 보정 폴백: 기기 한글 글꼴(한글 폭 1em 기준)을 웹폰트 한글 폭 · 세로 메트릭에 맞춘다(CLS 감소)
        sa = met['han']; up = met['upm']
        fb = (f"@font-face{{font-family:'{F['fam']} Fallback';src:{','.join(f'local({chr(39)}{n}{chr(39)})' for n in F['local'])};"
              f"size-adjust:{sa * 100:.1f}%;ascent-override:{met['asc'] / up / sa * 100:.1f}%;descent-override:{met['desc'] / up / sa * 100:.1f}%;line-gap-override:{met['gap'] / up / sa * 100:.1f}%}}")
        css.append(fb)
        ko = met.pop('ko', '')
        ent = {'fam': F['fam'], 'kind': F['kind'], 'lic': 'OFL-1.1', 'ver': F['ver'], 'w': {}, 'met': met}
        if ko:
            ent['ko'] = ko
        for w in sorted(W):
            files, _ = W[w]; rng = F['weights'][w][2]
            for i, size, ur, hh in files:  # ?h=내용 해시: 다시 빌드해도 서비스 워커 저장본이 섞이지 않게
                css.append(f"@font-face{{font-family:'{F['fam']}';font-style:normal;font-weight:{rng};font-display:swap;src:url('{w}-{i}.woff2?h={hh}') format('woff2');unicode-range:{ur}}}")
            ent['w'][str(w)] = {'range': rng, 'n': [x[0] for x in files], 'kb': [round(x[1] / 1024, 1) for x in files], 'h': [x[3] for x in files], 'total_kb': round(sum(x[1] for x in files) / 1024)}
        open(os.path.join(OUT, fid, 'font.css'), 'w').write('\n'.join(css) + '\n')
        ent['css_h'] = sha(os.path.join(OUT, fid, 'font.css'))[:8]  # hpfontpick.js의 V에 같은 값을 적는다
        ent['css_kb'] = round(os.path.getsize(os.path.join(OUT, fid, 'font.css')) / 1024, 1)
        man[fid] = ent
    json.dump(man, open(man_p, 'w'), ensure_ascii=False, indent=1)
    # 글자 → 조각 번호(미리 받기 계산용 · 한글 음절만, 조각마다 글자를 이어 붙인 문자열)
    json.dump({'s': [''.join(chr(c) for c in s if 0xac00 <= c <= 0xd7a3) for s in slices]}, open(os.path.join(OUT, 'slices.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print('완료', man_p, file=sys.stderr)
    print('hpfontpick.js V =', json.dumps({k: v['css_h'] for k, v in man.items()}), file=sys.stderr)


if __name__ == '__main__':
    main()

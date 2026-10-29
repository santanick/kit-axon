/* 디디쌤 스튜디오 v5 — 글로벌 · 일정
   ① 홈페이지: 유형별 시나리오 템플릿 20종 선택 → AI로 수정(대화형 편집) · 다국어 페이지
   ② 언어팩 10개(관리자 화면 핵심 UI) + 학습자 사이트 · 콘텐츠 언어 설정
   ③ 영상 자동 자막 · 자동 번역(10개 언어, 브라우저 내장 번역 → 운영 모드 번역 API)
   ④ 캘린더 연동(Google · 네이버 · ICS) + 학습자 · 교수자 일정 기반 AI 튜터 코칭 */
'use strict';

/* ═════════ ② 언어 ═════════ */
const LANGS = [['ko', '한국어'], ['en', 'English'], ['ja', '日本語'], ['zh-CN', '简体中文'], ['zh-TW', '繁體中文'], ['vi', 'Tiếng Việt'], ['th', 'ไทย'], ['id', 'Bahasa Indonesia'], ['es', 'Español'], ['fr', 'Français']];
const LANG_TTS = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', vi: 'vi-VN', th: 'th-TH', id: 'id-ID', es: 'es-ES', fr: 'fr-FR' };
const langName = l => (LANGS.find(x => x[0] === l) || [l, l])[1];
const LORD = ['en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'th', 'id', 'es', 'fr'];
/* 관리자 UI 핵심 문구(메뉴 · 탭 · 공통 버튼 · 용어). 순서: en ja zh-CN zh-TW vi th id es fr */
const DICT = Object.fromEntries(Object.entries({
  '현황': 'Overview|現況|概况|概況|Tổng quan|ภาพรวม|Ringkasan|Resumen|Aperçu',
  '학습': 'Learning|学習|学习|學習|Học tập|การเรียน|Pembelajaran|Aprendizaje|Apprentissage',
  '소통': 'Communication|コミュニケーション|沟通|溝通|Giao tiếp|การสื่อสาร|Komunikasi|Comunicación|Communication',
  '운영': 'Operations|運営|运营|營運|Vận hành|การดำเนินงาน|Operasional|Operaciones|Opérations',
  '설정': 'Settings|設定|设置|設定|Cài đặt|ตั้งค่า|Pengaturan|Ajustes|Paramètres',
  '학생': 'Students|学生|学生|學生|Sinh viên|นักศึกษา|Mahasiswa|Estudiantes|Étudiants',
  '임직원': 'Employees|社員|员工|員工|Nhân viên|พนักงาน|Karyawan|Empleados|Employés',
  '원생': 'Students|生徒|学员|學員|Học sinh|นักเรียน|Siswa|Alumnos|Élèves',
  '수강생': 'Learners|受講生|学员|學員|Học viên|ผู้เรียน|Peserta|Alumnos|Apprenants',
  '학습자': 'Learners|学習者|学习者|學習者|Người học|ผู้เรียน|Pelajar|Aprendices|Apprenants',
  '훈련생': 'Trainees|訓練生|学员|學員|Học viên|ผู้ฝึกอบรม|Peserta pelatihan|Aprendices|Stagiaires',
  '교과목': 'Courses|科目|课程|課程|Môn học|รายวิชา|Mata kuliah|Asignaturas|Cours',
  '교육과정': 'Programs|研修コース|培训课程|培訓課程|Chương trình|หลักสูตร|Program|Programas|Formations',
  '수업': 'Classes|授業|课程|課程|Lớp học|ชั้นเรียน|Kelas|Clases|Cours',
  '강좌': 'Courses|講座|课程|課程|Khóa học|คอร์ส|Kursus|Cursos|Cours',
  '훈련과정': 'Training courses|訓練コース|培训课程|培訓課程|Khóa đào tạo|หลักสูตรฝึกอบรม|Kursus pelatihan|Cursos de formación|Formations',
  '러닝 저니': 'Learning journey|ラーニングジャーニー|学习路径|學習路徑|Lộ trình học|เส้นทางการเรียน|Jalur belajar|Itinerario|Parcours',
  'AI 진단': 'AI assessment|AI診断|AI诊断|AI診斷|Chẩn đoán AI|ประเมินด้วย AI|Diagnosis AI|Diagnóstico IA|Diagnostic IA',
  '콘텐츠 · 편성': 'Content · Schedule|コンテンツ · 編成|内容 · 编排|內容 · 編排|Nội dung · Lịch|เนื้อหา · จัดผัง|Konten · Jadwal|Contenido · Programación|Contenus · Programmation',
  '평가': 'Assessment|評価|评估|評估|Đánh giá|การประเมิน|Penilaian|Evaluación|Évaluation',
  '배지': 'Badges|バッジ|徽章|徽章|Huy hiệu|เหรียญตรา|Lencana|Insignias|Badges',
  '수료증': 'Certificates|修了証|结业证书|結業證書|Chứng chỉ|ใบประกาศ|Sertifikat|Certificados|Certificats',
  '출결': 'Attendance|出欠|考勤|出缺勤|Điểm danh|การเข้าเรียน|Kehadiran|Asistencia|Présences',
  '교재': 'Materials|教材|教材|教材|Tài liệu|ตำรา|Bahan ajar|Materiales|Supports',
  '목록 · 진도': 'List · Progress|一覧 · 進捗|列表 · 进度|列表 · 進度|Danh sách · Tiến độ|รายชื่อ · ความคืบหน้า|Daftar · Progres|Lista · Progreso|Liste · Progression',
  '등록 · 초대': 'Enroll · Invite|登録 · 招待|注册 · 邀请|註冊 · 邀請|Đăng ký · Mời|ลงทะเบียน · เชิญ|Daftar · Undang|Inscribir · Invitar|Inscrire · Inviter',
  '학과': 'Departments|学科|院系|系所|Khoa|ภาควิชา|Jurusan|Departamentos|Départements',
  '부서': 'Departments|部署|部门|部門|Phòng ban|แผนก|Departemen|Departamentos|Services',
  '반': 'Classes|クラス|班级|班級|Lớp|ห้อง|Kelas|Grupos|Classes',
  '기수': 'Cohorts|期|期次|期別|Khóa|รุ่น|Angkatan|Promociones|Promotions',
  '훈련반': 'Training groups|訓練班|培训班|培訓班|Nhóm đào tạo|กลุ่มฝึก|Kelompok pelatihan|Grupos de formación|Groupes',
  '보호자': 'Guardians|保護者|家长|家長|Phụ huynh|ผู้ปกครอง|Wali|Tutores|Parents',
  '운영자 · 로그': 'Admins · Logs|運営者 · ログ|管理员 · 日志|管理員 · 日誌|Quản trị · Nhật ký|ผู้ดูแล · บันทึก|Admin · Log|Administradores · Registros|Admins · Journaux',
  '공지 · 알림함': 'Notices · Inbox|お知らせ · 通知|公告 · 通知|公告 · 通知|Thông báo · Hộp thư|ประกาศ · กล่องแจ้งเตือน|Pengumuman · Kotak masuk|Avisos · Bandeja|Annonces · Boîte',
  '메시지': 'Messages|メッセージ|消息|訊息|Tin nhắn|ข้อความ|Pesan|Mensajes|Messages',
  '커뮤니티': 'Community|コミュニティ|社区|社群|Cộng đồng|ชุมชน|Komunitas|Comunidad|Communauté',
  '상담': 'Counseling|相談|咨询|諮詢|Tư vấn|ให้คำปรึกษา|Konsultasi|Asesoría|Conseil',
  '자동화': 'Automation|自動化|自动化|自動化|Tự động hóa|ระบบอัตโนมัติ|Otomasi|Automatización|Automatisation',
  '홈페이지': 'Website|ホームページ|网站|網站|Trang web|เว็บไซต์|Situs web|Sitio web|Site web',
  '매출': 'Sales|売上|销售额|營收|Doanh thu|ยอดขาย|Penjualan|Ventas|Ventes',
  '청구서': 'Invoices|請求書|账单|帳單|Hóa đơn|ใบแจ้งหนี้|Tagihan|Facturas|Factures',
  '법정의무교육': 'Mandatory training|法定義務教育|法定培训|法定培訓|Đào tạo bắt buộc|อบรมภาคบังคับ|Pelatihan wajib|Formación obligatoria|Formation obligatoire',
  '학사 · 비교과': 'Academics · Extracurricular|学務 · 課外|教务 · 课外|教務 · 課外|Học vụ · Ngoại khóa|วิชาการ · กิจกรรม|Akademik · Ekstrakurikuler|Académico · Extracurricular|Scolarité · Parascolaire',
  '기관 관리': 'Organizations|機関管理|机构管理|機構管理|Quản lý tổ chức|จัดการหน่วยงาน|Kelola lembaga|Organizaciones|Organisations',
  '캘린더 · 코칭': 'Calendar · Coaching|カレンダー · コーチング|日历 · 辅导|行事曆 · 輔導|Lịch · Huấn luyện|ปฏิทิน · โค้ช|Kalender · Pembinaan|Calendario · Coaching|Calendrier · Coaching',
  '메뉴 구성': 'Menu layout|メニュー構成|菜单配置|選單配置|Bố cục menu|จัดเมนู|Tata menu|Menú|Menus',
  '학습 규칙 · AI 튜터': 'Learning rules · AI tutor|学習ルール · AIチューター|学习规则 · AI导师|學習規則 · AI導師|Quy tắc học · Gia sư AI|กฎการเรียน · ติวเตอร์ AI|Aturan belajar · Tutor AI|Reglas · Tutor IA|Règles · Tuteur IA',
  '연동': 'Integrations|連携|集成|整合|Tích hợp|การเชื่อมต่อ|Integrasi|Integraciones|Intégrations',
  '언어': 'Language|言語|语言|語言|Ngôn ngữ|ภาษา|Bahasa|Idioma|Langue',
  '기관 유형': 'Organization type|機関タイプ|机构类型|機構類型|Loại tổ chức|ประเภทหน่วยงาน|Jenis lembaga|Tipo de organización|Type d’organisme',
  '저장': 'Save|保存|保存|儲存|Lưu|บันทึก|Simpan|Guardar|Enregistrer',
  '취소': 'Cancel|キャンセル|取消|取消|Hủy|ยกเลิก|Batal|Cancelar|Annuler',
  '닫기': 'Close|閉じる|关闭|關閉|Đóng|ปิด|Tutup|Cerrar|Fermer',
  '다음': 'Next|次へ|下一步|下一步|Tiếp|ถัดไป|Berikutnya|Siguiente|Suivant',
  '이전': 'Back|戻る|上一步|上一步|Quay lại|ย้อนกลับ|Kembali|Atrás|Précédent',
  '편집': 'Edit|編集|编辑|編輯|Sửa|แก้ไข|Ubah|Editar|Modifier',
  '관리': 'Manage|管理|管理|管理|Quản lý|จัดการ|Kelola|Gestionar|Gérer',
  '복사': 'Copy|コピー|复制|複製|Sao chép|คัดลอก|Salin|Copiar|Copier',
  '열기': 'Open|開く|打开|開啟|Mở|เปิด|Buka|Abrir|Ouvrir',
  '맡기기': 'Delegate|任せる|交给AI|交給AI|Giao việc|มอบหมาย|Serahkan|Delegar|Déléguer',
  '승인하고 실행': 'Approve & run|承認して実行|批准并执行|核准並執行|Duyệt và chạy|อนุมัติและเรียกใช้|Setujui & jalankan|Aprobar y ejecutar|Approuver et exécuter',
  '+ 직접 만들기': '+ Create manually|+ 手動で作成|+ 手动创建|+ 手動建立|+ Tạo thủ công|+ สร้างเอง|+ Buat manual|+ Crear manualmente|+ Créer manuellement',
  'AI 과정 설계': 'AI course design|AIコース設計|AI课程设计|AI課程設計|Thiết kế khóa học AI|ออกแบบหลักสูตรด้วย AI|Desain kursus AI|Diseño de curso IA|Conception IA',
  '이 화면 채우기': 'Fill this screen|この画面を埋める|填充此页面|填寫此頁面|Điền màn hình này|เติมหน้านี้|Isi layar ini|Rellenar esta pantalla|Remplir cet écran',
  '맞춤 구성 · 데모 모드': 'Tailored · Demo mode|カスタム構成 · デモ|定制配置 · 演示模式|客製配置 · 示範模式|Tùy chỉnh · Chế độ demo|ปรับแต่ง · โหมดเดโม|Kustom · Mode demo|Personalizado · Demo|Personnalisé · Démo',
  '대학': 'University|大学|大学|大學|Đại học|มหาวิทยาลัย|Universitas|Universidad|Université',
  '기업': 'Company|企業|企业|企業|Doanh nghiệp|องค์กร|Perusahaan|Empresa|Entreprise',
  '평생교육원': 'Lifelong learning center|生涯学習院|终身教育院|終身教育院|Trung tâm học tập suốt đời|ศูนย์การศึกษาตลอดชีวิต|Pusat pendidikan sepanjang hayat|Centro de aprendizaje permanente|Centre de formation continue',
  '직업훈련원': 'Vocational training center|職業訓練校|职业培训院|職業訓練院|Trung tâm dạy nghề|ศูนย์ฝึกอาชีพ|Balai latihan kerja|Centro de formación profesional|Centre de formation professionnelle',
  '정운영자 화면': 'Owner view|管理者ビュー|主管理员视图|主管理員檢視|Giao diện chủ sở hữu|มุมมองเจ้าของ|Tampilan pemilik|Vista de propietario|Vue propriétaire',
  '부운영자 화면': 'Staff view|副管理者ビュー|副管理员视图|副管理員檢視|Giao diện nhân viên|มุมมองเจ้าหน้าที่|Tampilan staf|Vista de personal|Vue équipe',
  '대기 과제 AI 평가해줘': 'Grade pending assignments with AI|保留中の課題をAI評価して|用AI评估待批作业|用AI評估待批作業|Chấm bài đang chờ bằng AI|ให้ AI ตรวจงานที่รอ|Nilai tugas tertunda dengan AI|Evalúa con IA las tareas pendientes|Évaluer les devoirs en attente avec l’IA',
  '월간 캘린더': 'Monthly calendar|月間カレンダー|月历|月曆|Lịch tháng|ปฏิทินรายเดือน|Kalender bulanan|Calendario mensual|Calendrier mensuel',
  'AI 코칭': 'AI coaching|AIコーチング|AI辅导|AI輔導|Huấn luyện AI|โค้ช AI|Pembinaan AI|Coaching IA|Coaching IA',
  '연동 설정': 'Connections|連携設定|连接设置|連結設定|Kết nối|การเชื่อมต่อ|Koneksi|Conexiones|Connexions',
  '템플릿 바꾸기': 'Change template|テンプレート変更|更换模板|更換範本|Đổi mẫu|เปลี่ยนเทมเพลต|Ganti templat|Cambiar plantilla|Changer de modèle',
  '게시하기': 'Publish|公開する|发布|發布|Xuất bản|เผยแพร่|Terbitkan|Publicar|Publier',
  '로그인': 'Log in|ログイン|登录|登入|Đăng nhập|เข้าสู่ระบบ|Masuk|Iniciar sesión|Connexion',
  '공지사항': 'Notices|お知らせ|公告|公告|Thông báo|ประกาศ|Pengumuman|Avisos|Annonces',
  '수강후기': 'Reviews|受講レビュー|学员评价|學員評價|Đánh giá|รีวิว|Ulasan|Opiniones|Avis',
  '오시는 길 · 문의': 'Location · Contact|アクセス · お問い合わせ|位置 · 联系|位置 · 聯絡|Địa chỉ · Liên hệ|แผนที่ · ติดต่อ|Lokasi · Kontak|Ubicación · Contacto|Accès · Contact',
  '홈': 'Home|ホーム|首页|首頁|Trang chủ|หน้าแรก|Beranda|Inicio|Accueil',
  '클래스': 'Classes|クラス|课程|課程|Lớp học|คลาส|Kelas|Clases|Cours',
  '게시판': 'Board|掲示板|论坛|論壇|Bảng tin|กระดาน|Forum|Tablón|Forum',
  '플랜 · 결제': 'Plan · Billing|プラン · 決済|套餐 · 支付|方案 · 付款|Gói · Thanh toán|แพ็กเกจ · ชำระเงิน|Paket · Pembayaran|Plan · Pago|Offre · Paiement',
  '서비스 설정': 'Service settings|サービス設定|服务设置|服務設定|Cài đặt dịch vụ|ตั้งค่าบริการ|Pengaturan layanan|Ajustes del servicio|Paramètres du service',
  '홈페이지 설정': 'Website settings|ホームページ設定|网站设置|網站設定|Cài đặt trang web|ตั้งค่าเว็บไซต์|Pengaturan situs|Ajustes del sitio|Paramètres du site',
  '팝업': 'Pop-ups|ポップアップ|弹窗|彈窗|Cửa sổ bật lên|ป๊อปอัป|Pop-up|Ventanas emergentes|Pop-ups',
  '상담 설정': 'Counseling settings|相談設定|咨询设置|諮詢設定|Cài đặt tư vấn|ตั้งค่าการปรึกษา|Pengaturan konsultasi|Ajustes de asesoría|Paramètres de conseil',
  '약관': 'Terms|規約|条款|條款|Điều khoản|ข้อกำหนด|Ketentuan|Términos|Conditions',
  '기능 맵': 'Feature map|機能マップ|功能地图|功能地圖|Bản đồ tính năng|แผนผังฟีเจอร์|Peta fitur|Mapa de funciones|Carte des fonctions',
  '데이터': 'Data|データ|数据|資料|Dữ liệu|ข้อมูล|Data|Datos|Données',
  '사이트 언어': 'Site languages|サイト言語|网站语言|網站語言|Ngôn ngữ trang|ภาษาของเว็บไซต์|Bahasa situs|Idiomas del sitio|Langues du site',
  '브랜드 컬러': 'Brand color|ブランドカラー|品牌颜色|品牌顏色|Màu thương hiệu|สีแบรนด์|Warna merek|Color de marca|Couleur de marque',
  '상단 메뉴': 'Top menu|上部メニュー|顶部菜单|頂部選單|Menu trên|เมนูด้านบน|Menu atas|Menú superior|Menu supérieur',
  '템플릿': 'Template|テンプレート|模板|範本|Mẫu|เทมเพลต|Templat|Plantilla|Modèle',
  '교재/교구': 'Materials|教材/教具|教材/教具|教材/教具|Tài liệu|สื่อการสอน|Bahan ajar|Materiales|Supports'
}).map(([k, v]) => [k, Object.fromEntries(v.split('|').map((x, i) => [LORD[i], x]))]));
const I18N = () => S?.settings?.i18n || { ui: 'ko', site: ['ko', 'en'], subs: ['en', 'ja', 'zh-CN'], auto: true };
const LX = (ko, lang) => (lang && lang !== 'ko' && DICT[ko]?.[lang]) || ko;
function translateUI(root) {
  const lang = I18N().ui; document.documentElement.lang = lang; if (!root || lang === 'ko') return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const hits = [];
  while ((n = w.nextNode())) { const v = n.nodeValue.trim(); if (v && DICT[v]?.[lang]) hits.push([n, n.nodeValue.replace(v, DICT[v][lang])]); }
  hits.forEach(([n, v]) => n.nodeValue = v);
  root.querySelectorAll?.('textarea[placeholder]').forEach(t => { if (/무엇을 도와드릴까요/.test(t.placeholder)) t.placeholder = { en: 'What can I help with?', ja: '何をお手伝いしましょうか?', 'zh-CN': '需要什么帮助?', 'zh-TW': '需要什麼協助?', vi: 'Tôi có thể giúp gì?', th: 'ให้ช่วยอะไรดี?', id: 'Apa yang bisa dibantu?', es: '¿En qué puedo ayudar?', fr: 'Comment puis-je aider ?' }[lang] || t.placeholder; });
}
let TRQ = 0; new MutationObserver(ms => { if (I18N().ui === 'ko') return; clearTimeout(TRQ); TRQ = setTimeout(() => { translateUI(document.body); }, 30); }).observe(document.documentElement, { childList: true, subtree: true });
AFTER.push(() => translateUI(document.body));
/* 상단 바 언어 선택 */
AFTER.push(() => { const r = $('.topr'); if (r && !$('#langSel')) r.insertAdjacentHTML('afterbegin', `<select id="langSel" aria-label="화면 언어">${LANGS.map(([k, n]) => `<option value="${k}" ${I18N().ui === k ? 'selected' : ''}>${n}</option>`).join('')}</select>`); });
document.addEventListener('change', e => { if (e.target.id === 'langSel') { S.settings.i18n = { ...I18N(), ui: e.target.value }; save(); render(); toast(e.target.value === 'ko' ? '화면 언어를 한국어로 바꿨습니다.' : `UI language: ${langName(e.target.value)} (메뉴 · 공통 버튼 · 주요 용어)`, 'ok'); } });

/* 콘텐츠 번역 엔진: 브라우저 내장 Translator API(Chrome 138+, 기기 내 번역) → 없으면 운영 모드 번역 API 대기 */
const TRC = {}; let TRDL = 0; /* 번역 모델 내려받기 실패 시 60초 동안 재시도하지 않음 */
const withTO = (pr, ms) => Promise.race([pr, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
async function trEngine(from, to) {
  const k = from + '>' + to; if (TRC[k] && (TRC[k].v || Date.now() - TRC[k].at < 60000)) return TRC[k].v;
  try { if (self.Translator) { const a = await withTO(Translator.availability({ sourceLanguage: from, targetLanguage: to }), 3000); if (a === 'available' || (a !== 'unavailable' && Date.now() - TRDL > 60000)) { TRDL = a === 'available' ? TRDL : Date.now(); const v = await withTO(Translator.create({ sourceLanguage: from, targetLanguage: to }), a === 'available' ? 5000 : 25000); TRDL = 0; TRC[k] = { v, at: Date.now() }; return v; } } } catch (e) { console.warn('translator', e.message || e); }
  TRC[k] = { v: null, at: Date.now() }; return null;
}
async function trText(text, to, from = 'ko') { if (!text || to === from) return { t: text, how: 'orig' }; if (DICT[text]?.[to]) return { t: DICT[text][to], how: 'dict' }; const tr = await trEngine(from, to); if (!tr) return null; try { return { t: await withTO(tr.translate(text), 8000), how: 'browser' }; } catch (e) { return null; } }
function langView() { const I = I18N();
  return `<div class="card"><div class="ch"><b>관리자 화면 언어</b><small>메뉴 · 탭 · 공통 버튼 · 주요 용어</small></div><div class="lgrid">${LANGS.map(([k, n]) => `<label class="lopt ${I.ui === k ? 'on' : ''}"><input type="radio" name="uil" value="${k}" ${I.ui === k ? 'checked' : ''} data-chg="i18n-ui"> ${n}</label>`).join('')}</div><p class="mini">데모 언어팩은 관리자 화면의 메뉴 · 공통 버튼 · 핵심 용어를 바꿉니다. 운영 모드에서는 전체 문구 언어 파일(JSON)을 함께 배포합니다.</p></div>
  <div class="card"><div class="ch"><b>학습자 사이트 · 콘텐츠 언어</b><small>학습자가 고를 수 있는 언어</small></div><div class="lgrid">${LANGS.map(([k, n]) => `<label class="lopt ${I.site.includes(k) ? 'on' : ''}"><input type="checkbox" value="${k}" ${I.site.includes(k) ? 'checked' : ''} ${k === 'ko' ? 'disabled' : ''} data-chg="i18n-site"> ${n}</label>`).join('')}</div>
    <label class="ckl"><input type="checkbox" data-chg="i18n-auto" ${I.auto ? 'checked' : ''}> 공지 · 과정 소개 · 홈페이지 문구를 학습자 언어로 자동 번역</label></div>
  <div class="card"><div class="ch"><b>영상 자막 기본 번역 언어</b><small>영상 편집기에서 '자동 번역' 시 기본 선택</small></div><div class="lgrid">${LANGS.filter(l => l[0] !== 'ko').map(([k, n]) => `<label class="lopt ${I.subs.includes(k) ? 'on' : ''}"><input type="checkbox" value="${k}" ${I.subs.includes(k) ? 'checked' : ''} data-chg="i18n-subs"> ${n}</label>`).join('')}</div>
    <p class="mini">번역 엔진: ${self.Translator ? tag('이 브라우저 내장 번역 사용 가능', 'g') : tag('이 브라우저는 내장 번역 미지원 — 운영 모드 번역 API로 처리', 'y')} · 기기 안에서 번역해 서버로 보내지 않습니다(Chrome 138 이상).</p></div>`; }
ACT['i18n-ui'] = el => { S.settings.i18n = { ...I18N(), ui: el.value }; save(); render(); };
ACT['i18n-site'] = el => { const I = { ...I18N() }; I.site = el.checked ? [...new Set([...I.site, el.value])] : I.site.filter(x => x !== el.value); S.settings.i18n = I; save(); render(); };
ACT['i18n-subs'] = el => { const I = { ...I18N() }; I.subs = el.checked ? [...new Set([...I.subs, el.value])] : I.subs.filter(x => x !== el.value); S.settings.i18n = I; save(); render(); };
ACT['i18n-auto'] = el => { S.settings.i18n = { ...I18N(), auto: el.checked }; save(); };

/* ═════════ ③ 영상 자동 자막 · 자동 번역 ═════════ */
const fmtT = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = (s % 60).toFixed(3).padStart(6, '0'); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${x}`; };
const toVTT = cues => 'WEBVTT\n\n' + cues.map((c, i) => `${i + 1}\n${fmtT(c.s)} --> ${fmtT(c.e)}\n${c.t}`).join('\n\n') + '\n';
function parseSubs(txt) { const out = []; String(txt).replace(/\r/g, '').split(/\n\n+/).forEach(b => { const m = b.match(/(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})[^\n]*\n([\s\S]+)/); if (!m) return; const sec = (h, mi, s, ms) => (+(h || '0:').slice(0, -1)) * 3600 + +mi * 60 + +s + +ms / 1000; out.push({ s: sec(m[1], m[2], m[3], m[4]), e: sec(m[5], m[6], m[7], m[8]), t: m[9].trim().slice(0, 300) }); }); return out; }
function cuesFromScenes(scenes) { let t0 = 0; return scenes.flatMap(s => { const ss = sentences(s.say); return (ss.length ? ss : ['']).map(t => { const d = secsFor(t); const c = { s: t0, e: t0 + d, t }; t0 += d; return c; }); }); }
function subEditor(it) {
  const sb = it.subs || {}; const T = sb.tracks || {}; const src = sb.src || 'ko'; const I = I18N(); const pick = UI.subPick || I.subs;
  const srcInfo = it.src === 'ai' ? '대본에서 자막을 바로 만듭니다(시간 자동 맞춤).' : it.src === 'youtube' || !it.src ? 'YouTube 자동 자막을 켜고, 자막 파일을 올리면 번역 트랙을 만들 수 있습니다.' : '업로드 영상은 음성 인식(STT)으로 자막을 만듭니다 — 운영 모드 서버(Whisper · CLOVA Speech)에서 처리.';
  return `<div class="subbox"><div class="ch"><b>자막 · 번역</b><small>${esc(srcInfo)}</small></div>
    <div class="bar2"><label class="mini">원문 언어 <select data-subsrc="1">${LANGS.map(([k, n]) => `<option value="${k}" ${src === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${it.src === 'ai' ? `<button type="button" class="btn sm ink" data-act="sub-auto">${ic('spark', 14)} 대본에서 자동 자막</button>` : ''}
      ${it.src === 'upload' ? `<button type="button" class="btn sm ink" data-act="sub-stt">${ic('spark', 14)} 음성 인식 자동 자막</button>` : ''}
      ${it.src === 'youtube' || !it.src ? `<label class="ckl"><input type="checkbox" data-subyt="1" ${sb.ytcc ? 'checked' : ''}> YouTube 자동 자막 켜기(cc_load_policy · 학습자 언어)</label>` : ''}
      <label class="btn sm">자막 파일 올리기(.vtt · .srt)<input type="file" accept=".vtt,.srt,text/vtt" data-subfile="1" hidden></label></div>
    ${sb.stt ? `<p class="mini">${tag(sb.stt, 'y')} 운영 모드에서 음성 인식이 끝나면 원문 자막이 자동으로 채워집니다.</p>` : ''}
    <div class="fl"><span>자동 번역 언어(${pick.length}/9)</span><div class="lchips">${LANGS.filter(l => l[0] !== src).map(([k, n]) => `<button type="button" class="chip ${pick.includes(k) ? 'on' : ''}" data-act="sub-pick" data-v="${k}">${n}</button>`).join('')}<button type="button" class="chip" data-act="sub-pickall">모두</button></div></div>
    <div class="bar2"><button type="button" class="btn sm ink" data-act="sub-tr" ${T[src]?.length ? '' : 'disabled'}>${ic('spark', 14)} 선택 언어로 자동 번역</button><span class="mini" id="subSt">${T[src]?.length ? `원문 ${T[src].length}줄` : '먼저 원문 자막을 만드세요'}</span></div>
    ${Object.keys(T).length ? `<table class="tbl"><thead><tr><th>언어</th><th>줄 수</th><th>방식</th><th></th></tr></thead><tbody>${Object.entries(T).map(([l, c]) => `<tr><td>${esc(langName(l))}${l === src ? ' ' + tag('원문') : ''}</td><td>${c.length}</td><td>${esc(sb.how?.[l] || '')}</td><td class="r"><button type="button" class="btn sm ghost" data-act="sub-view" data-v="${l}">보기 · 수정</button><button type="button" class="btn sm ghost" data-act="sub-dl" data-v="${l}">VTT</button>${it.src === 'ai' ? `<label class="ckl mini"><input type="radio" name="burn" data-subburn="${l}" ${sb.burn === l ? 'checked' : ''}> 영상에 입히기</label>` : ''}</td></tr>`).join('')}</tbody></table>` : ''}
    ${(sb.pending || []).length ? `<p class="mini">${tag('번역 대기', 'y')} ${sb.pending.map(langName).join(', ')} — 이 브라우저는 내장 번역을 지원하지 않습니다. 운영 모드 번역 API(또는 Chrome 최신 버전)에서 자동 생성됩니다.</p>` : ''}</div>`;
}
{ const base = edRender; edRender = function () { base(); if (ED?.it?.type === 'video') { const b = $('#edBody'); b && b.insertAdjacentHTML('beforeend', subEditor(ED.it)); } }; }
const SB = () => (ED.it.subs = ED.it.subs || { src: 'ko', tracks: {}, how: {}, pending: [] });
document.addEventListener('change', async e => { const el = e.target; if (!ED || !el.closest?.('#edBody')) return;
  if (el.dataset.subsrc) { SB().src = el.value; edRender(); }
  if (el.dataset.subyt) { SB().ytcc = el.checked; }
  if (el.dataset.subburn) { SB().burn = el.dataset.subburn; }
  if (el.dataset.subfile) { const f = el.files[0]; if (!f) return; if (f.size > 2e6) { toast('자막 파일이 너무 큽니다(2MB 이하).', 'warn'); return; } const cues = parseSubs(await f.text()); if (!cues.length) { toast('자막 형식을 읽지 못했습니다(.vtt · .srt).', 'warn'); return; } const b = SB(); b.tracks[b.src] = cues; b.how[b.src] = '파일'; edRender(); toast(`자막 ${cues.length}줄을 불러왔습니다.`, 'ok'); } });
ACT['sub-auto'] = () => { const b = SB(); b.tracks[b.src] = cuesFromScenes(ED.it.ai.scenes); b.how[b.src] = '대본 자동'; edRender(); toast(`자막 ${b.tracks[b.src].length}줄을 만들었습니다.`, 'ok'); };
ACT['sub-stt'] = () => { const b = SB(); b.stt = '음성 인식 대기'; edRender(); toast('음성 인식 작업을 등록했습니다(운영 모드에서 처리).'); };
ACT['sub-pick'] = el => { const P = new Set(UI.subPick || I18N().subs); P.has(el.dataset.v) ? P.delete(el.dataset.v) : P.add(el.dataset.v); UI.subPick = [...P]; edRender(); };
ACT['sub-pickall'] = () => { UI.subPick = LANGS.map(l => l[0]).filter(l => l !== SB().src); edRender(); };
async function translateTrack(cues, to, from, onp) { const out = []; for (const c of cues) { const r = await trText(c.t, to, from); if (!r) return null; out.push({ ...c, t: r.t }); onp && onp(out.length); } return out; }
ACT['sub-tr'] = async () => { const b = SB(); const src = b.tracks[b.src]; const P = (UI.subPick || I18N().subs).filter(l => l !== b.src); b.pending = []; let ok = 0;
  for (const l of P) { const st = $('#subSt'); st && (st.textContent = `${langName(l)} 번역 중…`); const r = await translateTrack(src, l, b.src.split('-')[0] === 'zh' ? b.src : b.src); if (r) { b.tracks[l] = r; b.how[l] = '자동 번역(브라우저)'; ok++; } else b.pending.push(l); }
  S.ai.usage++; edRender(); toast(ok ? `${ok}개 언어 자막을 만들었습니다.` : `${b.pending.length}개 언어를 번역 대기로 등록했습니다.`, ok ? 'ok' : ''); };
ACT['sub-view'] = el => { const l = el.dataset.v, b = SB(); modal2(`${langName(l)} 자막`, `<textarea id="subTx" rows="14" style="width:100%">${esc(toVTT(b.tracks[l]))}</textarea><p class="mini">시간과 문장을 고친 뒤 확인을 누르세요.</p>`, () => { const c = parseSubs($('#subTx').value); if (c.length) { b.tracks[l] = c; b.how[l] = (b.how[l] || '') + ' · 수정'; edRender(); } }); };
ACT['sub-dl'] = el => { const l = el.dataset.v; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toVTT(SB().tracks[l])], { type: 'text/vtt' })); a.download = `${ED.it.title.replace(/[\\/:*?"<>|]/g, '_')}.${l}.vtt`; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 5000); };
/* 커리큘럼 배지에 자막 표시: build.js itemBadge는 const라 감싸지 않고 렌더 후 덧붙인다 */
AFTER.push(cur => { if (cur.tab !== 'class' || !UI.cls) return; const c = C(UI.cls); if (!c) return; $$('[data-act=item-edit]').forEach(b => { const it = c.curriculum[+b.dataset.v]; const n = Object.keys(it?.subs?.tracks || {}).length; if (n && !b.parentElement.querySelector('.subn')) b.insertAdjacentHTML('afterend', ` <span class="tag subn">자막 ${n}개 언어</span>`); }); });

/* ═════════ ① 홈페이지 템플릿 20종 + AI 수정 ═════════ */
const S2 = (type, data) => ({ id: uid('s'), type, data });
const pubCls = n => S.classes.filter(c => c.open === '전체').slice(0, n).map(c => c.id);
const TPL = [
  ['corp-academy', '사내 아카데미', ['corp'], '직무 · 리더십 · 법정교육을 한 포털에서', '#1E3A8A', '신뢰', () => [S2('banner', { title: `${S.org.name} 아카데미`, sub: '직무 역량부터 리더십까지, 필요한 교육을 필요한 때에 이수하고 기록합니다.', cta: '내 교육 보기' }), S2('text', { title: '학습 체계', body: '직급 · 직무별 필수 과정과 선택 과정을 구분해 연간 학습 계획을 지원합니다.', cols: [['직무 역량', '부서별 필수 과정'], ['리더십', '직급별 리더 과정'], ['법정의무교육', '4종 자동 배정 · 이수 관리']] }), S2('classes', { title: '이번 분기 추천 과정', ids: pubCls(4), layout: 'grid' }), S2('notices', { title: '교육 공지', n: 4 }), S2('map', { title: '교육 문의', addr: '인재개발팀', tel: '내선 0000', hours: '평일 09:00 ~ 18:00' })]],
  ['corp-onboard', '신규 입사자 온보딩 포털', ['corp'], '입사 첫 30일 학습 여정', '#0F766E', '친근', () => [S2('banner', { title: `${S.org.name}에 오신 것을 환영합니다`, sub: '입사 첫 30일, 꼭 알아야 할 것만 순서대로 안내합니다.', cta: '온보딩 시작' }), S2('text', { title: '30일 로드맵', body: '1주차 회사 이해 → 2주차 업무 도구 → 3주차 직무 기초 → 4주차 멘토 미팅과 회고.', cols: [['1주차', '회사 · 문화'], ['2주차', '업무 도구'], ['3~4주차', '직무 기초 · 회고']] }), S2('video', { title: 'CEO 환영 메시지', url: '' }), S2('classes', { title: '온보딩 필수 과정', ids: pubCls(4), layout: 'grid' }), S2('notices', { title: '입사자 안내', n: 3 })]],
  ['corp-legal', '법정의무교육 센터', ['corp'], '4대 법정교육 이수율 관리', '#334155', '신뢰', () => [S2('banner', { title: '법정의무교육, 마감 전에 끝내세요', sub: '성희롱 예방 · 개인정보 보호 · 장애인 인식 개선 · 직장 내 괴롭힘 예방 교육을 온라인으로 이수합니다.', cta: '미이수 과정 보기' }), S2('text', { title: '이수 기준', body: '과정별 진도 80% 이상과 평가 통과 시 이수가 인정되며, 이수증은 자동 발급됩니다.', cols: [['4종', '연 1회 필수'], ['진도 80%', '이수 기준'], ['자동 발급', '이수증 · 증빙']] }), S2('classes', { title: '올해 법정교육', ids: pubCls(4), layout: 'grid' }), S2('notices', { title: '마감 안내', n: 3 })]],
  ['corp-partner', '고객 · 파트너 교육', ['corp', 'adult'], '외부 고객 대상 제품 교육 · 인증', '#7C3AED', '모던', () => [S2('banner', { title: '제품을 가장 잘 쓰는 방법', sub: '고객과 파트너를 위한 단계별 제품 교육과 인증 프로그램.', cta: '인증 과정 시작' }), S2('slideBanner', { title: '하이라이트', slides: ['신규 기능 웨비나 매월 개최', '파트너 인증 프로그램 모집', '실무 사례 라이브러리 공개'], sec: 5 }), S2('classes', { title: '인증 과정', ids: pubCls(4), layout: 'slide' }), S2('reviews', { title: '수강 후기', note: '실제 후기만 표시' }), S2('map', { title: '교육 문의', addr: '고객 성공팀', tel: '대표번호', hours: '평일 10:00 ~ 17:00' })]],
  ['univ-aicenter', '대학 AI 교육센터', ['univ'], 'AI 진단 → 러닝 저니 → 디지털 배지(KIT AX ON형)', '#15173B', '모던', () => [S2('banner', { title: 'AI 시대의 역량, 여기서 시작합니다', sub: 'AI 진단으로 나의 유형을 확인하고, 단계별 러닝 저니를 완주해 디지털 배지를 받으세요.', cta: 'AI 진단 시작하기' }), S2('text', { title: '이렇게 성장합니다', body: '진단 → 맞춤 코스 → 실습 과제 → 학교 평가 → 배지까지, 모든 학습 기록이 한 곳에 남습니다.', cols: [['AI 진단', '5가지 유형'], ['러닝 저니', 'Explorer → Builder → Master'], ['디지털 배지', '역량 증명']] }), S2('classes', { title: '지금 열린 교과 · 비교과', ids: pubCls(4), layout: 'grid' }), S2('slideImage', { title: '학습 현장', count: 3 }), S2('notices', { title: '공지사항', n: 3 }), S2('map', { title: '센터 위치 · 문의', addr: S.settings.footer.addr || '센터 주소', tel: S.settings.footer.tel || '대표번호', hours: '평일 09:00 ~ 18:00' })]],
  ['univ-extra', '비교과 · 역량 포털', ['univ'], '비교과 프로그램 신청 · 마일리지', '#0369A1', '친근', () => [S2('banner', { title: '비교과로 채우는 나의 역량', sub: '특강 · 공모전 · 멘토링에 참여하고 역량 마일리지와 배지를 모으세요.', cta: '프로그램 신청' }), S2('slideBanner', { title: '모집 중', slides: ['AX 챌린지 참가팀 모집', '취업 역량 특강 시리즈', '창업 멘토링 3기'], sec: 4 }), S2('classes', { title: '이번 학기 프로그램', ids: pubCls(4), layout: 'grid' }), S2('reviews', { title: '참여 후기', note: '' }), S2('notices', { title: '공지', n: 3 })]],
  ['univ-lms', '학과 온라인 강의실', ['univ'], '주차별 강의 · 과제 · 평가', '#1D4ED8', '신뢰', () => [S2('banner', { title: '온라인 강의실', sub: '주차별 강의 영상 · 강의자료 · 과제 · 시험을 한 화면에서 확인하세요.', cta: '내 강의실' }), S2('text', { title: '수업 안내', body: '매주 강의를 수강하고 확인 퀴즈를 풀면 출석이 인정됩니다. 과제는 루브릭 기준으로 평가합니다.', cols: [['주차별 강의', '15주 편성'], ['과제 · 루브릭', '기준 공개'], ['중간 · 기말', '온라인 시험']] }), S2('classes', { title: '이번 학기 교과목', ids: pubCls(4), layout: 'grid' }), S2('notices', { title: '학과 공지', n: 4 })]],
  ['univ-lifelong', '대학 평생교육 · 시민 강좌', ['univ', 'lifelong'], '지역 주민 대상 대학 강좌', '#15803D', '따뜻', () => [S2('banner', { title: '대학에서 배우는 즐거움', sub: '교수진이 직접 여는 시민 강좌, 온라인과 캠퍼스에서 만나요.', cta: '강좌 둘러보기' }), S2('classes', { title: '이번 학기 시민 강좌', ids: pubCls(4), layout: 'grid' }), S2('image', { title: '캠퍼스 학습 공간', alt: '강의실 사진' }), S2('reviews', { title: '수강 후기', note: '' }), S2('map', { title: '오시는 길', addr: S.settings.footer.addr || '캠퍼스 주소', tel: S.settings.footer.tel || '대표번호', hours: '평일 09:00 ~ 18:00' })]],
  ['k12-total', '초중고 종합학원', ['k12'], '반별 수업 · 보호자 소통 · 성적 관리', '#2563EB', '신뢰', () => [S2('banner', { title: '우리 아이 성적, 데이터로 관리합니다', sub: '반별 맞춤 수업 · 매 회차 테스트 · 보호자 앱 리포트.', cta: '상담 신청하기' }), S2('text', { title: '관리 시스템', body: '출결 · 테스트 · 과제를 매일 기록하고 보호자에게 주간 리포트를 보냅니다.', cols: [['반별 수업', '학년 · 수준별'], ['주간 리포트', '보호자 앱'], ['온라인 보강', '결석 시 자동 배정']] }), S2('classes', { title: '반 안내', ids: pubCls(4), layout: 'grid' }), S2('reviews', { title: '학부모 후기', note: '' }), S2('map', { title: '오시는 길 · 상담', addr: S.settings.footer.addr || '학원 주소', tel: S.settings.footer.tel || '상담 전화', hours: '평일 14:00 ~ 22:00' })]],
  ['k12-exam', '입시 · 관리형 학원', ['k12'], '내신 · 수능 대비 집중 관리', '#111827', '모던', () => [S2('banner', { title: '목표 대학까지, 매일 관리합니다', sub: '1:1 학습 플랜 · 주간 모의고사 · 오답 클리닉.', cta: '레벨 테스트 신청' }), S2('slideBanner', { title: '합격 소식', slides: ['2026 수시 합격 현황 공개', '겨울방학 윈터스쿨 모집', '주말 오답 클리닉 운영'], sec: 5 }), S2('classes', { title: '관 · 반 안내', ids: pubCls(4), layout: 'grid' }), S2('notices', { title: '입시 공지', n: 4 }), S2('map', { title: '상담 · 위치', addr: S.settings.footer.addr || '학원 주소', tel: S.settings.footer.tel || '상담 전화', hours: '매일 09:00 ~ 23:00' })]],
  ['k12-kids', '영어 · 코딩 키즈 학원', ['k12'], '놀이처럼 배우는 영어 · 코딩', '#F59E0B', '친근', () => [S2('banner', { title: '놀면서 배우는 영어 · 코딩', sub: '아이 눈높이 프로젝트 수업, 매달 결과물 발표회.', cta: '무료 체험 신청' }), S2('text', { title: '수업 방식', body: '20분 개념 · 30분 프로젝트 · 10분 발표로 아이가 스스로 만들고 말하게 합니다.', cols: [['원어민 영어', '파닉스 → 리딩'], ['코딩', '블록 → 파이썬'], ['발표회', '매월 1회']] }), S2('slideImage', { title: '수업 갤러리', count: 3 }), S2('classes', { title: '반 안내', ids: pubCls(4), layout: 'grid' }), S2('reviews', { title: '학부모 후기', note: '' })]],
  ['adult-cert', '자격증 · 시험 대비', ['adult'], '합격까지 단계별 커리큘럼', '#B91C1C', '신뢰', () => [S2('banner', { title: '한 번에 합격하는 커리큘럼', sub: '기출 분석 · 단계별 강의 · 모의고사로 합격까지 이끕니다.', cta: '강좌 둘러보기' }), S2('text', { title: '합격 로드맵', body: '이론 → 기출 → 모의고사 → 최종 점검 4단계로 진행합니다.', cols: [['이론', '핵심 개념'], ['기출', '최근 10개년'], ['모의고사', '실전 환경']] }), S2('classes', { title: '인기 강좌', ids: pubCls(4), layout: 'slide' }), S2('reviews', { title: '합격 후기', note: '' }), S2('books', { title: '교재', ids: S.books.map(b => b.id) })]],
  ['adult-bootcamp', 'IT · 코딩 부트캠프', ['adult', 'voc'], '실무 프로젝트 중심 집중 과정', '#0F172A', '모던', () => [S2('banner', { title: '12주 후, 개발자로 일합니다', sub: '현업 멘토와 실무 프로젝트 4개 · 포트폴리오 · 취업 연계.', cta: '지원하기' }), S2('text', { title: '커리큘럼', body: '기초 → 프론트엔드 → 백엔드 → 팀 프로젝트 순서로 진행합니다.', cols: [['12주', '풀타임'], ['프로젝트 4개', '포트폴리오'], ['취업 연계', '기업 매칭']] }), S2('video', { title: '데모데이 영상', url: '' }), S2('classes', { title: '모집 중 기수', ids: pubCls(4), layout: 'grid' }), S2('reviews', { title: '수료생 후기', note: '' })]],
  ['adult-hobby', '취미 · 원데이 클래스', ['adult', 'lifelong'], '감성 클래스 예약형', '#DB2777', '따뜻', () => [S2('banner', { title: '오늘, 나를 위한 한 시간', sub: '드로잉 · 베이킹 · 플라워, 원데이부터 정규반까지.', cta: '클래스 예약' }), S2('slideImage', { title: '클래스 갤러리', count: 3 }), S2('classes', { title: '이번 주 클래스', ids: pubCls(4), layout: 'slide' }), S2('reviews', { title: '수강 후기', note: '' }), S2('map', { title: '오시는 길', addr: S.settings.footer.addr || '스튜디오 주소', tel: S.settings.footer.tel || '예약 문의', hours: '화~일 11:00 ~ 21:00' })]],
  ['adult-lang', '외국어 학원(다국어)', ['adult', 'k12'], '언어별 레벨 과정 · 다국어 사이트', '#0891B2', '친근', () => [S2('banner', { title: '말이 트이는 순간까지', sub: '레벨 테스트로 시작해 회화 · 시험 대비까지 단계별로.', cta: '레벨 테스트' }), S2('text', { title: '언어별 과정', body: '영어 · 일본어 · 중국어 · 스페인어 레벨별 소규모 수업.', cols: [['영어', 'A1 ~ C1'], ['일본어', 'JLPT 대비'], ['중국어', 'HSK 대비']] }), S2('classes', { title: '개강 강좌', ids: pubCls(4), layout: 'grid' }), S2('reviews', { title: '수강 후기', note: '' })], ['ko', 'en', 'ja', 'zh-CN']],
  ['life-city', '시민 평생학습관', ['lifelong'], '지역 주민 평생교육 강좌 신청', '#15803D', '따뜻', () => [S2('banner', { title: '배움에는 끝이 없습니다', sub: '생활 · 직업 · 인문 강좌를 온라인과 오프라인으로 만나 보세요.', cta: '강좌 신청하기' }), S2('text', { title: '수강 안내', body: '학습비 반환 기준과 수강 신청 절차를 확인하세요. 10명 이상 신청 시 개강합니다.', cols: [['생활 강좌', '건강 · 취미'], ['직업 강좌', '자격 · 창업'], ['인문 강좌', '역사 · 문학']] }), S2('classes', { title: '이번 분기 강좌', ids: pubCls(4), layout: 'grid' }), S2('notices', { title: '공지사항', n: 4 }), S2('map', { title: '오시는 길', addr: S.settings.footer.addr || '학습관 주소', tel: S.settings.footer.tel || '대표번호', hours: '평일 09:00 ~ 18:00' })]],
  ['life-senior', '시니어 디지털 배움터', ['lifelong'], '큰 글씨 · 쉬운 메뉴 · 전화 상담', '#B45309', '따뜻', () => [S2('banner', { title: '스마트폰, 천천히 함께 배워요', sub: '큰 글씨 화면과 전화 상담으로 누구나 쉽게 시작합니다.', cta: '전화로 신청하기' }), S2('text', { title: '배우는 내용', body: '카카오톡 · 키오스크 · 은행 앱 · 사진 정리를 실습 위주로 배웁니다.', cols: [['스마트폰 기초', '4회'], ['키오스크', '2회'], ['사진 · 영상', '4회']] }), S2('classes', { title: '모집 강좌', ids: pubCls(3), layout: 'grid' }), S2('map', { title: '전화 · 방문 신청', addr: S.settings.footer.addr || '배움터 주소', tel: S.settings.footer.tel || '전화 상담', hours: '평일 10:00 ~ 16:00' })]],
  ['voc-card', '국민내일배움카드 훈련기관', ['voc'], '국비 과정 모집 · 취업 연계', '#1E40AF', '신뢰', () => [S2('banner', { title: '취업까지 이어지는 훈련', sub: '국민내일배움카드로 수강하고, 수료 후 취업을 함께 준비합니다.', cta: '훈련과정 보기' }), S2('text', { title: '수강 절차', body: '카드 발급 → 과정 상담 → HRD-Net 수강 신청 → 개강 → 출석 80% 이상 수료.', cols: [['국비 지원', '자부담 최소화'], ['출석 80%', '수료 기준'], ['취업 지원', '이력서 · 면접']] }), S2('classes', { title: '모집 중 과정', ids: pubCls(4), layout: 'grid' }), S2('reviews', { title: '수료생 후기', note: '' }), S2('notices', { title: '모집 공지', n: 4 })]],
  ['voc-employer', '사업주 위탁 훈련', ['voc', 'corp'], '기업 맞춤 위탁 교육 · 환급 과정', '#334155', '신뢰', () => [S2('banner', { title: '기업 맞춤 위탁 훈련', sub: '고용보험 환급 과정부터 맞춤 사내 교육까지 설계 · 운영합니다.', cta: '도입 문의' }), S2('text', { title: '운영 방식', body: '요구 분석 → 과정 설계 → 운영 · 출결 → 수료 · 환급 서류까지 대행합니다.', cols: [['환급 과정', '고용보험'], ['맞춤 설계', '직무 분석'], ['결과 리포트', '수료 · 만족도']] }), S2('classes', { title: '대표 과정', ids: pubCls(4), layout: 'grid' }), S2('map', { title: '도입 문의', addr: S.settings.footer.addr || '주소', tel: S.settings.footer.tel || '대표번호', hours: '평일 09:00 ~ 18:00' })]],
  ['solo-creator', '1인 강사 · 크리에이터', ['adult', 'lifelong', 'k12', 'corp', 'univ', 'voc'], '강사 브랜딩 + 온라인 강의 판매', '#9333EA', '친근', () => [S2('banner', { title: `${S.org.name}의 클래스`, sub: '현장에서 검증된 노하우를 온라인으로 배워 보세요.', cta: '강의 보러 가기' }), S2('text', { title: '강사 소개', body: '10년 현장 경험과 수강생 성과로 증명된 커리큘럼을 운영합니다.', cols: [['누적 수강생', '데이터 연동'], ['강의 수', '데이터 연동'], ['만족도', '후기 기반']] }), S2('video', { title: '맛보기 강의', url: '' }), S2('classes', { title: '강의 목록', ids: pubCls(4), layout: 'grid' }), S2('reviews', { title: '수강 후기', note: '' })]]
].map(([id, name, types, scene, color, tone, build, langs]) => ({ id, name, types, scene, color, tone, build, langs }));
const tplFor = ty => TPL.filter(t => t.types.includes(ty));
function siteFromTpl(tp) { const ty = S.org.type; return { tpl: tp.id, color: tp.color, tone: tp.tone, prompt: '', sections: tp.build(), menus: [['홈', true], ['클래스', true], ['교재/교구', ty !== 'corp' && ty !== 'univ'], ['커뮤니티', true], ['공지사항', true], ['게시판', ty !== 'corp']].map(([l, on]) => ({ l, on, access: S.settings.siteOpen === 'private' ? '지정 회원' : '공개' })), langs: tp.langs || ['ko'], tr: {}, log: [], published: S.site?.published || false, at: nowStr() }; }
function tplThumb(tp) { const secs = tp.build(); return `<div class="tth" style="--c:${tp.color}"><i class="th-hero"></i>${secs.slice(1, 5).map(s => `<i class="th-${['classes', 'books', 'reviews'].includes(s.type) ? 'grid' : s.type === 'text' ? 'cols' : 'line'}"></i>`).join('')}</div>`; }
{ const base = VIEWS.site; VIEWS.site = () => {
  if (!S.site?.tpl || UI.siteGallery) { const f = UI.tplF || 'mine'; const L = f === 'mine' ? tplFor(S.org.type) : f === 'all' ? TPL : TPL.filter(t => t.types.includes(f));
    return head('', `유형별 시나리오 템플릿 ${TPL.length}종 중 하나를 고르고, AI에게 말로 수정해 완성합니다.`, S.site?.tpl ? `<button class="btn" data-act="tpl-back">편집으로 돌아가기</button>` : '') +
      `<div class="bar2">${[['mine', `내 유형 추천 ${tplFor(S.org.type).length}`], ['all', `전체 ${TPL.length}`], ...Object.entries(TYPES).map(([k, v]) => [k, v.name])].map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="tpl-f" data-v="${k}">${esc(l)}</button>`).join('')}</div>
      <div class="tplg">${L.map(tp => `<div class="card tplc">${tplThumb(tp)}<b>${esc(tp.name)}</b><small>${esc(tp.scene)}</small><div class="mini">${tp.types.map(k => TYPES[k].name).join(' · ')} · 섹션 ${tp.build().length}${tp.langs ? ' · 다국어' : ''}</div><div class="bar2"><button class="btn sm" data-act="tpl-pv" data-v="${tp.id}">미리 보기</button><button class="btn sm ink" data-act="tpl-use" data-v="${tp.id}">이 템플릿 사용</button></div></div>`).join('')}</div>`; }
  let h = base(); const s = site(); const tp = TPL.find(t => t.id === s.tpl);
  const card = `<div class="card"><div class="ch"><b>템플릿</b><small>${esc(tp?.name || '')}</small><span class="sp"></span><button class="btn sm" data-act="tpl-gallery">템플릿 바꾸기</button></div>
    <div class="ch"><b>✦ AI로 수정</b></div><textarea id="sitePrompt" rows="3" maxlength="300" placeholder="예: 블루 톤에 신뢰감 있게, 겨울방학 특강을 맨 위에 강조하고 후기 섹션 추가">${esc(UI.sitePrompt || '')}</textarea>
    <div class="lchips">${['블루 톤으로 바꿔줘', '문구를 더 짧게', '후기 섹션 추가', '공지 섹션 빼줘', '영어 · 일본어 페이지도 만들어줘'].map(x => `<button class="chip" data-act="site-q" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="bar2"><button class="btn pri sm" data-act="site-gen">AI로 수정</button><small class="mini">섹션 구성은 유지하고 지시한 부분만 바꿉니다</small></div>
    ${(s.log || []).length ? `<ul class="slog">${s.log.slice(0, 5).map(l => `<li><small>${esc(l.at)}</small> ${esc(l.q)} → ${esc(l.ch.join(' · '))}</li>`).join('')}</ul>` : ''}</div>
    <div class="card"><div class="ch"><b>사이트 언어</b><small>${(s.langs || ['ko']).length}개</small></div><div class="lchips">${LANGS.map(([k, n]) => `<button class="chip ${(s.langs || ['ko']).includes(k) ? 'on' : ''}" data-act="site-lang" data-v="${k}" ${k === 'ko' ? 'disabled' : ''}>${n}</button>`).join('')}</div><div class="bar2"><button class="btn sm ink" data-act="site-tr">${ic('spark', 14)} 선택 언어 페이지 자동 생성</button><select data-chg="site-pvlang" aria-label="미리보기 언어">${(s.langs || ['ko']).map(l => `<option value="${l}" ${UI.pvLang === l ? 'selected' : ''}>${langName(l)}${l !== 'ko' && !s.tr?.[l] ? '(미생성)' : ''}</option>`).join('')}</select></div></div>`;
  return h.replace(/<div class="card"><div class="ch"><b>✦ AI로 만들기<\/b><\/div>[\s\S]*?<\/div><\/div>/, card); }; }
ACT['tpl-f'] = el => { UI.tplF = el.dataset.v; render(); };
ACT['tpl-gallery'] = () => { UI.siteGallery = true; render(); };
ACT['tpl-back'] = () => { UI.siteGallery = false; render(); };
ACT['tpl-pv'] = el => { const tp = TPL.find(t => t.id === el.dataset.v); const w = overlay(`미리 보기 — ${tp.name}`, `<iframe class="tplpv" title="템플릿 미리보기" sandbox="allow-same-origin"></iframe><div class="bar2"><button class="btn ink" data-act="tpl-use" data-v="${tp.id}">이 템플릿 사용</button></div>`); w.querySelector('iframe').srcdoc = siteHTML(siteFromTpl(tp)); w.addEventListener('click', e => { if (e.target.closest('[data-x]') || e.target === w || e.target.closest('[data-act=tpl-use]')) setTimeout(() => w.remove()); }); };
ACT['tpl-use'] = el => { const tp = TPL.find(t => t.id === el.dataset.v); S.site = siteFromTpl(tp); UI.siteGallery = false; UI.pvLang = 'ko'; logAudit(`홈페이지 템플릿 적용 — ${tp.name}`); save(); go('site'); toast(`「${tp.name}」 템플릿을 적용했습니다. AI에게 말로 수정해 보세요.`, 'ok'); };
ACT['site-q'] = el => { $('#sitePrompt').value = el.dataset.v; ACT['site-gen'](); };
ACT['site-gen'] = () => { const q = ($('#sitePrompt')?.value || UI.sitePrompt || '').trim(); UI.sitePrompt = ''; UI.siteGenDone = true; if (!S.site?.tpl) S.site = siteFromTpl(tplFor(S.org.type)[0]); if (!q) { save(); render(); return; } const ch = siteEdit(S.site, q); S.ai.usage++; save(); render(); toast(ch.length ? `수정했습니다: ${ch.join(' · ')}` : '바꿀 부분을 찾지 못했습니다. 예: "블루 톤", "후기 섹션 추가", "○○ 강조"', ch.length ? 'ok' : 'warn'); if (S.site.needTr) { delete S.site.needTr; ACT['site-tr'](); } };
ACT['site-lang'] = el => { const s = site(); const L2 = new Set(s.langs || ['ko']); L2.has(el.dataset.v) ? L2.delete(el.dataset.v) : L2.add(el.dataset.v); s.langs = [...L2]; save(); render(); };
ACT['site-pvlang'] = el => { UI.pvLang = el.value; render(); };
ACT['site-tr'] = async () => { const s = site(); s.tr = s.tr || {}; let ok = 0, wait = [];
  for (const l of (s.langs || []).filter(x => x !== 'ko')) { const secs = []; let fail = false;
    for (const x of s.sections) { const d = { ...x.data }; for (const k of ['title', 'sub', 'cta', 'body']) if (typeof d[k] === 'string' && d[k]) { const r = await trText(d[k], l); if (!r) { fail = true; break; } d[k] = r.t; } if (fail) break; if (d.cols) { const c2 = []; for (const [a, b] of d.cols) { const ra = await trText(a, l), rb = await trText(b, l); if (!ra || !rb) { fail = true; break; } c2.push([ra.t, rb.t]); } d.cols = c2; } if (fail) break; secs.push({ ...x, data: d }); }
    if (fail) wait.push(l); else { s.tr[l] = secs; ok++; } }
  s.trWait = wait; save(); render(); toast(ok ? `${ok}개 언어 페이지를 만들었습니다.` : wait.length ? `${wait.map(langName).join(', ')} — 이 브라우저는 내장 번역 미지원이라 운영 모드 번역 API로 생성됩니다(메뉴 · 버튼은 언어팩으로 바로 바뀝니다).` : '추가 언어를 먼저 고르세요.', ok ? 'ok' : ''); };
/* 미리보기 · 내보내기에 언어 적용 */
{ const base = siteHTML; siteHTML = (s, full, lang) => { lang = lang || UI.pvLang || 'ko'; let s2 = s; if (lang !== 'ko') s2 = { ...s, sections: s.tr?.[lang] || s.sections, menus: s.menus.map(m => ({ ...m, l: LX(m.l, lang) })) };
  let h = base(s2, full).replace('<html lang="ko">', `<html lang="${lang}">`);
  if ((s.langs || []).length > 1) h = h.replace(/<a class="lg" href="#">로그인<\/a>/, `<span class="lsw">${s.langs.map(l => `<a href="#" class="${l === lang ? 'on' : ''}">${esc(langName(l))}</a>`).join(' · ')}</span><a class="lg" href="#">${esc(LX('로그인', lang))}</a>`).replace('</style>', '.lsw{font-size:12px;margin-left:auto}.lsw a{color:#4c4c4c;text-decoration:none}.lsw a.on{font-weight:700;color:#212121}header .lsw+.lg{margin-left:12px}</style>');
  if (lang !== 'ko' && !s.tr?.[lang]) h = h.replace('<body>', `<body><div style="background:#FFF3D6;color:#8A5A00;padding:8px 16px;font-size:13px">${esc(langName(lang))} 본문은 아직 생성되지 않았습니다 — 메뉴만 언어팩으로 표시 중</div>`);
  return h; }; }
AFTER.push(cur => { if (cur.tab !== 'site' && cur.ws !== 'site') return; const f = $('#sitePv'); if (f && S.site) f.srcdoc = siteHTML(S.site); });
const COLORS = [[/파랑|파란|블루|blue/i, '#2563EB'], [/네이비|남색/, '#1E3A8A'], [/보라|퍼플/, '#7C3AED'], [/주황|오렌지/, '#EA580C'], [/초록|녹색|그린/, '#15803D'], [/빨강|빨간|레드/, '#B91C1C'], [/핑크|분홍|마젠타/, '#DB2777'], [/검정|블랙|다크/, '#111827'], [/민트|청록/, '#0D9488'], [/노랑|옐로/, '#F59E0B']];
const SECK = [[/후기|리뷰/, 'reviews'], [/공지/, 'notices'], [/영상|동영상/, 'video'], [/(^|[^이])지도|연락처|오시는|문의/, 'map'], [/교재|교구/, 'books'], [/갤러리|사진|이미지/, 'slideImage'], [/슬라이드\s*배너|모집 배너/, 'slideBanner'], [/클래스|강좌|과정|교과목/, 'classes'], [/소개|텍스트/, 'text']];
function siteEdit(s, q) { const ch = []; const secOf = w => (SECK.find(([r]) => r.test(w)) || [])[1];
  const col = COLORS.find(([r]) => r.test(q)); if (col) { s.color = col[1]; ch.push('색 변경'); }
  const tone = Object.keys(TONES).find(k => q.includes(k)); if (tone) { s.tone = tone; ch.push(`${tone} 톤`); }
  const how = /짧게|간결/.test(q) ? '더 짧게' : /신뢰/.test(q) ? '신뢰감 있게' : /친근|부드럽/.test(q) ? '친근하게' : /숫자|구체/.test(q) ? '숫자로 구체적으로' : /행동|신청\s*유도|전환/.test(q) ? '행동 유도 강화' : '';
  if (how) { s.sections.forEach(x => rewrite(x, how)); ch.push(`문구 ${how}`); }
  q.split(/[,，]|그리고|하고|고\s/).forEach(part => {
    if (/(추가|넣어|넣고|만들어)/.test(part) && !/페이지도|다국어|언어|(영|일본|중국|베트남|태국|스페인|프랑스|인도네시아)어\s*·?\s*(페이지|사이트|버전|\S+어)/.test(part)) { const k = secOf(part); if (k && !(k === 'classes' && /강조/.test(part))) { const d = { reviews: { title: '수강후기', note: '' }, notices: { title: '공지사항', n: 3 }, video: { title: '소개 영상', url: '' }, map: { title: '오시는 길 · 문의', addr: S.settings.footer.addr || '', tel: S.settings.footer.tel || '', hours: '평일 09:00 ~ 18:00' }, books: { title: '교재 · 교구', ids: S.books.map(b => b.id) }, slideImage: { title: '갤러리', count: 3 }, slideBanner: { title: '모집 중', slides: ['모집 안내', '이벤트'], sec: 5 }, classes: { title: t('cls'), ids: pubCls(4), layout: 'grid' }, text: { title: '소개', body: '내용을 입력하세요' } }[k]; s.sections.splice(Math.max(1, s.sections.length - 1), 0, S2(k, d)); ch.push(`${SEC[k].n} 추가`); } }
    if (/(빼|삭제|없애|지워|제거)/.test(part)) { const k = secOf(part); const i = s.sections.findIndex(x => x.type === k); if (i > 0) { s.sections.splice(i, 1); ch.push(`${SEC[k].n} 삭제`); } }
    if (/(맨\s*위|상단|위로|먼저)/.test(part) && !/강조/.test(part)) { const k = secOf(part); const i = s.sections.findIndex(x => x.type === k); if (i > 1) { const [x] = s.sections.splice(i, 1); s.sections.splice(1, 0, x); ch.push(`${SEC[k].n} 위로`); } } });
  const fo = (q.match(/([가-힣A-Za-z0-9 ·]{2,24}?)\s*(을|를)?\s*(맨\s*위에\s*)?(강조|중심|위주|메인)/) || [])[1]; if (fo) { const f = fo.replace(/^(그리고|또|맨\s*위에)\s*/, '').trim(); const hero = s.sections.find(x => x.type === 'banner'); if (hero) { hero.data.title = `${f}, ${S.org.name}에서`; ch.push(`「${f}」 강조`); } const c = S.classes.find(c => c.name.includes(f) || f.includes(clean(c.name))); const cs = s.sections.find(x => x.type === 'classes'); if (c && cs) { cs.data.ids = [c.id, ...(cs.data.ids || []).filter(x => x !== c.id)].slice(0, 12); } }
  const tt = q.match(/제목\S*\s*[「"“'](.+?)[」"”']/); if (tt) { const hero = s.sections.find(x => x.type === 'banner'); if (hero) { hero.data.title = tt[1]; ch.push('제목 변경'); } }
  const LK = { 영어: 'en', 일본어: 'ja', 중국어: 'zh-CN', 번체: 'zh-TW', 대만: 'zh-TW', 베트남: 'vi', 태국: 'th', 인도네시아: 'id', 스페인: 'es', 프랑스: 'fr' }; const ls = Object.entries(LK).filter(([k]) => q.includes(k)).map(([, v]) => v);
  if (ls.length || /다국어|10개\s*언어/.test(q)) { s.langs = [...new Set([...(s.langs || ['ko']), ...(ls.length ? ls : LANGS.map(l => l[0]))])]; s.needTr = true; ch.push(`언어 ${s.langs.length}개`); }
  s.log = [{ at: nowStr(), q, ch: ch.length ? ch : ['변경 없음'] }, ...(s.log || [])].slice(0, 20); s.at = nowStr(); return ch; }
/* 기존 데이터(템플릿 이전 사이트)는 가장 가까운 템플릿을 표시만 */
/* 흐름(FILL)의 홈페이지 단계도 템플릿 + AI 수정으로 */
{ const f = FILL.find(x => x.id === 'site'); f.line = x => `${S.site?.tpl ? `현재 템플릿 「${TPL.find(t => t.id === S.site.tpl)?.name}」` : `추천 템플릿 「${tplFor(S.org.type)[0].name}」 적용`} + AI 수정(게시는 직접)`; f.run = x => { if (!S.site?.tpl) S.site = siteFromTpl(tplFor(S.org.type)[0]); const ch = siteEdit(S.site, x.q); return `「${TPL.find(t => t.id === S.site.tpl).name}」 ${ch.join(' · ') || '적용'}`; }; }

/* ═════════ ④ 캘린더 연동 + AI 튜터 코칭 ═════════ */
MENU.calendar = { label: '캘린더 · 코칭', ws: 'learn' };
Object.values(PRESET).forEach(p => { if (!p.on.includes('calendar')) p.on.push('calendar'); });
const CAL = () => S.cal || (S.cal = { google: { on: true, clientId: '', connected: false }, naver: { on: true, connected: false }, scope: { lesson: true, due: true, exam: true, live: true, block: true }, coach: { on: true, before: [3, 1, 0], quiet: '22:00-08:00', ch: '알림함 + 캘린더 알림', tone: '격려' }, conn: {}, log: [] });
const CALK = { 수업: '#4C77C5', 학습: '#3BA875', 과제: '#D6246E', 시험: '#B3121B', 라이브: '#7D5CB5', 진단: '#E8622A', 채점: '#8A5A00', 준비: '#5D6078' };
function calEvents(role, who) {
  const E = []; const add = (date, title, kind, cls, extra = {}) => date && E.push({ id: `${kind}-${cls?.id || ''}-${date}-${E.length}`, date, title, kind, cls: cls?.id, clsName: cls?.name, ...extra });
  const Cs = S.classes.filter(c => c.status !== '종료' && (!who || role === 'teacher' || c.learners.includes(who)));
  Cs.forEach(c => { const wk = w => addDays(c.start, (w - 1) * 7);
    if (c.weekly) (c.weekPlan || []).forEach(w => { if (role === 'teacher') add(wk(w.w), `${w.w}주 수업 — ${w.title}`, '수업', c, { time: '10:00' }); else add(wk(w.w), `${w.w}주 학습 — ${w.title}`, '학습', c, { time: '20:00', dur: 40 }); });
    c.curriculum.forEach(it => { const d0 = it.week ? wk(it.week) : c.start;
      if (it.type === 'assign') { const due = addDays(d0, it.due || 7); add(due, `과제 마감 — ${it.title}`, '과제', c, { time: '23:59', alarm: 1 }); if (role === 'teacher') add(addDays(due, 3), `채점 마감 — ${it.title}`, '채점', c); }
      if (it.type === 'exam') { add(d0, `시험 — ${it.title}`, '시험', c, { time: '10:00', alarm: 1 }); if (role === 'teacher') add(addDays(d0, -7), `시험 출제 마감 — ${it.title}`, '준비', c); }
      if (it.type === 'live' && it.at) add(it.at.slice(0, 10), `라이브 — ${it.title}`, '라이브', c, { time: it.at.slice(11, 16) || '19:00' }); }); });
  (S.diags || []).filter(d => d.status === '진행 중' && d.end).forEach(d => add(d.end, `진단 마감 — ${d.name}`, '진단', null, { alarm: 1 }));
  const sc = CAL().scope; return E.filter(e => ({ 수업: sc.lesson, 학습: sc.block, 과제: sc.due, 채점: sc.due, 준비: sc.due, 시험: sc.exam, 라이브: sc.live, 진단: sc.due })[e.kind] !== false).sort((a, b) => a.date.localeCompare(b.date));
}
const teachers = () => S.admins.filter(a => a.role === 'teacher');
function coachFor(role, id) { const E = calEvents(role, id).filter(e => e.date >= today() && e.date <= addDays(today(), 7)); const out = [];
  if (role === 'learner') { const m = M(id); E.filter(e => ['과제', '시험', '진단'].includes(e.kind)).forEach(e => { const dd = Math.round((new Date(e.date) - new Date(today())) / 864e5); const p = e.cls ? C(e.cls)?.prog[id]?.p ?? 0 : null; if (dd <= 7) out.push({ d: dd, e, msg: `${dd ? `D-${dd}` : '오늘'} · ${e.title}${e.clsName ? `(${e.clsName})` : ''}. ${p != null ? `지금 진도 ${p}% — ` : ''}${e.kind === '과제' ? (p < 50 ? '오늘 저녁 25분 블록에 영상 1개를 먼저 보고, 내일 초안을 쓰는 순서를 추천해요.' : '초안을 루브릭 기준으로 한 번 점검해 볼까요? 제가 체크리스트를 드릴게요.') : e.kind === '시험' ? '핵심 개념 퀴즈 10문항으로 마지막 점검을 해 보세요.' : '15분이면 끝나요. 오늘 안에 참여해 주세요.'}`, block: dd > 0 ? { date: addDays(today(), 0), time: '20:00', dur: 25, title: `학습 블록 — ${e.title.replace(/ — .*/, '')} 준비` } : null }); });
    if (!out.length && m) out.push({ d: 7, msg: `이번 주는 마감이 없어요. ${m.name}님, 주 2회 30분 학습 블록을 캘린더에 넣어 두면 꾸준히 이어 갈 수 있어요.`, block: { date: addDays(today(), 1), time: '20:00', dur: 30, title: '정기 학습 블록' } }); }
  else { const P = pend().filter(x => !id || teachers().find(t => t.id === id)?.classes.includes(x.c.id) || true); const g = E.filter(e => ['채점', '준비', '수업'].includes(e.kind)).slice(0, 4);
    if (P.length) out.push({ d: 0, msg: `채점 대기 ${P.length}건 — AI 평가 초안이 준비되어 있어요. 오늘 30분이면 ${Math.min(P.length, 10)}건을 확정할 수 있습니다.` });
    g.forEach(e => { const dd = Math.round((new Date(e.date) - new Date(today())) / 864e5); out.push({ d: dd, e, msg: `${dd ? `D-${dd}` : '오늘'} · ${e.title}. ${e.kind === '수업' ? '강의자료 · 퀴즈가 준비됐는지 확인하세요.' : e.kind === '준비' ? '문항 은행에서 AI로 출제 초안을 만들 수 있습니다.' : '마감 전에 확정해 학생에게 피드백을 보내세요.'}` }); }); }
  return out.sort((a, b) => a.d - b.d); }
const ymd = d => d.replace(/-/g, '');
function toICS(E, name) { const z = n => String(n).padStart(2, '0'); const now = new Date(); const st = `${now.getUTCFullYear()}${z(now.getUTCMonth() + 1)}${z(now.getUTCDate())}T${z(now.getUTCHours())}${z(now.getUTCMinutes())}00Z`; const esc2 = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DIDISAM Studio//KO', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${esc2(name)}`, 'X-WR-TIMEZONE:Asia/Seoul', ...E.flatMap(e => { const t = e.time && e.time !== '23:59' ? e.time.replace(':', '') + '00' : null; const end = t ? (() => { const [h, m] = e.time.split(':').map(Number); const mm = h * 60 + m + (e.dur || 60); return `${z(Math.floor(mm / 60) % 24)}${z(mm % 60)}00`; })() : null;
    return ['BEGIN:VEVENT', `UID:${e.id}@didisam`, `DTSTAMP:${st}`, t ? `DTSTART;TZID=Asia/Seoul:${ymd(e.date)}T${t}` : `DTSTART;VALUE=DATE:${ymd(e.date)}`, t ? `DTEND;TZID=Asia/Seoul:${ymd(e.date)}T${end}` : `DTEND;VALUE=DATE:${ymd(addDays(e.date, 1))}`, `SUMMARY:${esc2(e.title)}`, `CATEGORIES:${e.kind}`, ...(e.clsName ? [`DESCRIPTION:${esc2(e.clsName + ' · ' + S.org.name)}`] : []), ...(e.alarm ? ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:마감 알림', 'TRIGGER:-P1D', 'END:VALARM'] : []), 'END:VEVENT']; }), 'END:VCALENDAR'].join('\r\n'); }
VIEWS.calendar = () => { const tb = UI.calT || 'month'; const c = CAL(); const role = UI.calRole || 'learner';
  const conn = Object.values(c.conn); const nL = S.members.length, nT = teachers().length;
  let body = '';
  if (tb === 'month') { const base = UI.calM || today().slice(0, 7); const [Y, Mo] = base.split('-').map(Number); const first = new Date(Y, Mo - 1, 1); const days = new Date(Y, Mo, 0).getDate(); const off = first.getDay(); const E = calEvents(role, role === 'learner' ? UI.calWho : null); const byD = {}; E.forEach(e => (byD[e.date] = byD[e.date] || []).push(e));
    const cells = [...Array(off).fill(''), ...Array.from({ length: days }, (_, i) => `${base}-${String(i + 1).padStart(2, '0')}`)];
    body = `<div class="bar2"><div class="seg2"><button class="${role === 'learner' ? 'on' : ''}" data-act="cal-role" data-v="learner">${esc(t('learner'))} 캘린더</button><button class="${role === 'teacher' ? 'on' : ''}" data-act="cal-role" data-v="teacher">${esc(t('teacher'))} 캘린더</button></div>${role === 'learner' ? `<select data-chg="cal-who" aria-label="${esc(t('learner'))} 선택"><option value="">전체 일정</option>${S.members.slice(0, 60).map(m => `<option value="${m.id}" ${UI.calWho === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>` : ''}<span class="sp"></span><button class="btn sm ghost" data-act="cal-mv" data-v="-1" aria-label="이전 달">‹</button><b>${Y}년 ${Mo}월</b><button class="btn sm ghost" data-act="cal-mv" data-v="1" aria-label="다음 달">›</button></div>
      <div class="calg">${'일월화수목금토'.split('').map(d => `<div class="cwd">${d}</div>`).join('')}${cells.map(d => d ? `<div class="cday ${d === today() ? 'td' : ''}"><small>${+d.slice(8)}</small>${(byD[d] || []).slice(0, 3).map(e => `<span class="cev" style="--k:${CALK[e.kind]}" title="${esc(e.title)}">${esc(e.title)}</span>`).join('')}${(byD[d] || []).length > 3 ? `<em>+${byD[d].length - 3}</em>` : ''}</div>` : '<div class="cday x"></div>').join('')}</div>
      <div class="bar2 klg">${Object.entries(CALK).map(([k, v]) => `<span><i style="background:${v}"></i>${k}</span>`).join('')}</div>
      <div class="card"><div class="ch"><b>내보내기 · 동기화</b><small>${E.length}개 일정 · ${role === 'learner' ? '학습 블록 · 마감' : '수업 · 채점 · 출제 마감'}</small></div><div class="bar2"><button class="btn ink" data-act="cal-push" data-v="google">Google 캘린더로 보내기</button><button class="btn ink" data-act="cal-push" data-v="naver">네이버 캘린더로 보내기</button><button class="btn" data-act="cal-ics">ICS 파일 내려받기(모든 캘린더)</button></div><p class="mini">ICS 파일은 Google · 네이버 · Outlook · 애플 캘린더 모두에서 가져오기로 열 수 있고, 마감 일정에는 하루 전 알림이 들어 있습니다.</p></div>`; }
  if (tb === 'conn') body = `<section class="g2c"><div class="card"><div class="ch"><b>Google 캘린더</b>${c.google.connected ? tag('연결됨', 'g') : tag('미연결')}</div><p class="mini">Google 계정으로 로그인해 일정을 추가 · 수정하고(Calendar API), 개인 일정의 바쁜 시간을 읽어 코칭 시간이 겹치지 않게 합니다.</p><label class="fl">OAuth 클라이언트 ID(Google Cloud 콘솔)<input data-chg="gcal-id" value="${esc(c.google.clientId)}" placeholder="xxxx.apps.googleusercontent.com"></label><div class="bar2"><button class="btn ink" data-act="gcal-connect">${c.google.clientId ? 'Google 로그인으로 연결' : '데모 연결'}</button>${c.google.connected ? '<button class="btn" data-act="cal-disc" data-v="google">연결 해제</button>' : ''}</div><small class="mini">토큰은 이 브라우저 메모리에만 두고 저장하지 않습니다. 권한 범위: calendar.events · calendar.freebusy.</small></div>
    <div class="card"><div class="ch"><b>네이버 캘린더</b>${c.naver.connected ? tag('연결됨', 'g') : tag('미연결')}</div><p class="mini">네이버 로그인(OAuth) 후 캘린더 일정 추가 API로 일정을 넣습니다. 네이버 API는 일정 '추가'만 지원하므로 수정 · 삭제는 ICS 구독(가져오기)으로 함께 운영합니다.</p><div class="bar2"><button class="btn ink" data-act="ncal-connect">네이버로 연결</button>${c.naver.connected ? '<button class="btn" data-act="cal-disc" data-v="naver">연결 해제</button>' : ''}</div><small class="mini">클라이언트 시크릿이 필요해 운영 모드에서는 서버 함수(naverCalendar)로 처리합니다. 데모는 연결 흐름만 보여 줍니다.</small></div></section>
    <div class="card"><div class="ch"><b>동기화 범위</b></div><div class="chk">${[['lesson', '수업 일정(교수자)'], ['block', '학습 블록(학습자)'], ['due', '과제 · 채점 · 출제 마감'], ['exam', '시험'], ['live', '라이브 강의']].map(([k, l]) => `<label><input type="checkbox" data-chg="cal-scope" data-v="${k}" ${c.scope[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
    <div class="card"><div class="ch"><b>사용자별 연결 현황</b><small>${t('learner')}과 ${t('teacher')}이 각자 자기 캘린더를 연결합니다</small></div>${table(['대상', 'Google', '네이버', '미연결'], [[esc(t('learner')), conn.filter(x => x.r === 'learner' && x.p === 'google').length, conn.filter(x => x.r === 'learner' && x.p === 'naver').length, nL - conn.filter(x => x.r === 'learner').length], [esc(t('teacher')), conn.filter(x => x.r === 'teacher' && x.p === 'google').length, conn.filter(x => x.r === 'teacher' && x.p === 'naver').length, nT - conn.filter(x => x.r === 'teacher').length]])}<div class="bar2"><button class="btn" data-act="cal-invite">미연결자에게 캘린더 연결 안내 보내기</button></div></div>`;
  if (tb === 'coach') { const who = UI.coachWho || S.members[0]?.id; const tw = teachers()[0]; const L1 = coachFor('learner', who), L2 = coachFor('teacher', tw?.id);
    body = `<div class="card"><div class="ch"><b>AI 튜터 코칭 규칙</b><label class="sw"><input type="checkbox" data-chg="coach-on" ${c.coach.on ? 'checked' : ''}><span></span></label></div><div class="form2"><label>알림 시점<select data-chg="coach-before">${[['3,1,0', 'D-3 · D-1 · 당일'], ['7,3,1', 'D-7 · D-3 · D-1'], ['1,0', 'D-1 · 당일']].map(([v, l]) => `<option value="${v}" ${c.coach.before.join(',') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label><label>조용한 시간<input data-chg="coach-quiet" value="${esc(c.coach.quiet)}"></label><label>채널<select data-chg="coach-ch">${['알림함 + 캘린더 알림', '알림함', '캘린더 알림만'].map(v => `<option ${c.coach.ch === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>말투<select data-chg="coach-tone">${['격려', '간결', '정중'].map(v => `<option ${c.coach.tone === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div><p class="mini">학습자 · 교수자 각자의 캘린더 일정(마감 · 시험 · 수업)과 진도를 함께 보고, 마감 전에 할 일을 쪼개 학습 블록을 캘린더에 제안합니다. 개인 일정의 바쁜 시간과 겹치지 않게 잡습니다(Google 연결 시).</p></div>
      <section class="g2c"><div class="card"><div class="ch"><b>${esc(t('learner'))} 코칭 미리 보기</b><select data-chg="coach-who" aria-label="${esc(t('learner'))} 선택">${S.members.slice(0, 60).map(m => `<option value="${m.id}" ${who === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></div><div class="coach">${L1.map(x => `<div class="cmsg"><span class="av">${ic('spark', 14)}</span><div><p>${esc(x.msg)}</p>${x.block ? `<small>${ic('check', 12)} 캘린더 제안: ${esc(x.block.date)} ${esc(x.block.time)} · ${x.block.dur}분 「${esc(x.block.title)}」</small>` : ''}</div></div>`).join('') || '<div class="empty">이번 주 코칭할 일정이 없습니다.</div>'}</div></div>
      <div class="card"><div class="ch"><b>${esc(t('teacher'))} 코칭 미리 보기</b><small>${esc(tw?.name || '')}</small></div><div class="coach">${L2.map(x => `<div class="cmsg"><span class="av">${ic('spark', 14)}</span><div><p>${esc(x.msg)}</p></div></div>`).join('') || '<div class="empty">이번 주 코칭할 일정이 없습니다.</div>'}</div></div></section>
      <div class="bar2"><button class="btn ink" data-act="coach-send">${ic('spark', 14)} 오늘 코칭 보내기</button><button class="btn" data-act="coach-auto">매일 자동 코칭 레시피 켜기</button><span class="mini">최근 발송 ${c.log.length ? esc(c.log[0].at) + ' · ' + c.log[0].n + '명' : '없음'}</span></div>`; }
  return head('', `${t('learner')} · ${t('teacher')}의 수업 · 마감 일정을 Google · 네이버 캘린더로 보내고, AI 튜터가 일정에 맞춰 코칭합니다.`) + tabs('calT', [['month', '월간 캘린더'], ['conn', '연동 설정'], ['coach', 'AI 코칭']], tb) + body; };
ACT['cal-role'] = el => { UI.calRole = el.dataset.v; render(); };
ACT['cal-who'] = el => { UI.calWho = el.value; render(); };
ACT['cal-mv'] = el => { const [y, m] = (UI.calM || today().slice(0, 7)).split('-').map(Number); const d = new Date(y, m - 1 + +el.dataset.v, 1); UI.calM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; render(); };
ACT['cal-scope'] = el => { CAL().scope[el.dataset.v] = el.checked; save(); };
ACT['gcal-id'] = el => { CAL().google.clientId = el.value.trim(); save(); render(); };
ACT['cal-ics'] = () => { const role = UI.calRole || 'learner'; const E = calEvents(role, role === 'learner' ? UI.calWho : null); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toICS(E, `${S.org.name} ${role === 'learner' ? t('learner') : t('teacher')}`)], { type: 'text/calendar' })); a.download = `${S.org.name}_${role}.ics`; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 5000); toast(`일정 ${E.length}개를 ICS 파일로 내려받았습니다.`, 'ok'); };
let GTOK = null;
function loadGIS() { return window.google?.accounts?.oauth2 ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
ACT['gcal-connect'] = async () => { const c = CAL(); if (!c.google.clientId) { c.google.connected = true; c.google.demo = true; save(); render(); toast('데모 연결했습니다. 실제 연결은 OAuth 클라이언트 ID를 넣고 다시 누르세요.'); return; }
  try { await loadGIS(); google.accounts.oauth2.initTokenClient({ client_id: c.google.clientId, scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy', callback: r => { if (r.access_token) { GTOK = r.access_token; c.google.connected = true; c.google.demo = false; save(); render(); toast('Google 캘린더에 연결했습니다.', 'ok'); } } }).requestAccessToken(); } catch (e) { toast('Google 로그인 스크립트를 불러오지 못했습니다.', 'warn'); } };
ACT['ncal-connect'] = () => { const c = CAL(); c.naver.connected = true; c.naver.demo = true; save(); render(); toast('데모 연결했습니다. 운영 모드에서는 네이버 로그인 → 서버 함수로 일정이 추가됩니다.'); };
ACT['cal-disc'] = el => { CAL()[el.dataset.v].connected = false; if (el.dataset.v === 'google') GTOK = null; save(); render(); };
ACT['cal-push'] = async el => { const p = el.dataset.v, c = CAL(); const role = UI.calRole || 'learner'; const E = calEvents(role, role === 'learner' ? UI.calWho : null).filter(e => e.date >= today());
  if (!c[p].connected) { toast(`${p === 'google' ? 'Google' : '네이버'} 캘린더를 먼저 연결하세요(연동 설정).`, 'warn'); UI.calT = 'conn'; render(); return; }
  if (p === 'google' && GTOK) { let n = 0; for (const e of E.slice(0, 50)) { const t2 = e.time && e.time !== '23:59'; const body = { summary: e.title, description: `${e.clsName || ''} · ${S.org.name}`, start: t2 ? { dateTime: `${e.date}T${e.time}:00`, timeZone: 'Asia/Seoul' } : { date: e.date }, end: t2 ? { dateTime: `${e.date}T${e.time}:00`, timeZone: 'Asia/Seoul' } : { date: addDays(e.date, 1) }, reminders: e.alarm ? { useDefault: false, overrides: [{ method: 'popup', minutes: 1440 }] } : { useDefault: true } }; if (t2) { const [h, m] = e.time.split(':').map(Number); const mm = h * 60 + m + (e.dur || 60); body.end.dateTime = `${e.date}T${String(Math.floor(mm / 60) % 24).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}:00`; }
      try { const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', { method: 'POST', headers: { Authorization: 'Bearer ' + GTOK, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (r.ok) n++; } catch (x) { } }
    c.log.unshift({ at: nowStr(), kind: 'Google 동기화', n }); save(); render(); toast(`Google 캘린더에 ${n}개 일정을 넣었습니다.`, 'ok'); return; }
  c.log.unshift({ at: nowStr(), kind: `${p === 'google' ? 'Google' : '네이버'} 동기화(데모)`, n: E.length }); logAudit(`캘린더 동기화 — ${p} ${E.length}개`); save(); render(); toast(`${p === 'google' ? 'Google' : '네이버'} 캘린더로 ${E.length}개 일정을 보냈습니다(데모).`, 'ok'); };
ACT['cal-invite'] = () => { const c = CAL(); const n = S.members.length - Object.values(c.conn).filter(x => x.r === 'learner').length; S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: '캘린더 미연결자', title: '내 캘린더를 연결하면 마감 전에 AI 튜터가 알려 드려요', ch: '알림함', n }); save(); toast(`${n}명에게 연결 안내를 보냈습니다(데모).`, 'ok'); };
['coach-before', 'coach-quiet', 'coach-ch', 'coach-tone'].forEach(k => ACT[k] = el => { const c = CAL().coach; if (k === 'coach-before') c.before = el.value.split(',').map(Number); else c[k.slice(6)] = el.value; save(); });
ACT['coach-on'] = el => { CAL().coach.on = el.checked; save(); };
ACT['coach-who'] = el => { UI.coachWho = el.value; render(); };
function coachSend() { const c = CAL(); let n = 0; S.members.forEach(m => { if (coachFor('learner', m.id).length) n++; }); const tn = teachers().length; S.msgs.unshift({ id: uid('ms'), at: nowStr(), to: `${t('learner')} · ${t('teacher')}(일정 기반)`, title: 'AI 튜터 오늘의 코칭', ch: c.coach.ch, n: n + tn }); c.log.unshift({ at: nowStr(), kind: '코칭 발송', n: n + tn }); logAudit(`AI 튜터 코칭 발송 — ${n + tn}명`); save(); return n + tn; }
ACT['coach-send'] = () => { const n = coachSend(); render(); toast(`${n}명에게 일정 기반 코칭을 보냈습니다(데모).`, 'ok'); };
ACT['coach-auto'] = () => { if (!S.autos.some(a => a.key === 'cal-coach')) S.autos.unshift({ key: 'cal-coach', name: '일정 기반 AI 튜터 코칭(매일)', trigger: 'sc:daily', cond: '마감 D-3 · D-1 · 당일 / 채점 · 수업 준비', actions: ['msg', 'draft'], approve: false, on: true, runs: 0, last: '' }); else S.autos.find(a => a.key === 'cal-coach').on = true; save(); toast('업무 자동화에 매일 코칭 레시피를 켰습니다.', 'ok'); };
{ const base = runAuto; runAuto = (a, force) => { if (a.key !== 'cal-coach') return base(a, force); const n = coachSend(); a.runs = (a.runs || 0) + 1; a.last = nowStr(); S.runs.unshift({ at: nowStr(), name: a.name, n, st: '완료', how: force ? '수동 실행' : trigLabel(a.trigger) }); save(); return `「${a.name}」 실행 — ${n}명 코칭`; }; }
{ const base = targets; targets = a => a.key === 'cal-coach' ? S.members.map(m => m.id) : base(a); }
/* 데모: 일부 사용자는 이미 연결된 상태 */
function seedCal() { const c = CAL(); if (Object.keys(c.conn).length) return; S.members.forEach((m, i) => { if (i % 3 === 0) c.conn[m.id] = { r: 'learner', p: 'google' }; else if (i % 5 === 1) c.conn[m.id] = { r: 'learner', p: 'naver' }; }); teachers().forEach(a => c.conn[a.id] = { r: 'teacher', p: 'google' }); }

/* AI 튜터 브리핑 · 흐름 연결 */
{ const base = BRIEF; BRIEF = () => { const B = base(); if (!S.cal?.coach?.on) return B; const n = S.members.filter(m => coachFor('learner', m.id).some(x => x.d <= 1 && x.e)).length; if (n) B[B.length - 1] = { k: 'coach', label: '마감 임박 코칭 대상', n, q: '마감 임박한 학습자에게 캘린더 기반 코칭 보내줘', unit: '명' }; return B; }; }
const LKW = { 영어: 'en', 일본어: 'ja', 중국어: 'zh-CN', 번체: 'zh-TW', 대만: 'zh-TW', 베트남: 'vi', 태국: 'th', 인도네시아: 'id', 스페인: 'es', 프랑스: 'fr' };
FILL.push(
  { id: 'calendar', go: 'calendar', re: /(캘린더|일정)\S*\s*(을|를|에|으로|로)?\s*(연동|등록|보내|넣|동기화|만들)/, label: () => '캘린더', line: x => `${x.cls || x.willCourse ? `「${x.target()}」` : '전체'} 수업 · 마감 일정을 ${/네이버/.test(x.q) ? '네이버' : /구글|google/i.test(x.q) ? 'Google' : 'Google · 네이버'} 캘린더로 보내기`, run: x => { const c = CAL(); const ps = /네이버/.test(x.q) ? ['naver'] : /구글|google/i.test(x.q) ? ['google'] : ['google', 'naver']; ps.forEach(p => c[p].connected = c[p].connected || (c[p].demo = true)); const E = calEvents('learner').filter(e => !x.cls || e.cls === x.cls.id); c.log.unshift({ at: nowStr(), kind: `${ps.join('·')} 동기화(데모)`, n: E.length }); return `일정 ${E.length}개 동기화(데모)`; } },
  { id: 'coach', go: 'calendar', single: true, re: /코칭/, label: () => 'AI 튜터 코칭', line: () => `캘린더 일정 기반 코칭(${CAL().coach.before.map(d => d ? 'D-' + d : '당일').join(' · ')}) 발송`, run: () => { CAL().coach.on = true; UI.calT = 'coach'; return `${coachSend()}명에게 코칭 발송(데모)`; } },
  { id: 'subtitle', absorb: 1, re: /자막|번역/, label: () => '자막 · 번역', line: x => { const ls = Object.entries(LKW).filter(([k]) => x.q.includes(k)).map(([, v]) => v); return `「${x.target()}」 AI 영상 자막 생성 + ${ls.length ? ls.map(langName).join(' · ') : '10개 언어'} 자동 번역`; },
    run: x => { const c = x.tc(); const ls = Object.entries(LKW).filter(([k]) => x.q.includes(k)).map(([, v]) => v); const P = ls.length ? ls : LANGS.map(l => l[0]).filter(l => l !== 'ko'); let n = 0; const V = c.curriculum.filter(i => i.type === 'video' && i.src === 'ai' && i.ai?.scenes?.length);
      V.forEach(it => { it.subs = it.subs || { src: 'ko', tracks: {}, how: {}, pending: [] }; it.subs.tracks.ko = cuesFromScenes(it.ai.scenes); it.subs.how.ko = '대본 자동'; n++; (async () => { for (const l of P) { const r = await translateTrack(it.subs.tracks.ko, l, 'ko'); if (r) { it.subs.tracks[l] = r; it.subs.how[l] = '자동 번역(브라우저)'; } else if (!it.subs.pending.includes(l)) it.subs.pending.push(l); } save(); })(); });
      return n ? `영상 ${n}개 자막 생성 · ${P.length}개 언어 번역 시작` : 'AI 영상이 없어 자막 대상이 없습니다(YouTube는 자동 자막 켜기 사용)'; } }
);
/* 흡수: 과정 생성과 함께 '자막'이 오면 과정 생성 뒤 실행되도록 absorb 해제(과정 영상이 만들어진 다음 자막) */
{ const f = FILL.find(x => x.id === 'subtitle'); f.absorb = 0; }

/* 상태 보강 */
{ const base = upgradeState; upgradeState = () => { base(); let ch = false; CAL(); seedCal(); if (!S.settings.i18n) { S.settings.i18n = { ui: 'ko', site: ['ko', 'en'], subs: ['en', 'ja', 'zh-CN'], auto: true }; ch = true; }
  if (!Object.values(S.nav.tabs).some(a => a.some(x => x.id === 'calendar'))) { (S.nav.tabs.learn = S.nav.tabs.learn || []).push({ id: 'calendar', on: true }); ch = true; }
  if (S.site && !S.site.tpl) { S.site.legacy = true; } if (ch || !S.v5) { S.v5 = 1; save(); } }; }
{ const base = postSeed; postSeed = type => { base(type); S.settings.i18n = { ui: 'ko', site: ['ko', 'en'], subs: ['en', 'ja', 'zh-CN'], auto: true }; CAL(); seedCal(); S.site = siteFromTpl(tplFor(type)[0]); S.v5 = 1; }; }

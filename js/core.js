/* نافس باجتهاد — المحرك الأساسي: التواريخ، البيانات، مؤشر الاجتهاد، النقاط، الأوسمة، خطة المذاكرة، التقرير الأسبوعي */
(function () {
  const N = (window.N = window.N || {});
  const pad = (n) => String(n).padStart(2, '0');

  /* ---------- تواريخ ---------- */
  N.fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  N.today = () => N.fmt(new Date());
  N.parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  N.addDays = (s, n) => { const d = N.parse(s); d.setDate(d.getDate() + n); return N.fmt(d); };
  N.diffDays = (a, b) => Math.round((N.parse(a) - N.parse(b)) / 864e5);
  const dfLong = new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
  const dfShort = new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'short', day: 'numeric', month: 'short' });
  const dfMonth = new Intl.DateTimeFormat('ar-u-nu-latn', { month: 'long', year: 'numeric' });
  N.dateLong = (s) => dfLong.format(N.parse(s));
  N.dateShort = (s) => dfShort.format(N.parse(s));
  N.monthName = (s) => dfMonth.format(N.parse(s));
  N.esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  N.days = (n) => (n === 1 ? 'يوم' : n === 2 ? 'يومان' : n <= 10 ? `${n} أيام` : `${n} يومًا`).replace(/^(\d+ )?يوم$/, 'يوم واحد');
  N.uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  /* ---------- الثوابت ---------- */
  N.GRADES = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'الأول المتوسط', 'الثاني المتوسط', 'الثالث المتوسط', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'];
  N.SUBJECTS = ['القرآن الكريم', 'الرياضيات', 'العلوم', 'اللغة العربية', 'اللغة الإنجليزية', 'الدراسات الإسلامية', 'الاجتماعيات', 'مهارات رقمية', 'أخرى'];
  N.AVATARS = ['🦁', '🐯', '🦊', '🐼', '🐨', '🦄', '🐬', '🦉', '🐢', '🚀', '⚽', '🎨'];

  N.INDEX_LEVELS = [
    { min: 0, icon: '🌱', name: 'بذرة نافس', cls: 'l1', msg: 'بداية طيبة، وكل خطوة صغيرة تنمّي البذرة.' },
    { min: 40, icon: '⭐', name: 'نجم صاعد', cls: 'l2', msg: 'تقدّم جميل، استمر وسترتقي أكثر.' },
    { min: 65, icon: '🔥', name: 'مجتهد متوهج', cls: 'l3', msg: 'اجتهاد واضح والالتزام يزداد.' },
    { min: 85, icon: '🏆', name: 'بطل نافس', cls: 'l4', msg: 'مستوى رائع، حافظ على هذا التميّز.' },
  ];
  N.POINT_LEVELS = [
    { min: 0, name: 'متحمس' }, { min: 100, name: 'منطلق' }, { min: 300, name: 'متقدم' },
    { min: 600, name: 'متميز' }, { min: 1000, name: 'أسطورة نافس' },
  ];
  N.PARTS = [
    { key: 'tasks', label: 'إنجاز المهام', icon: '✅', w: 30, tip: 'قسّموا المهام الكبيرة إلى خطوات صغيرة، وابدؤوا بأسهلها لبناء الزخم.' },
    { key: 'ontime', label: 'الالتزام بالمواعيد', icon: '⏰', w: 15, tip: 'اتفقوا على وقت ثابت للمذاكرة يوميًا، فالروتين أقوى من الحماس المؤقت.' },
    { key: 'study', label: 'وقت المذاكرة', icon: '📚', w: 15, tip: 'جلسات قصيرة (25 دقيقة) تتخللها راحة 5 دقائق أنفع من جلسة طويلة متعبة.' },
    { key: 'focus', label: 'التركيز', icon: '🧠', w: 10, tip: 'هيّئوا مكانًا هادئًا خاليًا من الجوال أثناء المذاكرة.' },
    { key: 'streak', label: 'سلسلة الاجتهاد', icon: '🔥', w: 15, tip: 'لا تكسروا السلسلة: حتى 20 دقيقة في اليوم الصعب تحافظ عليها.' },
    { key: 'goals', label: 'تحقيق الأهداف', icon: '🎯', w: 15, tip: 'اختاروا هدفًا واحدًا واضحًا هذا الأسبوع واحتفلوا عند إنجازه.' },
  ];
  N.BADGES = [
    { id: 'first', icon: '👣', name: 'الخطوة الأولى', desc: 'أنجز أول مهمة', test: (s) => s.doneCount >= 1 },
    { id: 'flame', icon: '🔥', name: 'شعلة الاجتهاد', desc: 'سلسلة اجتهاد 7 أيام متتالية', test: (s) => s.best >= 7 },
    { id: 'hunter', icon: '🎯', name: 'صائد المهام', desc: 'أنجز 25 مهمة', test: (s) => s.doneCount >= 25 },
    { id: 'focus', icon: '🧠', name: 'نجم التركيز', desc: 'متوسط تركيز 4 من 5 (5 جلسات على الأقل)', test: (s) => s.focusN >= 5 && s.focusAvg >= 4 },
    { id: 'goal', icon: '🚀', name: 'محقق الأهداف', desc: 'حقق هدفًا كاملًا', test: (s) => s.goalsDone >= 1 },
    { id: 'champ', icon: '🏆', name: 'بطل نافس', desc: 'مؤشر اجتهاد 85% فأكثر', test: (s) => s.index >= 85 },
  ];

  /* ---------- الوصول للبيانات (التخزين في sync.js) ---------- */
  N.db = null;
  N.student = (id) => N.db.students.find((s) => s.id === id);
  N.childrenOf = (fid) => N.db.students.filter((s) => s.familyId === fid && s.active);
  N.parentsOf = (fid) => N.db.accounts.filter((a) => a.role === 'parent' && a.familyId === fid);
  N.accountOf = (sid) => N.db.accounts.find((a) => a.role === 'student' && a.studentId === sid);

  /* ---------- الإحصاءات ---------- */
  function activeDates(sid) {
    const set = new Set();
    N.db.tasks.forEach((t) => { if (t.studentId === sid && t.done && t.doneOn) set.add(t.doneOn); });
    const byDay = {};
    N.db.logs.forEach((l) => { if (l.studentId === sid) byDay[l.date] = (byDay[l.date] || 0) + l.minutes; });
    Object.entries(byDay).forEach(([d, m]) => { if (m >= 20) set.add(d); });
    N.db.participations.forEach((p) => { if (p.studentId === sid) p.days.forEach((d) => set.add(d)); });
    return set;
  }
  N.streak = (sid, asOf = N.today()) => {
    const set = activeDates(sid);
    let d = set.has(asOf) ? asOf : N.addDays(asOf, -1);
    let n = 0;
    while (set.has(d)) { n++; d = N.addDays(d, -1); }
    return n;
  };
  N.bestStreak = (sid) => {
    const days = [...activeDates(sid)].sort();
    let best = 0, cur = 0, prev = null;
    days.forEach((d) => { cur = prev && N.diffDays(d, prev) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = d; });
    return best;
  };
  N.weekDots = (sid) => { const set = activeDates(sid), t = N.today(); return Array.from({ length: 7 }, (_, i) => { const d = N.addDays(t, i - 6); return { d, on: set.has(d), today: d === t }; }); };

  N.index = (sid, end = N.today(), days = 7) => {
    const start = N.addDays(end, -(days - 1));
    const inWin = (d) => d >= start && d <= end;
    const tasks = N.db.tasks.filter((t) => t.studentId === sid && inWin(t.date));
    const done = tasks.filter((t) => t.done);
    const logs = N.db.logs.filter((l) => l.studentId === sid && inWin(l.date));
    const st = N.student(sid);
    const goals = N.db.goals.filter((g) => g.studentId === sid);
    const minutes = logs.reduce((a, l) => a + l.minutes, 0);
    const focusLogs = logs.filter((l) => l.focus);
    const v = {
      tasks: tasks.length ? (done.length / tasks.length) * 100 : 60,
      ontime: done.length ? (done.filter((t) => t.doneOn <= t.date).length / done.length) * 100 : 60,
      study: Math.min(100, (minutes / ((st?.targetMin || 60) * days)) * 100),
      focus: focusLogs.length ? (focusLogs.reduce((a, l) => a + l.focus, 0) / focusLogs.length / 5) * 100 : 50,
      streak: (Math.min(N.streak(sid, end), 14) / 14) * 100,
      goals: goals.length ? (goals.reduce((a, g) => a + Math.min(1, g.progress / g.target), 0) / goals.length) * 100 : 60,
    };
    const parts = N.PARTS.map((p) => ({ ...p, value: Math.round(v[p.key]) }));
    const score = Math.round(N.PARTS.reduce((a, p) => a + (v[p.key] * p.w) / 100, 0));
    return { score, parts, level: N.indexLevel(score), minutes, done: done.length, total: tasks.length };
  };
  N.indexLevel = (score) => [...N.INDEX_LEVELS].reverse().find((l) => score >= l.min);

  N.stats = (sid) => {
    const tasks = N.db.tasks.filter((t) => t.studentId === sid);
    const done = tasks.filter((t) => t.done);
    const logs = N.db.logs.filter((l) => l.studentId === sid);
    const fl = logs.filter((l) => l.focus);
    const parts = N.db.participations.filter((p) => p.studentId === sid);
    const goals = N.db.goals.filter((g) => g.studentId === sid);
    return {
      doneCount: done.length,
      onTime: done.filter((t) => t.doneOn <= t.date).length,
      minutes: logs.reduce((a, l) => a + l.minutes, 0),
      focusN: fl.length,
      focusAvg: fl.length ? fl.reduce((a, l) => a + l.focus, 0) / fl.length : 0,
      streak: N.streak(sid), best: N.bestStreak(sid),
      goalsDone: goals.filter((g) => g.progress >= g.target).length,
      challengesDone: parts.filter((p) => p.completed).length,
      challengeDays: parts.reduce((a, p) => a + p.days.length, 0),
      index: N.index(sid).score,
    };
  };

  N.badges = (sid) => {
    const s = N.stats(sid), off = N.db.settings.badgesOff || [];
    return N.BADGES.filter((b) => !off.includes(b.id)).map((b) => ({ ...b, earned: !!b.test(s) }));
  };

  N.points = (sid) => {
    const s = N.stats(sid);
    const earned = N.badges(sid).filter((b) => b.earned).length;
    const rows = [
      ['مهام منجزة', s.doneCount * 10], ['إنجاز قبل/في الموعد', s.onTime * 5], ['وقت المذاكرة', Math.floor(s.minutes / 10)],
      ['أيام التحديات', s.challengeDays * 15], ['أهداف محققة', s.goalsDone * 50], ['أوسمة', earned * 25],
    ];
    const total = rows.reduce((a, r) => a + r[1], 0);
    const L = N.POINT_LEVELS; let i = L.length - 1; while (L[i].min > total) i--;
    const next = L[i + 1] || null;
    return { total, rows, level: L[i], next, pct: next ? Math.round(((total - L[i].min) / (next.min - L[i].min)) * 100) : 100 };
  };

  /* ---------- خطة المذاكرة ---------- */
  N.generatePlan = (exam) => {
    N.db.tasks = N.db.tasks.filter((t) => !(t.examId === exam.id && !t.done));
    const t0 = N.today();
    const days = N.diffDays(exam.date, t0);
    if (days <= 0) return 0;
    const topics = (exam.topics || '').split(/[،,\n]+/).map((x) => x.trim()).filter(Boolean);
    const n = Math.min(days, 7);
    const mins = n <= 2 ? 30 : 45;
    const mk = (date, title) => N.db.tasks.push({ id: N.uid(), studentId: exam.studentId, title, subject: exam.subject, date, type: 'study', minutes: mins, done: false, doneOn: null, examId: exam.id });
    if (n === 1) { mk(N.addDays(exam.date, -1) < t0 ? t0 : N.addDays(exam.date, -1), `مراجعة مركزة: ${exam.subject}${topics.length ? ' — ' + topics.join('، ') : ''}`); return 1; }
    const chunks = Array.from({ length: n - 1 }, () => []);
    (topics.length ? topics : ['المنهج المقرر']).forEach((tp, i) => chunks[i % chunks.length].push(tp));
    let count = 0;
    for (let i = 0; i < n; i++) {
      const date = N.addDays(exam.date, -(n - i));
      if (i < n - 1) { if (!chunks[i].length) chunks[i].push('حل تمارين وتدريبات'); mk(date, `مذاكرة ${exam.subject}: ${chunks[i].join('، ')}`); }
      else mk(date, `مراجعة شاملة: ${exam.subject}`);
      count++;
    }
    return count;
  };

  /* ---------- التقرير الأسبوعي ---------- */
  N.report = (sid) => {
    const end = N.today(), start = N.addDays(end, -6);
    const cur = N.index(sid, end), prev = N.index(sid, N.addDays(end, -7));
    const tasks = N.db.tasks.filter((t) => t.studentId === sid && t.date >= start && t.date <= end);
    const logs = N.db.logs.filter((l) => l.studentId === sid && l.date >= start && l.date <= end);
    const diffs = cur.parts.map((p, i) => ({ ...p, delta: p.value - prev.parts[i].value }));
    const improved = [...diffs].sort((a, b) => b.delta - a.delta)[0];
    const weakest = [...cur.parts].sort((a, b) => a.value - b.value)[0];
    const strongest = [...cur.parts].sort((a, b) => b.value - a.value)[0];
    const st = N.student(sid);
    const notes = {
      improved: improved.delta > 0 ? `تحسّن «${improved.label}» بمقدار ${improved.delta} نقطة عن الأسبوع الماضي.` : `أقوى جانب هذا الأسبوع «${strongest.label}» بنسبة ${strongest.value}%.`,
      support: `يحتاج ${st.name} دعمًا في «${weakest.label}» (${weakest.value}%).`,
      advice: weakest.tip,
    };
    const fresh = !!st.createdAt && Date.now() - new Date(st.createdAt).getTime() < 7 * 864e5;
    return { start, end, cur, prev, fresh, delta: cur.score - prev.score, tasksDone: tasks.filter((t) => t.done).length, tasksTotal: tasks.length, minutes: logs.reduce((a, l) => a + l.minutes, 0), streak: N.streak(sid), notes, weakest, strongest };
  };
})();

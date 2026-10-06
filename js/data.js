/* نافس باجتهاد — البيانات التجريبية وعمليات الحسابات */
(function () {
  const N = window.N;

  N.DEFAULT_AGREEMENT = {
    student: ['أبدأ مذاكرتي في الوقت المتفق عليه دون تذكير', 'أنجز واجباتي قبل اللعب والترفيه', 'أطلب المساعدة بهدوء عندما أحتاجها'],
    parent: ['أخصص وقتًا هادئًا للمذاكرة وأقلل المشتتات', 'أشجّع المحاولة والجهد لا الدرجة فقط', 'أراجع إنجازات الأسبوع معك بابتسامة'],
    reward: 'نزهة عائلية أو نشاط يختاره الطالب عند الوصول إلى «بطل نافس»',
  };

  N.TIPS = [
    ['التحفيز', 'امدح الجهد لا الذكاء', 'قل «أعجبني إصرارك على حل المسألة» بدل «أنت ذكي». مدح الجهد يعلّم الطفل أن النجاح يُبنى بالمحاولة، فيتحمّس لتحدي الصعب.'],
    ['الروتين', 'وقت ثابت للمذاكرة', 'اتفقوا على ساعة يومية ثابتة قدر الإمكان. الروتين يقلل الجدال ويجعل المذاكرة عادة لا معركة.'],
    ['التركيز', 'قاعدة 25 + 5', 'جلسة تركيز 25 دقيقة ثم راحة 5 دقائق. بعد أربع جلسات راحة أطول. هذا يناسب الأطفال ويحفظ الطاقة.'],
    ['التواصل', 'اسأل أسئلة مفتوحة', 'بدل «هل ذاكرت؟» جرّب «وش أمتع شيء تعلمته اليوم؟». الأسئلة المفتوحة تفتح باب الحوار وتقلل المقاومة.'],
    ['الاختبارات', 'قبل الاختبار بيوم', 'نوم كافٍ ومراجعة خفيفة وفطور صحي أهم من سهر المذاكرة. طمئنه أن الاختبار خطوة وليس حكمًا عليه.'],
    ['الشاشات', 'اتفاق الشاشات', 'حدّدوا معًا وقت الشاشة وأماكنها. حين يشارك الطفل في القرار يلتزم به أكثر.'],
    ['التحفيز', 'احتفل بالسلسلة', 'عند بلوغ 7 أيام اجتهاد احتفلوا بشيء بسيط: وجبة يحبها أو لعبة جماعية. التعزيز الصغير والمتكرر أقوى من الجائزة الكبيرة النادرة.'],
    ['التواصل', 'حين يتعثر الطفل', 'ابدأ بالتعاطف: «واضح أنها صعبة عليك»، ثم اسأل: «وش الجزء اللي ما فهمته؟». حدّد المشكلة قبل البحث عن الحل.'],
  ];

  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  N.seed = () => {
    const T = N.today(), r = rng(7);
    const db = {
      admin: { username: 'admin', pin: '0000' },
      settings: { badgesOff: [] },
      families: [{ id: 'f1', username: 'NAFES1001', pin: '4826', name: 'أبو عبدالله', phone: '966500000000', active: true }],
      students: [
        { id: 's1', familyId: 'f1', name: 'عبدالله', grade: 'السادس', avatar: '🦁', targetMin: 60, active: true },
        { id: 's2', familyId: 'f1', name: 'نورة', grade: 'الرابع', avatar: '🦄', targetMin: 45, active: true },
      ],
      tasks: [], exams: [], logs: [], goals: [], participations: [], agreements: {},
      challenges: [
        { id: 'c1', title: 'تحدي القراءة', desc: 'اقرأ 15 دقيقة يوميًا لمدة 7 أيام', days: 7, active: true },
        { id: 'c2', title: 'تحدي البداية المبكرة', desc: 'ابدأ المذاكرة في الوقت المتفق عليه 5 أيام', days: 5, active: true },
        { id: 'c3', title: 'تحدي الترتيب', desc: 'رتّب حقيبتك ومكتبك كل يوم لمدة 5 أيام', days: 5, active: true },
      ],
      content: N.TIPS.map((t, i) => ({ id: 'tip' + i, category: t[0], title: t[1], body: t[2] })),
    };
    const subj = ['الرياضيات', 'العلوم', 'اللغة العربية', 'اللغة الإنجليزية', 'القرآن الكريم'];
    const titles = ['حل تمارين الصفحة', 'مراجعة الدرس', 'كتابة الواجب', 'حفظ ومراجعة', 'قراءة الوحدة'];
    // عبدالله: مجتهد، سلسلة 12 يوم
    for (let i = 0; i < 14; i++) {
      const d = N.addDays(T, -i), active = i <= 11;
      if (active) db.logs.push({ id: N.uid(), studentId: 's1', date: d, minutes: 55 + Math.floor(r() * 25), focus: r() > 0.3 ? 5 : 4, note: '' });
      for (let k = 0; k < 2; k++) {
        const done = active && !(i === 0 && k === 1);
        const late = done && r() > 0.9;
        db.tasks.push({ id: N.uid(), studentId: 's1', title: `${titles[(i + k) % 5]}`, subject: subj[(i + k) % 5], date: d, type: 'homework', minutes: 30, done, doneOn: done ? (late ? N.addDays(d, 1) > T ? d : N.addDays(d, 1) : d) : null });
      }
    }
    // نورة: متوسطة
    for (let i = 0; i < 14; i++) {
      const d = N.addDays(T, -i), active = i % 2 === 0 && i < 8;
      if (active) db.logs.push({ id: N.uid(), studentId: 's2', date: d, minutes: 25 + Math.floor(r() * 20), focus: 3, note: '' });
      for (let k = 0; k < 2; k++) {
        const done = active && (k === 0 || r() > 0.5);
        db.tasks.push({ id: N.uid(), studentId: 's2', title: `${titles[(i + k + 2) % 5]}`, subject: subj[(i + k + 1) % 5], date: d, type: 'homework', minutes: 25, done, doneOn: done ? d : null });
      }
    }
    // مهام قادمة
    [['s1', 'مشروع العلوم: نموذج الخلية', 'العلوم', 2], ['s1', 'حل تمارين الكسور', 'الرياضيات', 1], ['s2', 'قراءة قصة وتلخيصها', 'اللغة العربية', 1], ['s2', 'حفظ سورة الأعلى', 'القرآن الكريم', 3]]
      .forEach(([sid, title, subject, n]) => db.tasks.push({ id: N.uid(), studentId: sid, title, subject, date: N.addDays(T, n), type: 'homework', minutes: 30, done: false, doneOn: null }));
    // مهام اليوم
    db.tasks.filter((t) => t.date === T && t.studentId === 's1').forEach((t, i) => { t.title = i ? 'مراجعة درس الحاسب' : 'حل تمارين الرياضيات'; });
    // اختبار قريب (يولّد خطة مذاكرة)
    const ex = { id: 'e1', studentId: 's1', subject: 'الرياضيات', date: N.addDays(T, 5), topics: 'الكسور العشرية، النسبة والتناسب، الهندسة' };
    db.exams.push(ex);
    N.db = db; N.generatePlan(ex);
    // أهداف
    db.goals.push({ id: N.uid(), studentId: 's1', title: 'قراءة 3 كتب هذا الشهر', target: 3, progress: 2, due: N.addDays(T, 20) }, { id: N.uid(), studentId: 's1', title: 'حفظ جزء عمّ', target: 10, progress: 7, due: N.addDays(T, 30) }, { id: N.uid(), studentId: 's2', title: 'قراءة 5 قصص', target: 5, progress: 2, due: N.addDays(T, 25) });
    // اتفاق الهمة + تحدٍّ جارٍ
    db.agreements.s1 = { ...JSON.parse(JSON.stringify(N.DEFAULT_AGREEMENT)), signedStudent: T, signedParent: T };
    db.participations.push({ id: N.uid(), studentId: 's1', challengeId: 'c1', days: [N.addDays(T, -2), N.addDays(T, -1)], completed: false });
    return db;
  };

  /* ---------- عمليات الإدارة ---------- */
  N.randPin = () => String(1000 + Math.floor(Math.random() * 9000));
  N.nextUsername = () => {
    const nums = N.db.families.map((f) => parseInt(f.username.replace(/\D/g, ''), 10)).filter(Boolean);
    return 'NAFES' + (Math.max(1000, ...nums) + 1);
  };
  N.login = (username, pin) => {
    const u = String(username || '').trim().toUpperCase(), p = String(pin || '').trim();
    if (u === N.db.admin.username.toUpperCase() && p === N.db.admin.pin) return { role: 'admin' };
    const f = N.db.families.find((x) => x.username.toUpperCase() === u && x.pin === p);
    if (!f) return { error: 'اسم المستخدم أو الرقم السري غير صحيح' };
    if (!f.active) return { error: 'هذا الحساب معطّل، تواصل مع إدارة الأكاديمية' };
    return { role: 'family', familyId: f.id };
  };
  N.toCSV = (rows) => '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  N.download = (name, text, type = 'text/csv;charset=utf-8') => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  };
})();

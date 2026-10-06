/* نافس باجتهاد — لوحة إدارة أكاديمية ألوان */
(function () {
  const N = window.N, E = N.esc, A = N.A, V = N.V;
  const header = (title, actions = '') => `<div class="page-h"><h1>${title}</h1><div class="row">${actions}</div></div>`;
  const allKids = () => N.db.students.filter((s) => s.active);

  V.aOverview = () => {
    const rows = allKids().map((s) => ({ s, ix: N.index(s.id) })).sort((a, b) => b.ix.score - a.ix.score);
    const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.ix.score, 0) / rows.length) : 0;
    const need = rows.filter((r) => r.ix.score < 40);
    const li = (r) => `<div class="task"><span style="font-size:1.6rem">${r.s.avatar}</span><div class="tt"><b>${E(r.s.name)}</b><small class="muted">${E(N.family(r.s.familyId)?.name)} · الصف ${E(r.s.grade)}</small></div><b>${r.ix.score}%</b><span>${r.ix.level.icon}</span></div>`;
    return `${header('نظرة عامة')}
    <div class="grid g4"><div class="card stat"><b>${N.db.families.filter((f) => f.active).length}</b><span>أسرة نشطة</span></div><div class="card stat"><b>${rows.length}</b><span>طالب</span></div><div class="card stat"><b>${avg}%</b><span>متوسط الاجتهاد</span></div><div class="card stat"><b>${need.length}</b><span>يحتاجون دعمًا</span></div></div>
    <div class="grid g2"><div class="card"><h2>🏆 الأعلى اجتهادًا</h2>${rows.slice(0, 5).map(li).join('') || N.empty('👥', 'لا يوجد طلاب بعد')}</div><div class="card"><h2>🤝 يحتاجون دعمًا</h2>${need.map(li).join('') || N.empty('🎉', 'لا أحد تحت 40% حاليًا')}</div></div>`;
  };

  /* ===== الأسر والطلاب ===== */
  V.aFamilies = () => `${header('الأسر والطلاب', `<button class="btn" data-act="famAdd">+ أسرة جديدة</button>`)}
    <p class="muted small">اسم المستخدم والرقم السري للأسرة يُعطى لولي الأمر، ويدخل به الأب والأبناء جميعًا.</p>
    ${N.db.families.map((f) => `<div class="card" style="margin-bottom:14px"><div class="row between"><div><h3>${E(f.name)} ${f.active ? '' : '<span class="chip bad">معطّل</span>'}</h3><div class="small">المستخدم: <span class="cred">${E(f.username)}</span> &nbsp; الرقم السري: <span class="cred">${E(f.pin)}</span> &nbsp; <span class="muted">${E(f.phone || '')}</span></div></div>
      <div class="row"><button class="btn sm ghost" data-act="famEdit" data-id="${f.id}">تعديل</button><button class="btn sm ghost" data-act="famPin" data-id="${f.id}">إعادة تعيين الرقم</button><button class="btn sm ghost" data-act="famToggle" data-id="${f.id}">${f.active ? 'تعطيل' : 'تفعيل'}</button><button class="btn sm red" data-act="famDel" data-id="${f.id}">حذف</button></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>الطالب</th><th>الصف</th><th>الاجتهاد</th><th></th></tr></thead><tbody>${N.db.students.filter((s) => s.familyId === f.id).map((s) => { const ix = N.index(s.id); return `<tr><td>${s.avatar} ${E(s.name)} ${s.active ? '' : '<span class="chip bad">معطّل</span>'}</td><td>${E(s.grade)}</td><td>${ix.score}% ${ix.level.icon}</td><td class="row"><button class="btn sm ghost" data-act="stEdit" data-id="${s.id}">تعديل</button><button class="btn sm ghost" data-act="stToggle" data-id="${s.id}">${s.active ? 'تعطيل' : 'تفعيل'}</button><button class="btn sm ghost" data-act="stDel" data-id="${s.id}" aria-label="حذف ${E(s.name)}">🗑️</button></td></tr>`; }).join('')}</tbody></table></div>
      <button class="btn sm" data-act="stAdd" data-id="${f.id}" style="margin-top:8px">+ إضافة ابن/ابنة</button></div>`).join('') || `<div class="card">${N.empty('👪', 'أضف أول أسرة')}</div>`}`;

  const gradeOpts = N.GRADES.map((g) => [g, g]);
  const stFields = (s = {}) => [{ name: 'name', label: 'اسم الطالب', value: s.name }, { name: 'grade', label: 'الصف', type: 'select', options: gradeOpts, value: s.grade || 'الرابع' }, { name: 'avatar', label: 'الرمز', type: 'select', options: N.AVATARS.map((a) => [a, a]), value: s.avatar || '🦁' }, { name: 'targetMin', label: 'هدف المذاكرة اليومي (دقيقة)', type: 'number', value: s.targetMin || 45, min: 10, max: 300 }];
  A.famAdd = () => N.modal({
    title: 'أسرة جديدة', fields: [{ name: 'name', label: 'اسم ولي الأمر / الأسرة' }, { name: 'phone', label: 'جوال ولي الأمر (للواتساب، بصيغة دولية)', required: false, dir: 'ltr' }, ...stFields().map((f) => ({ ...f, name: 'st_' + f.name, label: 'الطالب الأول — ' + f.label }))],
    body: `<p class="muted small">سيُنشأ اسم مستخدم ورقم سري تلقائيًا.</p>`,
    onSubmit: (d) => { const fid = N.uid(); N.db.families.push({ id: fid, username: N.nextUsername(), pin: N.randPin(), name: d.name.trim(), phone: d.phone, active: true }); N.db.students.push({ id: N.uid(), familyId: fid, name: d.st_name.trim(), grade: d.st_grade, avatar: d.st_avatar, targetMin: +d.st_targetMin, active: true }); N.save(); N.render(); },
  });
  A.famEdit = ({ id }) => { const f = N.family(id); N.modal({ title: 'تعديل الأسرة', fields: [{ name: 'name', label: 'الاسم', value: f.name }, { name: 'phone', label: 'الجوال', value: f.phone, required: false, dir: 'ltr' }], onSubmit: (d) => { f.name = d.name.trim(); f.phone = d.phone; N.save(); N.render(); } }); };
  A.famPin = ({ id }) => { const f = N.family(id); N.confirm(`إعادة تعيين الرقم السري لأسرة ${f.name}؟`, () => { f.pin = N.randPin(); N.save(); N.render(); N.toast(`الرقم الجديد: ${f.pin}`); }); };
  A.famToggle = ({ id }) => { const f = N.family(id); f.active = !f.active; N.save(); N.render(); };
  A.famDel = ({ id }) => N.confirm('حذف الأسرة وكل بيانات أبنائها نهائيًا؟', () => { const ids = N.db.students.filter((s) => s.familyId === id).map((s) => s.id); ids.forEach(wipe); N.db.families = N.db.families.filter((f) => f.id !== id); N.save(); N.render(); });
  const wipe = (sid) => { ['tasks', 'exams', 'logs', 'goals', 'participations'].forEach((k) => { N.db[k] = N.db[k].filter((x) => x.studentId !== sid); }); delete N.db.agreements[sid]; N.db.students = N.db.students.filter((s) => s.id !== sid); };
  A.stAdd = ({ id }) => N.modal({ title: 'طالب جديد', fields: stFields(), onSubmit: (d) => { N.db.students.push({ id: N.uid(), familyId: id, name: d.name.trim(), grade: d.grade, avatar: d.avatar, targetMin: +d.targetMin, active: true }); N.save(); N.render(); } });
  A.stEdit = ({ id }) => { const s = N.student(id); N.modal({ title: 'تعديل الطالب', fields: stFields(s), onSubmit: (d) => { Object.assign(s, { name: d.name.trim(), grade: d.grade, avatar: d.avatar, targetMin: +d.targetMin }); N.save(); N.render(); } }); };
  A.stToggle = ({ id }) => { const s = N.student(id); s.active = !s.active; N.save(); N.render(); };
  A.stDel = ({ id }) => N.confirm('حذف الطالب وكل بياناته نهائيًا؟', () => { wipe(id); N.save(); N.render(); });

  /* ===== التحديات ===== */
  V.aChallenges = () => `${header('التحديات', `<button class="btn" data-act="chAdd">+ تحدٍّ جديد</button>`)}<div class="grid g2">${N.db.challenges.map((c) => `<div class="card"><div class="row between"><h3>🏁 ${E(c.title)}</h3><span class="chip ${c.active ? 'ok' : ''}">${c.active ? 'نشط' : 'متوقف'}</span></div><p class="muted">${E(c.desc)} · ${c.days} أيام · مشاركون: ${N.db.participations.filter((p) => p.challengeId === c.id).length}</p><div class="row"><button class="btn sm ghost" data-act="chEdit" data-id="${c.id}">تعديل</button><button class="btn sm ghost" data-act="chTog" data-id="${c.id}">${c.active ? 'إيقاف' : 'تفعيل'}</button><button class="btn sm red" data-act="chDel" data-id="${c.id}">حذف</button></div></div>`).join('')}</div>`;
  const chFields = (c = {}) => [{ name: 'title', label: 'اسم التحدي', value: c.title }, { name: 'desc', label: 'الوصف', type: 'textarea', value: c.desc }, { name: 'days', label: 'عدد الأيام', type: 'number', value: c.days || 7, min: 1, max: 60 }];
  A.chAdd = () => N.modal({ title: 'تحدٍّ جديد', fields: chFields(), onSubmit: (d) => { N.db.challenges.push({ id: N.uid(), title: d.title.trim(), desc: d.desc.trim(), days: +d.days, active: true }); N.save(); N.render(); } });
  A.chEdit = ({ id }) => { const c = N.db.challenges.find((x) => x.id === id); N.modal({ title: 'تعديل التحدي', fields: chFields(c), onSubmit: (d) => { Object.assign(c, { title: d.title.trim(), desc: d.desc.trim(), days: +d.days }); N.save(); N.render(); } }); };
  A.chTog = ({ id }) => { const c = N.db.challenges.find((x) => x.id === id); c.active = !c.active; N.save(); N.render(); };
  A.chDel = ({ id }) => N.confirm('حذف التحدي؟', () => { N.db.challenges = N.db.challenges.filter((c) => c.id !== id); N.db.participations = N.db.participations.filter((p) => p.challengeId !== id); N.save(); N.render(); });

  /* ===== المحتوى ===== */
  V.aContent = () => `${header('محتوى «معك في التربية»', `<button class="btn" data-act="ctAdd">+ نصيحة جديدة</button>`)}<div class="grid g2">${N.db.content.map((c) => `<div class="card"><span class="chip">${E(c.category)}</span><h3 style="margin-top:8px">${E(c.title)}</h3><p class="muted">${E(c.body)}</p><div class="row"><button class="btn sm ghost" data-act="ctEdit" data-id="${c.id}">تعديل</button><button class="btn sm red" data-act="ctDel" data-id="${c.id}">حذف</button></div></div>`).join('')}</div>`;
  const ctFields = (c = {}) => [{ name: 'category', label: 'التصنيف', value: c.category || 'التحفيز' }, { name: 'title', label: 'العنوان', value: c.title }, { name: 'body', label: 'النص', type: 'textarea', value: c.body }];
  A.ctAdd = () => N.modal({ title: 'نصيحة جديدة', fields: ctFields(), onSubmit: (d) => { N.db.content.push({ id: N.uid(), category: d.category.trim(), title: d.title.trim(), body: d.body.trim() }); N.save(); N.render(); } });
  A.ctEdit = ({ id }) => { const c = N.db.content.find((x) => x.id === id); N.modal({ title: 'تعديل النصيحة', fields: ctFields(c), onSubmit: (d) => { Object.assign(c, { category: d.category.trim(), title: d.title.trim(), body: d.body.trim() }); N.save(); N.render(); } }); };
  A.ctDel = ({ id }) => N.confirm('حذف النصيحة؟', () => { N.db.content = N.db.content.filter((c) => c.id !== id); N.save(); N.render(); });

  /* ===== الأوسمة ===== */
  V.aBadges = () => `${header('الأوسمة')}<p class="muted">تُمنح الأوسمة تلقائيًا عند تحقق الشرط. يمكنك إيقاف أي وسام.</p><div class="grid g3">${N.BADGES.map((b) => { const off = N.db.settings.badgesOff.includes(b.id); const n = allKids().filter((s) => b.test(N.stats(s.id))).length; return `<div class="card center" style="${off ? 'opacity:.55' : ''}"><div style="font-size:2.6rem">${b.icon}</div><h3>${b.name}</h3><p class="muted small">${b.desc}</p><p class="small">حصل عليه ${n} طالب</p><button class="btn sm ${off ? '' : 'ghost'}" data-act="bdTog" data-id="${b.id}">${off ? 'تفعيل' : 'إيقاف'}</button></div>`; }).join('')}</div>`;
  A.bdTog = ({ id }) => { const o = N.db.settings.badgesOff; const i = o.indexOf(id); i < 0 ? o.push(id) : o.splice(i, 1); N.save(); N.render(); };

  /* ===== التقارير والنسخ ===== */
  const repRows = () => allKids().map((s) => { const ix = N.index(s.id), st = N.stats(s.id), pt = N.points(s.id); return { s, ix, st, pt, f: N.family(s.familyId) }; });
  V.aReports = () => `${header('استخراج التقارير', `<button class="btn" data-act="csv">⬇️ تصدير CSV</button>`)}
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>الطالب</th><th>الأسرة</th><th>الاجتهاد</th><th>السلسلة</th><th>النقاط</th><th></th></tr></thead><tbody>${repRows().map((r) => `<tr><td>${r.s.avatar} ${E(r.s.name)}</td><td>${E(r.f?.name)}</td><td>${r.ix.score}% ${r.ix.level.icon}</td><td>${r.st.streak}</td><td>${r.pt.total}</td><td><button class="btn sm ghost" data-act="aRep" data-id="${r.s.id}">التقرير</button></td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h2>الإعدادات والنسخ الاحتياطي</h2><p class="muted small">البيانات محفوظة حاليًا في متصفح هذا الجهاز. خذ نسخة احتياطية دوريًا إلى أن يُربط التطبيق بقاعدة بيانات Supabase (ملف supabase/schema.sql).</p><div class="row"><button class="btn ghost" data-act="backup">نسخة احتياطية JSON</button><button class="btn ghost" data-act="restore">استعادة نسخة</button><button class="btn ghost" data-act="adminPin">تغيير رقم الإدارة</button><button class="btn red" data-act="resetDemo">إعادة البيانات التجريبية</button></div></div>`;
  V.aReport = () => `<div class="no-print"><a class="btn sm ghost" href="#/a/reports">→ رجوع</a></div>` + V.report();
  A.aRep = ({ id }) => { N.session.studentId = id; location.hash = '#/a/report'; };
  A.csv = () => N.download('nafes-report.csv', N.toCSV([['الطالب', 'الصف', 'الأسرة', 'مؤشر الاجتهاد %', 'المستوى', 'السلسلة', 'المهام المنجزة', 'دقائق المذاكرة', 'النقاط'], ...repRows().map((r) => [r.s.name, r.s.grade, r.f?.name, r.ix.score, r.ix.level.name, r.st.streak, r.st.doneCount, r.st.minutes, r.pt.total])]));
  A.backup = () => N.download(`nafes-backup-${N.today()}.json`, JSON.stringify(N.db), 'application/json');
  A.restore = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json'; i.onchange = () => i.files[0].text().then((t) => { try { const d = JSON.parse(t); if (!d.families || !d.students) throw 0; N.db = d; N.save(); N.render(); N.toast('تمت الاستعادة ✅'); } catch (e) { N.toast('ملف غير صالح'); } }); i.click(); };
  A.adminPin = () => N.modal({ title: 'تغيير رقم الإدارة', fields: [{ name: 'pin', label: 'الرقم الجديد (4 أرقام على الأقل)', type: 'text', dir: 'ltr' }], onSubmit: (d) => { if (!/^\d{4,}$/.test(d.pin)) { N.toast('أرقام فقط، 4 على الأقل'); return false; } N.db.admin.pin = d.pin; N.save(); N.toast('تم التغيير ✅'); } });
  A.resetDemo = () => N.confirm('سيُحذف كل شيء وتعود البيانات التجريبية. متأكد؟', () => { N.resetDemo(); N.render(); });
})();

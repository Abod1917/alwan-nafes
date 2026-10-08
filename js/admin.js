/* نافس باجتهاد — لوحة إدارة أكاديمية ألوان (المشرف) */
(function () {
  const N = window.N, E = N.esc, A = N.A, V = N.V;
  const header = (title, actions = '') => `<div class="page-h"><h1>${title}</h1><div class="row">${actions}</div></div>`;
  const allKids = () => N.db.students.filter((s) => s.active);
  const parentNames = (fid) => N.parentsOf(fid).map((p) => `${p.name}${p.relationship ? ' (' + p.relationship + ')' : ''}`).join('، ');
  const goalsText = (s) => [...(s.goals || []).map((k) => N.goalOpt(k)?.label).filter(Boolean), s.goalNote].filter(Boolean).join('، ');
  const dt = (iso) => (iso ? N.dateShort(N.fmt(new Date(iso))) : '—');
  const admin = (action, p) => N.rpc('nafes_admin', { p_token: N.token(), p_action: action, p });
  const refresh = async (msg) => { await N.loadRemote(); N.render(); if (msg) N.toast(msg); };
  N.ui.peopleTab = N.ui.peopleTab || 'all'; N.ui.peopleQ = N.ui.peopleQ || '';

  V.aOverview = () => {
    const rows = allKids().map((s) => ({ s, ix: N.index(s.id) })).sort((a, b) => b.ix.score - a.ix.score);
    const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.ix.score, 0) / rows.length) : 0;
    const need = rows.filter((r) => r.ix.score < 40);
    const week = N.addDays(N.today(), -6), acc = N.db.accounts;
    const newCount = acc.filter((a) => a.createdAt && N.fmt(new Date(a.createdAt)) >= week).length;
    const li = (r) => `<div class="task"><span style="font-size:1.6rem">${r.s.avatar}</span><div class="tt"><b>${E(r.s.name)}</b><small class="muted">الصف ${E(r.s.grade)}${r.s.school ? ' · ' + E(r.s.school) : ''}</small></div><b>${r.ix.score}%</b><span>${r.ix.level.icon}</span></div>`;
    return `${header('نظرة عامة')}
    <div class="grid g4"><div class="card stat"><b>${rows.length}</b><span>طالب</span></div><div class="card stat"><b>${acc.filter((a) => a.role === 'parent').length}</b><span>ولي أمر</span></div><div class="card stat"><b>${newCount}</b><span>تسجيل هذا الأسبوع</span></div><div class="card stat"><b>${avg}%</b><span>متوسط الاجتهاد</span></div></div>
    <div class="grid g2"><div class="card"><h2>🏆 الأعلى اجتهادًا</h2>${rows.slice(0, 5).map(li).join('') || N.empty('👥', 'لا يوجد طلاب بعد')}</div><div class="card"><h2>🤝 يحتاجون دعمًا (أقل من 40%)</h2>${need.map(li).join('') || N.empty('🎉', 'لا أحد حاليًا')}</div></div>`;
  };

  /* ===== صفحة المشرف: كل المسجلين ===== */
  const peopleRows = () => {
    const out = [];
    N.db.accounts.forEach((a) => {
      if (a.role === 'student') { const s = N.student(a.studentId) || {}; out.push({ a, type: 'طالب', name: a.name, s, linked: parentNames(a.familyId) }); }
      else out.push({ a, type: 'ولي أمر', name: a.name, rel: a.relationship, kids: N.childrenOf(a.familyId).map((k) => k.name).join('، ') });
    });
    N.db.students.filter((s) => !N.accountOf(s.id)).forEach((s) => out.push({ a: null, type: 'طالب (بلا حساب دخول)', name: s.name, s, linked: parentNames(s.familyId) }));
    return out;
  };
  V.aPeople = () => {
    const tab = N.ui.peopleTab, q = N.ui.peopleQ.trim();
    const rows = peopleRows().filter((r) => (tab === 'all' || (tab === 's' ? r.type.startsWith('طالب') : r.type === 'ولي أمر')) && (!q || JSON.stringify([r.name, r.a?.username, r.s?.school, r.linked, r.kids]).includes(q)));
    const tabs = [['all', 'الكل'], ['s', 'الطلاب'], ['p', 'أولياء الأمور']];
    return `${header('المسجلون', `<button class="btn" data-act="peopleCsv">⬇️ تصدير CSV</button><button class="btn ghost" data-act="famAdd">+ تسجيل أسرة</button>`)}
    <div class="row" style="margin-bottom:12px"><div class="tabs" style="margin:0">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="peopleTab" data-id="${k}">${l}</button>`).join('')}</div><input class="input" style="max-width:260px;margin:0" id="peopleQ" placeholder="بحث بالاسم أو المدرسة أو المستخدم" value="${E(q)}" aria-label="بحث"></div>
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>الاسم</th><th>النوع</th><th>المستخدم</th><th>التفاصيل</th><th>الارتباط</th><th>التسجيل</th><th></th></tr></thead><tbody>
    ${rows.map((r) => `<tr style="${r.a && !r.a.active ? 'opacity:.55' : ''}"><td><b>${r.s?.avatar || ''} ${E(r.name)}</b></td><td><span class="chip ${r.type === 'ولي أمر' ? '' : 'ok'}">${E(r.type)}</span></td><td>${r.a ? `<span class="cred">${E(r.a.username)}</span>` : '—'}</td>
      <td class="small">${r.s ? E([r.s.grade && 'الصف ' + r.s.grade, r.s.age && r.s.age + ' سنة', r.s.school].filter(Boolean).join(' · ')) + (goalsText(r.s) ? `<br><span class="muted">🎯 ${E(goalsText(r.s))}</span>` : '') : `${E(r.rel || '')}${r.a?.phone ? ` · <span dir="ltr">${E(r.a.phone)}</span>` : ''}`}</td>
      <td class="small">${r.type === 'ولي أمر' ? (r.kids ? 'أبناؤه: ' + E(r.kids) : '—') : (r.linked ? 'ولي الأمر: ' + E(r.linked) : `<span class="muted">غير مرتبط${r.a?.linkCode ? ' · رمز ' + E(r.a.linkCode) : ''}</span>`)}</td>
      <td class="small">${dt(r.a?.createdAt || r.s?.createdAt)}${r.a?.lastLogin ? `<br><span class="muted">آخر دخول ${dt(r.a.lastLogin)}</span>` : ''}</td>
      <td>${r.a ? `<div class="row" style="flex-wrap:nowrap"><button class="btn sm ghost" data-act="accPin" data-id="${r.a.id}">إعادة الرقم</button><button class="btn sm ghost" data-act="accToggle" data-id="${r.a.id}">${r.a.active ? 'تعطيل' : 'تفعيل'}</button></div>` : ''}</td></tr>`).join('') || `<tr><td colspan="7">${N.empty('🗂️', 'لا يوجد مسجلون بعد')}</td></tr>`}
    </tbody></table></div></div>`;
  };
  A.peopleTab = ({ id }) => { N.ui.peopleTab = id; N.render(); };
  document.addEventListener('input', (e) => { if (e.target.id === 'peopleQ') { N.ui.peopleQ = e.target.value; clearTimeout(A._qt); A._qt = setTimeout(() => { N.render(); const i = document.getElementById('peopleQ'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } });
  A.peopleCsv = () => N.download(`nafes-registrations-${N.today()}.csv`, N.toCSV([['النوع', 'الاسم', 'اسم المستخدم', 'صفة القرابة', 'الجوال', 'الصف', 'العمر', 'المدرسة', 'الأهداف', 'مرتبط مع', 'رمز الربط', 'تاريخ التسجيل', 'آخر دخول', 'الحالة'],
    ...peopleRows().map((r) => [r.type, r.name, r.a?.username, r.rel, r.a?.phone, r.s?.grade, r.s?.age, r.s?.school, r.s ? goalsText(r.s) : '', r.type === 'ولي أمر' ? r.kids : r.linked, r.a?.linkCode, r.a?.createdAt || r.s?.createdAt, r.a?.lastLogin, r.a ? (r.a.active ? 'نشط' : 'معطّل') : '—'])]));
  A.accPin = ({ id }) => { const a = N.db.accounts.find((x) => x.id === id); N.confirm(`إعادة تعيين الرقم السري لـ ${a.name}؟`, () => admin('reset_pin', { id }).then((r) => N.modal({ title: 'الرقم السري الجديد', body: `<p>${E(a.name)} — <span class="cred">${E(a.username)}</span></p><b class="cred big">${E(r.pin)}</b>`, submit: 'تم', onSubmit: () => {} })).catch((e) => N.toast(e.message))); };
  A.accToggle = ({ id }) => admin('toggle', { id }).then(() => refresh('تم')).catch((e) => N.toast(e.message));

  /* ===== الأسر ===== */
  V.aFamilies = () => {
    const fams = [...new Set([...N.db.accounts.map((a) => a.familyId), ...N.db.students.map((s) => s.familyId)].filter(Boolean))];
    return `${header('الأسر', `<button class="btn" data-act="famAdd">+ تسجيل أسرة</button>`)}
    ${fams.map((fid) => { const pars = N.parentsOf(fid), kids = N.db.students.filter((s) => s.familyId === fid); return `<div class="card" style="margin-bottom:14px"><div class="row between"><h3>${pars.length ? '👨‍👩‍👧 ' + E(parentNames(fid)) : '🧒 طالب مستقل (بلا ولي أمر)'}</h3><button class="btn sm red" data-act="famDel" data-id="${fid}">حذف الأسرة</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>الطالب</th><th>الصف</th><th>المدرسة</th><th>الاجتهاد</th><th>الدخول</th><th></th></tr></thead><tbody>${kids.map((s) => { const ix = N.index(s.id), ac = N.accountOf(s.id); return `<tr><td>${s.avatar} ${E(s.name)} ${s.active ? '' : '<span class="chip bad">معطّل</span>'}</td><td>${E(s.grade)}</td><td>${E(s.school || '')}</td><td>${ix.score}% ${ix.level.icon}</td><td>${ac ? `<span class="cred">${E(ac.username)}</span>` : '—'}</td><td class="row"><button class="btn sm ghost" data-act="stEdit" data-id="${s.id}">تعديل</button><button class="btn sm ghost" data-act="stToggle" data-id="${s.id}">${s.active ? 'إخفاء' : 'إظهار'}</button></td></tr>`; }).join('')}</tbody></table></div></div>`; }).join('') || `<div class="card">${N.empty('👪', 'لا توجد أسر بعد')}</div>`}`;
  };
  const gradeOpts = N.GRADES.map((g) => [g, g]);
  A.famAdd = () => N.modal({
    title: 'تسجيل أسرة جديدة', body: '<p class="muted small">يُنشأ لولي الأمر اسم مستخدم ورقم سري تلقائيًا لتسليمه له.</p>',
    fields: [{ name: 'name', label: 'اسم ولي الأمر' }, { name: 'relationship', label: 'صفة القرابة', type: 'select', options: N.RELATIONS.map((r) => [r, r]) }, { name: 'phone', label: 'الجوال (اختياري)', required: false, dir: 'ltr' }, { name: 'cname', label: 'اسم الطالب' }, { name: 'cage', label: 'عمر الطالب', type: 'number', min: 5, max: 19, value: 10 }, { name: 'cgrade', label: 'الصف', type: 'select', options: gradeOpts, value: 'الرابع' }, { name: 'cschool', label: 'المدرسة', required: false }, { name: 'cgoal', label: 'أهم هدف', type: 'select', options: N.GOAL_OPTIONS.map((o) => [o.k, `${o.icon} ${o.label}`]) }],
    onSubmit: (d) => { admin('create_parent', { name: d.name, relationship: d.relationship, phone: d.phone, child: { name: d.cname, age: d.cage, grade: d.cgrade, school: d.cschool, goals: [d.cgoal] } }).then(async (r) => { await refresh(); N.modal({ title: 'تم تسجيل الأسرة 🎉', body: `<p>سلّم ولي الأمر بيانات الدخول:</p><div class="cred-box"><span class="muted small">اسم المستخدم</span><b class="cred big">${E(r.username)}</b></div><div class="cred-box"><span class="muted small">الرقم السري</span><b class="cred big">${E(r.pin)}</b></div><p class="small muted">تُبنى خطة الطالب عند أول دخول لولي الأمر.</p>`, submit: 'تم', onSubmit: () => {} }); }).catch((e) => N.toast(e.message)); },
  });
  A.famDel = ({ id }) => N.confirm('حذف الأسرة وإيقاف حساباتها؟ (يمكن استرجاعها من قاعدة البيانات عند الحاجة)', () => admin('delete_family', { id }).then(() => refresh('تم حذف الأسرة')).catch((e) => N.toast(e.message)));
  const stFields = (s = {}) => [{ name: 'name', label: 'اسم الطالب', value: s.name }, { name: 'grade', label: 'الصف', type: 'select', options: gradeOpts, value: s.grade || 'الرابع' }, { name: 'age', label: 'العمر', type: 'number', min: 5, max: 19, value: s.age || 10 }, { name: 'school', label: 'المدرسة', value: s.school, required: false }, { name: 'targetMin', label: 'هدف المذاكرة اليومي (دقيقة)', type: 'number', value: s.targetMin || 45, min: 10, max: 300 }];
  A.stEdit = ({ id }) => { const s = N.student(id); N.modal({ title: 'تعديل الطالب', fields: stFields(s), onSubmit: (d) => { Object.assign(s, { name: d.name.trim(), grade: d.grade, age: +d.age, school: d.school.trim(), targetMin: +d.targetMin }); N.save(); N.render(); } }); };
  A.stToggle = ({ id }) => { const s = N.student(id); s.active = !s.active; N.save(); N.render(); };

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


  /* ===== التقارير ===== */
  const repRows = () => allKids().map((s) => { const ix = N.index(s.id), st = N.stats(s.id), pt = N.points(s.id); return { s, ix, st, pt }; });
  V.aReports = () => `${header('استخراج التقارير', `<button class="btn" data-act="csv">⬇️ تصدير CSV</button>`)}
    <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>الطالب</th><th>ولي الأمر</th><th>الاجتهاد</th><th>السلسلة</th><th>النقاط</th><th></th></tr></thead><tbody>${repRows().map((r) => `<tr><td>${r.s.avatar} ${E(r.s.name)}</td><td>${E(parentNames(r.s.familyId) || '—')}</td><td>${r.ix.score}% ${r.ix.level.icon}</td><td>${r.st.streak}</td><td>${r.pt.total}</td><td><button class="btn sm ghost" data-act="aRep" data-id="${r.s.id}">التقرير</button></td></tr>`).join('') || `<tr><td colspan="6">${N.empty('📊', 'لا توجد بيانات بعد')}</td></tr>`}</tbody></table></div></div>`;
  V.aReport = () => `<div class="no-print"><a class="btn sm ghost" href="#/a/reports">→ رجوع</a></div>` + V.report();
  A.aRep = ({ id }) => { N.session.studentId = id; location.hash = '#/a/report'; };
  A.csv = () => N.download(`nafes-report-${N.today()}.csv`, N.toCSV([['الطالب', 'الصف', 'المدرسة', 'ولي الأمر', 'مؤشر الاجتهاد %', 'المستوى', 'السلسلة', 'المهام المنجزة', 'دقائق المذاكرة', 'النقاط'], ...repRows().map((r) => [r.s.name, r.s.grade, r.s.school, parentNames(r.s.familyId), r.ix.score, r.ix.level.name, r.st.streak, r.st.doneCount, r.st.minutes, r.pt.total])]));
})();

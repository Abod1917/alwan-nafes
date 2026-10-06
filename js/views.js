/* نافس باجتهاد — صفحات ولي الأمر والطالب */
(function () {
  const N = window.N, E = N.esc, A = N.A;
  N.ui = { taskTab: 'today', calMonth: N.today().slice(0, 7) + '-01', calSel: N.today(), tipCat: 'الكل' };
  const V = (N.V = {});
  const header = (title, actions = '') => `<div class="page-h"><h1>${title}</h1><div class="row">${actions}</div></div>`;
  const cur = () => N.student(N.session.studentId);

  /* ===== لوحة الطالب ===== */
  V.sDash = () => {
    const s = cur(), ix = N.index(s.id), st = N.streak(s.id), pt = N.points(s.id), t = N.today();
    const today = N.db.tasks.filter((x) => x.studentId === s.id && x.date === t);
    const next = N.db.exams.filter((e) => e.studentId === s.id && e.date >= t).sort((a, b) => a.date.localeCompare(b.date))[0];
    return `${header(`أهلًا ${E(s.name)} ${s.avatar}`, `<button class="btn" data-act="logStudy">⏱️ سجّل مذاكرتي</button>`)}
    <div class="card hero">${N.gauge(ix.score, ix.level)}<div><h2>مؤشر اجتهادي هذا الأسبوع</h2><p class="muted">${ix.level.msg}</p><div class="row"><span class="chip">🔥 سلسلة ${N.days(st)}</span><span class="chip">⭐ ${pt.total} نقطة · ${pt.level.name}</span></div><div style="margin-top:12px">${N.dots(s.id)}</div></div></div>
    ${next ? `<div class="card" style="margin-top:16px"><b>📝 اختبار ${E(next.subject)} بعد ${N.days(N.diffDays(next.date, t))}</b> <span class="muted">— خطتك جاهزة في المهام</span></div>` : ''}
    <div class="card"><div class="row between"><h2>مهام اليوم</h2><button class="btn sm ghost" data-act="addTask">+ مهمة</button></div>${today.length ? today.map((x) => N.taskRow(x, { canDel: false })).join('') : N.empty('🎈', 'ما عندك مهام اليوم، استمتع بوقتك!')}</div>`;
  };

  /* ===== لوحة ولي الأمر ===== */
  V.pDash = () => {
    const kids = N.childrenOf(N.session.familyId), t = N.today();
    const s = cur(), ix = N.index(s.id), r = N.report(s.id);
    const late = N.db.tasks.filter((x) => x.studentId === s.id && !x.done && x.date < t).length;
    const upcoming = N.db.exams.filter((e) => e.studentId === s.id && e.date >= t).sort((a, b) => a.date.localeCompare(b.date));
    return `${header(`لوحة ولي الأمر`, `<button class="btn ghost" data-act="addExam">📝 اختبار جديد</button><button class="btn" data-act="addTask">+ مهمة</button>`)}
    <div class="grid g3" style="margin-bottom:16px">${kids.map((k) => { const i = N.index(k.id); return `<button class="card ${k.id === s.id ? '' : ''}" style="text-align:start;cursor:pointer;${k.id === s.id ? 'border:2px solid var(--primary)' : ''}" data-act="pick" data-id="${k.id}"><div class="row"><span style="font-size:2rem">${k.avatar}</span><div><b>${E(k.name)}</b><div class="muted small">الصف ${E(k.grade)}</div></div></div><div style="margin-top:8px"><b>${i.score}%</b> <span class="lvl ${i.level.cls}">${i.level.icon} ${i.level.name}</span></div></button>`; }).join('')}</div>
    <div class="card hero">${N.gauge(ix.score, ix.level)}<div><h2>${E(s.name)} — هذا الأسبوع</h2><div class="row"><span class="chip ${r.delta >= 0 ? 'ok' : 'bad'}">${r.delta >= 0 ? '▲' : '▼'} ${Math.abs(r.delta)} عن الأسبوع الماضي</span><span class="chip">🔥 ${N.days(r.streak)}</span><span class="chip">✅ ${r.tasksDone}/${r.tasksTotal} مهمة</span><span class="chip">⏱️ ${r.minutes} دقيقة</span>${late ? `<span class="chip bad">${late} مهام متأخرة</span>` : ''}</div><div class="note n3" style="margin-top:12px">💡 ${E(r.notes.advice)}</div><a class="btn sm" href="#/p/report">عرض التقرير الأسبوعي</a></div></div>
    <div class="grid g2"><div class="card"><h2>مكوّنات المؤشر</h2>${N.parts(ix.parts)}</div><div class="card"><h2>الاختبارات القادمة</h2>${upcoming.length ? upcoming.map((e) => `<div class="task"><div class="tt"><b>${E(e.subject)}</b><small class="muted">${N.dateLong(e.date)} · بعد ${N.days(N.diffDays(e.date, t))}${e.topics ? '<br>' + E(e.topics) : ''}</small></div><button class="icon-btn" data-act="delExam" data-id="${e.id}" aria-label="حذف الاختبار">🗑️</button></div>`).join('') : N.empty('📝', 'لا توجد اختبارات قادمة')}</div></div>`;
  };
  A.pick = ({ id }) => { N.session.studentId = id; N.persistSession(); N.render(); };
  A.addTask = () => N.addTask(N.session.studentId, N.today(), N.render);
  A.addExam = () => N.addExam(N.session.studentId, N.render);
  A.logStudy = () => N.logStudy(N.session.studentId, N.render);
  A.delExam = ({ id }) => N.confirm('حذف الاختبار وجلسات المذاكرة غير المنجزة؟', () => { N.db.exams = N.db.exams.filter((e) => e.id !== id); N.db.tasks = N.db.tasks.filter((t) => !(t.examId === id && !t.done)); N.save(); N.render(); });

  /* ===== المهام ===== */
  V.tasks = () => {
    const s = cur(), t = N.today(), tab = N.ui.taskTab, all = N.db.tasks.filter((x) => x.studentId === s.id);
    const f = { today: (x) => x.date === t, upcoming: (x) => x.date > t && !x.done, late: (x) => x.date < t && !x.done, done: (x) => x.done }[tab];
    const list = all.filter(f).sort((a, b) => (tab === 'done' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
    const tabs = [['today', 'اليوم'], ['upcoming', 'القادمة'], ['late', 'المتأخرة'], ['done', 'المنجزة']];
    return `${header(`مهام ${E(s.name)}`, `<button class="btn" data-act="addTask">+ مهمة جديدة</button>`)}
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="taskTab" data-id="${k}" role="tab" aria-selected="${tab === k}">${l} (${all.filter({ today: (x) => x.date === t, upcoming: (x) => x.date > t && !x.done, late: (x) => x.date < t && !x.done, done: (x) => x.done }[k]).length})</button>`).join('')}</div>
    <div class="card">${list.length ? list.slice(0, 60).map((x) => N.taskRow(x)).join('') : N.empty('🗂️', 'لا توجد مهام هنا')}</div>`;
  };
  A.taskTab = ({ id }) => { N.ui.taskTab = id; N.render(); };

  /* ===== التقويم ===== */
  V.calendar = () => {
    const s = cur(), m = N.ui.calMonth, first = N.parse(m), t = N.today();
    const startOffset = (first.getDay() + 1) % 7; // السبت أول الأسبوع
    const days = []; for (let i = -startOffset; i < 42 - startOffset; i++) days.push(N.addDays(m, i));
    const tasks = N.db.tasks.filter((x) => x.studentId === s.id), exams = N.db.exams.filter((x) => x.studentId === s.id);
    const hd = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const sel = N.ui.calSel, dt = tasks.filter((x) => x.date === sel), de = exams.filter((x) => x.date === sel);
    return `${header('التقويم', `<button class="icon-btn" data-act="calNav" data-id="-1" aria-label="الشهر السابق">›</button><b>${N.monthName(m)}</b><button class="icon-btn" data-act="calNav" data-id="1" aria-label="الشهر التالي">‹</button>`)}
    <div class="card"><div class="cal">${hd.map((h) => `<div class="h">${h}</div>`).join('')}${days.map((d) => {
      const nt = tasks.filter((x) => x.date === d), ne = exams.some((x) => x.date === d);
      return `<button class="${d.slice(0, 7) !== m.slice(0, 7) ? 'out' : ''} ${d === t ? 'today' : ''} ${d === sel ? 'sel' : ''}" data-act="calSel" data-id="${d}" aria-label="${N.dateLong(d)}">${+d.slice(8)}<span class="pip">${ne ? '<i class="e"></i>' : ''}${nt.some((x) => !x.done) ? '<i></i>' : ''}${nt.some((x) => x.done) ? '<i class="d"></i>' : ''}</span></button>`;
    }).join('')}</div><p class="muted small">🔵 مهام · 🔴 اختبار · 🟢 منجزة</p></div>
    <div class="card"><div class="row between"><h2>${N.dateLong(sel)}</h2><button class="btn sm ghost" data-act="calAdd">+ مهمة</button></div>${de.map((e) => `<div class="note n2">📝 اختبار ${E(e.subject)}${e.topics ? ' — ' + E(e.topics) : ''}</div>`).join('')}${dt.length ? dt.map((x) => N.taskRow(x)).join('') : (de.length ? '' : N.empty('📅', 'لا شيء في هذا اليوم'))}</div>`;
  };
  A.calNav = ({ id }) => { const d = N.parse(N.ui.calMonth); d.setMonth(d.getMonth() + +id); N.ui.calMonth = N.fmt(d); N.render(); };
  A.calSel = ({ id }) => { N.ui.calSel = id; N.render(); };
  A.calAdd = () => N.addTask(N.session.studentId, N.ui.calSel, N.render);

  /* ===== الأهداف ===== */
  V.goals = () => {
    const s = cur(), gs = N.db.goals.filter((g) => g.studentId === s.id);
    return `${header('أهدافي', `<button class="btn" data-act="addGoal">+ هدف جديد</button>`)}
    ${gs.length ? gs.map((g) => { const p = Math.min(100, Math.round((g.progress / g.target) * 100)), done = g.progress >= g.target; return `<div class="card" style="margin-bottom:12px"><div class="row between"><h3>${done ? '🏅 ' : '🎯 '}${E(g.title)}</h3><span class="chip ${done ? 'ok' : ''}">${done ? 'تحقق!' : 'حتى ' + N.dateShort(g.due)}</span></div><div class="bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div><div class="row between" style="margin-top:10px"><span>${g.progress} / ${g.target} (${p}%)</span><span class="row"><button class="icon-btn" data-act="goalStep" data-id="${g.id}" data-n="-1" aria-label="إنقاص">−</button><button class="icon-btn" data-act="goalStep" data-id="${g.id}" data-n="1" aria-label="زيادة">+</button><button class="icon-btn" data-act="delGoal" data-id="${g.id}" aria-label="حذف الهدف">🗑️</button></span></div></div>`; }).join('') : `<div class="card">${N.empty('🎯', 'ضع أول هدف لك وابدأ التقدم نحوه')}</div>`}`;
  };
  A.addGoal = () => N.addGoal(N.session.studentId, N.render);
  A.goalStep = ({ id, n }) => { const g = N.db.goals.find((x) => x.id === id); const was = g.progress >= g.target; g.progress = Math.max(0, g.progress + +n); N.save(); if (!was && g.progress >= g.target) N.toast('🏅 حققت هدفك! +50 نقطة'); N.render(); };
  A.delGoal = ({ id }) => N.confirm('حذف الهدف؟', () => { N.db.goals = N.db.goals.filter((g) => g.id !== id); N.save(); N.render(); });

  /* ===== اتفاق الهمة ===== */
  V.agreement = () => {
    const s = cur(), isP = N.session.role === 'parent';
    const ag = N.db.agreements[s.id] || (N.db.agreements[s.id] = JSON.parse(JSON.stringify(N.DEFAULT_AGREEMENT)));
    const list = (k, title, icon) => `<div class="card"><h2>${icon} ${title}</h2><ul style="padding-inline-start:20px;margin:0">${ag[k].map((x, i) => `<li style="margin:6px 0">${E(x)} ${isP ? `<button class="icon-btn" style="min-height:32px;min-width:32px" data-act="agDel" data-k="${k}" data-i="${i}" aria-label="حذف البند">✕</button>` : ''}</li>`).join('')}</ul>${isP ? `<button class="btn sm ghost" data-act="agAdd" data-k="${k}" style="margin-top:8px">+ بند</button>` : ''}</div>`;
    const sig = (k, label) => `<div class="card center"><b>${label}</b><p>${ag[k] ? `✍️ وقّع بتاريخ ${N.dateShort(ag[k])}` : 'لم يوقّع بعد'}</p>${(k === 'signedParent') === isP ? `<button class="btn sm ${ag[k] ? 'ghost' : ''}" data-act="agSign" data-k="${k}">${ag[k] ? 'إلغاء التوقيع' : 'أوافق وأوقّع'}</button>` : ''}</div>`;
    return `${header(`اتفاق الهمة — ${E(s.name)}`)}<p class="muted">اتفاق ودّي بين الطالب وأسرته: التزامات واضحة من الطرفين ومكافأة يتشارك فرحتها الجميع.</p>
    <div class="grid g2">${list('student', 'التزاماتي أنا الطالب', '🧒')}${list('parent', 'التزامات ولي الأمر', '👨‍👩‍👧')}</div>
    <div class="card"><h2>🎁 المكافأة المتفق عليها</h2><p>${E(ag.reward)}</p>${isP ? `<button class="btn sm ghost" data-act="agReward">تعديل المكافأة</button>` : ''}</div>
    <div class="grid g2" style="margin-top:16px">${sig('signedStudent', 'توقيع الطالب')}${sig('signedParent', 'توقيع ولي الأمر')}</div>`;
  };
  const AG = () => N.db.agreements[N.session.studentId];
  A.agSign = ({ k }) => { AG()[k] = AG()[k] ? null : N.today(); N.save(); N.render(); };
  A.agDel = ({ k, i }) => { AG()[k].splice(+i, 1); N.save(); N.render(); };
  A.agAdd = ({ k }) => N.modal({ title: 'بند جديد', fields: [{ name: 'text', label: 'نص البند' }], onSubmit: (d) => { AG()[k].push(d.text.trim()); N.save(); N.render(); } });
  A.agReward = () => N.modal({ title: 'المكافأة', fields: [{ name: 'text', label: 'المكافأة', value: AG().reward }], onSubmit: (d) => { AG().reward = d.text.trim(); N.save(); N.render(); } });

  /* ===== التحديات ===== */
  V.challenges = () => {
    const s = cur(), t = N.today();
    return `${header('التحديات')}<div class="grid g2">${N.db.challenges.filter((c) => c.active).map((c) => {
      const p = N.db.participations.find((x) => x.studentId === s.id && x.challengeId === c.id), n = p ? p.days.length : 0, pct = Math.round((n / c.days) * 100), doneToday = p?.days.includes(t);
      return `<div class="card"><h3>🏁 ${E(c.title)}</h3><p class="muted">${E(c.desc)}</p><div class="bar"><i style="width:${Math.min(100, pct)}%"></i></div><div class="row between" style="margin-top:10px"><span>${n} / ${c.days} يوم</span>${!p ? `<button class="btn sm" data-act="chJoin" data-id="${c.id}">انضم للتحدي</button>` : p.completed ? '<span class="chip ok">🏆 أكملته</span>' : `<button class="btn sm" data-act="chCheck" data-id="${c.id}" ${doneToday ? 'disabled' : ''}>${doneToday ? 'سجّلت اليوم ✓' : 'سجّل إنجاز اليوم'}</button>`}</div></div>`;
    }).join('') || '<div class="card">' + N.empty('🏁', 'لا توجد تحديات حاليًا') + '</div>'}</div>`;
  };
  A.chJoin = ({ id }) => { N.db.participations.push({ id: N.uid(), studentId: N.session.studentId, challengeId: id, days: [], completed: false }); N.save(); N.toast('بالتوفيق في التحدي! 💪'); N.render(); };
  A.chCheck = ({ id }) => {
    const sid = N.session.studentId, p = N.db.participations.find((x) => x.studentId === sid && x.challengeId === id), c = N.db.challenges.find((x) => x.id === id), t = N.today();
    if (p.days.includes(t)) return; p.days.push(t);
    if (p.days.length >= c.days) { p.completed = true; N.toast(`🏆 أكملت «${c.title}»!`); } else N.toast('يوم جديد في التحدي! +15 نقطة ✨');
    N.save(); N.render();
  };

  /* ===== الإنجازات والنقاط ===== */
  V.achievements = () => {
    const s = cur(), pt = N.points(s.id), bs = N.badges(s.id), st = N.stats(s.id);
    return `${header('الإنجازات والنقاط')}
    <div class="card"><div class="stripe"></div><div class="row between"><div><h2>⭐ ${pt.total} نقطة</h2><b>المستوى: ${pt.level.name}</b></div>${pt.next ? `<span class="muted">باقي ${pt.next.min - pt.total} نقطة لمستوى «${pt.next.name}»</span>` : '<span class="chip ok">أعلى مستوى!</span>'}</div><div class="bar" style="margin-top:10px"><i style="width:${pt.pct}%"></i></div>
    <div class="row" style="margin-top:12px">${N.POINT_LEVELS.map((l) => `<span class="chip ${pt.total >= l.min ? 'ok' : ''}">${l.name}</span>`).join('')}</div></div>
    <div class="grid g3"><div class="card stat"><b>🔥 ${st.streak}</b><span>سلسلة حالية</span></div><div class="card stat"><b>🏅 ${st.best}</b><span>أطول سلسلة</span></div><div class="card stat"><b>✅ ${st.doneCount}</b><span>مهمة منجزة</span></div></div>
    <div class="card"><h2>الأوسمة (${bs.filter((b) => b.earned).length}/${bs.length})</h2><div class="grid g3">${bs.map((b) => `<div class="badge ${b.earned ? '' : 'off'}"><span class="i">${b.icon}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join('')}</div></div>
    <div class="card"><h2>من أين جاءت نقاطي؟</h2>${pt.rows.map((r) => `<div class="row between task"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div>`;
  };

  /* ===== التقرير الأسبوعي ===== */
  V.report = () => {
    const s = cur(), r = N.report(s.id), fam = N.family(s.familyId);
    return `${header('التقرير الأسبوعي', `<button class="btn" data-act="print">🖨️ حفظ PDF / طباعة</button><button class="btn wa" data-act="wa">مشاركة واتساب</button>`)}
    <div class="sheet"><div class="sheet-h">${N.logo('nafes')}<div style="text-align:end">${N.logo('alwan')}</div></div><div class="stripe"></div>
    <h2>تقرير الاجتهاد الأسبوعي — ${E(s.name)}</h2><p class="muted">الصف ${E(s.grade)} · من ${N.dateLong(r.start)} إلى ${N.dateLong(r.end)}</p>
    <div class="hero" style="margin:14px 0">${N.gauge(r.cur.score, r.cur.level)}<div class="grid g2"><div class="stat"><b>${r.tasksDone}/${r.tasksTotal}</b><span>مهام منجزة</span></div><div class="stat"><b>${r.minutes}</b><span>دقيقة مذاكرة</span></div><div class="stat"><b>${r.streak}</b><span>${r.streak === 1 ? 'يوم' : 'أيام'} سلسلة</span></div><div class="stat"><b>${r.delta >= 0 ? '▲' : '▼'} ${Math.abs(r.delta)}</b><span>عن الأسبوع الماضي</span></div></div></div>
    <h3>تفاصيل المؤشر</h3>${N.parts(r.cur.parts)}
    <div class="note n3"><b>⭐ أبرز تحسّن:</b> ${E(r.notes.improved)}</div><div class="note n2"><b>🤝 يحتاج دعمًا:</b> ${E(r.notes.support)}</div><div class="note"><b>💡 توصية:</b> ${E(r.notes.advice)}</div>
    <p class="muted small center" style="margin-top:16px">نافس بهمتك — أكاديمية ألوان${fam ? ' · ' + E(fam.name) : ''}</p></div>`;
  };
  A.print = () => window.print();
  A.wa = () => {
    const s = cur(), r = N.report(s.id), fam = N.family(s.familyId);
    const txt = `📊 تقرير نافس الأسبوعي — ${s.name}\nمؤشر الاجتهاد: ${r.cur.score}% ${r.cur.level.icon} ${r.cur.level.name}\n✅ المهام: ${r.tasksDone}/${r.tasksTotal}\n⏱️ المذاكرة: ${r.minutes} دقيقة\n🔥 السلسلة: ${r.streak} يوم\n\n⭐ ${r.notes.improved}\n🤝 ${r.notes.support}\n💡 ${r.notes.advice}\n\nأكاديمية ألوان — نافس بهمتك`;
    window.open(`https://wa.me/${(fam?.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
  };

  /* ===== معك في التربية ===== */
  V.parenting = () => {
    const s = cur(), r = N.report(s.id), cats = ['الكل', ...new Set(N.db.content.map((c) => c.category))], cat = N.ui.tipCat;
    return `${header('معك في التربية')}
    <div class="card"><div class="stripe"></div><h2>توصية هذا الأسبوع لـ ${E(s.name)}</h2><p>جانب «${r.weakest.label}» يحتاج دعمًا (${r.weakest.value}%).</p><div class="note n3">💡 ${E(r.weakest.tip)}</div></div>
    <div class="tabs" style="margin-top:16px">${cats.map((c) => `<button class="${cat === c ? 'on' : ''}" data-act="tipCat" data-id="${E(c)}">${E(c)}</button>`).join('')}</div>
    <div class="grid g2">${N.db.content.filter((c) => cat === 'الكل' || c.category === cat).map((c) => `<div class="card"><span class="chip">${E(c.category)}</span><h3 style="margin-top:8px">${E(c.title)}</h3><p class="muted" style="margin:0">${E(c.body)}</p></div>`).join('')}</div>`;
  };
  A.tipCat = ({ id }) => { N.ui.tipCat = id; N.render(); };
})();

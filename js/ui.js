/* نافس باجتهاد — أدوات الواجهة: نوافذ، إشعارات، مكوّنات مشتركة */
(function () {
  const N = window.N, E = N.esc;
  N.A = {}; // الإجراءات: data-act

  N.toast = (msg) => {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  };

  N.logo = (kind, cls = '') => `<img class="logo-l ${cls}" src="assets/${kind}-logo.png" alt="شعار ${kind === 'nafes' ? 'نافس بهمتك' : 'أكاديمية ألوان'}"><img class="logo-d ${cls}" src="assets/${kind}-logo-dark.png" alt="" aria-hidden="true">`;

  /* نافذة نموذج عامة */
  N.modal = ({ title, fields = [], submit = 'حفظ', body = '', onSubmit }) => {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    const inputs = fields.map((f) => {
      const v = f.value ?? '', req = f.required === false ? '' : 'required';
      let el;
      if (f.type === 'select') el = `<select name="${f.name}">${f.options.map(([val, lab]) => `<option value="${E(val)}" ${String(val) === String(v) ? 'selected' : ''}>${E(lab)}</option>`).join('')}</select>`;
      else if (f.type === 'textarea') el = `<textarea name="${f.name}" ${req}>${E(v)}</textarea>`;
      else el = `<input name="${f.name}" type="${f.type || 'text'}" value="${E(v)}" ${req} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.dir ? `dir="${f.dir}"` : ''} inputmode="${f.type === 'number' ? 'numeric' : 'text'}">`;
      return `<label class="f">${E(f.label)}${el}</label>`;
    }).join('');
    bg.innerHTML = `<form class="modal" role="dialog" aria-modal="true" aria-label="${E(title)}"><h2>${E(title)}</h2>${body}${inputs}<div class="row" style="margin-top:8px"><button class="btn" type="submit">${E(submit)}</button><button class="btn ghost" type="button" data-close>إلغاء</button></div></form>`;
    const close = () => { bg.remove(); document.removeEventListener('keydown', esc); };
    const esc = (e) => { if (e.key === 'Escape') close(); };
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.hasAttribute('data-close')) close(); });
    bg.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      if (onSubmit(data) !== false) close();
    });
    document.addEventListener('keydown', esc);
    document.body.appendChild(bg);
    bg.querySelector('input,select,textarea')?.focus();
  };
  N.confirm = (msg, yes) => N.modal({ title: 'تأكيد', body: `<p>${E(msg)}</p>`, submit: 'نعم، تأكيد', onSubmit: () => { yes(); } });

  /* مكوّنات */
  N.gauge = (score, level) => {
    const R = 74, C = 2 * Math.PI * R, off = C * (1 - score / 100);
    const col = score >= 85 ? 'var(--primary)' : score >= 65 ? '#e8731f' : score >= 40 ? 'var(--warn)' : 'var(--ok)';
    return `<div class="gauge" role="img" aria-label="مؤشر الاجتهاد ${score}%"><svg width="168" height="168" viewBox="0 0 168 168"><circle cx="84" cy="84" r="${R}" fill="none" stroke="var(--soft)" stroke-width="14"/><circle cx="84" cy="84" r="${R}" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}"/></svg><div class="t"><b>${score}%</b><span>${level.icon} ${level.name}</span></div></div>`;
  };
  N.parts = (parts) => parts.map((p) => `<div class="part"><span>${p.icon} ${p.label} <small class="muted">(${p.w}%)</small></span><b>${p.value}%</b><div class="bar" role="presentation"><i style="width:${p.value}%"></i></div></div>`).join('');
  N.dots = (sid) => `<div class="dots" aria-label="آخر 7 أيام">${N.weekDots(sid).map((x) => `<i class="${x.on ? 'on' : ''} ${x.today ? 'today' : ''}" title="${N.dateShort(x.d)}">${x.on ? '🔥' : ''}</i>`).join('')}</div>`;
  N.taskRow = (t, { who = false, canDel = true } = {}) => {
    const late = !t.done && t.date < N.today();
    return `<div class="task ${t.done ? 'done' : ''}"><button class="chk" data-act="toggleTask" data-id="${t.id}" aria-label="${t.done ? 'إلغاء الإنجاز' : 'تم الإنجاز'}: ${E(t.title)}">${t.done ? '✓' : ''}</button><div class="tt"><b>${E(t.title)}</b><small class="muted">${who ? E(N.student(t.studentId)?.name) + ' · ' : ''}${E(t.subject)} · ${N.dateShort(t.date)}${t.minutes ? ' · ' + t.minutes + ' د' : ''}${t.type === 'study' ? ' · خطة مذاكرة' : ''}</small></div>${late ? '<span class="chip bad">متأخرة</span>' : ''}${canDel ? `<button class="icon-btn" data-act="delTask" data-id="${t.id}" aria-label="حذف المهمة">🗑️</button>` : ''}</div>`;
  };
  N.empty = (icon, text) => `<div class="empty"><div style="font-size:2.4rem">${icon}</div>${E(text)}</div>`;

  /* حوارات الإضافة المشتركة */
  const subjOpts = N.SUBJECTS.map((s) => [s, s]);
  N.addTask = (sid, date = N.today(), after) => N.modal({
    title: 'مهمة جديدة',
    fields: [{ name: 'title', label: 'عنوان المهمة' }, { name: 'subject', label: 'المادة', type: 'select', options: subjOpts }, { name: 'date', label: 'تاريخ التسليم', type: 'date', value: date }, { name: 'minutes', label: 'الوقت المتوقع (دقيقة)', type: 'number', value: 30, min: 5, max: 240 }],
    onSubmit: (d) => { N.db.tasks.push({ id: N.uid(), studentId: sid, title: d.title.trim(), subject: d.subject, date: d.date, type: 'homework', minutes: +d.minutes, done: false, doneOn: null }); N.save(); N.toast('تمت إضافة المهمة ✅'); after?.(); },
  });
  N.addExam = (sid, after) => N.modal({
    title: 'اختبار جديد (تُنشأ خطة مذاكرة تلقائيًا)',
    fields: [{ name: 'subject', label: 'المادة', type: 'select', options: subjOpts }, { name: 'date', label: 'تاريخ الاختبار', type: 'date', value: N.addDays(N.today(), 5), min: N.today() }, { name: 'topics', label: 'الموضوعات (افصل بينها بفاصلة)', type: 'textarea', required: false }],
    onSubmit: (d) => { const ex = { id: N.uid(), studentId: sid, subject: d.subject, date: d.date, topics: d.topics }; N.db.exams.push(ex); const n = N.generatePlan(ex); N.save(); N.toast(n ? `تم إنشاء خطة مذاكرة من ${n} ${n > 2 ? 'جلسات' : 'جلسة'} 📚` : 'تمت إضافة الاختبار'); after?.(); },
  });
  N.logStudy = (sid, after) => N.modal({
    title: 'تسجيل وقت المذاكرة',
    fields: [{ name: 'minutes', label: 'كم دقيقة ذاكرت؟', type: 'number', value: 30, min: 5, max: 300 }, { name: 'focus', label: 'مستوى التركيز', type: 'select', value: 4, options: [[5, '5 — ممتاز'], [4, '4 — جيد جدًا'], [3, '3 — متوسط'], [2, '2 — ضعيف'], [1, '1 — مشتت']] }],
    onSubmit: (d) => { N.db.logs.push({ id: N.uid(), studentId: sid, date: N.today(), minutes: +d.minutes, focus: +d.focus, note: '' }); N.save(); N.toast('أحسنت! تم تسجيل الجلسة 🌟'); after?.(); },
  });
  N.addGoal = (sid, after) => N.modal({
    title: 'هدف جديد',
    fields: [{ name: 'title', label: 'ما هو هدفك؟' }, { name: 'target', label: 'الكمية المستهدفة (مثال: 3 كتب)', type: 'number', value: 5, min: 1, max: 100 }, { name: 'due', label: 'الموعد النهائي', type: 'date', value: N.addDays(N.today(), 30) }],
    onSubmit: (d) => { N.db.goals.push({ id: N.uid(), studentId: sid, title: d.title.trim(), target: +d.target, progress: 0, due: d.due }); N.save(); N.toast('تمت إضافة الهدف 🎯'); after?.(); },
  });

  /* إجراءات مشتركة */
  N.A.toggleTask = ({ id }) => {
    const t = N.db.tasks.find((x) => x.id === id); if (!t) return;
    const before = N.badges(t.studentId).filter((b) => b.earned).map((b) => b.id);
    t.done = !t.done; t.doneOn = t.done ? N.today() : null; N.save();
    if (t.done) { const nb = N.badges(t.studentId).find((b) => b.earned && !before.includes(b.id)); N.toast(nb ? `وسام جديد: ${nb.icon} ${nb.name}` : 'ممتاز! +10 نقاط 🎉'); }
    N.render();
  };
  N.A.delTask = ({ id }) => N.confirm('حذف هذه المهمة؟', () => { N.db.tasks = N.db.tasks.filter((t) => t.id !== id); N.save(); N.render(); });
  N.A.theme = () => { const n = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('nafes_theme', n); } catch (e) { /* ignore */ } };
  N.A.logout = () => { N.session = null; sessionStorage.removeItem('nafes_session'); location.hash = '#/login'; };
})();

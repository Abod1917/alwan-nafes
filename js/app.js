/* نافس باجتهاد — التوجيه، الجلسة، الهيكل */
(function () {
  const N = window.N, E = N.esc, V = N.V, A = N.A, OB = N.OB;
  N.session = null;
  N.persistSession = () => { try { sessionStorage.setItem('nafes_pick', N.session?.studentId || ''); } catch (e) { /* ignore */ } };

  const NAV = {
    s: [['dash', '🏠', 'الرئيسية', 'sDash'], ['tasks', '✅', 'المهام', 'tasks'], ['calendar', '📅', 'التقويم', 'calendar'], ['goals', '🎯', 'أهدافي', 'goals'], ['agreement', '🤝', 'اتفاق الهمة', 'agreement'], ['challenges', '🏁', 'التحديات', 'challenges'], ['achievements', '🏆', 'إنجازاتي', 'achievements']],
    p: [['dash', '🏠', 'لوحتي', 'pDash'], ['tasks', '✅', 'المهام', 'tasks'], ['calendar', '📅', 'التقويم', 'calendar'], ['goals', '🎯', 'الأهداف', 'goals'], ['agreement', '🤝', 'اتفاق الهمة', 'agreement'], ['challenges', '🏁', 'التحديات', 'challenges'], ['achievements', '🏆', 'الإنجازات', 'achievements'], ['report', '📊', 'التقرير الأسبوعي', 'report'], ['parenting', '💬', 'معك في التربية', 'parenting']],
    a: [['overview', '📈', 'نظرة عامة', 'aOverview'], ['people', '🗂️', 'المسجلون', 'aPeople'], ['families', '👪', 'الأسر', 'aFamilies'], ['challenges', '🏁', 'التحديات', 'aChallenges'], ['content', '💬', 'المحتوى', 'aContent'], ['badges', '🏅', 'الأوسمة', 'aBadges'], ['reports', '📊', 'التقارير', 'aReports']],
  };
  const PUBLIC = { welcome: OB.welcome, login: OB.login, 'join/student': OB.joinStudent, 'join/parent': OB.joinParent };

  const topbar = () => {
    const me = N.db?.me;
    return `<header class="topbar"><a class="brand" href="#/">${N.logo('nafes')}<span class="muted small">من أكاديمية ألوان</span></a><div class="grow"></div>
      ${me ? `<span id="syncState" class="sync" data-s="ok" title="محفوظ" aria-hidden="true"></span><span class="small muted who-name">${E(me.name)}</span>` : ''}
      <button class="icon-btn" data-act="theme" aria-label="تبديل الوضع الفاتح/الداكن">🌓</button>
      ${me ? `<button class="icon-btn" data-act="account" aria-label="حسابي">👤</button><button class="icon-btn" data-act="logout" aria-label="تسجيل الخروج">🚪</button>` : ''}</header>`;
  };

  /* بعد الدخول/التسجيل: تحميل البيانات وبناء الخطة المبدئية للطلاب الجدد */
  N.start = async (target) => {
    const db = await N.loadRemote(), me = db.me;
    try { localStorage.setItem('nafes_last', JSON.stringify({ username: me.username, name: me.name, role: me.role })); } catch (e) { /* ignore */ }
    let pick = null; try { pick = sessionStorage.getItem('nafes_pick'); } catch (e) { /* ignore */ }
    const kids = N.childrenOf(me.familyId);
    N.session = { role: me.role, familyId: me.familyId, studentId: me.role === 'student' ? me.studentId : (kids.find((k) => k.id === pick) || kids[0])?.id };
    if (me.role !== 'admin') {
      const fresh = db.students.filter((s) => !s.starterDone && (me.role === 'parent' || s.id === me.studentId));
      if (fresh.length) { fresh.forEach(N.buildStarter); N.save(); await N.flush(); }
    }
    location.hash = target || (me.role === 'admin' ? '#/a/overview' : me.role === 'student' ? '#/s/dash' : '#/p/dash');
    N.render();
  };

  let booting = false;
  N.render = () => {
    const root = document.getElementById('app');
    const path = location.hash.replace(/^#\/?/, ''), [area, page] = path.split('/');
    const go = (h) => { if (location.hash !== h) location.hash = h; else N.render(); };
    if (!N.token()) {
      const view = PUBLIC[path];
      if (!view) return go('#/welcome');
      root.innerHTML = topbar() + view();
      return;
    }
    if (!N.db) {
      root.innerHTML = topbar() + `<div class="login-wrap"><div class="empty"><div class="spinner" aria-hidden="true"></div>جارٍ التحميل…</div></div>`;
      if (!booting) { booting = true; N.start(location.hash).catch((e) => { root.innerHTML = topbar() + `<div class="login-wrap"><div class="card login"><p>${E(e.message)}</p><button class="btn" data-act="retry">إعادة المحاولة</button></div></div>`; }).finally(() => { booting = false; }); }
      return;
    }
    if (path === 'done') { root.innerHTML = topbar() + OB.done(); return; }
    const S = N.session, key = S.role === 'admin' ? 'a' : S.role === 'student' ? 's' : 'p';
    if (area !== key) return go(`#/${key}/${NAV[key][0][0]}`);
    if (key !== 'a' && !N.student(S.studentId)) S.studentId = N.childrenOf(S.familyId)[0]?.id;
    if (key === 'p' && !S.studentId && page !== 'dash') return go('#/p/dash');
    if (key === 'a' && page === 'view') {
      const st = N.student(S.studentId); if (!st) return go('#/a/people');
      const sub = path.split('/')[2] || 'dash', item = NAV.p.find((i) => i[0] === sub) || NAV.p[0];
      const pars = N.parentsOf(st.familyId).map((x) => x.name).join('، ');
      const tabs = NAV.p.map((i) => `<a href="#/a/view/${i[0]}" class="${i === item ? 'on' : ''}">${i[1]} ${i[2]}</a>`).join('');
      root.innerHTML = `${topbar()}<div class="shell"><nav class="side" aria-label="القائمة">${NAV.a.map((i) => `<a href="#/a/${i[0]}"><span class="ic">${i[1]}</span>${i[2]}</a>`).join('')}</nav><main class="main" id="main">
        <div class="viewas no-print"><div class="row between"><b>👁️ تعرض صفحات ${E(st.name)}${pars ? ' — ولي الأمر: ' + E(pars) : ''}</b><a class="btn sm ghost" href="#/a/people">→ رجوع للمسجلين</a></div><div class="tabs viewtabs">${tabs}</div></div>${V[item[3]]()}</main></div>`;
      return;
    }
    const items = NAV[key], cur = items.find((i) => i[0] === page) || (page === 'report' && key === 'a' ? ['report', '', '', 'aReport'] : null);
    if (!cur) return go(`#/${key}/${items[0][0]}`);
    root.innerHTML = `${topbar()}<div class="shell"><nav class="side" aria-label="القائمة">${items.map((i) => `<a href="#/${key}/${i[0]}" class="${i[0] === page ? 'on' : ''}" ${i[0] === page ? 'aria-current="page"' : ''}><span class="ic">${i[1]}</span>${i[2]}</a>`).join('')}</nav><main class="main" id="main">${V[cur[3]]()}</main></div>`;
  };
  let lastHash = '';
  window.addEventListener('hashchange', () => { N.render(); if (location.hash !== lastHash) { window.scrollTo(0, 0); lastHash = location.hash; } });
  A.retry = () => N.render();
  A.logout = () => N.confirm('تسجيل الخروج من المنصة؟', () => N.signOut());

  /* حسابي: بيانات الدخول، رمز الربط، تغيير الرقم السري */
  A.account = () => {
    const me = N.db.me, parents = N.parentsOf(me.familyId).filter((p) => p.id !== me.id);
    const info = `<div class="cred-box"><span class="muted small">اسم المستخدم</span><b class="cred big">${E(me.username)}</b></div>
      ${me.role === 'student' ? `<div class="cred-box"><span class="muted small">رمز الربط لولي أمرك</span><b class="cred big">${E(me.linkCode)}</b></div>
        <p class="small">${parents.length ? 'مرتبط مع: ' + parents.map((p) => `${E(p.name)} (${E(p.relationship || 'ولي أمر')})`).join('، ') : 'لم يرتبط بك ولي أمر بعد.'}</p>` : ''}
      ${me.role === 'parent' && parents.length ? `<p class="small">أولياء أمور آخرون في الأسرة: ${parents.map((p) => `${E(p.name)} (${E(p.relationship || '')})`).join('، ')}</p>` : ''}
      <h3 style="margin-top:12px">تغيير الرقم السري</h3>`;
    N.modal({
      title: 'حسابي', body: info, submit: 'تغيير الرقم السري',
      fields: [{ name: 'old', label: 'الرقم الحالي', type: 'password', dir: 'ltr' }, { name: 'pin', label: 'الرقم الجديد (4 إلى 8 أرقام)', type: 'password', dir: 'ltr' }],
      onSubmit: (d) => { N.rpc('nafes_change_pin', { p_token: N.token(), p_old: d.old, p_new: d.pin }).then(() => N.toast('تم تغيير الرقم السري ✅')).catch((e) => N.toast(e.message)); },
    });
  };

  /* النقرات والنماذج */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = A[el.dataset.act]; if (fn) { e.preventDefault(); fn({ ...el.dataset }, el); }
  });
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-form]'); if (!form) return;
    e.preventDefault();
    const btn = form.querySelector('[type=submit],button:not([type])'), fn = N.F[form.dataset.form];
    if (!fn || btn?.disabled) return;
    if (btn) btn.disabled = true;
    try { await fn(Object.fromEntries(new FormData(form).entries()), form); }
    catch (err) { const box = form.querySelector('.form-err'); if (box) { box.textContent = err.message; box.hidden = false; } else N.toast(err.message); }
    finally { if (btn && document.body.contains(btn)) btn.disabled = false; }
  });

  try { const th = localStorage.getItem('nafes_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.dataset.theme = th; } catch (e) { /* ignore */ }
  N.render();
})();

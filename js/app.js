/* نافس باجتهاد — التوجيه، الدخول، الهيكل */
(function () {
  const N = window.N, E = N.esc, V = N.V, A = N.A;
  N.session = null;
  N.persistSession = () => { try { sessionStorage.setItem('nafes_session', JSON.stringify(N.session)); } catch (e) { /* ignore */ } };
  const restore = () => { try { N.session = JSON.parse(sessionStorage.getItem('nafes_session')); } catch (e) { N.session = null; } };

  const NAV = {
    s: [['dash', '🏠', 'الرئيسية', 'sDash'], ['tasks', '✅', 'المهام', 'tasks'], ['calendar', '📅', 'التقويم', 'calendar'], ['goals', '🎯', 'أهدافي', 'goals'], ['agreement', '🤝', 'اتفاق الهمة', 'agreement'], ['challenges', '🏁', 'التحديات', 'challenges'], ['achievements', '🏆', 'إنجازاتي', 'achievements']],
    p: [['dash', '🏠', 'لوحتي', 'pDash'], ['tasks', '✅', 'المهام', 'tasks'], ['calendar', '📅', 'التقويم', 'calendar'], ['goals', '🎯', 'الأهداف', 'goals'], ['agreement', '🤝', 'اتفاق الهمة', 'agreement'], ['challenges', '🏁', 'التحديات', 'challenges'], ['achievements', '🏆', 'الإنجازات', 'achievements'], ['report', '📊', 'التقرير الأسبوعي', 'report'], ['parenting', '💬', 'معك في التربية', 'parenting']],
    a: [['overview', '📈', 'نظرة عامة', 'aOverview'], ['families', '👪', 'الأسر والطلاب', 'aFamilies'], ['challenges', '🏁', 'التحديات', 'aChallenges'], ['content', '💬', 'المحتوى', 'aContent'], ['badges', '🏅', 'الأوسمة', 'aBadges'], ['reports', '📊', 'التقارير', 'aReports']],
  };

  const topbar = () => {
    const S = N.session, kid = S && S.role !== 'admin' ? N.student(S.studentId) : null;
    return `<header class="topbar"><a class="brand" href="#/">${N.logo('nafes')}<span class="muted small">من أكاديمية ألوان</span></a><div class="grow"></div>${S ? `<span class="small muted">${S.role === 'admin' ? 'إدارة الأكاديمية' : S.role === 'student' ? E(kid?.name || '') : 'ولي الأمر'}</span>` : ''}<button class="icon-btn" data-act="theme" aria-label="تبديل الوضع الفاتح/الداكن">🌓</button>${S ? `${S.role !== 'admin' ? `<button class="icon-btn" data-act="switch" aria-label="تبديل المستخدم">👥</button>` : ''}<button class="icon-btn" data-act="logout" aria-label="تسجيل الخروج">🚪</button>` : ''}</header>`;
  };

  function loginView() {
    return `<div class="login-wrap"><div class="card login"><div class="logos">${N.logo('nafes')}${N.logo('alwan')}</div><h1>نافس باجتهاد</h1><p class="muted">منصة أكاديمية ألوان لمتابعة اجتهاد الأبناء</p>
    <form id="loginForm" style="text-align:start"><label class="f">اسم المستخدم<input name="u" autocomplete="username" dir="ltr" placeholder="NAFES1001" required></label><label class="f">الرقم السري<input name="p" type="password" inputmode="numeric" autocomplete="current-password" dir="ltr" required></label><p id="loginErr" class="chip bad" style="display:none" role="alert"></p><button class="btn" style="width:100%">دخول</button></form>
    <p class="muted small" style="margin-top:14px">تجربة: <span class="cred">NAFES1001</span> / <span class="cred">4826</span></p></div></div>`;
  }
  let fails = 0, lockUntil = 0;
  function bindLogin() {
    const f = document.getElementById('loginForm'); if (!f) return;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const err = document.getElementById('loginErr'), show = (m) => { err.textContent = m; err.style.display = 'inline-flex'; };
      if (Date.now() < lockUntil) return show(`محاولات كثيرة، انتظر ${Math.ceil((lockUntil - Date.now()) / 1000)} ثانية`);
      const r = N.login(f.u.value, f.p.value);
      if (r.error) { if (++fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; } return show(r.error); }
      fails = 0;
      if (r.role === 'admin') N.session = { role: 'admin' }; else { N.session = { role: 'who', familyId: r.familyId }; }
      N.persistSession(); location.hash = r.role === 'admin' ? '#/a/overview' : '#/who';
    });
  }

  function whoView() {
    const kids = N.childrenOf(N.session.familyId);
    return `<div class="login-wrap"><div class="card login"><h1>من يستخدم المنصة؟</h1><div class="who"><button data-act="asParent"><span class="av">👨‍👩‍👧</span><div><b>ولي الأمر</b><div class="muted small">المتابعة والتقارير</div></div></button>${kids.map((k) => `<button data-act="asStudent" data-id="${k.id}"><span class="av">${k.avatar}</span><div><b>${E(k.name)}</b><div class="muted small">الصف ${E(k.grade)}</div></div></button>`).join('')}</div></div></div>`;
  }
  A.asParent = () => { const k = N.childrenOf(N.session.familyId)[0]; N.session = { role: 'parent', familyId: N.session.familyId, studentId: k?.id }; N.persistSession(); location.hash = '#/p/dash'; };
  A.asStudent = ({ id }) => { N.session = { role: 'student', familyId: N.session.familyId, studentId: id }; N.persistSession(); location.hash = '#/s/dash'; };
  A.switch = () => { N.session = { role: 'who', familyId: N.session.familyId }; N.persistSession(); location.hash = '#/who'; };

  N.render = () => {
    const root = document.getElementById('app'), S = N.session;
    const parts = location.hash.replace(/^#\/?/, '').split('/'), area = parts[0], page = parts[1];
    const go = (h) => { if (location.hash !== h) location.hash = h; };
    if (!S) { if (area !== 'login') return go('#/login'); root.innerHTML = topbar() + loginView(); return bindLogin(); }
    if (S.role === 'who') { if (area !== 'who') return go('#/who'); root.innerHTML = topbar() + whoView(); return; }
    const key = S.role === 'admin' ? 'a' : S.role === 'student' ? 's' : 'p';
    if (area !== key) return go(`#/${key}/${NAV[key][0][0]}`);
    if (key !== 'a' && !N.student(S.studentId)) { S.studentId = N.childrenOf(S.familyId)[0]?.id; N.persistSession(); }
    const items = NAV[key], cur = items.find((i) => i[0] === page) || (page === 'report' && key === 'a' ? ['report', '', '', 'aReport'] : null);
    if (!cur) return go(`#/${key}/${items[0][0]}`);
    root.innerHTML = `${topbar()}<div class="shell"><nav class="side" aria-label="القائمة">${items.map((i) => `<a href="#/${key}/${i[0]}" class="${i[0] === page ? 'on' : ''}" ${i[0] === page ? 'aria-current="page"' : ''}><span class="ic">${i[1]}</span>${i[2]}</a>`).join('')}</nav><main class="main" id="main">${V[cur[3]]()}</main></div>`;
    window.scrollTo(0, 0);
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const fn = A[el.dataset.act]; if (fn) { e.preventDefault(); fn({ ...el.dataset }, el); }
  });
  window.addEventListener('hashchange', N.render);

  // تهيئة
  try { const th = localStorage.getItem('nafes_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.dataset.theme = th; } catch (e) { /* ignore */ }
  N.load(); restore(); N.render();
})();

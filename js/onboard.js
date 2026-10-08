/* نافس باجتهاد — البداية: اختيار نوع الحساب، التسجيل، الدخول */
(function () {
  const N = window.N, E = N.esc, A = N.A;
  N.F = {}; // معالجات النماذج: data-form
  const OB = (N.OB = {});
  let st = { step: 1, data: { goals: [], avatar: '🦁', targetMin: 45, hasChild: '' } };
  const reset = () => { st = { step: 1, data: { goals: [], avatar: '🦁', targetMin: 45, hasChild: '' } }; };
  const D = () => st.data;
  const last = () => { try { return JSON.parse(localStorage.getItem('nafes_last')) || null; } catch (e) { return null; } };
  const roleName = { student: 'طالب', parent: 'ولي أمر', admin: 'الإدارة' };

  const wrap = (inner, wide) => `<div class="login-wrap"><div class="card login" style="${wide ? 'width:min(560px,100%)' : ''}">${inner}</div></div>`;
  const logos = `<div class="logos">${N.logo('nafes')}${N.logo('alwan')}</div>`;
  const steps = (n, total) => `<div class="steps" aria-label="الخطوة ${n} من ${total}">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
  const opt = (arr, v) => arr.map(([val, lab]) => `<option value="${E(val)}" ${String(val) === String(v ?? '') ? 'selected' : ''}>${E(lab)}</option>`).join('');
  const field = (label, html) => `<label class="f">${label}${html}</label>`;
  const err = `<p class="form-err chip bad" role="alert" hidden></p>`;
  const showErr = (form, m) => { const e = form.querySelector('.form-err'); e.textContent = m; e.hidden = false; };
  const keep = (form) => Object.assign(D(), Object.fromEntries(new FormData(form).entries()));
  const gradeOpts = [['', 'اختر الصف'], ...N.GRADES.map((g) => [g, g])];
  const ageOpts = [['', 'العمر'], ...Array.from({ length: 13 }, (_, i) => [i + 6, `${i + 6} سنوات`])];

  /* ===== البداية ===== */
  OB.welcome = () => { reset(); return wrap(`${logos}<h1>نافس باجتهاد</h1><p class="muted">منصة أكاديمية ألوان لبناء عادة الاجتهاد عند أبنائنا</p>
    ${last() ? `<a class="role-btn back-card" href="#/login"><span class="av">👋</span><div><b>أهلًا بعودتك ${E(last().name)}</b><div class="muted small">ادخل لصفحة ${roleName[last().role] || ''} · <span class="cred">${E(last().username)}</span></div></div></a><p class="muted small" style="margin:14px 0 6px">أو أنشئ حسابًا جديدًا:</p>` : ''}
    <div class="who"><a class="role-btn" href="#/join/student"><span class="av">🧒</span><div><b>أنا طالب</b><div class="muted small">أبني أهدافي وأتابع اجتهادي</div></div></a>
    <a class="role-btn" href="#/join/parent"><span class="av">👨‍👩‍👧</span><div><b>أنا ولي أمر</b><div class="muted small">أتابع ابني وأدعمه</div></div></a></div>
    <p style="margin-top:18px">عندك حساب؟ <a href="#/login"><b>تسجيل الدخول</b></a></p>`); };

  /* ===== الدخول ===== */
  OB.login = () => wrap(`${logos}<h1>تسجيل الدخول</h1><form data-form="login" style="text-align:start">
    ${field('اسم المستخدم', `<input name="u" autocomplete="username" dir="ltr" placeholder="NAFES1005" value="${E(last()?.username || '')}" required>`)}
    ${field('الرقم السري', `<input name="p" type="password" inputmode="numeric" autocomplete="current-password" dir="ltr" required>`)}
    ${err}<button class="btn" style="width:100%">دخول</button></form><p class="small" style="margin-top:14px">جديد؟ <a href="#/welcome">أنشئ حسابك</a></p>`);
  N.F.login = async (d, form) => {
    const r = await N.rpc('nafes_login', { p_username: d.u, p_pin: d.p });
    if (r.error) return showErr(form, r.error);
    N.setToken(r.token); await N.start();
  };

  /* ===== تسجيل الطالب ===== */
  const goalChips = () => `<div class="chips" role="group" aria-label="الأهداف">${N.GOAL_OPTIONS.map((o) => `<button type="button" class="${D().goals.includes(o.k) ? 'on' : ''}" data-act="obGoal" data-id="${o.k}" aria-pressed="${D().goals.includes(o.k)}">${o.icon} ${o.label}</button>`).join('')}</div>`;
  const avatarChips = () => `<div class="chips av-chips" role="group" aria-label="اختر رمزك">${N.AVATARS.map((a) => `<button type="button" class="${D().avatar === a ? 'on' : ''}" data-act="obAvatar" data-id="${a}" aria-label="${a}">${a}</button>`).join('')}</div>`;
  const pinStep = (form, back) => `${field('اختر رقمًا سريًا (4 إلى 8 أرقام)', `<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,8}" autocomplete="new-password" dir="ltr" required>`)}
    ${field('أعد كتابة الرقم السري', `<input name="pin2" type="password" inputmode="numeric" pattern="[0-9]{4,8}" autocomplete="new-password" dir="ltr" required>`)}
    <p class="muted small">احفظه جيدًا، ستحتاجه مع اسم المستخدم للدخول.</p>${err}
    <div class="row"><button class="btn" type="submit">إنشاء الحساب</button><button class="btn ghost" type="button" data-act="obBack" data-id="${back}">رجوع</button></div>`;

  OB.joinStudent = () => {
    const d = D(), s = st.step;
    let body;
    if (s === 1) body = `<h2>عرّفنا بنفسك 👋</h2>
      ${field('اسمك', `<input name="name" value="${E(d.name)}" required maxlength="60" autocomplete="given-name">`)}
      <div class="grid g2">${field('عمرك', `<select name="age" required>${opt(ageOpts, d.age)}</select>`)}${field('صفك الدراسي', `<select name="grade" required>${opt(gradeOpts, d.grade)}</select>`)}</div>
      ${field('اسم مدرستك', `<input name="school" value="${E(d.school)}" maxlength="100" required>`)}
      <b class="small">اختر رمزك</b>${avatarChips()}${err}<button class="btn" style="width:100%;margin-top:14px">التالي</button>`;
    else if (s === 2) body = `<h2>وش أهدافك؟ 🎯</h2><p class="muted small">اختر هدفًا أو أكثر، ونبني لك منها خطة أسبوعك الأول: أهداف ومهام يومية وتحديات وأفكار.</p>
      ${goalChips()}
      ${field('هدف آخر خاص بك (اختياري)', `<input name="goalNote" value="${E(d.goalNote)}" maxlength="80" placeholder="مثال: أتعلم البرمجة">`)}
      ${field('كم تبغى تذاكر يوميًا؟', `<select name="targetMin">${opt(N.STUDY_TARGETS, d.targetMin)}</select>`)}
      ${err}<div class="row"><button class="btn">التالي</button><button class="btn ghost" type="button" data-act="obBack" data-id="1">رجوع</button></div>`;
    else body = `<h2>أمّن حسابك 🔐</h2>${pinStep('st', 2)}`;
    return wrap(`${steps(s, 3)}<form data-form="joinStudent" style="text-align:start">${body}</form>`, true);
  };
  N.F.joinStudent = async (d, form) => {
    keep(form);
    if (st.step === 2 && !D().goals.length && !(D().goalNote || '').trim()) return showErr(form, 'اختر هدفًا واحدًا على الأقل');
    if (st.step < 3) { st.step++; return N.render(); }
    if (d.pin !== d.pin2) return showErr(form, 'الرقمان السريان غير متطابقين');
    const x = D();
    const r = await N.rpc('nafes_register', { p: { role: 'student', name: x.name, age: x.age, grade: x.grade, school: x.school, avatar: x.avatar, goals: x.goals, goalNote: x.goalNote, targetMin: x.targetMin, pin: d.pin } });
    N.setToken(r.token); N.welcome = { username: r.username, role: 'student' }; reset();
    await N.start('#/done');
  };

  /* ===== تسجيل ولي الأمر ===== */
  OB.joinParent = () => {
    const d = D(), s = st.step;
    let body;
    if (s === 1) body = `<h2>بيانات ولي الأمر 👋</h2>
      ${field('اسمك', `<input name="name" value="${E(d.name)}" required maxlength="60" autocomplete="name">`)}
      ${field('صفة القرابة بالطالب', `<select name="relationship" required>${opt([['', 'اختر'], ...N.RELATIONS.map((r) => [r, r])], d.relationship)}</select>`)}
      ${field('رقم الجوال (اختياري، لمشاركة التقارير بالواتساب)', `<input name="phone" value="${E(d.phone)}" inputmode="tel" dir="ltr" placeholder="9665XXXXXXXX" maxlength="20">`)}
      ${err}<button class="btn" style="width:100%">التالي</button>`;
    else if (s === 2) body = `<h2>ربطك بابنك 🔗</h2><p class="muted small">هل ابنك مسجّل في المنصة مسبقًا؟</p>
      <div class="chips" role="radiogroup"><button type="button" class="${d.hasChild === 'yes' ? 'on' : ''}" data-act="obHas" data-id="yes" role="radio" aria-checked="${d.hasChild === 'yes'}">نعم، عنده حساب</button><button type="button" class="${d.hasChild === 'no' ? 'on' : ''}" data-act="obHas" data-id="no" role="radio" aria-checked="${d.hasChild === 'no'}">لا، سجّله معي الآن</button></div>
      ${d.hasChild === 'yes' ? field('رمز الربط (تجده في حساب ابنك ← حسابي)', `<input name="code" value="${E(d.code)}" dir="ltr" maxlength="6" style="text-transform:uppercase;letter-spacing:4px" required>`) : ''}
      ${d.hasChild === 'no' ? `${field('اسم ابنك/ابنتك', `<input name="childName" value="${E(d.childName)}" required maxlength="60">`)}
        <div class="grid g2">${field('العمر', `<select name="childAge" required>${opt(ageOpts, d.childAge)}</select>`)}${field('الصف', `<select name="childGrade" required>${opt(gradeOpts, d.childGrade)}</select>`)}</div>
        ${field('المدرسة', `<input name="childSchool" value="${E(d.childSchool)}" maxlength="100" required>`)}
        <b class="small">أهداف ابنك</b>${goalChips()}` : ''}
      ${err}<div class="row" style="margin-top:12px"><button class="btn">التالي</button><button class="btn ghost" type="button" data-act="obBack" data-id="1">رجوع</button></div>`;
    else body = `<h2>أمّن حسابك 🔐</h2>${pinStep('pa', 2)}`;
    return wrap(`${steps(s, 3)}<form data-form="joinParent" style="text-align:start">${body}</form>`, true);
  };
  N.F.joinParent = async (d, form) => {
    keep(form);
    const x = D();
    if (st.step === 2 && !x.hasChild) return showErr(form, 'اختر أحد الخيارين');
    if (st.step === 2 && x.hasChild === 'no' && !x.goals.length) return showErr(form, 'اختر هدفًا واحدًا على الأقل لابنك');
    if (st.step < 3) { st.step++; return N.render(); }
    if (d.pin !== d.pin2) return showErr(form, 'الرقمان السريان غير متطابقين');
    const p = { role: 'parent', name: x.name, relationship: x.relationship, phone: x.phone, pin: d.pin };
    if (x.hasChild === 'yes') p.code = (x.code || '').trim().toUpperCase();
    else p.child = { name: x.childName, age: x.childAge, grade: x.childGrade, school: x.childSchool, goals: x.goals, avatar: '🦁', targetMin: 45 };
    const r = await N.rpc('nafes_register', { p });
    N.setToken(r.token); N.welcome = { username: r.username, role: 'parent' }; reset();
    await N.start('#/done');
  };

  A.obGoal = ({ id }) => { const g = D().goals, i = g.indexOf(id); i < 0 ? g.push(id) : g.splice(i, 1); keepOpen(); };
  A.obAvatar = ({ id }) => { D().avatar = id; keepOpen(); };
  A.obHas = ({ id }) => { D().hasChild = id; keepOpen(); };
  A.obBack = ({ id }) => { keepOpen(); st.step = +id; N.render(); };
  function keepOpen() { const f = document.querySelector('form[data-form]'); if (f) keep(f); N.render(); }

  /* ===== بعد التسجيل ===== */
  OB.done = () => {
    const me = N.db.me, kid = me.role === 'student' ? N.student(me.studentId) : N.db.students[0];
    return wrap(`<div style="font-size:3rem">🎉</div><h1>أهلًا ${E(me.name)}!</h1><p class="muted">تم إنشاء حسابك${kid && me.role === 'parent' ? ` ورُبطت بـ ${E(kid.name)}` : ''}. احفظ بيانات الدخول:</p>
      <div class="cred-box"><span class="muted small">اسم المستخدم</span><b class="cred big">${E(me.username)}</b></div>
      ${me.role === 'student' ? `<div class="cred-box"><span class="muted small">رمز الربط — أعطه لولي أمرك ليتابعك</span><b class="cred big">${E(me.linkCode)}</b></div>` : ''}
      ${me.role === 'parent' && kid && !N.accountOf(kid.id) ? `<p class="small muted">تقدر تنشئ لابنك حساب دخول خاص من لوحتك.</p>` : ''}
      <a class="btn" style="width:100%;margin-top:12px" href="#/${me.role === 'student' ? 's' : 'p'}/dash">ابدأ الآن</a>`);
  };
})();

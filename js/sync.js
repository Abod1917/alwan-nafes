/* نافس باجتهاد — الاتصال بقاعدة البيانات والمزامنة */
(function () {
  const N = window.N, C = window.NAFES_CONFIG;
  const TKEY = 'nafes_token';
  const COLL = { student: 'students', task: 'tasks', exam: 'exams', log: 'logs', goal: 'goals', part: 'participations', challenge: 'challenges', content: 'content' };
  const GLOBAL = ['challenge', 'content', 'settings'];

  N.token = () => { try { return localStorage.getItem(TKEY); } catch (e) { return null; } };
  N.setToken = (t) => { try { t ? localStorage.setItem(TKEY, t) : localStorage.removeItem(TKEY); } catch (e) { /* ignore */ } };

  N.rpc = async (name, body) => {
    let r;
    try {
      r = await fetch(`${C.url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: C.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) { throw new Error('تعذّر الاتصال، تحقق من الإنترنت'); }
    const txt = await r.text();
    let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { /* ignore */ }
    if (!r.ok) {
      const msg = (j && j.message) || 'حدث خطأ غير متوقع';
      if (msg === 'NAFES_AUTH') { N.signOut(true); throw new Error('انتهت الجلسة، سجّل الدخول من جديد'); }
      throw new Error(msg);
    }
    return j;
  };

  /* بناء الحالة من سجلات الخادم */
  let snap = new Map();
  const keyOf = (kind, id) => `${kind}:${id}`;
  function build(res) {
    const db = { me: res.me, accounts: res.accounts || [], students: [], tasks: [], exams: [], logs: [], goals: [], participations: [], agreements: {}, challenges: [], content: [], settings: { id: 'settings', badgesOff: [] } };
    [...res.global, ...res.records].forEach(({ kind, data }) => {
      if (kind === 'agreement') db.agreements[data.studentId] = data;
      else if (kind === 'settings') db.settings = { badgesOff: [], ...data };
      else if (COLL[kind]) db[COLL[kind]].push(data);
    });
    return db;
  }
  function collect() {
    const m = new Map(), admin = N.db.me.role === 'admin';
    Object.entries(COLL).forEach(([kind, coll]) => {
      if (!admin && GLOBAL.includes(kind)) return;
      N.db[coll].forEach((d) => m.set(keyOf(kind, d.id), { kind, data: d }));
    });
    Object.entries(N.db.agreements).forEach(([sid, ag]) => { if (ag) { const d = { ...ag, id: 'ag_' + sid, studentId: sid }; m.set(keyOf('agreement', d.id), { kind: 'agreement', data: d }); } });
    if (admin) m.set(keyOf('settings', 'settings'), { kind: 'settings', data: { ...N.db.settings, id: 'settings' } });
    return m;
  }
  const snapshot = () => { snap = new Map([...collect()].map(([k, v]) => [k, JSON.stringify(v.data)])); };

  N.loadRemote = async () => {
    const res = await N.rpc('nafes_load', { p_token: N.token() });
    N.db = build(res); snapshot();
    return N.db;
  };

  /* حفظ التغييرات فقط (إضافة/تعديل/حذف) مع تأخير بسيط لجمعها */
  let timer = null, saving = null, dirty = false;
  N.pending = () => dirty || !!saving;
  N.save = () => { dirty = true; clearTimeout(timer); timer = setTimeout(flush, 300); setStatus('saving'); };
  async function flush() {
    if (saving) { await saving; }
    if (!dirty || !N.db) return;
    dirty = false;
    const cur = collect(), ups = [], dels = [];
    cur.forEach((v, k) => { const s = JSON.stringify(v.data); if (snap.get(k) !== s) ups.push({ kind: v.kind, data: v.data, s, k }); });
    snap.forEach((_, k) => { if (!cur.has(k)) dels.push(k); });
    if (!ups.length && !dels.length) { setStatus('ok'); return; }
    saving = N.rpc('nafes_sync', { p_token: N.token(), p_ups: ups.map(({ kind, data }) => ({ kind, data })), p_dels: dels.map((k) => k.slice(k.indexOf(':') + 1)) })
      .then(() => { ups.forEach((u) => snap.set(u.k, u.s)); dels.forEach((k) => snap.delete(k)); setStatus('ok'); })
      .catch((e) => { dirty = true; setStatus('err'); N.toast('لم يُحفظ التغيير: ' + e.message); clearTimeout(timer); timer = setTimeout(flush, 5000); })
      .finally(() => { saving = null; });
    await saving;
  }
  N.flush = flush;
  function setStatus(s) { const el = document.getElementById('syncState'); if (el) { el.dataset.s = s; el.title = { saving: 'جارٍ الحفظ…', ok: 'محفوظ', err: 'لم يُحفظ — ستُعاد المحاولة' }[s]; } }

  /* تحديث عند العودة للتطبيق (لرؤية ما أضافه الطرف الآخر) */
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !N.token() || !N.db || N.pending() || document.querySelector('.modal-bg')) return;
    try { await N.loadRemote(); N.render(); } catch (e) { /* ignore */ }
  });
  window.addEventListener('beforeunload', (e) => { if (N.pending()) { flush(); e.preventDefault(); e.returnValue = ''; } });

  N.signOut = (silent) => {
    const t = N.token();
    if (t && !silent) N.rpc('nafes_logout', { p_token: t }).catch(() => {});
    N.setToken(null); N.db = null; N.session = null; snap = new Map();
    try { sessionStorage.removeItem('nafes_pick'); } catch (e) { /* ignore */ }
    location.hash = '#/welcome'; N.render();
  };
})();

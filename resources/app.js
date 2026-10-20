// طبقة البيانات: Supabase (جدول records) مشتركة بين أعضاء اللجنة بعد تسجيل الدخول
const sb=supabase.createClient(MISHKAH_CFG.url,MISHKAH_CFG.key);
const el=(t,a={},...c)=>{const e=document.createElement(t);for(const[k,v]of Object.entries(a))k.startsWith('on')?e.addEventListener(k.slice(2),v):e.setAttribute(k,v);c.flat().forEach(x=>e.append(x));return e};
const fail=e=>{if(e){console.error(e);alert('تعذّر الحفظ: '+e.message)}return !e};
const db={
  async list(c){const{data,error}=await sb.from('records').select('id,key,data').eq('collection',c).order('created_at');fail(error);return data||[]},
  async add(c,d={},key=null){const{data,error}=await sb.from('records').insert({collection:c,data:d,key}).select('id,key,data').single();fail(error);return data},
  async set(id,d){fail((await sb.from('records').update({data:d}).eq('id',id)).error)},
  async del(id){fail((await sb.from('records').delete().eq('id',id)).error)},
  async put(c,key,d){fail((await sb.from('records').upsert({collection:c,key,data:d},{onConflict:'collection,key'})).error)}
};

function nav(active){
  const pages=[['index.html','الرئيسية'],['resources.html','تنمية الموارد'],['reports.html','التقارير والعقود'],['projects.html','المشاريع والملف التعريفي'],['october.html','جداول أكتوبر']];
  document.querySelector('header').innerHTML='<div class="in"><span class="who" id="who"></span><h1>المشكاة · لجنة تنمية الموارد المالية</h1><nav>'+
    pages.map(([h,t])=>`<a href="${h}" class="${h===active?'on':''}">${t}</a>`).join('')+'</nav></div>';
}

// بوابة الدخول: تشغّل init بعد نجاح الجلسة
async function start(active,init){
  nav(active);
  const main=document.querySelector('main'),content=main.innerHTML;
  const show=async user=>{
    if(!user){
      main.innerHTML='<form id="login" class="card"><h3>تسجيل دخول اللجنة</h3><input name="e" type="email" placeholder="البريد الإلكتروني" required dir="ltr"><input name="p" type="password" placeholder="كلمة المرور" required dir="ltr"><div class="err" id="err"></div><button>دخول</button></form>';
      document.getElementById('login').onsubmit=async ev=>{ev.preventDefault();const f=ev.target;
        const{error}=await sb.auth.signInWithPassword({email:f.e.value,password:f.p.value});
        if(error)document.getElementById('err').textContent='بيانات الدخول غير صحيحة'};
      document.getElementById('who').innerHTML='';
      return;
    }
    document.getElementById('who').innerHTML=`${user.email}<button id="out">خروج</button>`;
    document.getElementById('out').onclick=()=>sb.auth.signOut();
    main.innerHTML=content;
    await init();
  };
  let cur;
  sb.auth.onAuthStateChange((_e,s)=>{const u=s?.user||null;if((u?.id||null)!==cur){cur=u?.id||null;show(u)}});
}

// cols: [{key,label,type:'text'|'date'|'number'|'area'|'select',options:[]}]
// opts.rowClass(row) => 'warn'|'bad'|''
async function editableTable(host,id,cols,seed=[],opts={}){
  let rows=await db.list(id);
  if(!rows.length&&seed.length){rows=[];for(const d of seed)rows.push(await db.add(id,d))};
  const tbody=el('tbody');
  const render=()=>{
    tbody.replaceChildren(...rows.map(r=>{
      const tr=el('tr',{class:opts.rowClass?opts.rowClass(r.data):''});
      cols.forEach(c=>{
        let f;
        if(c.type==='select')f=el('select',{},...['',...c.options].map(o=>el('option',{value:o},o)));
        else if(c.type==='area')f=el('textarea',{rows:1});
        else f=el('input',{type:c.type||'text'});
        f.value=r.data[c.key]??'';
        f.addEventListener('change',async()=>{r.data[c.key]=f.value;await db.set(r.id,r.data);if(opts.rowClass)tr.className=opts.rowClass(r.data)});
        tr.append(el('td',{},f));
      });
      tr.append(el('td',{},el('button',{class:'x',title:'حذف',onclick:async()=>{if(confirm('حذف هذا الصف؟ سيُحذف عند الجميع.')){await db.del(r.id);rows=rows.filter(x=>x!==r);render()}}},'✕')));
      return tr;
    }));
  };
  const csv=()=>{
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const t=[cols.map(c=>q(c.label)).join(','),...rows.map(r=>cols.map(c=>q(r.data[c.key])).join(','))].join('\n');
    const a=el('a',{href:URL.createObjectURL(new Blob(['\ufeff'+t],{type:'text/csv;charset=utf-8'})),download:id+'.csv'});
    a.click();URL.revokeObjectURL(a.href);
  };
  host.replaceChildren(
    el('div',{class:'bar'},
      el('button',{onclick:async()=>{rows.push(await db.add(id,{}));render()}},'+ إضافة صف'),
      el('button',{class:'ghost',onclick:async()=>{rows=await db.list(id);render()}},'تحديث'),
      el('button',{class:'ghost',onclick:csv},'تصدير CSV (يفتح في Excel)')),
    el('div',{class:'tablewrap'},el('table',{},
      el('thead',{},el('tr',{},...cols.map(c=>el('th',{},c.label)),el('th',{}))),tbody)));
  render();
}

// أسئلة: كل إجابة سجل بمفتاح رقم السؤال
async function questionForm(host,id,title,questions){
  const ans={};(await db.list(id)).forEach(r=>ans[r.key]=r.data.v);
  const d=el('details',{},el('summary',{},title+` (${questions.length} سؤال)`));
  questions.forEach((q,i)=>{
    const f=el('textarea',{rows:2,placeholder:q.hint||''});
    f.value=ans[i]??'';
    f.addEventListener('change',()=>db.put(id,String(i),{v:f.value}));
    d.append(el('div',{class:'q'},el('label',{},`${i+1}. ${q.q}`),f));
  });
  host.append(d);
}

// قائمة بنود (سياسات، أقسام ملف تعريفي)
async function checklist(host,id,items){
  const st={};(await db.list(id)).forEach(r=>st[r.key]=r.data.v);
  const ul=el('ul',{style:'list-style:none;padding:0'});
  items.forEach((t,i)=>{
    const c=el('input',{type:'checkbox'});c.checked=!!st[i];
    c.addEventListener('change',()=>db.put(id,String(i),{v:c.checked}));
    ul.append(el('li',{},el('label',{},c,' '+t)));
  });
  host.replaceChildren(ul);
}

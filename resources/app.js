// مكوّنات مشتركة: جدول قابل للتعديل + حقول أسئلة، والحفظ في localStorage (على هذا المتصفح فقط)
const store={
  get(k,d){try{return JSON.parse(localStorage.getItem('mishkah-fin:'+k))??d}catch{return d}},
  set(k,v){try{localStorage.setItem('mishkah-fin:'+k,JSON.stringify(v))}catch{}}
};
const el=(t,a={},...c)=>{const e=document.createElement(t);for(const[k,v]of Object.entries(a))k.startsWith('on')?e.addEventListener(k.slice(2),v):e.setAttribute(k,v);c.flat().forEach(x=>e.append(x));return e};

function nav(active){
  const pages=[['index.html','الرئيسية'],['resources.html','تنمية الموارد'],['reports.html','التقارير والعقود'],['projects.html','المشاريع والملف التعريفي'],['october.html','جداول أكتوبر']];
  document.querySelector('header').innerHTML='<div class="in"><h1>المشكاة · لجنة تنمية الموارد المالية</h1><nav>'+
    pages.map(([h,t])=>`<a href="${h}" class="${h===active?'on':''}">${t}</a>`).join('')+'</nav></div>';
}

// cols: [{key,label,type:'text'|'date'|'number'|'area'|'select',options:[]}]
// opts.rowClass(row) => 'warn'|'bad'|''
function editableTable(host,id,cols,seed=[],opts={}){
  let rows=store.get(id,seed);
  const save=()=>store.set(id,rows);
  const tbody=el('tbody');
  const render=()=>{
    tbody.replaceChildren(...rows.map((r,i)=>{
      const tr=el('tr',{class:opts.rowClass?opts.rowClass(r):''});
      cols.forEach(c=>{
        let f;
        if(c.type==='select')f=el('select',{},...['',...c.options].map(o=>el('option',{value:o},o)));
        else if(c.type==='area')f=el('textarea',{rows:1});
        else f=el('input',{type:c.type||'text'});
        f.value=r[c.key]??'';
        f.addEventListener('change',()=>{r[c.key]=f.value;save();if(opts.rowClass)tr.className=opts.rowClass(r)});
        tr.append(el('td',{},f));
      });
      tr.append(el('td',{},el('button',{class:'x',title:'حذف',onclick:()=>{if(confirm('حذف هذا الصف؟')){rows.splice(i,1);save();render()}}},'✕')));
      return tr;
    }));
  };
  const csv=()=>{
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const t=[cols.map(c=>q(c.label)).join(','),...rows.map(r=>cols.map(c=>q(r[c.key])).join(','))].join('\n');
    const a=el('a',{href:URL.createObjectURL(new Blob(['﻿'+t],{type:'text/csv;charset=utf-8'})),download:id+'.csv'});
    a.click();URL.revokeObjectURL(a.href);
  };
  host.append(
    el('div',{class:'bar'},
      el('button',{onclick:()=>{rows.push({});save();render()}},'+ إضافة صف'),
      el('button',{class:'ghost',onclick:csv},'تصدير CSV (يفتح في Excel)')),
    el('div',{class:'tablewrap'},el('table',{},
      el('thead',{},el('tr',{},...cols.map(c=>el('th',{},c.label)),el('th',{}))),tbody)));
  render();
}

// questions: [{id,q,hint}] داخل <details>
function questionForm(host,id,title,questions){
  const ans=store.get(id,{});
  const d=el('details',{},el('summary',{},title+` (${questions.length} سؤال)`));
  questions.forEach((q,i)=>{
    const f=el('textarea',{rows:2,placeholder:q.hint||''});
    f.value=ans[i]??'';
    f.addEventListener('change',()=>{ans[i]=f.value;store.set(id,ans)});
    d.append(el('div',{class:'q'},el('label',{},`${i+1}. ${q.q}`),f));
  });
  host.append(d);
}

// قائمة بنود قابلة للتعديل (سياسات، أقسام ملف تعريفي)
function checklist(host,id,items){
  const st=store.get(id,{});
  const ul=el('ul',{style:'list-style:none;padding:0'});
  items.forEach((t,i)=>{
    const c=el('input',{type:'checkbox'});c.checked=!!st[i];
    c.addEventListener('change',()=>{st[i]=c.checked;store.set(id,st)});
    ul.append(el('li',{},el('label',{},c,' '+t)));
  });
  host.append(ul);
}

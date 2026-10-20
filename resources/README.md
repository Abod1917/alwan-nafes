# تنمية الموارد المالية — المشكاة

صفحات ثابتة (HTML/CSS/JS) مستقلة تماماً، قاعدتها مشتركة في Supabase (مشروع `mishkah-resources`).

| الملف | الدور |
|---|---|
| `theme.css` | الألوان والخطوط فقط — عدّله وحده لمطابقة هوية المشكاة |
| `style.css` | التخطيط (يقرأ الألوان من theme.css) |
| `config.js` | رابط Supabase والمفتاح publishable (آمن للمتصفح) |
| `app.js` | تسجيل الدخول والجداول والنماذج |
| `schema.sql` | مخطط الجدول وسياسات الأمان |

## إضافة عضو إلى اللجنة
1. Supabase ← Authentication ← Users ← Add user (بريد وكلمة مرور، مع Auto Confirm).
2. افتح SQL Editor ونفّذ (بدّل البريد):
```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"committee": true}'
where email = 'member@example.com';
```
بدون العلامة يستطيع الحساب الدخول لكنه لا يرى أي بيانات ولا يكتب.
يُنصح بإيقاف التسجيل الذاتي: Authentication ← Sign In / Providers ← إلغاء «Allow new users to sign up».

## التشغيل
افتح `index.html` عبر أي خادم ثابت (Vercel/GitHub Pages). لا يحتاج بناءً.

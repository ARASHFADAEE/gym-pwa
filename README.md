# باشگاه آرش — Gym PWA

اپ شخصی تمرین بدنسازی + موزیک‌پلیر، فارسی و راست‌به‌چپ، قابل نصب روی گوشی و کاملاً آفلاین.
A personal, installable, offline-first workout tracker + music player (Persian / RTL).

## امکانات
- برنامه ۴ روزه بالاتنه/پایین‌تنه (شنبه، یکشنبه، سه‌شنبه، چهارشنبه) با انتخاب خودکار روز
- ثبت وزنه و تکرار هر ست، رکورد جلسه قبل، پیشنهاد افزایش وزنه
- تایمر استراحت دایره‌ای تمام‌صفحه با بوق و ویبره (±۱۵ ثانیه، رد کردن، کوچک کردن)
- لینک ویدیوی آموزشی آپارات برای هر حرکت + نکات فرم صحیح
- تاریخچه جلسات، ثبت هفتگی وزن و دور کمر با نمودار
- موزیک‌پلیر با ۱۵ آهنگ فونک (دریفت/برزیلی/اگرسیو) با مجوز آزاد CC BY / CC0، کنترل از صفحه قفل، افزودن آهنگ از گوشی
- پشتیبان‌گیری/بازیابی JSON — همه داده‌ها فقط روی گوشی (localStorage / IndexedDB)

## نصب روی گوشی
اپ باید از آدرس **HTTPS** باز بشه.
- **اندروید (Chrome):** آدرس رو باز کن ← منوی ⋮ ← «Install app / نصب برنامه» یا «Add to Home screen».
- **آیفون (Safari):** آدرس رو در Safari باز کن ← دکمه Share ← «Add to Home Screen» ← Add.
- بعد از نصب یک بار آنلاین باز کن، و در تب «موزیک» دکمه «ذخیره آفلاین» رو بزن.

## Deploy (GitHub Pages)
1. Push this folder as the root of a public repo (e.g. `gym-pwa`).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
3. Open `https://<user>.github.io/gym-pwa/`. All paths are relative, so any sub-path works.

Any static HTTPS host works (own subdomain with SSL, Netlify, Cloudflare Pages…). No build step.

## Structure
`index.html` (shell + SVG icon sprite) · `css/style.css` · `js/app.js` · `js/data.js` (program, videos, tracks) · `sw.js` (offline cache; music cached on first play) · `manifest.webmanifest` · `icons/` · `fonts/` · `music/`

When you change files, bump the cache by editing `VERSION` in `sw.js`.

## Credits
See [CREDITS.md](CREDITS.md): phonk tracks from Free Music Archive (CC BY 4.0 / CC0), Vazirmatn font (OFL), Lucide icons (ISC).

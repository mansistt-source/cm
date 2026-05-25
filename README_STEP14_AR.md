# Step 14 — Production Activity + Credits Ledger

هذا التعديل يضيف طبقة تتبع وتشغيل حقيقية بدون تغيير تصميم الواجهة:

## ما تمت إضافته

- Wallet لكل مستخدم.
- Credit ledger لكل زيادة/نقصان في الكريدتس.
- Activity log لكل عملية مهمة على المنصة.
- Sessions activity مرتبطة بالجهاز/IP/User-Agent.
- Subscriptions records عند تأكيد دفع باقة.
- Endpoints لعرض سجل النشاط والكريدتس.
- Endpoint جاهز لخصم الكريدتس عند تنفيذ توليد/Generation لاحقًا.

## Endpoints جديدة

- `GET /api/me/wallet`
- `GET /api/me/activity?limit=50`
- `GET /api/me/credits/ledger?limit=50`
- `GET /api/me/subscriptions`
- `POST /api/projects/:id/credits/consume`
- `GET /api/admin/activity?limit=100`
- `GET /api/admin/credits`
- `POST /api/admin/users/:id/credits/adjust`

## التسجيل التلقائي للأحداث

يسجل النظام الآن:

- إنشاء حساب.
- تسجيل دخول.
- إنشاء مشروع.
- فتح مشروع.
- تعديل مشروع.
- حذف مشروع.
- بدء Checkout.
- تأكيد الدفع.
- إضافة credits بعد الدفع.
- رفع ملف.
- تحميل ملف.
- تغيير حالة المشروع.
- إضافة Deliverable.

## الكريدتس

القيمة الافتراضية:

`1 USD = 100 credits`

يمكن تغييرها من Railway Variable:

`CREDITS_PER_USD=100`

مثال:

باقة 150 دولار = 15000 credits.

## ملاحظات

- هذا لا يربط PayPal أو Stripe بعد.
- هذا لا يربط R2 بعد.
- هذا لا يشغل Higgsfield بعد.
- هذا يجهز قاعدة إنتاج منطقية لتتبع كل شيء قبل دخول الدفع الحقيقي والتوليد.

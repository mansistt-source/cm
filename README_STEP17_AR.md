# Step 17 — Estimate / Reserve / Finalize Credits

هذه الخطوة تضيف منطق التشغيل الصحيح بالكريدتس:

1. النظام يحسب تكلفة العملية كمدى: `estimatedLowCredits` إلى `estimatedHighCredits`.
2. قبل تشغيل العملية، يجب أن يكون لدى المستخدم رصيد متاح يغطي `estimatedHighCredits`.
3. النظام يحجز الحد الأعلى فقط ولا يخصمه نهائيًا.
4. بعد انتهاء العملية، الأدمن/المشغل الداخلي يرسل التكلفة الفعلية.
5. النظام يخصم التكلفة الفعلية فقط ويرجع باقي الحجز تلقائيًا.

## Endpoints الجديدة

### Estimate عام
`POST /api/operations/estimate`

### Estimate على مشروع
`POST /api/projects/:id/operations/estimate`

### Reserve على مشروع
`POST /api/projects/:id/operations/reserve`

### عرض عمليات مشروع
`GET /api/projects/:id/operations`

### Finalize reservation
`POST /api/operations/:reservationId/finalize`

Body:
```json
{ "actualCredits": 210 }
```
أو:
```json
{ "actualUsd": 21 }
```

### Refund reservation
`POST /api/operations/:reservationId/refund`

Body:
```json
{ "reason": "Operation failed" }
```

## Variables

```env
CREDITS_PER_USD=10
MIN_TOPUP_USD=30
TOPUP_AMOUNTS_USD=30,50,100,300,800,1500
EARLY_DYNAMIC_MARKUP=1.65
ESTIMATE_SAFETY_BUFFER_RATE=0.15
```

## ملاحظات أمان

- Finalize و Refund حاليًا Admin-only.
- لا يتم خصم أي تكلفة نهائية بمجرد الـ estimate.
- لا يتم تشغيل العملية لو الرصيد المتاح أقل من الحد الأعلى.
- `reservedCredits` يظهر في wallet.
- `availableCredits = balanceCredits - reservedCredits`.

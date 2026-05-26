// Billing / Wallet page: credit subscriptions + flexible top-up.
// Customer-facing formula: 1 USD = 10 credits. Minimum top-up: 30 USD.

function billToken() { return localStorage.getItem("cm_token") || ""; }
function billCurrentUser() { try { return JSON.parse(localStorage.getItem("cm_user") || "null") || null; } catch { return null; } }
async function billApi(path, opts = {}) {
  const token = billToken();
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type":"application/json",
      ...(opts.headers || {}),
      ...(token ? { Authorization:`Bearer ${token}` } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "API request failed");
  return data;
}
function billMoney(n) { return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }
function billCredits(n) { return `${Number(n || 0).toLocaleString()} CRED`; }
function billReadReturnState() {
  const hash = String(window.location.hash || "");
  const search = String(window.location.search || "");
  return {
    approved: hash.includes("paypal=approved") || search.includes("token="),
    cancelled: hash.includes("paypal=cancelled"),
  };
}

const BILLING_TIER_PLANS = [
  { key:"tier_starter", name:"ابتدائي", code:"TIER_STARTER", amountUsd:150, subtitle:"رصيد تشغيل أولي للمشاريع الصغيرة" },
  { key:"tier_growth", name:"معزز", code:"TIER_GROWTH", amountUsd:300, subtitle:"اختيار مناسب للحملات والتجارب الجادة", active:true },
  { key:"tier_pro", name:"احترافي", code:"TIER_PRO", amountUsd:800, subtitle:"رصيد أعلى للإنتاج المتكرر" },
  { key:"tier_agency", name:"الأقصى", code:"TIER_AGENCY", amountUsd:1500, subtitle:"رصيد كبير للوكالات والباقات الضخمة" },
];

function BillingPage({ p, navigate }) {
  const [user, setUser] = React.useState(billCurrentUser());
  const [wallet, setWallet] = React.useState(null);
  const [plans, setPlans] = React.useState([]);
  const [ledger, setLedger] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busyKey, setBusyKey] = React.useState("");
  const [err, setErr] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [customUsd, setCustomUsd] = React.useState(30);
  const authed = Boolean(billToken());

  async function load() {
    setErr("");
    try {
      const bp = await fetch("/api/billing/plans").then(r => r.json());
      setPlans(bp.plans || []);

      if (billToken()) {
        const [me, w, led] = await Promise.all([
          billApi("/api/auth/me"),
          billApi("/api/me/wallet"),
          billApi("/api/me/credits/ledger?limit=12")
        ]);
        if (me.user) { setUser(me.user); localStorage.setItem("cm_user", JSON.stringify(me.user)); }
        setWallet(w.wallet || null);
        setLedger(led.ledger || []);
        window.dispatchEvent(new Event("cm-wallet-changed"));
      } else {
        setWallet(null);
        setLedger([]);
      }
    } catch(e) { setErr(e.message || "فشل تحميل الفوترة"); }
    finally { setLoading(false); }
  }

  React.useEffect(() => { load(); }, []);

  React.useEffect(() => {
    const state = billReadReturnState();
    if (state.cancelled) {
      setMsg("تم إلغاء عملية الدفع");
      localStorage.removeItem("cm_pending_paypal_order_id");
      return;
    }
    if (state.approved) {
      const orderId = localStorage.getItem("cm_pending_paypal_order_id");
      if (!billToken()) {
        setErr("تم الرجوع من PayPal بدون جلسة دخول. سجل الدخول ثم افتح الفوترة مرة أخرى.");
        return;
      }
      if (orderId) captureOrder(orderId, true);
      else setErr("رجعت من PayPal لكن لم نجد رقم الطلب المؤقت. أعد محاولة الشحن.");
    }
  }, []);

  function requireLogin(payload) {
    localStorage.setItem("cm_pending_topup", JSON.stringify(payload || {}));
    setMsg("سجل الدخول أولًا، ثم ارجع للفوترة لإتمام الشحن.");
    setTimeout(() => navigate("auth"), 450);
  }

  async function buyPlan(amountUsd, key) {
    setErr(""); setMsg("");
    const numericAmount = Number(amountUsd || 0);
    if (!billToken()) return requireLogin({ amountUsd:numericAmount, key });
    if (!Number.isFinite(numericAmount) || numericAmount < 30) {
      setErr("أقل شحن هو 30 دولار");
      return;
    }
    const busyId = key || `flex_${numericAmount}`;
    setBusyKey(busyId);
    try {
      const body = key && String(key).startsWith("topup_")
        ? { planKey:key }
        : { amountUsd:numericAmount };
      const data = await billApi("/api/billing/paypal/create-order", { method:"POST", body: JSON.stringify(body) });
      if (!data.approvalUrl || !data.paypalOrderId) throw new Error("PayPal approval URL missing");
      localStorage.setItem("cm_pending_paypal_order_id", data.paypalOrderId);
      window.location.href = data.approvalUrl;
    } catch(e) { setErr(e.message || "فشل إنشاء طلب PayPal"); }
    finally { setBusyKey(""); }
  }

  async function captureOrder(orderId, fromReturn) {
    setErr(""); setMsg("جاري تأكيد الدفع وإضافة الكريدتس...");
    try {
      const data = await billApi("/api/billing/paypal/capture-order", { method:"POST", body: JSON.stringify({ paypalOrderId: orderId }) });
      localStorage.removeItem("cm_pending_paypal_order_id");
      if (data.wallet) setWallet(data.wallet);
      setMsg(`تمت إضافة ${Number(data.payment?.credits || 0).toLocaleString()} كريدت إلى رصيدك`);
      window.dispatchEvent(new Event("cm-wallet-changed"));
      await load();
      if (fromReturn && window.location.hash.includes("paypal=")) window.location.hash = "#/billing";
    } catch(e) { setErr(e.message || "فشل تأكيد الدفع"); }
  }

  const clampedCustomUsd = Math.max(30, Math.min(5000, Number(customUsd || 30)));
  const customCredits = clampedCustomUsd * 10;
  const nav = authed
    ? <AuthedNav p={p} current="billing" navigate={navigate} user={user} />
    : <BillingPublicNav p={p} navigate={navigate} />;

  return <PageFrame p={p} density={0.35}>
    {nav}
    <div style={{ padding:"32px", maxWidth:1280, margin:"0 auto" }}>
      <SectionHead p={p} code="// FINANCIAL_OPS" title="الفوترة والاشتراك" sub="اشحن الكريدتس واستخدمها في كل خدمات المنصة. 1 دولار = 10 كريدت." right={<CrunchBtn p={p} label="تحديث" onClick={load} />} />
      {err && <div style={{ marginBottom:12 }}><Toast p={p} type="error">{err}</Toast></div>}
      {msg && <div style={{ marginBottom:12 }}><Toast p={p} type="success">{msg}</Toast></div>}

      <div style={{ display:"grid", gridTemplateColumns:"1.1fr .9fr", gap:16, marginBottom:16 }}>
        <Panel p={p} padding={26}>
          <Tag p={p}>TIERS_AVAILABLE</Tag>
          <h2 style={{ margin:"18px 0 6px", fontFamily:"'Bebas Neue', sans-serif", fontSize:54, color:p.fg, letterSpacing:".04em", lineHeight:1 }}>خطط الكريدت</h2>
          <div style={{ color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13, marginBottom:18 }}>اختار رصيد تشغيل جاهز. دي مش تعقيد اشتراكات، دي كريدتس تستخدمها في كل المنصة.</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10 }}>
            {BILLING_TIER_PLANS.map((plan) => <TierCard key={plan.key} p={p} plan={plan} busy={busyKey === plan.key} onBuy={() => buyPlan(plan.amountUsd, plan.key)} />)}
          </div>
        </Panel>

        <Panel p={p} padding={26}>
          <Tag p={p} color={p.accent2}>CURRENT_WALLET</Tag>
          {authed ? <>
            <div style={{ marginTop:18, fontFamily:"'Bebas Neue', sans-serif", fontSize:62, color:p.accent, letterSpacing:".04em", lineHeight:1 }}>{billCredits(wallet?.availableCredits || 0)}</div>
            <div style={{ marginTop:10, display:"grid", gap:8 }}>
              <WalletRow p={p} label="BALANCE" value={billCredits(wallet?.balanceCredits || 0)} />
              <WalletRow p={p} label="RESERVED" value={billCredits(wallet?.reservedCredits || 0)} />
              <WalletRow p={p} label="LIFETIME_USED" value={billCredits(wallet?.lifetimeUsedCredits || 0)} />
            </div>
          </> : <>
            <div style={{ marginTop:18, fontFamily:"'Bebas Neue', sans-serif", fontSize:54, color:p.accent, letterSpacing:".04em", lineHeight:1 }}>1$ = 10 CRED</div>
            <div style={{ marginTop:12, color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13, lineHeight:1.9 }}>تقدر تشوف الأسعار، لكن الشراء يحتاج تسجيل دخول عشان الكريدتس تتحط في حسابك.</div>
            <div style={{ marginTop:16 }}><CrunchBtn p={p} label="تسجيل الدخول / إنشاء حساب" solid onClick={() => navigate("auth")} /></div>
          </>}
          <div style={{ marginTop:18, color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13, lineHeight:1.8 }}>قبل أي عملية إنتاج، النظام يحجز الحد الأعلى للتكلفة. بعد التنفيذ يخصم التكلفة الفعلية ويرجع الفرق تلقائيًا.</div>
        </Panel>
      </div>

      <Panel p={p} padding={26}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1.35fr", gap:24, alignItems:"center" }}>
          <div>
            <Tag p={p} color={p.accent}>FLEX_TX</Tag>
            <h2 style={{ margin:"14px 0 6px", fontFamily:"'Bebas Neue', sans-serif", fontSize:44, color:p.fg, letterSpacing:".04em", lineHeight:1 }}>ادفع اللي استخدمته</h2>
            <div style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.dim, letterSpacing:".12em" }}>CRED · MIN $30 · MAX $5,000 · $1 = 10 CRED</div>
          </div>
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"120px 1fr 120px", gap:10, alignItems:"stretch" }}>
              <button onClick={() => setCustomUsd((v) => Math.max(30, Number(v || 30) - 10))} style={miniBtnStyle(p)}>-</button>
              <div style={{ border:`1px solid ${p.border}`, background:p.bg0, minHeight:60, display:"grid", gridTemplateColumns:"1fr auto", alignItems:"center", padding:"0 18px" }}>
                <input value={customUsd} onChange={(e) => setCustomUsd(e.target.value.replace(/[^0-9.]/g, ""))} onBlur={() => setCustomUsd(clampedCustomUsd)} style={{ width:"100%", background:"transparent", border:0, outline:"none", color:p.fg, fontFamily:"'Bebas Neue', sans-serif", fontSize:38, letterSpacing:".05em", textAlign:"center" }} />
                <span style={{ color:p.accent, fontFamily:"'Space Mono', monospace", fontSize:12 }}>$</span>
              </div>
              <button onClick={() => setCustomUsd((v) => Math.min(5000, Number(v || 30) + 10))} style={miniBtnStyle(p)}>+</button>
            </div>
            <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:6 }}>
              {[30,50,100,300,800,1500].map((amount) => <button key={amount} onClick={() => setCustomUsd(amount)} style={quickBtnStyle(p, Number(clampedCustomUsd) === amount)}>${amount}</button>)}
            </div>
            <div style={{ marginTop:14, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, alignItems:"center" }}>
              <div style={{ fontFamily:"'Space Mono', monospace", color:p.dim, fontSize:11, letterSpacing:".1em" }}>YOU_RECEIVE <span style={{ color:p.accent2 }}>{billCredits(customCredits)}</span></div>
              <CrunchBtn p={p} label={busyKey === "flex" ? "جاري التحويل..." : "ادفع الآن"} solid full onClick={() => buyPlan(clampedCustomUsd, null)} disabled={busyKey === "flex"} />
            </div>
          </div>
        </div>
      </Panel>

      {authed && <Panel p={p} padding={24} style={{ marginTop:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <Tag p={p}>CREDITS_LEDGER</Tag>
          <div style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.dim, letterSpacing:".14em" }}>آخر 12 حركة</div>
        </div>
        <div style={{ marginTop:14, display:"grid", gap:8 }}>
          {!ledger.length && <div style={{ color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13 }}>لا توجد حركات رصيد بعد.</div>}
          {ledger.map((item) => <LedgerRow key={item.id} p={p} item={item} />)}
        </div>
      </Panel>}
    </div>
  </PageFrame>;
}

function BillingPublicNav({ p, navigate }) {
  return <nav style={{ position:"sticky", top:0, zIndex:100, background:`${p.bg0}f2`, backdropFilter:"blur(14px)", borderBottom:`1px solid ${p.border}`, padding:"12px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:18 }}>
    <div style={{ display:"flex", alignItems:"center", gap:14, cursor:"pointer" }} onClick={() => navigate("landing")}>
      <svg width="22" height="22" viewBox="0 0 24 24"><polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke={p.accent} strokeWidth="1.5" fill="none" /><polygon points="12,7 17,10 17,14 12,17 7,14 7,10" fill={p.accent} /></svg>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:17, letterSpacing:".22em", color:p.fg }}>CONTENT/<span style={{ color:p.accent }}>MACHINE</span></div>
    </div>
    <div style={{ display:"flex", gap:10 }}>
      <CrunchBtn p={p} label="الرئيسية" onClick={() => navigate("landing")} />
      <CrunchBtn p={p} label="تسجيل الدخول" solid onClick={() => navigate("auth")} />
    </div>
  </nav>;
}

function TierCard({ p, plan, busy, onBuy }) {
  const credits = Number(plan.amountUsd || 0) * 10;
  return <div style={{ position:"relative", minHeight:170, background:p.bg0, border:`1px solid ${plan.active ? p.accent : p.border}`, padding:16, display:"flex", flexDirection:"column", justifyContent:"space-between", clipPath:"polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)" }}>
    <div style={{ position:"absolute", top:0, left:0, width:36, height:2, background:p.accent }} />
    {plan.active && <div style={{ position:"absolute", top:10, left:10, border:`1px solid ${p.accent2}`, color:p.accent2, fontFamily:"'Space Mono', monospace", fontSize:8, letterSpacing:".16em", padding:"4px 7px" }}>ACTIVE</div>}
    <div>
      <div style={{ fontFamily:"'Space Mono', monospace", color:p.dim, fontSize:9, letterSpacing:".14em", textAlign:"right" }}>{plan.code}</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:25, color:p.fg, letterSpacing:".04em", marginTop:6, textAlign:"right" }}>{plan.name}</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:41, color:plan.active?p.accent:p.fg, letterSpacing:".04em", marginTop:4 }}>{billMoney(plan.amountUsd)}</div>
      <div style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.accent2, letterSpacing:".08em" }}>CRED {credits.toLocaleString()}</div>
      <div style={{ marginTop:8, fontFamily:"'Inter', sans-serif", fontSize:11, color:p.dim, lineHeight:1.5 }}>{plan.subtitle}</div>
    </div>
    <CrunchBtn p={p} label={busy ? "جاري التحويل..." : "اختر"} solid={plan.active} full onClick={onBuy} disabled={busy} />
  </div>;
}

function WalletRow({ p, label, value }) {
  return <div style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"9px 0", borderBottom:`1px dashed ${p.border}` }}>
    <span style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.dim, letterSpacing:".18em" }}>{label}</span>
    <span style={{ fontFamily:"'Space Mono', monospace", fontSize:11, color:p.fg }}>{value}</span>
  </div>;
}

function LedgerRow({ p, item }) {
  const delta = Number(item.deltaCredits || 0);
  const positive = delta >= 0;
  return <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, alignItems:"center", background:p.bg0, border:`1px solid ${p.border}`, padding:12 }}>
    <div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", color:p.fg, fontSize:18, letterSpacing:".05em" }}>{item.reason || item.type || "credit movement"}</div>
      <div style={{ fontFamily:"'Space Mono', monospace", color:p.dim, fontSize:9, letterSpacing:".08em", marginTop:4 }}>{item.type} · {new Date(item.createdAt).toLocaleString()}</div>
    </div>
    <div style={{ fontFamily:"'Space Mono', monospace", color:positive?p.accent2:p.warn, fontSize:12 }}>{positive?"+":""}{delta.toLocaleString()} CRED</div>
  </div>;
}

function miniBtnStyle(p) {
  return { background:p.bg0, border:`1px solid ${p.border}`, color:p.accent, fontFamily:"'Bebas Neue', sans-serif", fontSize:32, cursor:"pointer" };
}
function quickBtnStyle(p, active) {
  return { background:active?p.accent:p.bg0, border:`1px solid ${active?p.accent:p.border}`, color:active?"#080605":p.dim, padding:"10px 4px", fontFamily:"'Space Mono', monospace", fontSize:10, cursor:"pointer" };
}

Object.assign(window, { BillingPage });

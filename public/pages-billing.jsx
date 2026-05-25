// Billing / Wallet page connected to backend PayPal + credits ledger.

function billToken() { return localStorage.getItem("cm_token") || ""; }
function billCurrentUser() { try { return JSON.parse(localStorage.getItem("cm_user") || "null") || { name:"Operator", email:"" }; } catch { return { name:"Operator", email:"" }; } }
async function billApi(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { "Content-Type":"application/json", ...(opts.headers || {}), ...(billToken() ? { Authorization:`Bearer ${billToken()}` } : {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "API request failed");
  return data;
}
function billMoney(n) { return `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }
function billCredits(n) { return `${Number(n || 0).toLocaleString()} credits`; }
function billReadReturnState() {
  const hash = String(window.location.hash || "");
  const search = String(window.location.search || "");
  return {
    approved: hash.includes("paypal=approved") || search.includes("token="),
    cancelled: hash.includes("paypal=cancelled"),
  };
}

function BillingPage({ p, navigate }) {
  const [user, setUser] = React.useState(billCurrentUser());
  const [wallet, setWallet] = React.useState(null);
  const [plans, setPlans] = React.useState([]);
  const [ledger, setLedger] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busyPlan, setBusyPlan] = React.useState("");
  const [err, setErr] = React.useState("");
  const [msg, setMsg] = React.useState("");

  async function load() {
    if (!billToken()) { navigate("auth"); return; }
    setErr("");
    try {
      const [me, w, bp, led] = await Promise.all([
        billApi("/api/auth/me"),
        billApi("/api/me/wallet"),
        fetch("/api/billing/plans").then(r => r.json()),
        billApi("/api/me/credits/ledger?limit=12")
      ]);
      if (me.user) { setUser(me.user); localStorage.setItem("cm_user", JSON.stringify(me.user)); }
      setWallet(w.wallet || null);
      setPlans(bp.plans || []);
      setLedger(led.ledger || []);
      window.dispatchEvent(new Event("cm-wallet-changed"));
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
      if (orderId) captureOrder(orderId, true);
      else setErr("رجعت من PayPal لكن لم نجد رقم الطلب المؤقت. أعد محاولة الشحن.");
    }
  }, []);

  async function buy(plan) {
    setErr(""); setMsg(""); setBusyPlan(plan.key);
    try {
      const data = await billApi("/api/billing/paypal/create-order", { method:"POST", body: JSON.stringify({ planKey: plan.key }) });
      if (!data.approvalUrl || !data.paypalOrderId) throw new Error("PayPal approval URL missing");
      localStorage.setItem("cm_pending_paypal_order_id", data.paypalOrderId);
      window.location.href = data.approvalUrl;
    } catch(e) { setErr(e.message || "فشل إنشاء طلب PayPal"); }
    finally { setBusyPlan(""); }
  }

  async function captureOrder(orderId, fromReturn) {
    setErr(""); setMsg("جاري تأكيد الدفع وإضافة الكريدتس...");
    try {
      const data = await billApi("/api/billing/paypal/capture-order", { method:"POST", body: JSON.stringify({ paypalOrderId: orderId }) });
      localStorage.removeItem("cm_pending_paypal_order_id");
      if (data.wallet) setWallet(data.wallet);
      setMsg(`تمت إضافة ${Number(data.payment?.credits || 0).toLocaleString()} credits إلى رصيدك`);
      window.dispatchEvent(new Event("cm-wallet-changed"));
      await load();
      if (fromReturn && window.location.hash.includes("paypal=")) window.location.hash = "#/billing";
    } catch(e) { setErr(e.message || "فشل تأكيد الدفع"); }
  }

  return <PageFrame p={p} density={0.35}>
    <AuthedNav p={p} current="billing" navigate={navigate} user={user} />
    <div style={{ padding:"32px", maxWidth:1280, margin:"0 auto" }}>
      <SectionHead p={p} code="// WALLET_BILLING" title="الفوترة والكريدتس" sub="اشحن رصيدك، وشغّل عمليات المنصة بالكريدتس. 1 دولار = 10 كريدت." right={<CrunchBtn p={p} label="تحديث" onClick={load} />} />
      {err && <div style={{ marginBottom:12 }}><Toast p={p} type="error">{err}</Toast></div>}
      {msg && <div style={{ marginBottom:12 }}><Toast p={p} type="success">{msg}</Toast></div>}

      <div style={{ display:"grid", gridTemplateColumns:"1.05fr 1.6fr", gap:16, marginBottom:16 }}>
        <Panel p={p} padding={26}>
          <Tag p={p}>CURRENT_WALLET</Tag>
          <div style={{ marginTop:18, fontFamily:"'Bebas Neue', sans-serif", fontSize:62, color:p.accent, letterSpacing:".04em", lineHeight:1 }}>{billCredits(wallet?.availableCredits || 0)}</div>
          <div style={{ marginTop:10, display:"grid", gap:8 }}>
            <WalletRow p={p} label="BALANCE" value={billCredits(wallet?.balanceCredits || 0)} />
            <WalletRow p={p} label="RESERVED" value={billCredits(wallet?.reservedCredits || 0)} />
            <WalletRow p={p} label="LIFETIME_USED" value={billCredits(wallet?.lifetimeUsedCredits || 0)} />
          </div>
          <div style={{ marginTop:18, color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13, lineHeight:1.8 }}>قبل أي عملية إنتاج، النظام يحجز الحد الأعلى للتكلفة. بعد التنفيذ يخصم التكلفة الفعلية ويرجع الفرق تلقائيًا.</div>
        </Panel>

        <Panel p={p} padding={26}>
          <Tag p={p}>TOP_UP</Tag>
          <div style={{ marginTop:14, display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:12 }}>
            {loading && <div style={{ gridColumn:"1/-1", color:p.dim }}>جاري تحميل خطط الشحن...</div>}
            {!loading && plans.map((plan) => <TopupCard key={plan.key} p={p} plan={plan} busy={busyPlan === plan.key} onBuy={() => buy(plan)} />)}
          </div>
        </Panel>
      </div>

      <Panel p={p} padding={24}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <Tag p={p}>CREDITS_LEDGER</Tag>
          <div style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.dim, letterSpacing:".14em" }}>آخر 12 حركة</div>
        </div>
        <div style={{ marginTop:14, display:"grid", gap:8 }}>
          {!ledger.length && <div style={{ color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13 }}>لا توجد حركات رصيد بعد.</div>}
          {ledger.map((item) => <LedgerRow key={item.id} p={p} item={item} />)}
        </div>
      </Panel>
    </div>
  </PageFrame>;
}

function WalletRow({ p, label, value }) {
  return <div style={{ display:"flex", justifyContent:"space-between", gap:12, padding:"9px 0", borderBottom:`1px dashed ${p.border}` }}>
    <span style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.dim, letterSpacing:".18em" }}>{label}</span>
    <span style={{ fontFamily:"'Space Mono', monospace", fontSize:11, color:p.fg }}>{value}</span>
  </div>;
}

function TopupCard({ p, plan, busy, onBuy }) {
  return <div style={{ position:"relative", background:p.bg0, border:`1px solid ${p.border}`, padding:16, minHeight:160, display:"flex", flexDirection:"column", justifyContent:"space-between", clipPath:"polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)" }}>
    <div style={{ position:"absolute", top:0, left:0, width:36, height:2, background:p.accent }} />
    <div>
      <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:p.dim, letterSpacing:".18em" }}>TOPUP</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:42, color:p.fg, letterSpacing:".05em", marginTop:6 }}>{billMoney(plan.amountUsd)}</div>
      <div style={{ fontFamily:"'Space Mono', monospace", fontSize:11, color:p.accent, letterSpacing:".08em" }}>{billCredits(plan.credits)}</div>
    </div>
    <CrunchBtn p={p} label={busy ? "جاري التحويل..." : "شراء عبر PayPal"} solid full onClick={onBuy} disabled={busy} />
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
    <div style={{ fontFamily:"'Space Mono', monospace", color:positive?p.accent2:p.warn, fontSize:12 }}>{positive?"+":""}{delta.toLocaleString()} credits</div>
  </div>;
}

Object.assign(window, { BillingPage });

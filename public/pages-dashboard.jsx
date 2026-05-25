// Dashboard page — connected to backend API.

const PLANS_DASH = [
  { key: "starter", name: "ابتدائي",   price: 150,  credits: 1500,  badge: "للبداية" },
  { key: "growth",  name: "مُعزز",      price: 300,  credits: 3300,  badge: "للنمو" },
  { key: "pro",     name: "احترافي",    price: 800,  credits: 9600,  badge: "يزيد الوفرة", featured: true },
  { key: "agency",  name: "الأقصى",     price: 1500, credits: 19500, badge: "للوكالات" },
];

function dashToken() { return localStorage.getItem("cm_token") || ""; }
function dashUserFallback() {
  try { return JSON.parse(localStorage.getItem("cm_user") || "null") || { name: "Operator", email: "" }; }
  catch { return { name: "Operator", email: "" }; }
}
async function dashApi(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(dashToken() ? { Authorization: `Bearer ${dashToken()}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "API request failed");
  return data;
}
function dashLogout(navigate) {
  fetch("/api/auth/logout", { method: "POST", headers: dashToken() ? { Authorization: `Bearer ${dashToken()}` } : {} }).catch(() => {});
  localStorage.removeItem("cm_token");
  localStorage.removeItem("cm_user");
  history.replaceState(null, "", "#/auth");
  navigate("auth");
}
function projectStatusLabel(s) {
  return ({ draft:"DRAFT", pending_payment:"PAYMENT", paid:"PAID", in_production:"PRODUCTION", delivered:"DELIVERED", cancelled:"CANCELLED", failed:"FAILED" })[s] || String(s || "").toUpperCase();
}
function projectStatusColor(p, s) {
  return ({ draft:p.dim, pending_payment:p.warn, paid:p.accent2, in_production:p.accent, delivered:p.accent2, cancelled:p.warn, failed:p.warn })[s] || p.dim;
}
function serviceLabel(s) {
  return ({ film_maker:"صانع الأفلام", marketing_agent:"وكيل التسويق", service_agent:"وكيل الخدمة", youtube_documentary:"وثائقي يوتيوب", ugc_avatar:"أفاتار UGC" })[s] || s || "مشروع";
}

function DashboardPage({ p, navigate, credits = 0 }) {
  const [tab, setTab] = React.useState("home");
  const [user, setUser] = React.useState(dashUserFallback());
  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  async function load() {
    if (!dashToken()) { navigate("auth"); return; }
    setLoading(true); setErr("");
    try {
      const me = await dashApi("/api/auth/me");
      if (me.user) { setUser(me.user); localStorage.setItem("cm_user", JSON.stringify(me.user)); }
      const list = await dashApi("/api/projects");
      setProjects(list.projects || []);
    } catch (e) {
      setErr(e.message || "فشل تحميل البيانات");
      if (String(e.message || "").includes("unauthorized")) navigate("auth");
    } finally { setLoading(false); }
  }

  React.useEffect(() => { load(); }, []);

  return (
    <PageFrame p={p} density={0.35}>
      <AuthedNav p={p} current="dashboard" navigate={navigate} credits={credits} user={user} onLogout={() => dashLogout(navigate)} />

      <div style={{ borderBottom: `1px solid ${p.border}`, padding: "0 32px", display: "flex", gap: 4, background: p.bg0 }}>
        {[{ id:"home", l:"نظرة عامة", icon:"◇" }, { id:"billing", l:"الباقات", icon:"$" }].map(t => {
          const on = tab === t.id;
          return <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:"12px 18px", background:"transparent", color:on?p.accent:p.dim, border:"none", borderBottom:`2px solid ${on?p.accent:"transparent"}`, fontFamily:"'Bebas Neue', sans-serif", fontSize:14, letterSpacing:".15em", cursor:"pointer", marginBottom:-1, display:"inline-flex", alignItems:"center", gap:6 }}>
            <span style={{ fontFamily:"'Space Mono', monospace", fontSize:11, opacity:.8 }}>{t.icon}</span>{t.l}
          </button>;
        })}
      </div>

      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
        {err && <div style={{ marginBottom: 16 }}><Toast p={p} type="error">{err}</Toast></div>}
        {loading ? <DashboardLoading p={p} /> : null}
        {!loading && tab === "home" && <DashHome p={p} navigate={navigate} user={user} projects={projects} />}
        {!loading && tab === "billing" && <DashBilling p={p} navigate={navigate} />}
      </div>
    </PageFrame>
  );
}

function DashboardLoading({ p }) {
  return <Panel p={p} padding={40} style={{ textAlign:"center" }}><AuroraLoader p={p} size={86} /><div style={{ marginTop:14, fontFamily:"'Space Mono', monospace", color:p.dim, letterSpacing:".18em", fontSize:10 }}>LOADING_OPERATOR_CONTEXT</div></Panel>;
}

function DashHome({ p, navigate, user, projects }) {
  const delivered = projects.filter(x => x.status === "delivered").length;
  const paid = projects.filter(x => x.paymentStatus === "paid").length;
  const active = projects.filter(x => ["paid", "in_production", "pending_payment"].includes(x.status)).length;
  return <>
    <SectionHead p={p} code="// COMMAND_CENTER" title={`أهلاً ${user.name || "Operator"}`} sub="نظرة عامة على نشاطك الحالي" />

    <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14, marginBottom:18 }}>
      <DashStat p={p} label="TOTAL_ORDERS" value={projects.length} />
      <DashStat p={p} label="PAID" value={paid} accent />
      <DashStat p={p} label="ACTIVE" value={active} />
      <DashStat p={p} label="DELIVERED" value={delivered} accent />
    </div>

    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
      <ActionCard p={p} onClick={() => navigate("film-hub")} code="//01" title="صانع الأفلام" sub="CINEMATIC_PIPELINE" desc="ابدأ طلب فيلم أو وثائقي، ثم ارفق البرومبت والملفات من صفحة المشروع." actionLabel="ابدأ الإنتاج" hot />
      <ActionCard p={p} onClick={() => navigate("market-hub")} code="//02" title="وكيل التسويق" sub="MARKETING_AGENT" desc="ابدأ طلب حملة، خطة محتوى، UGC، أو بحث تسويقي منظم." actionLabel="ابدأ التسويق" />
    </div>

    <Panel p={p} padding={20}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div><div style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.accent, letterSpacing:".22em" }}>// RECENT_ORDERS</div><div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:p.fg, letterSpacing:".05em", marginTop:4 }}>المشاريع الأخيرة</div></div>
        <a onClick={() => navigate("library")} style={{ fontFamily:"'Space Mono', monospace", fontSize:11, color:p.accent, letterSpacing:".18em", cursor:"pointer" }}>↳ كل المشاريع</a>
      </div>
      <RecentListConnected p={p} navigate={navigate} projects={projects.slice(0, 5)} />
    </Panel>
  </>;
}

function DashStat({ p, label, value, accent }) {
  return <Panel p={p} padding={18}><div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:p.dim, letterSpacing:".22em" }}>{label}</div><div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:42, color:accent?p.accent:p.fg, lineHeight:1, marginTop:8 }}>{value}</div></Panel>;
}

function ActionCard({ p, onClick, code, title, sub, desc, actionLabel, hot }) {
  const [hover, setHover] = React.useState(false);
  return <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ position:"relative", padding:24, background:hot||hover?p.bg2:p.bg1, border:`1px solid ${hover||hot?p.accent:p.border}`, cursor:"pointer", transition:"all .15s", clipPath:"polygon(0 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)" }}>
    <div style={{ position:"absolute", top:0, left:0, width:hover||hot?80:30, height:2, background:p.accent, transition:"width .25s" }} />
    <div style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.dim, letterSpacing:".22em" }}>{code} {sub}</div>
    <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:38, color:p.fg, letterSpacing:".05em", marginTop:6, lineHeight:1 }}>{title}</div>
    <div style={{ fontFamily:"'Inter', sans-serif", fontSize:13, color:p.dim, lineHeight:1.7, margin:"14px 0 18px", minHeight:46 }}>{desc}</div>
    <CrunchBtn p={p} label={`${actionLabel} ←`} solid={hot} small />
  </div>;
}

function RecentListConnected({ p, navigate, projects }) {
  if (!projects.length) return <div style={{ padding:18, color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13 }}>لا توجد طلبات بعد. افتح مكتبة المشاريع وأنشئ أول طلب.</div>;
  return <div>{projects.map((j) => <div key={j.id} onClick={() => { localStorage.setItem("cm_last_project_id", j.id); navigate("project-detail", { id:j.id }); }} style={{ display:"grid", gridTemplateColumns:"auto 1fr auto auto", gap:16, alignItems:"center", padding:"12px 14px", marginBottom:4, background:p.bg2, border:`1px solid ${p.border}`, cursor:"pointer" }}>
    <span style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.dim, letterSpacing:".18em" }}>JOB//{j.id.slice(-6).toUpperCase()}</span>
    <div><div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, color:p.fg, letterSpacing:".06em", lineHeight:1.2 }}>{j.title}</div><div style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.dim, letterSpacing:".12em", marginTop:2 }}>{serviceLabel(j.serviceType)} · ${j.priceUsd}</div></div>
    <Tag p={p} color={projectStatusColor(p, j.status)}>{projectStatusLabel(j.status)}</Tag>
    <span style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.dim, letterSpacing:".12em" }}>{new Date(j.updatedAt || j.createdAt).toLocaleDateString("ar")}</span>
  </div>)}</div>;
}

function DashBilling({ p }) {
  const [amount, setAmount] = React.useState(0);
  const credits = amount > 0 ? Math.floor(amount / 0.0792) : 0;
  const valid = amount >= 5 && amount <= 5000;

  return (
    <>
      <SectionHead p={p} code="// FINANCIAL_OPS" title="الفوترة والاشتراك" sub="إدارة خطتك ومخزن الكريديت" />

      {/* current plan */}
      <Panel p={p} padding={22} style={{ marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 28, alignItems: "center" }}>
          <div>
            <Tag p={p} color={p.accent2}>● ACTIVE_PLAN</Tag>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: p.fg, letterSpacing: ".05em", marginTop: 10, lineHeight: 1 }}>
              GROWTH · مُعزز
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em", marginTop: 8 }}>
              التجديد التالي: 18 ديسمبر · $300/شهر
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>CRED_THIS_PERIOD</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: p.accent, lineHeight: 1, marginTop: 6 }}>
              2,313<span style={{ fontSize: 14, color: p.dim, marginRight: 6 }}>/ 3,300</span>
            </div>
            <StatusBar p={p} label="" value={70} color={p.accent} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <CrunchBtn p={p} label="ترقية الخطة" solid icon="↑" full />
            <CrunchBtn p={p} label="إيقاف التجديد" small full />
          </div>
        </div>
      </Panel>

      <SectionHead p={p} code="// TIERS_AVAILABLE" title="خطط الكريديت" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
        {PLANS_DASH.map(plan => <BillingPlan key={plan.key} p={p} plan={plan} active={plan.key === "growth"} />)}
      </div>

      {/* PAYG */}
      <Panel p={p} padding={22}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22, alignItems: "center" }}>
          <div>
            <Tag p={p}>FLEX_TX</Tag>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: p.fg, marginTop: 8, lineHeight: 1, letterSpacing: ".04em" }}>
              ادفع اللي استخدمته
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em", marginTop: 6 }}>
              $0.079 / CRED · MAX $5,000
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 6 }}>// AMOUNT_USD</div>
            <NumberSwitch p={p} value={amount} onChange={setAmount} min={0} max={5000}
              step={(v) => v < 50 ? 1 : v < 200 ? 5 : v < 1000 ? 10 : 50}
              prefix="$" />
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              {[10, 50, 100, 500, 1000].map(v => (
                <button key={v} onClick={() => setAmount(v)} style={{
                  flex: 1, padding: "6px 0",
                  background: amount === v ? `${p.accent}22` : p.bg2,
                  color: amount === v ? p.accent : p.dim,
                  border: `1px solid ${amount === v ? p.accent : p.border}`,
                  fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".12em",
                  cursor: "pointer",
                }}>${v}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>YOU_RECEIVE</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, color: p.accent, lineHeight: 1, marginTop: 4 }}>
              {credits ? credits.toLocaleString() : "—"}
              <span style={{ fontSize: 11, color: p.dim, marginRight: 6, fontFamily: "'Space Mono', monospace" }}>CRED</span>
            </div>
            <div style={{ marginTop: 10 }}>
              <CrunchBtn p={p} label="ادفع الآن" solid icon="▶" disabled={!valid} full />
            </div>
          </div>
        </div>
      </Panel>

      {/* invoice history */}
      <Panel p={p} padding={20} style={{ marginTop: 18 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 14 }}>// INVOICE_LOG</div>
        {[
          ["INV-7B41", "اشتراك GROWTH",    "18 نوفمبر",  "$300.00",  "PAID"],
          ["INV-7A2C", "شحن كريديت",      "12 نوفمبر",  "$50.00",   "PAID"],
          ["INV-78E1", "اشتراك GROWTH",    "18 أكتوبر",  "$300.00",  "PAID"],
          ["INV-75F0", "شحن كريديت",      "5 أكتوبر",   "$120.00",  "PAID"],
        ].map((row, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto auto auto",
            gap: 24, padding: "10px 0", borderBottom: i < 3 ? `1px dashed ${p.border}` : "none",
            fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".12em", alignItems: "center",
          }}>
            <span style={{ color: p.accent }}>{row[0]}</span>
            <span style={{ color: p.fg, fontFamily: "'Inter', sans-serif", letterSpacing: 0 }}>{row[1]}</span>
            <span>{row[2]}</span>
            <span style={{ color: p.fg, fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: ".05em" }}>{row[3]}</span>
            <Tag p={p} color={p.accent2}>● {row[4]}</Tag>
          </div>
        ))}
      </Panel>
    </>
  );
}

function BillingPlan({ p, plan, active }) {
  return (
    <div style={{
      position: "relative", padding: 20, background: plan.featured ? p.bg2 : p.bg1,
      border: `1px solid ${plan.featured ? p.accent : p.border}`,
      clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: plan.featured ? 60 : 30, height: 2, background: plan.featured ? p.accent : p.dim }} />
      {active && (
        <div style={{
          position: "absolute", top: -1, right: -1, padding: "3px 10px", background: p.accent2, color: p.bg0,
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, letterSpacing: ".18em",
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 12px 100%)",
        }}>
          ACTIVE
        </div>
      )}
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", marginBottom: 8 }}>
        TIER_{plan.key.toUpperCase()}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: p.fg, letterSpacing: ".08em", lineHeight: 1.2, marginBottom: 14 }}>
        {plan.name}
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, letterSpacing: ".02em", color: plan.featured ? p.accent : p.fg, lineHeight: 1 }}>
        ${plan.price}<span style={{ fontSize: 11, color: p.dim, marginRight: 4 }}>/MO</span>
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent2, marginTop: 4, letterSpacing: ".15em" }}>
        {plan.credits.toLocaleString()} CRED
      </div>
      <div style={{ marginTop: 14 }}>
        <CrunchBtn p={p} label={active ? "خطتك الحالية" : "اختر"} solid={plan.featured && !active} small full disabled={active} />
      </div>
    </div>
  );
}

Object.assign(window, { DashboardPage });

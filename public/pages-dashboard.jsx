// Dashboard page — connected to backend API.

const PLANS_DASH = [
  { key: "starter", name: "Starter", price: 150, badge: "للبداية" },
  { key: "growth", name: "Growth", price: 300, badge: "للنمو" },
  { key: "pro", name: "Pro", price: 800, badge: "احترافي", featured: true },
  { key: "agency", name: "Agency", price: 1500, badge: "للوكالات" },
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
        {[{ id:"home", l:"نظرة عامة", icon:"◇" }, { id:"billing", l:"الباقات", icon:"$" }, { id:"security", l:"الأمان", icon:"⌬" }].map(t => {
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
        {!loading && tab === "security" && <DashSecurityConnected p={p} navigate={navigate} user={user} />}
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

function DashBilling({ p, navigate }) {
  const [packages, setPackages] = React.useState(PLANS_DASH);
  React.useEffect(() => { fetch("/api/packages").then(r => r.json()).then(d => setPackages(d.packages || PLANS_DASH)).catch(() => {}); }, []);
  return <>
    <SectionHead p={p} code="// PACKAGES" title="الباقات" sub="اختار باقة ثم أنشئ طلبك من مكتبة المشاريع" />
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14 }}>
      {packages.map(plan => <div key={plan.key} style={{ position:"relative", padding:20, background:plan.key==="pro"?p.bg2:p.bg1, border:`1px solid ${plan.key==="pro"?p.accent:p.border}`, clipPath:"polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%)" }}>
        <div style={{ position:"absolute", top:0, left:0, width:plan.key==="pro"?60:30, height:2, background:plan.key==="pro"?p.accent:p.dim }} />
        <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:p.dim, letterSpacing:".22em", marginBottom:8 }}>PACKAGE_{plan.key.toUpperCase()}</div>
        <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:p.fg, letterSpacing:".08em" }}>{plan.name}</div>
        <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:44, color:p.accent, lineHeight:1, margin:"14px 0" }}>${plan.priceUsd}</div>
        <CrunchBtn p={p} label="إنشاء طلب" solid={plan.key==="pro"} full onClick={() => navigate("library")} />
      </div>)}
    </div>
  </>;
}

function DashSecurityConnected({ p, navigate, user }) {
  const [oldPassword, setOldPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [setup, setSetup] = React.useState(null);
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  async function run(path, body) { setMsg(""); setErr(""); try { const d = await dashApi(path, { method:"POST", body: JSON.stringify(body || {}) }); setMsg("تم تنفيذ العملية"); return d; } catch(e) { setErr(e.message); } }
  return <>
    <SectionHead p={p} code="// SECURITY" title="الأمان" sub={`الحساب: ${user.email || ""}`} />
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
      <Panel p={p} padding={22}>
        <Tag p={p}>PASSWORD</Tag>
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:16 }}>
          <TacticalInput p={p} label="كلمة السر الحالية" value={oldPassword} onChange={setOldPassword} type="password" rtl={false} />
          <TacticalInput p={p} label="كلمة السر الجديدة" value={newPassword} onChange={setNewPassword} type="password" rtl={false} />
          <CrunchBtn p={p} label="تغيير كلمة المرور" solid full onClick={() => run("/api/security/change-password", { oldPassword, newPassword })} />
        </div>
      </Panel>
      <Panel p={p} padding={22}>
        <Tag p={p}>2FA</Tag>
        <div style={{ color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13, lineHeight:1.8, marginTop:14 }}>فعّل المصادقة الثنائية باستخدام كود Authenticator.</div>
        <div style={{ display:"flex", gap:8, marginTop:14 }}>
          <CrunchBtn p={p} label="إنشاء سر 2FA" onClick={async () => { const d = await run("/api/security/2fa/setup", {}); if (d) setSetup(d); }} />
          <CrunchBtn p={p} label="إنهاء كل الجلسات" onClick={() => run("/api/security/logout-all", {})} />
        </div>
        {setup && <div style={{ marginTop:14 }}><Toast p={p}>Secret: {setup.secret || setup.otpauth || "generated"}</Toast></div>}
        <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"1fr auto", gap:8 }}>
          <TacticalInput p={p} label="كود التفعيل" value={code} onChange={setCode} rtl={false} />
          <div style={{ alignSelf:"end" }}><CrunchBtn p={p} label="تفعيل" solid onClick={() => run("/api/security/2fa/enable", { code })} /></div>
        </div>
      </Panel>
    </div>
    <div style={{ marginTop:14 }}>{err && <Toast p={p} type="error">{err}</Toast>}{msg && <Toast p={p} type="success">{msg}</Toast>}</div>
  </>;
}

Object.assign(window, { DashboardPage });

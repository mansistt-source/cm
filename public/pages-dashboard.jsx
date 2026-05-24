// Dashboard page — Home / Billing / Security tabs.

const PLANS_DASH = [
  { key: "starter", name: "ابتدائي",   price: 150,  credits: 1500,  badge: "للبداية" },
  { key: "growth",  name: "مُعزز",      price: 300,  credits: 3300,  badge: "للنمو" },
  { key: "pro",     name: "احترافي",    price: 800,  credits: 9600,  badge: "يزيد الوفرة", featured: true },
  { key: "agency",  name: "الأقصى",     price: 1500, credits: 19500, badge: "للوكالات" },
];

function DashboardPage({ p, navigate, user = { name: "أحمد", email: "ahmed@op.r74", initial: "أ" }, credits = 4820 }) {
  const [tab, setTab] = React.useState("home");

  return (
    <PageFrame p={p} density={0.35}>
      <AuthedNav p={p} current="dashboard" navigate={navigate} credits={credits} user={user} onLogout={() => navigate("auth")} />

      {/* sub-tabs */}
      <div style={{ borderBottom: `1px solid ${p.border}`, padding: "0 32px", display: "flex", gap: 4, background: p.bg0 }}>
        {[
          { id: "home",     l: "نظرة عامة", icon: "◇" },
          { id: "billing",  l: "الفوترة",   icon: "$" },
          { id: "security", l: "الأمان",   icon: "⌬" },
        ].map(t => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "12px 18px",
              background: "transparent",
              color: on ? p.accent : p.dim,
              border: "none", borderBottom: `2px solid ${on ? p.accent : "transparent"}`,
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: ".15em",
              cursor: "pointer", marginBottom: -1,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, opacity: .8 }}>{t.icon}</span>
              {t.l}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
        {tab === "home"     && <DashHome p={p} navigate={navigate} user={user} credits={credits} />}
        {tab === "billing"  && <DashBilling p={p} />}
        {tab === "security" && <DashSecurity p={p} user={user} />}
      </div>
    </PageFrame>
  );
}

// ---------- HOME tab ----------
function DashHome({ p, navigate, user, credits }) {
  return (
    <>
      <SectionHead p={p} code="// COMMAND_CENTER" title={`أهلاً ${user.name}`} sub="نظرة عامة على نشاطك الحالي" />

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, marginBottom: 18 }}>

        {/* CRED ORB */}
        <Panel p={p} padding={26}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}>
            <div>
              <Tag p={p}>CRED_BALANCE</Tag>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 86, color: p.fg, lineHeight: 1, letterSpacing: ".02em", marginTop: 10 }}>
                <CountUp value={credits} />
                <span style={{ fontSize: 18, color: p.dim, marginRight: 8 }}>CRED</span>
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em", marginTop: 6 }}>
                1 CRED ≈ ثانية فيديو احترافي
              </div>
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <CrunchBtn p={p} label="شحن المخزن" small icon="+" solid onClick={() => {}} />
                <CrunchBtn p={p} label="ترقية الخطة" small icon="↑" />
              </div>
            </div>
            {/* orb */}
            <div style={{ width: 160, height: 160, position: "relative" }}>
              <svg width="160" height="160" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke={p.border} strokeWidth="1" fill="none" />
                <circle cx="50" cy="50" r="44" stroke={p.accent} strokeWidth="2"
                  fill="none" strokeDasharray="276" strokeDashoffset="83"
                  transform="rotate(-90 50 50)" style={{ filter: `drop-shadow(0 0 6px ${p.accent})` }} />
                <circle cx="50" cy="50" r="34" stroke={p.border} strokeWidth="1" fill="none" opacity=".5" />
                <text x="50" y="54" textAnchor="middle" fill={p.accent}
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: ".05em" }}>70%</text>
                {/* ticks */}
                {Array.from({ length: 24 }).map((_, i) => {
                  const a = (i / 24) * Math.PI * 2;
                  const x1 = 50 + Math.cos(a) * 47;
                  const y1 = 50 + Math.sin(a) * 47;
                  const x2 = 50 + Math.cos(a) * 49;
                  const y2 = 50 + Math.sin(a) * 49;
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={p.dim} strokeWidth=".5" />;
                })}
              </svg>
              <div style={{ position: "absolute", top: "75%", left: "50%", transform: "translateX(-50%)", fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>
                MONTHLY
              </div>
            </div>
          </div>
        </Panel>

        {/* QUICK STATS */}
        <Panel p={p} padding={20}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>// THIS_MONTH</div>
          {[
            { l: "RUNS_EXECUTED",     v: 12,    delta: "+4" },
            { l: "CRED_USED",         v: 432,   delta: "+102" },
            { l: "AVG_DURATION",      v: "3:47", delta: "-8s" },
            { l: "SUCCESS",           v: "98%", delta: "+0.4" },
          ].map((s, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: i < 3 ? `1px dashed ${p.border}` : "none",
            }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em" }}>{s.l}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: p.fg, letterSpacing: ".04em" }}>{s.v}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: s.delta.startsWith("-") ? p.warn : p.accent2, letterSpacing: ".1em" }}>{s.delta}</span>
              </div>
            </div>
          ))}
        </Panel>
      </div>

      {/* TWO MAIN ACTION CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <ActionCard p={p} onClick={() => navigate("film-hub")}
          code="//01" title="صانع الأفلام" sub="CINEMATIC_PIPELINE"
          desc="فيلم سينمائي أو وثائقي احترافي. خط إنتاج كامل من الفكرة للملف النهائي."
          glyph={
            <svg width="100" height="100" viewBox="0 0 100 100">
              <rect x="20" y="30" width="60" height="40" stroke={p.accent} strokeWidth="1" fill="none" />
              <polygon points="42,40 42,60 60,50" fill={p.accent} />
              <line x1="20" y1="22" x2="80" y2="22" stroke={p.accent} strokeWidth=".5" opacity=".5" />
              <line x1="20" y1="78" x2="80" y2="78" stroke={p.accent} strokeWidth=".5" opacity=".5" />
            </svg>
          }
          actionLabel="ابدأ الإنتاج" hot
        />
        <ActionCard p={p} onClick={() => navigate("market-hub")}
          code="//02" title="وكيل التسويق" sub="MARKETING_AGENT"
          desc="وكيل تسويق كامل: ترندات، حملات، خطط محتوى، UGC. الذكاء يعمل بالنيابة عنك."
          glyph={
            <svg width="100" height="100" viewBox="0 0 100 100">
              <polygon points="50,15 80,50 50,85 20,50" stroke={p.accent} strokeWidth="1" fill="none" />
              <circle cx="50" cy="50" r="10" fill={p.accent} />
              <line x1="50" y1="15" x2="50" y2="85" stroke={p.accent} strokeWidth=".5" opacity=".4" />
              <line x1="20" y1="50" x2="80" y2="50" stroke={p.accent} strokeWidth=".5" opacity=".4" />
            </svg>
          }
          actionLabel="ابدأ التسويق"
        />
      </div>

      {/* RECENT PROJECTS */}
      <Panel p={p} padding={20}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// RECENT_OPS</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: p.fg, letterSpacing: ".05em", marginTop: 4 }}>
              المشاريع الأخيرة
            </div>
          </div>
          <a onClick={() => navigate("library")} style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.accent, letterSpacing: ".18em", cursor: "pointer" }}>
            ↳ كل المشاريع
          </a>
        </div>
        <RecentList p={p} navigate={navigate} />
      </Panel>
    </>
  );
}

function ActionCard({ p, onClick, code, title, sub, desc, glyph, actionLabel, hot }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", padding: 24, background: hot || hover ? p.bg2 : p.bg1,
        border: `1px solid ${hover || hot ? p.accent : p.border}`,
        cursor: "pointer", transition: "all .15s",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)",
      }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: hover || hot ? 80 : 30, height: 2, background: p.accent, transition: "width .25s" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>{code} {sub}</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, color: p.fg, letterSpacing: ".05em", marginTop: 4, lineHeight: 1 }}>{title}</div>
        </div>
        <div style={{ opacity: hover || hot ? 1 : 0.5, transition: "opacity .25s" }}>{glyph}</div>
      </div>

      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.dim, lineHeight: 1.7, marginBottom: 18, minHeight: 50 }}>
        {desc}
      </div>

      <CrunchBtn p={p} label={`${actionLabel} ←`} solid={hot} small />

      <div style={{
        position: "absolute", right: 0, bottom: 0, width: 18, height: 18,
        background: hover || hot ? p.accent : "transparent",
        clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
      }} />
    </div>
  );
}

function RecentList({ p, navigate }) {
  const projects = [
    { id: 1, name: "حملة إطلاق العطر",        type: "حملة",   status: "RENDER", prog: 84,  color: p.accent,   time: "منذ 2د" },
    { id: 2, name: "وثائقي الحضارات",         type: "وثائقي", status: "DONE",   prog: 100, color: p.accent2, time: "منذ ساعة" },
    { id: 3, name: "إعلان منتج جديد",         type: "إعلان",  status: "FRAMES", prog: 32,  color: p.warn,    time: "منذ 3س" },
    { id: 4, name: "ميتيريال أنيمي",         type: "أنيمي",  status: "QUEUE",  prog: 12,  color: p.dim,     time: "أمس" },
  ];
  return (
    <div>
      {projects.map((j, i) => (
        <div key={j.id} onClick={() => navigate("project-detail", { id: j.id })}
          style={{
            display: "grid", gridTemplateColumns: "auto 1fr auto auto auto",
            gap: 16, alignItems: "center",
            padding: "12px 14px", marginBottom: 4,
            background: p.bg2, border: `1px solid ${p.border}`,
            cursor: "pointer", transition: "border-color .15s",
          }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
            JOB//{j.id.toString().padStart(3, "0")}
          </span>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.fg, letterSpacing: ".06em", lineHeight: 1.2 }}>{j.name}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em", marginTop: 2 }}>{j.type}</div>
          </div>
          <div style={{ width: 140 }}>
            <StatusBar p={p} label="" value={j.prog} color={j.color} />
          </div>
          <Tag p={p} color={j.color}>{j.status}</Tag>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em", minWidth: 70, textAlign: "left" }}>{j.time}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- BILLING tab ----------
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

// ---------- SECURITY tab ----------
function DashSecurity({ p, user }) {
  const [cur, setCur] = React.useState("");
  const [nw, setNw] = React.useState("");
  const [conf, setConf] = React.useState("");
  const [msg, setMsg] = React.useState("");

  return (
    <>
      <SectionHead p={p} code="// ACCOUNT_INTEGRITY" title="الأمان" sub="بيانات المشغّل وتغيير كلمة السر" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* identity */}
        <Panel p={p} padding={24}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 14 }}>// OPERATOR_ID</div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", paddingBottom: 18, borderBottom: `1px solid ${p.border}`, marginBottom: 18 }}>
            <div style={{
              width: 64, height: 64, background: p.accent,
              clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: p.bg0, letterSpacing: ".05em",
            }}>{user.initial || user.name[0]}</div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: p.fg, letterSpacing: ".05em" }}>{user.name}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".15em", marginTop: 3 }}>{user.email}</div>
              <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                <Tag p={p} color={p.accent2}>VERIFIED</Tag>
                <Tag p={p}>RANK_S</Tag>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".1em" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>عضو منذ</span><span style={{ color: p.fg }}>4 يناير 2026</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>آخر دخول</span><span style={{ color: p.fg }}>منذ 12 دقيقة</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>IP</span><span style={{ color: p.fg }}>147.xx.xx.42</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>2FA</span><span style={{ color: p.warn }}>OFF</span></div>
          </div>
          <div style={{ marginTop: 16 }}>
            <CrunchBtn p={p} label="تفعيل 2FA" solid icon="⌬" full />
          </div>
        </Panel>

        {/* password */}
        <Panel p={p} padding={24}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 14 }}>// PASSWORD_ROTATE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <TacticalInput p={p} label="الحالية" type="password" value={cur} onChange={setCur} placeholder="••••••••" rtl={false} />
            <TacticalInput p={p} label="الجديدة" type="password" value={nw} onChange={setNw} placeholder="••••••••" hint="٨ أحرف على الأقل · حرف كبير + رقم" rtl={false} />
            <TacticalInput p={p} label="التأكيد" type="password" value={conf} onChange={setConf} placeholder="••••••••" rtl={false} />
            {msg && <Toast p={p} type="success">{msg}</Toast>}
            <div style={{ marginTop: 4 }}>
              <CrunchBtn p={p} label="حفظ كلمة السر" solid icon="▶" full onClick={() => setMsg("✓ تم تغيير كلمة السر")} />
            </div>
          </div>
        </Panel>
      </div>

      {/* sessions */}
      <Panel p={p} padding={20} style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// ACTIVE_SESSIONS</div>
          <CrunchBtn p={p} label="إنهاء كل الجلسات" small icon="!" />
        </div>
        {[
          ["MacOS · Chrome",    "EU-W2 · 147.xx.xx.42", "هذه الجلسة", true],
          ["iOS · Safari",       "EU-W2 · 92.xx.xx.18",  "منذ يومين", false],
          ["Windows · Firefox",  "US-E1 · 64.xx.xx.91",  "منذ أسبوع", false],
        ].map((s, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "1fr 1fr auto auto",
            gap: 16, alignItems: "center",
            padding: "10px 0", borderBottom: i < 2 ? `1px dashed ${p.border}` : "none",
          }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg }}>{s[0]}</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".1em" }}>{s[1]}</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".1em" }}>{s[2]}</span>
            {s[3] ? <Tag p={p} color={p.accent2}>● CURRENT</Tag> : <a style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.warn, letterSpacing: ".18em", cursor: "pointer" }}>↳ ENDED</a>}
          </div>
        ))}
      </Panel>
    </>
  );
}

Object.assign(window, { DashboardPage });

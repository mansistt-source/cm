// Full landing page (scrollable) for CONTENT/MACHINE — مُحرك التسويق
// Crimson Ops aesthetic, RTL Arabic. Builds on palettes / hud / shaders.

const { useState, useEffect, useRef } = React;

function cmGoBilling() {
  try {
    if (typeof window !== "undefined") {
      if (window.__cmNav) {
        window.__cmNav("billing");
      } else {
        window.location.hash = "#/billing";
      }
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  } catch (e) {
    window.location.hash = "#/billing";
  }
}


const PLANS = [
  { key: "starter", name: "اشتراك ابتدائي", price: 150,  credits: 1500,  badge: "للبداية",
    features: ["1,500 كريديت/شهر", "حتى 30 ثانية للفيديو", "تصدير 1080p", "دعم بريدي"] },
  { key: "growth",  name: "اشتراك مُعزز",    price: 300,  credits: 3300,  badge: "للنمو",
    features: ["3,300 كريديت/شهر", "حتى 60 ثانية", "تصدير 4K", "أولوية في الطابور"] },
  { key: "pro",     name: "اشتراك احترافي",  price: 800,  credits: 9600,  badge: "يزيد الوفرة", featured: true,
    features: ["9,600 كريديت/شهر", "حتى 5 دقائق", "تصدير 4K · HDR", "تخصيص الستايل", "دعم مباشر"] },
  { key: "agency",  name: "أقصى اشتراك",     price: 1500, credits: 19500, badge: "للوكالات",
    features: ["19,500 كريديت/شهر", "بلا حدود زمنية", "API كامل", "حسابات فرعية", "مدير نجاح"] },
];

const STEPS = [
  { code: "01", title: "تكتب الفكرة",     sub: "نص حر أو خيارات سريعة من المفاوض",
    body: "اوصف فكرتك بلغتك. المفاوض يطرح أسئلة محددة، يقترح أنماط، ويفهم نيتك قبل أن نصرف كريديت واحد." },
  { code: "02", title: "العقل يصمم",      sub: "ستوري بورد · ستايل · إيقاع",
    body: "نولّد لوحة قصة كاملة، نختار اللوحة اللونية، ونحدد إيقاع المشاهد. تقدر تعدل أي عنصر قبل التنفيذ." },
  { code: "03", title: "نسلّم الفيديو",   sub: "تصدير · 4K · جاهز للنشر",
    body: "خط الإنتاج يصبّ الإطارات، يركّب الصوت، ويصدّر الملف النهائي. متوسط زمن التسليم أقل من 4 دقائق." },
];

const SHOWCASE = [
  { code: "01", title: "NEO-NOIR",      sub: "rain · neon · shadow",      meta: "RUNTIME +18%" },
  { code: "02", title: "DOC // STARK",  sub: "natural · grounded",         meta: "RUNTIME +0%" },
  { code: "03", title: "ANIME",         sub: "stylized · kinetic",         meta: "RUNTIME +6%" },
  { code: "04", title: "COMMERCIAL",    sub: "punchy · branded · clean",   meta: "RUNTIME +4%" },
  { code: "05", title: "CINEMATIC",     sub: "anamorphic · gritty",        meta: "RUNTIME +22%" },
  { code: "06", title: "RETRO/VHS",     sub: "grain · scanlines · 4:3",    meta: "RUNTIME +8%" },
];

const STATS = [
  { v: "98.7%",  l: "UPTIME" },
  { v: "< 4MIN", l: "AVG_RENDER" },
  { v: "2.1M+",  l: "CLIPS_PROCESSED" },
  { v: "12,847", l: "ACTIVE_OPERATORS" },
];

// ---------- top telemetry ticker ----------
function Ticker({ p }) {
  const items = [
    "● NET 142ms",
    "REGION EU-WEST-1",
    "NODE/CASCADE-7 ONLINE",
    "QUEUE 247 JOBS",
    "GPU CLUSTER 92%",
    "▸ JOB//07A2 RENDERED",
    "▸ JOB//07B1 ASSEMBLED",
    "▸ JOB//07C4 EXPORTED",
    "// FRAME_BATCH OK",
    "// STORYBOARD_LOCK OK",
  ];
  return (
    <div style={{
      position: "relative", overflow: "hidden",
      borderBottom: `1px solid ${p.border}`, background: p.bg0,
      height: 28, display: "flex", alignItems: "center",
    }}>
      <div className="ticker-track" style={{
        display: "flex", whiteSpace: "nowrap", animation: "ticker 60s linear infinite",
      }}>
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} style={{
            padding: "0 28px",
            fontFamily: "'Space Mono', monospace", fontSize: 10,
            color: t.startsWith("●") || t.startsWith("▸") ? p.accent : p.dim,
            letterSpacing: ".22em", textTransform: "uppercase",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            {t}
            <span style={{ width: 4, height: 4, background: p.border, marginRight: 8, transform: "rotate(45deg)" }} />
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }`}</style>
    </div>
  );
}

// ---------- sticky nav ----------
function Nav({ p, onLogin, navigating }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: `${p.bg0}f2`, backdropFilter: "blur(14px)",
      borderBottom: `1px solid ${p.border}`,
      padding: "14px 40px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className={navigating ? "logo-spin" : "logo-pulse"} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24">
            <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke={p.accent} strokeWidth="1.5" fill="none" />
            <polygon points="12,7 17,10 17,14 12,17 7,14 7,10" fill={p.accent} />
          </svg>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: ".22em", color: p.fg }}>
            CONTENT/<span style={{ color: p.accent }}>MACHINE</span>
          </div>
        </div>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.dim, marginRight: 6 }}>
          مُحرك التسويق
        </span>
        <Tag p={p} color={p.accent2}>v.2.6</Tag>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 26, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".18em", color: p.dim, textTransform: "uppercase" }}>
        <a href="#how" style={{ color: p.dim, textDecoration: "none" }}>كيف يعمل</a>
        <a href="#styles" style={{ color: p.dim, textDecoration: "none" }}>الأنماط</a>
        <a href="#plans" style={{ color: p.dim, textDecoration: "none" }}>الباقات</a>
        <a href="#payg" style={{ color: p.dim, textDecoration: "none" }}>الدفع المرن</a>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Tag p={p} glow>● ONLINE</Tag>
        <CrunchBtn p={p} label="دخول" small icon="↵" onClick={onLogin} />
      </div>

      <style>{`
        @keyframes logo-rot { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .logo-spin svg { animation: logo-rot 1s linear; transform-origin: center; }
      `}</style>
    </nav>
  );
}

// ---------- hero ----------
function Hero({ p, onStart, onDemo }) {
  return (
    <section style={{ position: "relative", padding: "70px 40px 80px", overflow: "hidden", borderBottom: `1px solid ${p.border}` }}>
      <ParticleField p={p} density={0.7} showGrid={true} />

      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 48, alignItems: "flex-start", maxWidth: 1440, margin: "0 auto" }}>

        {/* LEFT — title */}
        <div style={{ paddingTop: 20 }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".3em", color: p.accent,
            marginBottom: 22, textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ width: 28, height: 1, background: p.accent }} />
            <span>SYS//AUTO_PIPELINE_07 · LIVE</span>
            <span style={{ flex: 1, height: 1, background: p.border }} />
          </div>

          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(64px, 9vw, 132px)", lineHeight: .85, letterSpacing: ".005em",
            color: p.fg, textTransform: "uppercase",
          }}>
            <div>بروميت<span style={{ color: p.accent, textShadow: `0 0 22px ${p.glow}` }}>.</span></div>
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{
                background: `linear-gradient(180deg, ${p.fg} 0%, ${p.dim} 100%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                يأتمت العملية
              </span>
              <span style={{
                position: "absolute", right: -12, top: 18, width: 5, height: 78, background: p.accent,
                boxShadow: `0 0 18px ${p.glow}`,
              }} />
            </div>
          </div>

          <p style={{
            marginTop: 26, maxWidth: 480, color: p.dim, fontSize: 15, lineHeight: 1.85,
            fontFamily: "'Inter', sans-serif",
          }}>
            اكتب فكرتك بكلامك. <span style={{ color: p.fg }}>المفاوض</span> يفهم النية، يقترح الأسلوب، ويبني خط الإنتاج. النظام يصوّر، يركّب، ويسلّمك الفيديو الجاهز
            <span style={{ color: p.accent2 }}> — تلقائياً، أقل من 4 دقائق</span>.
          </p>

          {/* CTA row */}
          <div style={{ marginTop: 30, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <CrunchBtn p={p} label="ابدأ المهمة" solid icon="▶" onClick={onStart} />
            <CrunchBtn p={p} label="شاهد العرض" icon="◇" onClick={onDemo} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginRight: 8 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: ".22em", color: p.dim, textTransform: "uppercase" }}>
                ACTIVE_OPERATORS
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: ".06em", color: p.fg }}>
                <CountUp value={12847} /> <span style={{ color: p.accent2, fontSize: 14 }}>↑</span>
              </div>
            </div>
          </div>

          {/* stat row */}
          <div style={{ display: "flex", gap: 36, marginTop: 56, paddingTop: 22, borderTop: `1px solid ${p.border}`, flexWrap: "wrap" }}>
            {STATS.map((s, i) => (
              <div key={i}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: p.fg, letterSpacing: ".06em" }}>
                  {s.v}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: ".22em", color: p.dim, marginTop: 2 }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — HUD console live mock */}
        <div style={{ paddingTop: 30, position: "relative" }}>
          <HudCard p={p} padding={0}>
            <div style={{ borderBottom: `1px solid ${p.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <PulseRing p={p} size={10} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".22em", color: p.dim, textTransform: "uppercase" }}>
                  JOB//07A2 · LIVE
                </span>
              </div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent2 }}>02:14</span>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em", marginBottom: 6, textTransform: "uppercase" }}>
                PROMPT
              </div>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg, lineHeight: 1.7,
                marginBottom: 18, padding: 12, background: p.bg2, borderRight: `2px solid ${p.accent}`,
              }} dir="rtl">
                فيلم قصير بأسلوب نوار، شخصية تكتشف خيانة في مدينة ممطرة. النهاية تحمل أمل خفيف.
              </div>

              <StatusBar p={p} label="STORYBOARD"  value={100} color={p.accent2} />
              <StatusBar p={p} label="FRAME_GEN"   value={100} color={p.accent2} />
              <StatusBar p={p} label="CLIP_RENDER" value={74}  color={p.accent} />
              <StatusBar p={p} label="ASSEMBLY"    value={12}  color={p.dim} />

              {/* tiny preview grid */}
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    aspectRatio: "16/9",
                    background: i < 4 ? p.bg2 : p.bg1,
                    border: `1px solid ${i === 3 ? p.accent : p.border}`,
                    position: "relative", overflow: "hidden",
                  }}>
                    {i < 4 && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: `repeating-linear-gradient(45deg, ${p.line} 0 2px, transparent 2px 6px)`,
                        opacity: .7,
                      }} />
                    )}
                    <div style={{ position: "absolute", top: 2, left: 3, fontFamily: "'Space Mono', monospace", fontSize: 8, color: p.dim, letterSpacing: ".1em" }}>
                      0{i + 1}
                    </div>
                    {i === 3 && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.accent, boxShadow: `0 0 10px ${p.accent}` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* thinking line */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${p.border}` }}>
                <ThinkingPulse p={p} label="ASSEMBLING SHOT 04 OF 06" />
              </div>
            </div>
          </HudCard>

          {/* secondary HUD strip */}
          <div style={{ marginTop: 14, display: "flex", gap: 12 }}>
            <Reticle p={p} size={70} />
            <div style={{ flex: 1 }}>
              <Tag p={p}>● TARGET_LOCKED</Tag>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".1em", marginTop: 8, marginBottom: 2 }}>
                NEO-NOIR // 30s
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em" }}>
                EST_CRED 45 · LAT 2.1s · QUEUE #03
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- how it works ----------
function HowItWorks({ p }) {
  return (
    <section id="how" style={{ padding: "100px 40px", position: "relative", borderBottom: `1px solid ${p.border}` }}>
      <SectionHead p={p} code="// PIPELINE_STAGES_03" title="كيف يعمل المحرك" sub="من فكرة إلى ملف جاهز · بدون لمس الكاميرا" />

      <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, position: "relative" }}>
        {/* connecting line */}
        <div style={{
          position: "absolute", top: 80, left: "12%", right: "12%",
          height: 1, background: `linear-gradient(90deg, transparent, ${p.accent}66, transparent)`,
          pointerEvents: "none",
        }} />

        {STEPS.map((s, i) => (
          <div key={i} style={{
            position: "relative", padding: 28, background: p.bg1, border: `1px solid ${p.border}`,
            clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%)",
            minHeight: 280,
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 40, height: 2, background: p.accent }} />

            {/* big step number */}
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 110, color: p.bg2,
              position: "absolute", top: 0, right: 18, lineHeight: 1, letterSpacing: ".02em",
              userSelect: "none", textShadow: `1px 1px 0 ${p.border}`,
            }}>
              {s.code}
            </div>

            <div style={{ position: "relative" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", marginBottom: 6 }}>
                STAGE_{s.code}
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: p.fg, letterSpacing: ".06em", lineHeight: 1, textTransform: "uppercase" }}>
                {s.title}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em", marginTop: 6, textTransform: "uppercase" }}>
                {s.sub}
              </div>

              <div style={{ marginTop: 70, fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg, lineHeight: 1.8 }} dir="rtl">
                {s.body}
              </div>

              {/* mini visual per step */}
              <div style={{ marginTop: 22 }}>
                {i === 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["فيلم", "إعلان", "وثائقي", "أنيمي"].map((x, j) => (
                      <span key={j} style={{
                        padding: "5px 10px",
                        background: j === 0 ? `${p.accent}22` : p.bg2,
                        color: j === 0 ? p.accent : p.dim,
                        border: `1px solid ${j === 0 ? p.accent : p.border}`,
                        fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".15em",
                      }}>{x}</span>
                    ))}
                  </div>
                )}
                {i === 1 && (
                  <div style={{ height: 60, overflow: "hidden" }}>
                    <AuroraLoader p={p} interactive intensity={0.7} height="100%" />
                  </div>
                )}
                {i === 2 && (
                  <div>
                    <StatusBar p={p} label="EXPORT_PROGRESS" value={88} color={p.accent} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".18em" }}>
                      <span>03:47 ELAPSED</span><span style={{ color: p.accent2 }}>● MP4 / 4K</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* step arrow */}
            {i < 2 && (
              <div style={{
                position: "absolute", top: 80, left: -10, width: 20, height: 20,
                background: p.bg0, display: "flex", alignItems: "center", justifyContent: "center",
                color: p.accent, fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700,
                border: `1px solid ${p.border}`, zIndex: 2,
              }}>◂</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- style reel ----------
function StyleReel({ p }) {
  return (
    <section id="styles" style={{ padding: "100px 40px", position: "relative", borderBottom: `1px solid ${p.border}`, background: p.bg0 }}>
      <SectionHead p={p} code="// STYLE_SIGNATURES_06" title="مكتبة الأنماط" sub="مرر الفأرة على أي بطاقة · كل نمط محمّل وجاهز" />

      <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {SHOWCASE.map((s, i) => (
          <IridescentCard
            key={i} p={p} hot={i === 0}
            code={`// ${s.code}`} title={s.title} sub={s.sub}
            meta={<><span>{s.meta}</span><span>·</span><span>READY</span></>}
            w="100%" h={300}
          />
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 36, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".22em" }}>
        + 24 STYLE ARCHETYPES · CUSTOM SIGNATURE BUILDER FOR PRO+
      </div>
    </section>
  );
}

// ---------- plans ----------
function Plans({ p, onSubscribe }) {
  return (
    <section id="plans" style={{ padding: "100px 40px", position: "relative", borderBottom: `1px solid ${p.border}` }}>
      <SectionHead p={p} code="// SUBSCRIPTION_TIERS_04" title="خطط الكريديت" sub="الكلفة الفعلية بالكريديت · بدون رسوم خفية" />

      <div style={{ maxWidth: 1440, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {PLANS.map((plan, i) => <PlanCard key={plan.key} p={p} plan={plan} onSubscribe={onSubscribe} />)}
      </div>
    </section>
  );
}

function PlanCard({ p, plan, onSubscribe }) {
  const [hover, setHover] = useState(false);
  const featured = plan.featured;
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); (onSubscribe || cmGoBilling)(); }}
      style={{
        position: "relative", padding: 24, background: featured ? p.bg2 : p.bg1,
        border: `1px solid ${hover || featured ? p.accent : p.border}`,
        cursor: "pointer", transition: "all .15s",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)",
        transform: featured ? "translateY(-8px)" : hover ? "translateY(-3px)" : "translateY(0)",
      }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: hover || featured ? 60 : 30, height: 2, background: featured ? p.accent : (hover ? p.accent : p.dim), transition: "width .25s" }} />

      {featured && (
        <div style={{
          position: "absolute", top: -1, right: -1, padding: "4px 10px", background: p.accent, color: p.bg0,
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, letterSpacing: ".18em",
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 12px 100%)",
        }}>
          MOST_USED
        </div>
      )}

      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: ".22em", color: p.dim, textTransform: "uppercase", marginBottom: 12 }}>
        TIER_{plan.key.toUpperCase()} · {plan.badge}
      </div>

      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: p.fg, letterSpacing: ".08em", lineHeight: 1.2, marginBottom: 16, minHeight: 50 }}>
        {plan.name}
      </div>

      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, letterSpacing: ".02em", color: featured ? p.accent : p.fg, lineHeight: 1 }}>
        ${plan.price}
        <span style={{ fontSize: 12, color: p.dim, marginRight: 6, fontFamily: "'Space Mono', monospace", letterSpacing: ".15em" }}>/MO</span>
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.accent2, letterSpacing: ".15em", marginTop: 4 }}>
        {plan.credits.toLocaleString()} CRED
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px dashed ${p.border}` }}>
        {plan.features.map((f, j) => (
          <div key={j} style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
            fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.fg,
          }} dir="rtl">
            <span style={{ width: 5, height: 5, background: p.accent, transform: "rotate(45deg)", flexShrink: 0 }} />
            {f}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <CrunchBtn p={p} label={featured ? "اذهب للفوترة" : "اشحن الرصيد"} solid={featured} small full onClick={(e) => { e && e.stopPropagation && e.stopPropagation(); (onSubscribe || cmGoBilling)(); }} />
      </div>

      <div style={{
        position: "absolute", right: 0, bottom: 0, width: 18, height: 18,
        background: hover || featured ? p.accent : "transparent",
        clipPath: "polygon(100% 0, 100% 100%, 0 100%)", transition: "background .15s",
      }} />
    </div>
  );
}

// ---------- PAYG ----------
function Payg({ p, onPay }) {
  const [amount, setAmount] = useState(0);
  const credits = amount > 0 ? Math.floor(amount * 10) : 0;
  const valid = amount >= 30 && amount <= 1500;
  const over = amount > 5000;

  return (
    <section id="payg" style={{ padding: "100px 40px", position: "relative", borderBottom: `1px solid ${p.border}` }}>
      <SectionHead p={p} code="// PAY_AS_YOU_GO" title="اشحن الكريدتس" sub="رصيد واحد لكل خدمات المنصة · 1 دولار = 10 كريدت · أقل شحن $30" />

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: 28, background: p.bg1, border: `1px solid ${p.accent}`, position: "relative", overflow: "hidden" }}>
        {/* aurora bg */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.45 }}>
          <AuroraLoader p={p} interactive={false} intensity={0.5} height="100%" />
        </div>

        <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 28, alignItems: "center" }}>
          {/* left blurb */}
          <div>
            <Tag p={p}>FLEX_TX</Tag>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: p.fg, letterSpacing: ".05em", marginTop: 10, lineHeight: 1 }}>
              ادفع ما تستخدمه
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".15em", marginTop: 8 }}>
              $1 = 10 CREDITS · MIN $30 · INSTANT
            </div>
          </div>

          {/* amount input */}
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 6 }}>// AMOUNT_USD</div>
            <NumberSwitch p={p} value={amount} onChange={setAmount} min={0} max={5000}
              step={(v) => v < 50 ? 1 : v < 200 ? 5 : v < 1000 ? 10 : 50}
              prefix="$" accent={over ? p.warn : p.accent} />
            {over && (
              <div style={{ marginTop: 6, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.warn, letterSpacing: ".18em" }}>! MAX $5,000</div>
            )}
            {/* presets */}
            <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
              {[30, 50, 100, 300, 800, 1500].map(v => (
                <button key={v} onClick={() => setAmount(v)} style={{
                  flex: 1, padding: "6px 0", background: amount === v ? `${p.accent}22` : "transparent",
                  color: amount === v ? p.accent : p.dim,
                  border: `1px solid ${amount === v ? p.accent : p.border}`,
                  fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".15em",
                  cursor: "pointer",
                }}>${v}</button>
              ))}
            </div>
          </div>

          {/* credits + cta */}
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", marginBottom: 4 }}>YOU_RECEIVE</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: p.accent, lineHeight: 1, letterSpacing: ".02em" }}>
              {credits ? credits.toLocaleString() : "—"}
              <span style={{ fontSize: 14, color: p.dim, marginRight: 8, fontFamily: "'Space Mono', monospace" }}>CRED</span>
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em", marginTop: 6 }}>
              ↳ رصيد واحد لكل أدوات المنصة
            </div>
            <div style={{ marginTop: 14 }}>
              <CrunchBtn p={p} label="اذهب للفوترة" solid icon="▶" disabled={!valid} onClick={(e) => { e && e.preventDefault && e.preventDefault(); if (valid) (onPay || cmGoBilling)(amount); }} full />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- CTA ----------
function Cta({ p, onStart }) {
  return (
    <section style={{ padding: "120px 40px", position: "relative", overflow: "hidden", borderBottom: `1px solid ${p.border}` }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
        <AuroraLoader p={p} interactive intensity={1.4} height="100%" />
      </div>

      <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 12, color: p.accent, letterSpacing: ".3em",
          marginBottom: 26, textTransform: "uppercase",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
        }}>
          <span style={{ width: 28, height: 1, background: p.accent }} />
          ◤ READY_FOR_OPERATION
          <span style={{ width: 28, height: 1, background: p.accent }} />
        </div>

        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: "clamp(52px, 9vw, 130px)", lineHeight: .9, letterSpacing: ".03em",
          color: p.fg, textTransform: "uppercase", marginBottom: 14,
        }}>
          جاهز <span style={{ color: p.accent, textShadow: `0 0 30px ${p.glow}` }}>تبدأ؟</span>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: p.fg, maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.8 }}>
          أول فيديو على حسابنا. كريديت ترحيبي عند التسجيل.
        </div>

        <div style={{ display: "inline-flex", gap: 14 }}>
          <CrunchBtn p={p} label="ابدأ المهمة" solid icon="▶" onClick={onStart} />
          <CrunchBtn p={p} label="حدّد جلسة" icon="◇" />
        </div>

        <div style={{ marginTop: 50, display: "flex", justifyContent: "center", gap: 24, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".2em", textTransform: "uppercase", flexWrap: "wrap" }}>
          <span>✓ NO_CARD_REQUIRED</span>
          <span>✓ CANCEL_ANYTIME</span>
          <span>✓ ARABIC_NATIVE</span>
        </div>
      </div>
    </section>
  );
}

// ---------- footer ----------
function Footer({ p }) {
  return (
    <footer style={{ padding: "40px", background: p.bg0 }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 36, marginBottom: 36 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <svg width="22" height="22" viewBox="0 0 24 24">
                <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke={p.accent} strokeWidth="1.5" fill="none" />
                <polygon points="12,7 17,10 17,14 12,17 7,14 7,10" fill={p.accent} />
              </svg>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: ".22em", color: p.fg }}>
                CONTENT/<span style={{ color: p.accent }}>MACHINE</span>
              </div>
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.dim, lineHeight: 1.7 }} dir="rtl">
              محرك توليد فيديو آلي بمستوى استوديو. عربي · سريع · بلا تعقيد.
            </div>
          </div>

          {[
            { t: "المنتج", links: ["كيف يعمل", "الأنماط", "الباقات", "الدفع المرن", "API"] },
            { t: "الشركة", links: ["عنّا", "اتصل بنا", "الوظائف", "المدوّنة", "الصحافة"] },
            { t: "قانوني", links: ["الشروط", "الخصوصية", "الكوكيز", "DMCA"] },
          ].map((col, i) => (
            <div key={i}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", marginBottom: 14, textTransform: "uppercase" }}>// {col.t}</div>
              {col.links.map((l, j) => (
                <div key={j} style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.dim, marginBottom: 8, cursor: "pointer" }} dir="rtl">↳ {l}</div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ paddingTop: 22, borderTop: `1px solid ${p.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", textTransform: "uppercase" }}>
            © 2026 CONTENT/MACHINE · ALL_RIGHTS_RESERVED
          </div>
          <div style={{ display: "flex", gap: 12, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", textTransform: "uppercase" }}>
            <span>● ALL_SYSTEMS_OPERATIONAL</span>
            <span>·</span>
            <span>EU/W-2</span>
            <span>·</span>
            <span>v.2.6</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---------- section head helper ----------
function SectionHead({ p, code, title, sub }) {
  return (
    <div style={{ maxWidth: 1440, margin: "0 auto 36px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".28em", color: p.accent, textTransform: "uppercase" }}>
        <span style={{ width: 8, height: 8, background: p.accent, transform: "rotate(45deg)" }} />
        {code}
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${p.border}, transparent)` }} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 24, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, color: p.fg, letterSpacing: ".04em", lineHeight: 1, textTransform: "uppercase" }}>{title}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.dim, lineHeight: 1.7 }} dir="rtl">{sub}</div>
      </div>
    </div>
  );
}

// ---------- root ----------
function LandingPage() {
  const p = window.PALETTES.crimson;
  const [navigating, setNavigating] = useState(false);

  function goBilling() {
    setNavigating(true);
    setTimeout(() => setNavigating(false), 250);
    cmGoBilling();
  }

  function go() {
    setNavigating(true);
    setTimeout(() => setNavigating(false), 600);
    if (window.__cmNav) {
      setTimeout(() => window.__cmNav("auth"), 280);
    }
  }

  return (
    <div dir="rtl" style={{ background: p.bg0, color: p.fg, fontFamily: "'Inter', sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <Ticker p={p} />
      <Nav p={p} onLogin={go} navigating={navigating} />
      <Hero p={p} onStart={go} onDemo={go} />
      <HowItWorks p={p} />
      <StyleReel p={p} />
      <Plans p={p} onSubscribe={goBilling} />
      <Payg p={p} onPay={goBilling} />
      <Cta p={p} onStart={go} />
      <Footer p={p} />
    </div>
  );
}

window.LandingPage = LandingPage;

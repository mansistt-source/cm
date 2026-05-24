// Create page (film/documentary) + Market page (marketing agent).

const CREATE_STYLES = [
  { id: "cinematic",  name: "سينمائي",     desc: "هوليوود · عمق ميدان · إضاءة درامية", glyph: "◆" },
  { id: "realistic",  name: "واقعي",        desc: "فوتوريالستيك · إضاءة طبيعية",        glyph: "○" },
  { id: "anime",      name: "أنيمي",         desc: "ألوان يابانية · حركة طلقة",          glyph: "◇" },
  { id: "3d",         name: "ثلاثي أبعاد",  desc: "نماذج 3D · إضاءة استوديو",            glyph: "▲" },
  { id: "luxury",     name: "فاخر",          desc: "ذهبي · أجواء برستيج",                glyph: "✦" },
  { id: "commercial", name: "إعلاني",        desc: "محتوى تسويقي · سوشيال",              glyph: "▶" },
];

const CREATE_DURATIONS = [
  { secs: 15,  label: "١٥ ث" },
  { secs: 30,  label: "٣٠ ث" },
  { secs: 60,  label: "دقيقة" },
  { secs: 120, label: "٢ د" },
  { secs: 300, label: "٥ د" },
];

const CREATE_TYPES = [
  { id: "film",        name: "فيلم سينمائي",  desc: "قصة · مشاهد درامية · موسيقى" },
  { id: "documentary", name: "وثائقي يوتيوب",  desc: "سرد · حقائق · صوت احترافي" },
];

// =========================================================================
// CREATE PAGE
// =========================================================================
function CreatePage({ p, navigate, credits = 4820, project }) {
  const [name, setName] = React.useState(project?.name || "مشروع بدون عنوان");
  const [prompt, setPrompt] = React.useState("");
  const [style, setStyle] = React.useState("cinematic");
  const [type, setType] = React.useState("film");
  const [duration, setDuration] = React.useState(project?.duration || 30);
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [progressMsg, setProgressMsg] = React.useState("");
  const [stage, setStage] = React.useState("");
  const [done, setDone] = React.useState(false);

  const DEMO_PROMPT = type === "film"
    ? "فيلم قصير بأسلوب نوار، شخصية تكتشف خيانة في مدينة ممطرة، النهاية تحمل أمل خفيف."
    : "وثائقي عن الحضارة المصرية القديمة، أسرار الأهرامات، سرد احترافي بأسلوب ناشيونال جيوغرافيك.";

  const estCred = Math.ceil(duration * 1.5);

  function generate() {
    if (!prompt.trim()) return;
    setLoading(true); setDone(false); setProgress(5); setProgressMsg("إرسال الطلب...");
    setStage("INIT");

    const stages = [
      ["INIT",       "تجهيز المهمة...",                 15],
      ["STORYBOARD", "العقل يكتب القصة...",             35],
      ["FRAMES",     "Higgsfield يولّد الإطارات...",     60],
      ["CLIPS",      "تركيب المقاطع...",                82],
      ["ASSEMBLY",   "تركيب الفيديو النهائي...",        95],
      ["DONE",       "✓ تم التسليم",                   100],
    ];
    let i = 0;
    const tick = () => {
      if (i >= stages.length) { setLoading(false); setDone(true); return; }
      const [s, m, pr] = stages[i];
      setStage(s); setProgressMsg(m); setProgress(pr);
      i++;
      setTimeout(tick, 1100 + Math.random() * 600);
    };
    setTimeout(tick, 600);
  }

  return (
    <PageFrame p={p} density={0.35}>
      <AuthedNav p={p} current="film-hub" navigate={navigate} credits={credits} onLogout={() => navigate("auth")} />

      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
        {/* breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <a onClick={() => navigate("film-hub")} style={{ color: p.dim, cursor: "pointer", textDecoration: "none" }}>صانع الأفلام</a>
          <span>◂</span>
          <span style={{ color: p.fg }}>{name}</span>
        </div>

        <SectionHead p={p} code="// FILM_PIPELINE_07" title={name} sub="أوصف فكرتك · النظام يبني الفيلم" right={
          <Tag p={p} color={p.accent2} glow>● HIGGSFIELD_ONLINE</Tag>
        } />

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>

          {/* LEFT: form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* TYPE */}
            <Panel p={p} padding={18}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// CONTENT_TYPE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {CREATE_TYPES.map(t => (
                  <button key={t.id} onClick={() => setType(t.id)} style={{
                    padding: "14px 16px", background: type === t.id ? `${p.accent}22` : p.bg2,
                    border: `1px solid ${type === t.id ? p.accent : p.border}`,
                    color: p.fg, cursor: "pointer", textAlign: "right",
                    fontFamily: "'Inter', sans-serif",
                    clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
                  }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: ".08em", color: p.fg }}>{t.name}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".12em", marginTop: 4 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </Panel>

            {/* PROMPT */}
            <Panel p={p} padding={18}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// PROMPT_DESCRIBE</div>
                <a onClick={() => setPrompt(DEMO_PROMPT)} style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", cursor: "pointer", textDecoration: "underline" }}>
                  ↳ استخدم مثال
                </a>
              </div>
              <TacticalTextarea p={p} value={prompt} onChange={setPrompt} placeholder={DEMO_PROMPT} rows={5}
                hint="كن تفصيلياً — الشخصيات · المشاعر · الأماكن · الإيقاع" />
              {/* smart suggestion chips */}
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", marginLeft: 4 }}>SMART_ADD:</span>
                {["مطر", "ليل", "نيون", "ضباب", "موسيقى حزينة", "زاوية منخفضة"].map((s, i) => (
                  <button key={i} onClick={() => setPrompt(prompt + ` ${s}.`)} style={{
                    padding: "4px 9px", background: p.bg2, color: p.dim,
                    border: `1px solid ${p.border}`, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".12em",
                    cursor: "pointer",
                  }}>+ {s}</button>
                ))}
              </div>
            </Panel>

            {/* STYLE */}
            <Panel p={p} padding={18}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// STYLE_SIGNATURE</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                {CREATE_STYLES.map(s => {
                  const on = style === s.id;
                  return (
                    <button key={s.id} onClick={() => setStyle(s.id)} style={{
                      padding: "12px", background: on ? `${p.accent}22` : p.bg2,
                      border: `1px solid ${on ? p.accent : p.border}`,
                      color: p.fg, cursor: "pointer", textAlign: "right",
                      clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: ".08em", color: on ? p.accent : p.fg }}>{s.name}</div>
                        <span style={{ color: on ? p.accent : p.dim, fontSize: 14 }}>{s.glyph}</span>
                      </div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".1em", lineHeight: 1.5 }}>{s.desc}</div>
                    </button>
                  );
                })}
              </div>
            </Panel>

            {/* DURATION */}
            <Panel p={p} padding={18}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// DURATION</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em" }}>
                  EST: <span style={{ color: p.accent }}>{estCred} CRED</span>
                </div>
              </div>
              <DurationSwitch p={p} value={duration} onChange={setDuration} min={1} max={3600} />
              {/* range hint + quick presets */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".2em" }}>
                <span>MIN 1s</span>
                <span style={{ color: p.accent2 }}>{Math.round((duration / 3600) * 100)}% OF RANGE</span>
                <span>MAX 60m</span>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".2em", alignSelf: "center" }}>JUMP →</span>
                {[15, 30, 60, 180, 600, 1800, 3600].map(s => (
                  <button key={s} onClick={() => setDuration(s)} style={{
                    padding: "5px 9px",
                    background: duration === s ? `${p.accent}22` : p.bg2,
                    color: duration === s ? p.accent : p.dim,
                    border: `1px solid ${duration === s ? p.accent : p.border}`,
                    fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".15em",
                    cursor: "pointer",
                  }}>
                    {s < 60 ? `${s}s` : s < 3600 ? `${s/60}m` : `1h`}
                  </button>
                ))}
              </div>
            </Panel>

            {/* GENERATE */}
            <div style={{ display: "flex", gap: 12 }}>
              <CrunchBtn p={p} label={loading ? "جاري التوليد..." : `توليد · ${estCred} CRED`} solid icon="▶" full disabled={loading} onClick={generate} />
              <CrunchBtn p={p} label="حفظ كمسودة" icon="◇" />
            </div>
          </div>

          {/* RIGHT: live preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel p={p} padding={0}>
              <div style={{ borderBottom: `1px solid ${p.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <PulseRing p={p} size={10} color={loading ? p.accent : p.dim} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
                    {loading ? "JOB//ACTIVE" : done ? "JOB//COMPLETE" : "JOB//IDLE"}
                  </span>
                </div>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: loading ? p.accent : p.dim, letterSpacing: ".18em" }}>
                  {loading ? "RENDERING" : done ? "READY" : "AWAIT_PROMPT"}
                </span>
              </div>

              {/* preview region */}
              <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden", background: p.bg0, borderBottom: `1px solid ${p.border}` }}>
                {(loading || done) ? (
                  <AuroraLoader p={p} interactive intensity={loading ? 1.3 : 0.6} height="100%" />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Reticle p={p} size={100} color={p.dim} />
                  </div>
                )}
                {done && (
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{
                      width: 70, height: 70, borderRadius: "50%", background: `${p.bg0}cc`, border: `1px solid ${p.accent}`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, color: p.accent,
                    }}>▶</div>
                  </div>
                )}
                <Corners p={p} size={14} inset={6} color={p.accent} />
              </div>

              {/* progress */}
              <div style={{ padding: 16 }}>
                {loading && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <Tag p={p} color={p.accent}>{stage}</Tag>
                      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.accent, letterSpacing: ".05em" }}>{progress}%</span>
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.fg, letterSpacing: ".08em", marginBottom: 6 }}>
                      <ThinkingPulse p={p} label={progressMsg} />
                    </div>
                  </div>
                )}

                <StatusBar p={p} label="STORYBOARD" value={progress >= 35 ? 100 : progress * 2} color={progress >= 35 ? p.accent2 : p.accent} />
                <StatusBar p={p} label="FRAMES"     value={Math.max(0, Math.min(100, (progress - 15) * 2))} color={progress >= 60 ? p.accent2 : p.accent} />
                <StatusBar p={p} label="CLIPS"      value={Math.max(0, Math.min(100, (progress - 35) * 1.8))} color={progress >= 82 ? p.accent2 : p.accent} />
                <StatusBar p={p} label="ASSEMBLY"   value={Math.max(0, Math.min(100, (progress - 60) * 2.5))} color={progress >= 95 ? p.accent2 : p.accent} />
              </div>
            </Panel>

            {/* job tile */}
            <Panel p={p} padding={16}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// JOB_SUMMARY</div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 6, columnGap: 14, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".08em" }}>
                <span>type</span>      <span style={{ color: p.fg }}>{type === "film" ? "CINEMATIC_FILM" : "DOCUMENTARY"}</span>
                <span>style</span>     <span style={{ color: p.fg }}>{(CREATE_STYLES.find(s => s.id === style) || {}).name}</span>
                <span>duration</span>  <span style={{ color: p.fg }}>
                  {duration < 60 ? `${duration}s` : `${Math.floor(duration/60)}m${duration%60 ? ` ${duration%60}s` : ""}`}
                </span>
                <span>est. cred</span> <span style={{ color: p.accent }}>{estCred}</span>
                <span>est. time</span> <span style={{ color: p.fg }}>~{Math.ceil(duration / 12)}m</span>
              </div>

              {done && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${p.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
                  <CrunchBtn p={p} label="تحميل MP4 · 4K" solid icon="↓" full />
                  <CrunchBtn p={p} label="نشر على Instagram" icon="◇" full />
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

// =========================================================================
// MARKET PAGE
// =========================================================================
const MARKET_MODES = [
  { id: "trend",    name: "بحث الترندات",    desc: "Instagram · TikTok · YouTube — أحدث الترندات في مجالك",
    glyph: <svg width="50" height="50" viewBox="0 0 100 100"><polyline points="10,80 30,60 50,70 70,40 90,30" stroke="currentColor" strokeWidth="2" fill="none" /><circle cx="90" cy="30" r="4" fill="currentColor" /></svg> },
  { id: "campaign", name: "حملة تسويقية",     desc: "ريلز + إعلانات + UGC — كامل من برومبت واحد",
    glyph: <svg width="50" height="50" viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" stroke="currentColor" strokeWidth="2" fill="none" /><line x1="20" y1="40" x2="80" y2="40" stroke="currentColor" /><circle cx="50" cy="60" r="10" stroke="currentColor" strokeWidth="2" fill="none" /></svg> },
  { id: "content",  name: "خطة محتوى أسبوع",  desc: "جدول نشر كامل مع نصوص وهاشتاجز",
    glyph: <svg width="50" height="50" viewBox="0 0 100 100">{[0,1,2,3,4,5,6].map(i => <rect key={i} x={10+i*11} y={30+(i%3)*15} width="9" height="9" fill="currentColor" opacity={0.4+i*0.08} />)}</svg> },
  { id: "ugc",      name: "UGC واسع النطاق",   desc: "100+ فيديو بأسلوب مؤثرين مختلفين",
    glyph: <svg width="50" height="50" viewBox="0 0 100 100">{[[30,30],[60,30],[30,60],[60,60],[45,45]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />)}</svg> },
];

const MARKET_DEMO_PROMPTS = {
  trend:    "ابحث عن أحدث ترندات محتوى العطور الفاخرة على TikTok وInstagram في الخليج العربي.",
  campaign: "اعمل حملة تسويقية كاملة لكافيه جديد في الرياض يقدم مشروبات باردة، 5 ريلز بأسلوبين مختلفين مع كابشنز.",
  content:  "اعمل خطة محتوى أسبوع كامل لصفحة تعليمية عن تطوير الذات، مع كابشن كل بوست وأفضل وقت نشر.",
  ugc:      "أنشئ 20 فيديو UGC بأسلوبات مؤثرين مختلفين لمنتج مكمل غذائي للرياضيين.",
};

function MarketPage({ p, navigate, credits = 4820, project }) {
  const [name, setName] = React.useState(project?.name || "حملة بدون عنوان");
  const [mode, setMode] = React.useState(project?.mode || "campaign");
  const [prompt, setPrompt] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [results, setResults] = React.useState(null);

  function run() {
    if (!prompt.trim()) return;
    setLoading(true); setResults(null); setProgress(5);
    let pr = 5;
    const t = setInterval(() => {
      pr += 6 + Math.random() * 10;
      if (pr >= 100) {
        clearInterval(t);
        setProgress(100); setLoading(false);
        setResults({ mode, items: 8 });
      } else {
        setProgress(Math.min(99, pr));
      }
    }, 350);
  }

  return (
    <PageFrame p={p} density={0.35}>
      <AuthedNav p={p} current="market-hub" navigate={navigate} credits={credits} onLogout={() => navigate("auth")} />

      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
        {/* breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <a onClick={() => navigate("market-hub")} style={{ color: p.dim, cursor: "pointer", textDecoration: "none" }}>وكيل التسويق</a>
          <span>◂</span>
          <span style={{ color: p.fg }}>{name}</span>
        </div>

        <SectionHead p={p} code="// MARKETING_AGENT_V2" title={name} sub="وكيل تسويق يبحث، يخطط، يولّد، ينشر — تلقائياً" right={
          <div style={{ display: "flex", gap: 8 }}>
            <Tag p={p} color={p.accent2} glow>● HIGGSFIELD</Tag>
            <Tag p={p}>RANK_S</Tag>
          </div>
        } />

        {/* MODES — 4 big mode tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
          {MARKET_MODES.map(m => {
            const on = mode === m.id;
            return (
              <div key={m.id} onClick={() => { setMode(m.id); setPrompt(""); }}
                style={{
                  position: "relative", padding: 20, background: on ? p.bg2 : p.bg1,
                  border: `1px solid ${on ? p.accent : p.border}`,
                  cursor: "pointer",
                  clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)",
                  transition: "transform .15s",
                  transform: on ? "translateY(-3px)" : "translateY(0)",
                  color: on ? p.accent : p.dim,
                }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: on ? 50 : 24, height: 2, background: on ? p.accent : p.dim, transition: "width .25s" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <Tag p={p} color={on ? p.accent : p.dim}>{m.id.toUpperCase()}</Tag>
                  <div style={{ color: on ? p.accent : p.dim }}>{m.glyph}</div>
                </div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".06em", lineHeight: 1.2, marginBottom: 6 }}>{m.name}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".1em", lineHeight: 1.5 }}>{m.desc}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
          {/* INPUT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel p={p} padding={18}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// AGENT_BRIEF · {mode.toUpperCase()}</div>
                <a onClick={() => setPrompt(MARKET_DEMO_PROMPTS[mode])} style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", cursor: "pointer", textDecoration: "underline" }}>
                  ↳ مثال
                </a>
              </div>
              <TacticalTextarea p={p} value={prompt} onChange={setPrompt} placeholder={MARKET_DEMO_PROMPTS[mode]} rows={6}
                hint="حدد المنصة · الجمهور · النبرة · المنطقة الجغرافية" />
            </Panel>

            {/* options grid */}
            <Panel p={p} padding={18}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>// OPTIONS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <Field p={p} label="المنصات">
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {[["IG", true], ["TT", true], ["YT", true], ["FB", false], ["X", false]].map(([l, on], i) => (
                      <button key={i} style={{
                        padding: "5px 9px",
                        background: on ? `${p.accent}22` : p.bg2,
                        color: on ? p.accent : p.dim,
                        border: `1px solid ${on ? p.accent : p.border}`,
                        fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".15em",
                        cursor: "pointer",
                      }}>{l}</button>
                    ))}
                  </div>
                </Field>
                <Field p={p} label="المنطقة">
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["KSA", true], ["UAE", false], ["EG", false], ["GLB", false]].map(([l, on], i) => (
                      <button key={i} style={{
                        flex: 1, padding: "5px 0",
                        background: on ? `${p.accent}22` : p.bg2,
                        color: on ? p.accent : p.dim,
                        border: `1px solid ${on ? p.accent : p.border}`,
                        fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".12em",
                        cursor: "pointer",
                      }}>{l}</button>
                    ))}
                  </div>
                </Field>
                <Field p={p} label="نبرة">
                  <div style={{ display: "flex", gap: 4 }}>
                    {[["جاد", false], ["ودي", true], ["مرح", false]].map(([l, on], i) => (
                      <button key={i} style={{
                        flex: 1, padding: "5px 0",
                        background: on ? `${p.accent}22` : p.bg2,
                        color: on ? p.accent : p.dim,
                        border: `1px solid ${on ? p.accent : p.border}`,
                        fontFamily: "'Inter', sans-serif", fontSize: 11,
                        cursor: "pointer",
                      }}>{l}</button>
                    ))}
                  </div>
                </Field>
              </div>
            </Panel>

            <CrunchBtn p={p} label={loading ? "Higgsfield يعمل..." : "تشغيل الوكيل ◢"} solid icon="▶" full disabled={loading} onClick={run} />
          </div>

          {/* OUTPUT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel p={p} padding={0}>
              <div style={{ borderBottom: `1px solid ${p.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <PulseRing p={p} size={10} color={loading ? p.accent : p.dim} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
                    AGENT//{loading ? "WORKING" : results ? "DONE" : "IDLE"}
                  </span>
                </div>
                {loading && <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.accent }}>{Math.round(progress)}%</span>}
              </div>

              <div style={{ position: "relative", height: 220 }}>
                {(loading || results) ? (
                  <LiquidMetalLoader p={p} height="100%" label={loading ? "◤ SCANNING_NET" : "◤ READY"} />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}>
                    <Reticle p={p} size={80} color={p.dim} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>AWAIT_BRIEF</span>
                  </div>
                )}
              </div>

              {loading && (
                <div style={{ padding: 14 }}>
                  <ThinkingPulse p={p} label={
                    progress < 25 ? "يبحث في المنصات..." :
                    progress < 50 ? "يحلل البيانات..." :
                    progress < 75 ? "يصمم الحملة..." :
                                    "يولّد المحتوى..."
                  } />
                </div>
              )}
            </Panel>

            {results && (
              <Panel p={p} padding={16}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// AGENT_OUTPUT</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 12 }}>
                  {Array.from({ length: results.items }).map((_, i) => (
                    <div key={i} style={{ aspectRatio: "9/16", background: p.bg2, border: `1px solid ${p.border}`, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(45deg, ${p.line} 0 2px, transparent 2px 8px)`, opacity: 0.6 }} />
                      <div style={{ position: "absolute", top: 4, right: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.accent, letterSpacing: ".15em" }}>0{i+1}</div>
                      <div style={{ position: "absolute", bottom: 6, left: 6, right: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".1em" }}>
                        {["REEL", "AD_15S", "UGC", "STORY"][i % 4]}
                      </div>
                    </div>
                  ))}
                </div>
                <CrunchBtn p={p} label="نشر الكل" solid icon="↗" full />
              </Panel>
            )}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

function Field({ p, label, children }) {
  return (
    <div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", marginBottom: 5, textTransform: "uppercase" }}>{label}</div>
      {children}
    </div>
  );
}

Object.assign(window, { CreatePage, MarketPage });

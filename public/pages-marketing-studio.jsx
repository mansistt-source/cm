// MARKETING STUDIO — expanded marketing agent with 4 modes:
//   HOOKS · CAMPAIGN · TOOLS · SUPERCOMPUTER
// Replaces the simpler MarketPage. Carries Higgsfield-inspired feature set.

const { useState: msUseState, useEffect: msUseEffect, useRef: msUseRef } = React;

// ----------------------------------------------------------------
// HOOK TEMPLATES — 24 archetypes across 5 categories
// Inspired by Higgsfield's viral preset vocabulary (situational drama,
// pattern interrupt, POV, UGC, story) — but our naming + visuals.
// ----------------------------------------------------------------
const HOOK_TEMPLATES = [
  // SITUATIONAL DRAMA — character + product in extreme location
  { id: "airplane_wing",  cat: "drama", name: "AIRPLANE WING",   ar: "جناح طائرة",      desc: "بطل واقف على جناح طائرة محلّقة، يرفع المنتج", env: "sky",     hot: true },
  { id: "volcano_rim",    cat: "drama", name: "VOLCANO RIM",     ar: "حافة بركان",       desc: "بطل على حافة بركان نشط، الحمم تتدفق", env: "lava" },
  { id: "skyscraper",     cat: "drama", name: "SKYSCRAPER",      ar: "سطح ناطحة",        desc: "بطل على حافة ناطحة سحاب، المدينة تحته", env: "city" },
  { id: "mountain_peak",  cat: "drama", name: "MOUNTAIN PEAK",   ar: "قمة جبل",          desc: "بطل على قمة جبل، الثلج والريح", env: "snow" },
  { id: "race_track",     cat: "drama", name: "RACE TRACK",      ar: "حلبة سباق",        desc: "بطل في وسط حلبة، السيارات تمر", env: "race" },
  { id: "free_fall",      cat: "drama", name: "FREE FALL",       ar: "سقوط حر",          desc: "بطل يسقط من السماء ممسكاً المنتج", env: "fall" },
  { id: "underwater",     cat: "drama", name: "DEEP DIVE",       ar: "غوص عميق",         desc: "تحت الماء، الضوء يلمع، فقاعات", env: "ocean" },
  { id: "drift_racing",   cat: "drama", name: "DRIFT ENTRY",     ar: "دخول استعراضي",     desc: "سيارة تنحرف، دخان، البطل يخرج", env: "drift" },

  // PATTERN INTERRUPT — surprise reveals
  { id: "wall_breaker",   cat: "interrupt", name: "WALL BREAKER", ar: "كاسر الجدار",     desc: "جدار ينكسر، بطل يخرج يشرب/يأخذ المنتج", env: "break", hot: true },
  { id: "cgi_explosion",  cat: "interrupt", name: "CGI BREAKDOWN", ar: "انفجار CGI",     desc: "المنتج ينفجر إلى أجزاء ثم يتجمع", env: "cgi" },
  { id: "object_fall",    cat: "interrupt", name: "OBJECT FALL",  ar: "سقوط مفاجئ",       desc: "المنتج يسقط من السماء، البطل يلتقطه", env: "drop" },
  { id: "magic_reveal",   cat: "interrupt", name: "MAGIC REVEAL", ar: "ظهور سحري",        desc: "ضوء يومض، المنتج يظهر من العدم", env: "magic" },

  // POV — first-person + surveillance angles
  { id: "first_person",   cat: "pov", name: "FIRST PERSON",      ar: "منظور أول",         desc: "كاميرا من عيني البطل", env: "fp" },
  { id: "spy_cam",        cat: "pov", name: "SPY CAM",           ar: "كاميرا تجسس",       desc: "نظرة سرية، إطار مظلم", env: "spy" },
  { id: "office_cctv",    cat: "pov", name: "OFFICE CCTV",       ar: "كاميرا أمنية",      desc: "زاوية عالية، تاريخ ووقت", env: "cctv" },
  { id: "night_vision",   cat: "pov", name: "NIGHT VISION",      ar: "رؤية ليلية",        desc: "أخضر، حبيبات، صوت لاسلكي", env: "nv" },
  { id: "drone_flyby",    cat: "pov", name: "DRONE FLYBY",       ar: "تحليق درون",        desc: "تحليق من بعيد لقريب، كشف", env: "drone" },

  // UGC — authentic-feel content openers
  { id: "tutorial_open",  cat: "ugc", name: "TUTORIAL",          ar: "تعليمي",            desc: "البطل يشرح ويعرض المنتج", env: "ugc-1", hot: true },
  { id: "unboxing_pov",   cat: "ugc", name: "UNBOXING",          ar: "فك تغليف",          desc: "POV لفتح الصندوق، إثارة", env: "ugc-2" },
  { id: "review_stare",   cat: "ugc", name: "REVIEW",            ar: "مراجعة",            desc: "وجه ناطق، اعتراف، صدمة", env: "ugc-3" },
  { id: "try_on_mirror",  cat: "ugc", name: "TRY-ON MIRROR",     ar: "تجربة أمام المرآة", desc: "البطل أمام المرآة يجرب", env: "ugc-4" },

  // STORY — narrative openers
  { id: "question_hook",  cat: "story", name: "QUESTION HOOK",   ar: "سؤال صدمة",         desc: "البطل يطرح سؤال غير متوقع", env: "story-1" },
  { id: "stat_hook",      cat: "story", name: "STAT HOOK",       ar: "إحصائية صادمة",     desc: "رقم كبير على الشاشة + لقطة بطل", env: "story-2" },
  { id: "confession",     cat: "story", name: "CONFESSION",      ar: "اعتراف",            desc: "البطل يعترف بشيء صادم", env: "story-3" },
];

const HOOK_CATEGORIES = [
  { id: "all",       l: "الكل",         c: "" },
  { id: "drama",     l: "دراما موقفية",  c: "DRAMA" },
  { id: "interrupt", l: "قطع نمطي",      c: "INTERRUPT" },
  { id: "pov",       l: "منظور POV",     c: "POV" },
  { id: "ugc",       l: "محتوى UGC",     c: "UGC" },
  { id: "story",     l: "قصصي",          c: "STORY" },
];

// SVG glyph generator for each hook env (cheap, abstract, sharp)
function HookGlyph({ env, p, w = "100%", h = "100%" }) {
  // returns a CSS-only stylized background that hints at the scene
  const layers = {
    sky:    `linear-gradient(180deg, ${p.bg0} 0%, ${p.bg2} 70%, ${p.accent}33 100%)`,
    lava:   `radial-gradient(circle at 50% 90%, ${p.accent} 0%, ${p.warn}aa 30%, ${p.bg0} 70%)`,
    city:   `linear-gradient(180deg, ${p.bg0} 0%, ${p.bg2} 60%, ${p.accent}22 100%)`,
    snow:   `linear-gradient(180deg, ${p.bg2} 0%, ${p.bg1} 70%, ${p.fg}22 100%)`,
    race:   `repeating-linear-gradient(90deg, ${p.bg0}, ${p.bg0} 12px, ${p.warn}33 12px, ${p.warn}33 14px)`,
    fall:   `linear-gradient(180deg, ${p.accent}11 0%, ${p.bg0} 100%)`,
    ocean:  `radial-gradient(ellipse at 50% 30%, ${p.accent2}55 0%, ${p.bg2} 60%, ${p.bg0} 100%)`,
    drift:  `linear-gradient(45deg, ${p.bg0} 30%, ${p.accent}33 70%)`,
    break:  `conic-gradient(from 45deg at 50% 50%, ${p.accent}66, ${p.bg2}, ${p.bg0}, ${p.accent}44)`,
    cgi:    `radial-gradient(circle at 50% 50%, ${p.accent} 0%, ${p.bg2} 40%, ${p.bg0} 100%)`,
    drop:   `linear-gradient(180deg, ${p.accent}22 0%, ${p.bg0} 30%, ${p.bg2} 100%)`,
    magic:  `radial-gradient(circle at 50% 50%, ${p.fg}33 0%, ${p.accent}55 20%, ${p.bg0} 70%)`,
    fp:     `repeating-radial-gradient(circle at 50% 50%, ${p.bg2} 0px, ${p.bg2} 20px, ${p.bg0} 22px)`,
    spy:    `linear-gradient(180deg, ${p.bg0}, ${p.bg2})`,
    cctv:   `repeating-linear-gradient(0deg, ${p.bg0}, ${p.bg0} 2px, ${p.bg1} 2px, ${p.bg1} 4px)`,
    nv:     `radial-gradient(ellipse at center, #1d3a1d 0%, #0a1a0a 60%, #050a05 100%)`,
    drone:  `linear-gradient(180deg, ${p.bg0} 0%, ${p.bg2} 100%)`,
    "ugc-1": `linear-gradient(135deg, ${p.bg2} 0%, ${p.bg0} 100%)`,
    "ugc-2": `linear-gradient(45deg, ${p.bg2} 0%, ${p.bg0} 100%)`,
    "ugc-3": `linear-gradient(180deg, ${p.bg1} 0%, ${p.bg0} 100%)`,
    "ugc-4": `linear-gradient(90deg, ${p.bg2} 0%, ${p.bg0} 100%)`,
    "story-1": `linear-gradient(135deg, ${p.bg0}, ${p.accent}22)`,
    "story-2": `linear-gradient(180deg, ${p.bg0}, ${p.bg2})`,
    "story-3": `linear-gradient(45deg, ${p.bg0}, ${p.bg1})`,
  };
  return (
    <div style={{
      position: "absolute", inset: 0, background: layers[env] || layers.sky,
      opacity: 0.95,
    }} />
  );
}

// ----------------------------------------------------------------
// THE MAIN PAGE
// ----------------------------------------------------------------
function MarketStudioPage({ p, navigate, credits = 4820, project }) {
  const [name, setName] = msUseState(project?.name || "حملة بدون عنوان");
  const [mode, setMode] = msUseState("hooks");

  const tabs = [
    { id: "hooks",         l: "HOOKS",         ar: "هوكس",          icon: "◢" },
    { id: "campaign",      l: "CAMPAIGN",      ar: "حملة كاملة",     icon: "◆" },
    { id: "tools",         l: "TOOLS",         ar: "الأدوات",        icon: "⊕" },
    { id: "campaign-operator", l: "CAMPAIGN_OPERATOR", ar: "مشغّل الحملات",  icon: "✦", hot: true },
  ];

  return (
    <PageFrame p={p} density={0.3}>
      <AuthedNav p={p} current="market-hub" navigate={navigate} credits={credits} onLogout={() => navigate("auth")} />

      <div style={{ padding: "26px 32px 32px", maxWidth: 1500, margin: "0 auto" }}>
        {/* breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <a onClick={() => navigate("market-hub")} style={{ color: p.dim, cursor: "pointer", textDecoration: "none" }}>وكيل التسويق</a>
          <span>◂</span>
          <span style={{ color: p.fg }}>{name}</span>
        </div>

        {/* HEADER */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".28em", color: p.accent, textTransform: "uppercase" }}>
            <span style={{ width: 6, height: 6, background: p.accent, transform: "rotate(45deg)" }} />
            // MARKETING_STUDIO_V3 · HIGGSFIELD_LINKED
            <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${p.border}, transparent)` }} />
            <Tag p={p} color={p.accent2} glow>● HIGGSFIELD</Tag>
            <Tag p={p}>SEEDANCE_2.0</Tag>
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, letterSpacing: ".04em", color: p.fg, textTransform: "uppercase", lineHeight: 1 }}>
            {name}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.dim, marginTop: 6, maxWidth: 720, lineHeight: 1.7 }} dir="rtl">
            ستوديو تسويقي كامل: هوكس فيرلية، حملات متعددة المنصات، أدوات تنبؤ بالأداء، ووكيل ذكي يعمل 24/7.
          </div>
        </div>

        {/* MODE TABS — large sharp segmented */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 22, padding: 4, background: p.bg1, border: `1px solid ${p.border}` }}>
          {tabs.map(t => {
            const on = mode === t.id;
            return (
              <button key={t.id} onClick={() => setMode(t.id)} style={{
                position: "relative",
                padding: "14px 16px",
                background: on ? p.accent : "transparent",
                color: on ? p.bg0 : p.dim,
                border: "none",
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: ".16em",
                cursor: "pointer", textAlign: "right",
                clipPath: "polygon(0 0, 100% 0, 100% 70%, 96% 100%, 0 100%)",
                transition: "all .15s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, opacity: on ? .8 : .6, letterSpacing: ".2em" }}>{t.icon} {t.l}</span>
                  {t.hot && !on && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: p.accent, letterSpacing: ".2em" }}>NEW</span>}
                </div>
                <div style={{ fontSize: 18, letterSpacing: ".08em", marginTop: 2 }}>{t.ar}</div>
              </button>
            );
          })}
        </div>

        {mode === "hooks"         && <HooksMode p={p} />}
        {mode === "campaign"      && <CampaignMode p={p} />}
        {mode === "tools"         && <ToolsMode p={p} />}
        {mode === "campaign-operator" && <SupercomputerMode p={p} />}
      </div>
    </PageFrame>
  );
}

// ----------------------------------------------------------------
// HOOKS MODE — Template gallery + builder
// ----------------------------------------------------------------
function HooksMode({ p }) {
  const [cat, setCat] = msUseState("all");
  const [selected, setSelected] = msUseState(null);
  const [character, setCharacter] = msUseState(null);
  const [product, setProduct] = msUseState("");
  const [appLink, setAppLink] = msUseState("");
  const [duration, setDuration] = msUseState(15);
  const [count, setCount] = msUseState(3);
  const [loading, setLoading] = msUseState(false);
  const [generated, setGenerated] = msUseState(null);

  const list = HOOK_TEMPLATES.filter(h => cat === "all" || h.cat === cat);

  function generate() {
    setLoading(true); setGenerated(null);
    setTimeout(() => { setLoading(false); setGenerated({ count, hook: selected }); }, 2200);
  }

  if (selected) {
    return (
      <div>
        {/* breadcrumb back to gallery */}
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setSelected(null)} style={{
            padding: "8px 14px", background: "transparent", color: p.dim,
            border: `1px solid ${p.border}`, cursor: "pointer",
            fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".18em",
          }}>← كل الهوكس</button>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.accent, letterSpacing: ".22em" }}>
            HOOK_BUILDER // {selected.name}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
          {/* LEFT: setup */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* selected hook preview */}
            <Panel p={p} padding={0} style={{ overflow: "hidden" }}>
              <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden" }}>
                <HookGlyph env={selected.env} p={p} />
                <NoiseOverlay opacity={0.12} />
                {/* mock storyboard elements */}
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Reticle p={p} size={120} color={p.accent} />
                </div>
                <div style={{ position: "absolute", top: 16, left: 18, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.fg, letterSpacing: ".22em", textShadow: "0 0 8px rgba(0,0,0,.8)" }}>
                  ◤ HOOK_PREVIEW · {selected.cat.toUpperCase()}
                </div>
                <div style={{ position: "absolute", bottom: 16, left: 18, right: 18 }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: p.fg, letterSpacing: ".06em", textShadow: "0 0 12px rgba(0,0,0,.8)", lineHeight: 1 }}>
                    {selected.ar}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".18em", textShadow: "0 0 8px rgba(0,0,0,.8)", marginTop: 6 }}>
                    {selected.name}
                  </div>
                </div>
                <Corners p={p} size={14} inset={8} color={p.accent} />
              </div>
            </Panel>

            {/* CHARACTER */}
            <Panel p={p} padding={18}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// CHARACTER · who is in the hook</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                {[
                  { id: "ava1", n: "ليلى",   g: "♀" },
                  { id: "ava2", n: "خالد",   g: "♂" },
                  { id: "ava3", n: "سارة",   g: "♀" },
                  { id: "ava4", n: "أحمد",   g: "♂" },
                  { id: "ava5", n: "نوف",    g: "♀" },
                ].map(a => {
                  const on = character === a.id;
                  return (
                    <button key={a.id} onClick={() => setCharacter(a.id)} style={{
                      padding: 8,
                      background: on ? `${p.accent}22` : p.bg2,
                      border: `1px solid ${on ? p.accent : p.border}`,
                      cursor: "pointer", textAlign: "center", color: p.fg,
                    }}>
                      <div style={{
                        width: "100%", aspectRatio: "1", background: p.bg0,
                        marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: p.dim,
                        border: `1px solid ${on ? p.accent : p.border}`,
                      }}>{a.g}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: on ? p.accent : p.dim, letterSpacing: ".1em" }}>{a.n}</div>
                    </button>
                  );
                })}
                {/* + upload */}
                <button onClick={() => setCharacter("custom")} style={{
                  padding: 8, background: character === "custom" ? `${p.accent}22` : "transparent",
                  border: `1px dashed ${p.border}`, cursor: "pointer", color: p.dim,
                  fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: ".15em",
                  aspectRatio: "1 / 1.35",
                }}>
                  + رفع<br/>صورة
                </button>
              </div>
            </Panel>

            {/* PRODUCT */}
            <Panel p={p} padding={18}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// PRODUCT · the thing being shown</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <TacticalInput p={p} label="رابط المنتج" value={product} onChange={setProduct} placeholder="https://shop.example.com/item" rtl={false} hint="رابط الصفحة أو ID" />
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 6 }}>▸ صور المنتج (≤ 5)</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0,1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, aspectRatio: "1", background: p.bg2,
                        border: `1px ${i === 0 ? "solid" : "dashed"} ${p.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: p.dim, fontFamily: "'Space Mono', monospace", fontSize: 14,
                        cursor: "pointer",
                      }}>{i === 0 ? "▦" : "+"}</div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>

            {/* APP PROMO */}
            <Panel p={p} padding={18}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// APP_PROMO · optional</div>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em" }}>للترويج لتطبيق</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 10 }}>
                <div style={{
                  width: 60, height: 60, background: p.bg2, border: `1px dashed ${p.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center", color: p.dim,
                  fontFamily: "'Space Mono', monospace", fontSize: 18, cursor: "pointer",
                }}>+</div>
                <TacticalInput p={p} value={appLink} onChange={setAppLink} placeholder="رابط التطبيق أو سكرين شوت" rtl={false} />
              </div>
            </Panel>

            {/* PARAMS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Panel p={p} padding={16}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 8 }}>// DURATION</div>
                <DurationSwitch p={p} value={duration} onChange={setDuration} min={3} max={60} />
                <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
                  {[6, 9, 15, 30].map(s => (
                    <button key={s} onClick={() => setDuration(s)} style={{
                      flex: 1, padding: "5px 0",
                      background: duration === s ? `${p.accent}22` : "transparent",
                      color: duration === s ? p.accent : p.dim,
                      border: `1px solid ${duration === s ? p.accent : p.border}`,
                      fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".15em", cursor: "pointer",
                    }}>{s}s</button>
                  ))}
                </div>
              </Panel>
              <Panel p={p} padding={16}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 8 }}>// VARIATIONS</div>
                <NumberSwitch p={p} value={count} onChange={setCount} min={1} max={10} step={1} suffix=" HOOKS" />
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em", marginTop: 8 }}>
                  ↳ كل واحد بسكربت مختلف وإبداع منفصل
                </div>
              </Panel>
            </div>

            <CrunchBtn p={p}
              label={loading ? "العقل يفكر..." : `توليد ${count} هوكس · ${duration * count * 4} CRED`}
              solid icon="▶" full disabled={loading || !character}
              onClick={generate}
            />
          </div>

          {/* RIGHT: output */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel p={p} padding={0}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${p.border}`, display: "flex", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <PulseRing p={p} size={10} color={loading ? p.accent : p.dim} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
                    {loading ? "BRAIN_THINKING" : generated ? "DELIVERED" : "AWAITING_INPUT"}
                  </span>
                </div>
                {loading && <ThinkingPulse p={p} label="عصف ذهني" />}
              </div>
              <div style={{ position: "relative", height: 240 }}>
                {(loading || generated) ? (
                  <AuroraLoader p={p} interactive intensity={loading ? 1.4 : 0.5} height="100%" />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                    <Reticle p={p} size={80} color={p.dim} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>اختر شخصية وانطلق</span>
                  </div>
                )}
              </div>
            </Panel>

            {loading && <BrainstormStream p={p} />}

            {generated && (
              <Panel p={p} padding={14}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// {generated.count} VARIATIONS · UNIQUE SCRIPTS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {Array.from({ length: generated.count }).map((_, i) => (
                    <div key={i} style={{
                      display: "grid", gridTemplateColumns: "60px 1fr auto auto",
                      gap: 10, alignItems: "center", padding: "10px 12px",
                      background: p.bg2, border: `1px solid ${p.border}`,
                    }}>
                      <div style={{ aspectRatio: "9/16", background: p.bg0, position: "relative", overflow: "hidden", border: `1px solid ${p.accent}` }}>
                        <HookGlyph env={generated.hook.env} p={p} />
                        <div style={{ position: "absolute", top: 3, left: 4, fontFamily: "'Space Mono', monospace", fontSize: 8, color: p.fg, textShadow: "0 0 4px rgba(0,0,0,.8)" }}>0{i+1}</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: p.fg, letterSpacing: ".06em" }}>
                          VARIATION_{(i+1).toString().padStart(2,"0")}
                        </div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".08em", marginTop: 2 }}>
                          {[
                            "بداية صادمة · 1.2s انفجار",
                            "مدخل بطيء · بناء توتر",
                            "سؤال مباشر للكاميرا",
                            "إحصائية مع لقطة قريبة",
                            "POV من الجانب الآخر",
                          ][i % 5]}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".15em", textAlign: "center" }}>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.accent2 }}>{82 + Math.floor(Math.random() * 14)}</div>
                        VIRAL
                      </div>
                      <CrunchBtn p={p} label="عرض" small />
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    );
  }

  // GALLERY VIEW
  return (
    <div>
      {/* category filter */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {HOOK_CATEGORIES.map(c => {
          const on = cat === c.id;
          const count = c.id === "all" ? HOOK_TEMPLATES.length : HOOK_TEMPLATES.filter(h => h.cat === c.id).length;
          return (
            <button key={c.id} onClick={() => setCat(c.id)} style={{
              padding: "8px 14px",
              background: on ? p.accent : "transparent",
              color: on ? p.bg0 : p.dim,
              border: `1px solid ${on ? p.accent : p.border}`,
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: ".15em",
              cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center",
            }}>
              {c.l}
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, opacity: .7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* gallery grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {list.map(h => <HookCard key={h.id} p={p} hook={h} onClick={() => setSelected(h)} />)}
      </div>
    </div>
  );
}

function HookCard({ p, hook, onClick }) {
  const [hover, setHover] = msUseState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", cursor: "pointer",
        border: `1px solid ${hover ? p.accent : p.border}`,
        transition: "all .15s",
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        background: p.bg1,
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
      }}>
      {/* visual */}
      <div style={{ position: "relative", aspectRatio: "9/14", overflow: "hidden" }}>
        <HookGlyph env={hook.env} p={p} />
        <NoiseOverlay opacity={0.14} />
        {/* abstract subject */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 18, height: 28, background: p.fg, opacity: 0.85,
            clipPath: "polygon(50% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)",
            filter: `drop-shadow(0 2px 8px ${p.bg0})`,
          }} />
        </div>
        {/* corner brackets */}
        <Corners p={p} size={8} inset={5} color={hover ? p.accent : `${p.fg}66`} />
        {/* top tags */}
        <div style={{ position: "absolute", top: 6, left: 6, right: 6, display: "flex", justifyContent: "space-between" }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 8, color: p.fg,
            background: "rgba(0,0,0,.6)", padding: "2px 6px", letterSpacing: ".2em", textTransform: "uppercase",
          }}>{hook.cat}</span>
          {hook.hot && (
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: 8, color: p.bg0,
              background: p.accent, padding: "2px 6px", letterSpacing: ".15em",
            }}>HOT</span>
          )}
        </div>
        {/* bottom name */}
        <div style={{ position: "absolute", bottom: 6, left: 6, right: 6 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".06em",
            textShadow: "0 0 8px rgba(0,0,0,.9)", lineHeight: 1,
          }}>{hook.ar}</div>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.accent, letterSpacing: ".18em",
            textShadow: "0 0 6px rgba(0,0,0,.9)", marginTop: 2,
          }}>{hook.name}</div>
        </div>
      </div>

      {/* hover overlay action */}
      {hover && (
        <div style={{
          position: "absolute", inset: 0, background: `${p.accent}11`,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            padding: "6px 14px", background: p.accent, color: p.bg0,
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: ".18em",
            clipPath: "polygon(0 0, 100% 0, 100% 70%, 90% 100%, 0 100%)",
          }}>استخدم ←</div>
        </div>
      )}
    </div>
  );
}

// Streaming brainstorm — shows the "operation brain" thinking out loud
function BrainstormStream({ p }) {
  const lines = [
    { t: "0.2s", c: "ok",   m: "تحليل المنتج · نوع · جمهور" },
    { t: "0.6s", c: "ok",   m: "تحديد الجمهور المستهدف · KSA · 18-34" },
    { t: "1.1s", c: "ok",   m: "عصف ذهني · 8 زوايا منفصلة" },
    { t: "1.5s", c: "hot",  m: "اختيار 3 أفكار بأعلى نقاط فيرلة" },
    { t: "1.8s", c: "ok",   m: "كتابة سكربت 1 · سؤال صدمة" },
    { t: "2.1s", c: "ok",   m: "كتابة سكربت 2 · إحصائية + شخص" },
    { t: "2.4s", c: "ok",   m: "كتابة سكربت 3 · POV غير متوقع" },
    { t: "2.7s", c: "inf",  m: "تجزيء إلى مشاهد · 4-6 لكل واحد" },
    { t: "3.0s", c: "ok",   m: "ستوري بورد · إطارات مفتاحية" },
    { t: "3.4s", c: "inf",  m: "تجهيز Higgsfield · Seedance 2.0" },
  ];
  const [shown, setShown] = msUseState(0);
  msUseEffect(() => {
    const t = setInterval(() => setShown(s => Math.min(lines.length, s + 1)), 220);
    return () => clearInterval(t);
  }, []);
  return (
    <Panel p={p} padding={14}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 8 }}>// BRAIN_STREAM · live</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, lineHeight: 1.8, letterSpacing: ".06em", direction: "ltr", textAlign: "left" }}>
        {lines.slice(0, shown).map((l, i) => {
          const color = l.c === "ok" ? p.accent2 : l.c === "hot" ? p.accent : p.warn;
          return (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              <span style={{ color: p.dim }}>{l.t}</span>
              <span style={{ color, width: 40 }}>[{l.c.toUpperCase()}]</span>
              <span style={{ color: p.fg, flex: 1, direction: "rtl", textAlign: "right" }}>{l.m}</span>
            </div>
          );
        })}
        {shown < lines.length && (
          <div style={{ marginTop: 4 }}><ThinkingPulse p={p} label="..." color={p.accent} /></div>
        )}
      </div>
    </Panel>
  );
}

Object.assign(window, { MarketStudioPage, HookGlyph, HOOK_TEMPLATES });

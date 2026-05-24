// SERVICE AGENT — the platform's omni-operator.
// Top-level page. Controls everything: creator, marketing tools, hooks, virality, etc.
// User writes a prompt → can mention hooks/characters/tools/constraints → agent
// parses into a workflow and executes across modules.

const { useState: saUseState, useEffect: saUseEffect, useRef: saUseRef } = React;

const TOKEN_TYPES = {
  hook:       { c: "accent",  l: "HOOK"        },
  character:  { c: "accent2", l: "CHARACTER"   },
  product:    { c: "warn",    l: "PRODUCT"     },
  tool:       { c: "accent",  l: "TOOL"        },
  constraint: { c: "warn",    l: "CONSTRAINT"  },
  module:     { c: "accent2", l: "MODULE"      },
};

// Available items per token kind
const HOOKS_AVAIL = [
  { v: "wall_breaker",   l: "WALL_BREAKER",  ar: "كاسر الجدار" },
  { v: "airplane_wing",  l: "AIRPLANE_WING", ar: "جناح طائرة" },
  { v: "volcano_rim",    l: "VOLCANO_RIM",   ar: "حافة بركان" },
  { v: "skyscraper",     l: "SKYSCRAPER",    ar: "ناطحة سحاب" },
  { v: "free_fall",      l: "FREE_FALL",     ar: "سقوط حر" },
  { v: "tutorial_open",  l: "TUTORIAL",      ar: "تعليمي UGC" },
  { v: "unboxing_pov",   l: "UNBOXING",      ar: "فك تغليف" },
  { v: "question_hook",  l: "QUESTION",      ar: "سؤال صدمة" },
];
const CHARACTERS_AVAIL = [
  { v: "layla",  l: "LAYLA",  ar: "ليلى · UGC نسائي" },
  { v: "khaled", l: "KHALED", ar: "خالد · UGC رجالي" },
  { v: "sara",   l: "SARA",   ar: "سارة · ناشطة" },
  { v: "ahmed",  l: "AHMED",  ar: "أحمد · أب عائلي" },
  { v: "nouf",   l: "NOUF",   ar: "نوف · مؤثرة فاشن" },
  { v: "custom", l: "CUSTOM", ar: "شخصيتك المرفوعة" },
];
const TOOLS_AVAIL = [
  { v: "virality_predictor", l: "VIRALITY_PREDICTOR", ar: "متنبئ الفيرلة" },
  { v: "nine_angles",        l: "9_ANGLES",           ar: "9 زوايا" },
  { v: "app_promo",          l: "APP_PROMO",          ar: "ترويج تطبيق" },
  { v: "storyboard_gen",     l: "STORYBOARD_GEN",     ar: "مولّد ستوري بورد" },
  { v: "script_writer",      l: "SCRIPT_WRITER",      ar: "كاتب سكربتات" },
  { v: "publisher",          l: "AUTO_PUBLISHER",     ar: "ناشر تلقائي" },
];
const MODULES_AVAIL = [
  { v: "film_maker",    l: "FILM_MAKER",    ar: "صانع الأفلام" },
  { v: "marketing",     l: "MARKETING",     ar: "وكيل التسويق" },
  { v: "campaign_op",   l: "CAMPAIGN_OPS",  ar: "مشغّل الحملات" },
];
const CONSTRAINTS_AVAIL = [
  { v: "virality_gt_80", l: "VIRALITY > 80",      ar: "فيرلة أكبر من 80%" },
  { v: "duration_30s",   l: "DURATION = 30s",      ar: "مدة 30 ثانية" },
  { v: "duration_lt_60", l: "DURATION < 60s",      ar: "مدة أقل من دقيقة" },
  { v: "platform_ig",    l: "PLATFORM = IG",       ar: "للإنستجرام فقط" },
  { v: "budget_lt_200",  l: "BUDGET < 200 CRED",   ar: "ميزانية أقل من 200" },
  { v: "no_explicit",    l: "NO_EXPLICIT",         ar: "لا محتوى صريح" },
];

const PROMPT_TEMPLATES = [
  {
    name: "حملة هوكس فيرلية مع متنبئ",
    desc: "5 هوكس بشخصية + فحص فيرلة > 80%",
    prompt: "ولّد 5 هوكس @hook:wall_breaker مع @character:layla للمنتج، وقبل التجميع طبّق @tool:virality_predictor واحرص @constraint:virality_gt_80",
  },
  {
    name: "وثائقي مع نشر تلقائي",
    desc: "وثائقي 5 دقائق + رفع على المنصات",
    prompt: "أنشئ في @module:film_maker وثائقي 5 دقائق عن الأهرامات بنبرة هادئة، ثم استخدم @tool:auto_publisher للنشر على IG + YT",
  },
  {
    name: "بحث ترندات → 9 هوكس",
    desc: "ابحث ترندات الأسبوع وأنتج هوكس",
    prompt: "ابحث ترندات هذا الأسبوع في @module:marketing، اختر أعلى 3، ولّد 3 هوكس @hook:question_hook لكل منها مع @character:nouf",
  },
  {
    name: "اختبار A/B بين شخصيتين",
    desc: "نفس الهوك بشخصيتين للمقارنة",
    prompt: "ولّد @hook:tutorial_open بشخصيتين: @character:layla و @character:khaled، طبّق @tool:virality_predictor وقارن النتائج",
  },
];

function ServiceAgentPage({ p, navigate, credits = 4820 }) {
  const [prompt, setPrompt] = saUseState("");
  const [parsed, setParsed] = saUseState([]);
  const [running, setRunning] = saUseState(false);
  const [progress, setProgress] = saUseState(0);
  const [log, setLog] = saUseState([]);
  const [done, setDone] = saUseState(false);

  // Parse @tokens from prompt
  saUseEffect(() => {
    const re = /@(hook|character|product|tool|constraint|module):(\w+)/g;
    const found = [];
    let m;
    while ((m = re.exec(prompt)) !== null) found.push({ type: m[1], val: m[2], idx: m.index });
    setParsed(found);
  }, [prompt]);

  // Insert a token at the end of the prompt
  function insertToken(type, val) {
    const sep = prompt && !prompt.endsWith(" ") ? " " : "";
    setPrompt(prompt + sep + `@${type}:${val} `);
  }

  function execute() {
    if (!prompt.trim()) return;
    setRunning(true); setDone(false); setProgress(0); setLog([]);

    const steps = [
      { t: 200, m: "tokenize prompt · " + parsed.length + " mentions found", c: "ok" },
      { t: 380, m: "resolving modules + tools...", c: "inf" },
      { t: 600, m: "constructing execution plan · 6 steps", c: "ok" },
      { t: 900, m: "STEP 1/6 → parse intent · brainstorm angles", c: "hot" },
      { t: 1500, m: "STEP 2/6 → write 5 distinct scripts", c: "ok" },
      { t: 2100, m: "STEP 3/6 → storyboard 6 scenes each", c: "ok" },
      { t: 2700, m: "STEP 4/6 → render frames via higgsfield", c: "ok" },
      { t: 3300, m: "STEP 5/6 → apply virality predictor (BEFORE assembly)", c: "hot" },
      { t: 3800, m: "PASS · 4/5 variants ≥ 80 viral (84, 86, 91, 78→retry)", c: "ok" },
      { t: 4200, m: "rebuilding variant 4 with new hook angle", c: "warn" },
      { t: 4700, m: "STEP 6/6 → assemble · audio mix · export", c: "ok" },
      { t: 5200, m: "DELIVERED · 5 videos · 0 failed", c: "hot" },
    ];

    steps.forEach((s) => setTimeout(() => {
      setLog(prev => [...prev, s]);
      setProgress(Math.min(100, (steps.indexOf(s) + 1) / steps.length * 100));
      if (steps.indexOf(s) === steps.length - 1) {
        setRunning(false); setDone(true);
      }
    }, s.t));
  }

  function reset() {
    setLog([]); setDone(false); setProgress(0);
  }

  return (
    <PageFrame p={p} density={0.4}>
      <AuthedNav p={p} current="service-agent" navigate={navigate} credits={credits} onLogout={() => navigate("auth")} />

      <div style={{ padding: "26px 32px 32px", maxWidth: 1500, margin: "0 auto" }}>

        {/* HERO STRIP */}
        <div style={{
          position: "relative", padding: "30px 32px", marginBottom: 22,
          background: p.bg1, border: `1px solid ${p.accent}`, overflow: "hidden",
        }}>
          <div style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
            <AuroraLoader p={p} interactive intensity={1.3} height="100%" />
          </div>
          <Corners p={p} size={16} inset={8} color={p.accent} />
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto", gap: 22, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Tag p={p} color={p.accent} glow>✦ OMNI_OPERATOR · v1</Tag>
                <Tag p={p}>● SUPREME</Tag>
                <Tag p={p} color={p.accent2}>9 MODULES LINKED</Tag>
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 64, color: p.fg, letterSpacing: ".04em", lineHeight: .9, textShadow: `0 0 24px ${p.glow}` }}>
                وكيل الخدمة
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: p.accent2, letterSpacing: ".22em", marginTop: 6 }}>
                SERVICE AGENT // OMNI_CONTROL
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: p.fg, lineHeight: 1.7, marginTop: 14, maxWidth: 720 }} dir="rtl">
                اكتب أمراً واحداً · يتحكم بكل المنصة · ينفذ مهام مركّبة من بداية النية إلى التسليم.
                يستخدم صانع الأفلام، الهوكس، متنبئ الفيرلة، 9 الزوايا، وكل أداة موجودة.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
              <div style={{ padding: "12px 14px", background: `${p.bg0}cc`, border: `1px solid ${p.border}`, backdropFilter: "blur(4px)" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>OPS_EXECUTED</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: p.accent, lineHeight: 1 }}>
                  <CountUp value={847} />
                </div>
              </div>
              <div style={{ padding: "12px 14px", background: `${p.bg0}cc`, border: `1px solid ${p.border}`, backdropFilter: "blur(4px)" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>SUCCESS_RATE</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: p.accent2, lineHeight: 1 }}>
                  96.4%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18, marginBottom: 18 }}>
          {/* LEFT: OPERATION BRIEF */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <Panel p={p} padding={20}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>
                  // OPERATION_BRIEF
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em" }}>
                  {parsed.length} TOKENS · {prompt.length}/2000
                </div>
              </div>

              {/* parsed token chips (active mentions) */}
              {parsed.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10, padding: 10, background: p.bg2, border: `1px dashed ${p.border}` }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", alignSelf: "center" }}>PARSED →</span>
                  {parsed.map((t, i) => {
                    const meta = TOKEN_TYPES[t.type];
                    const col = meta ? p[meta.c] : p.fg;
                    return (
                      <span key={i} style={{
                        padding: "3px 8px", background: `${col}22`, border: `1px solid ${col}66`, borderRight: `2px solid ${col}`,
                        fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".1em", color: col,
                        display: "inline-flex", alignItems: "center", gap: 4,
                      }}>
                        <span style={{ opacity: .6 }}>@{t.type}:</span>
                        <span style={{ fontWeight: 700 }}>{t.val}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Prompt textarea */}
              <textarea
                value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="أمثلة:&#10;ولّد 5 هوكس @hook:wall_breaker بشخصية @character:layla وقبل التجميع طبّق @tool:virality_predictor مع @constraint:virality_gt_80&#10;&#10;أنشئ في @module:film_maker وثائقي 5 دقائق عن الأهرامات بنبرة هادئة"
                rows={6}
                style={{
                  width: "100%", background: p.bg0, border: `1px solid ${p.border}`, borderRight: `3px solid ${p.accent}`,
                  color: p.fg, padding: "14px 16px",
                  fontFamily: "'Inter', sans-serif", fontSize: 14, outline: "none", lineHeight: 1.7,
                  direction: "rtl", boxSizing: "border-box", resize: "vertical",
                }}
              />

              {/* Insert token row */}
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", alignSelf: "center" }}>INSERT →</span>
                <TokenPicker p={p} type="hook"       items={HOOKS_AVAIL}       onPick={(v) => insertToken("hook", v)} />
                <TokenPicker p={p} type="character"  items={CHARACTERS_AVAIL}  onPick={(v) => insertToken("character", v)} />
                <TokenPicker p={p} type="tool"       items={TOOLS_AVAIL}       onPick={(v) => insertToken("tool", v)} />
                <TokenPicker p={p} type="module"     items={MODULES_AVAIL}     onPick={(v) => insertToken("module", v)} />
                <TokenPicker p={p} type="constraint" items={CONSTRAINTS_AVAIL} onPick={(v) => insertToken("constraint", v)} />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <CrunchBtn p={p} label={running ? "ينفّذ..." : done ? "تنفيذ جديد" : "نفّذ الأمر"}
                  solid icon="▶" full disabled={!prompt.trim() || running}
                  onClick={() => { if (done) { reset(); } else execute(); }} />
                <CrunchBtn p={p} label="مسح" icon="✕" onClick={() => { setPrompt(""); setLog([]); setDone(false); }} />
              </div>
            </Panel>

            {/* WORKFLOW CHAIN */}
            {parsed.length > 0 && (
              <Panel p={p} padding={18}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>
                  // EXECUTION_PLAN · شجرة التنفيذ
                </div>
                <WorkflowChain p={p} tokens={parsed} running={running} progress={progress} done={done} />
              </Panel>
            )}

            {/* QUICK TEMPLATES */}
            <Panel p={p} padding={18}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>
                // QUICK_OPS · أوامر جاهزة
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {PROMPT_TEMPLATES.map((t, i) => (
                  <button key={i} onClick={() => setPrompt(t.prompt)} style={{
                    padding: 12, background: p.bg2, border: `1px solid ${p.border}`,
                    color: p.fg, textAlign: "right", cursor: "pointer",
                    transition: "all .15s",
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = p.accent; e.currentTarget.style.background = `${p.accent}11`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.background = p.bg2; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <Tag p={p} color={p.accent}>OP_{(i+1).toString().padStart(2,"0")}</Tag>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: p.fg, letterSpacing: ".05em", lineHeight: 1.2 }}>{t.name}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".1em", marginTop: 4 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </Panel>
          </div>

          {/* RIGHT: live execution + modules */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* LIVE EXECUTION */}
            <Panel p={p} padding={0}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${p.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <PulseRing p={p} size={10} color={running ? p.accent : done ? p.accent2 : p.dim} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
                    EXECUTION · {running ? "LIVE" : done ? "COMPLETE" : "STANDBY"}
                  </span>
                </div>
                {(running || done) && (
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.accent }}>{Math.round(progress)}%</span>
                )}
              </div>
              <div style={{ position: "relative", height: 200 }}>
                {(running || done) ? (
                  <AuroraLoader p={p} interactive intensity={running ? 1.4 : 0.6} height="100%" />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <Reticle p={p} size={80} color={p.dim} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>AWAIT_DIRECTIVE</span>
                  </div>
                )}
              </div>
              {(running || log.length > 0) && (
                <div style={{ padding: 14, borderTop: `1px solid ${p.border}`, maxHeight: 280, overflow: "auto", fontFamily: "'Space Mono', monospace", fontSize: 11, lineHeight: 1.85, direction: "ltr", textAlign: "left" }}>
                  {log.map((entry, i) => {
                    const col = entry.c === "ok" ? p.accent2 : entry.c === "hot" ? p.accent : entry.c === "warn" ? p.warn : p.fg;
                    return (
                      <div key={i} style={{ display: "flex", gap: 8 }}>
                        <span style={{ color: p.dim, width: 40 }}>{(entry.t / 1000).toFixed(1)}s</span>
                        <span style={{ color: col, width: 38 }}>[{entry.c.toUpperCase()}]</span>
                        <span style={{ color: p.fg, flex: 1 }}>{entry.m}</span>
                      </div>
                    );
                  })}
                  {running && <ThinkingPulse p={p} label="processing..." />}
                </div>
              )}
            </Panel>

            {/* AVAILABLE MODULES */}
            <Panel p={p} padding={18}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>
                // CONNECTED_MODULES · 9
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {[
                  { l: "FILM_MAKER",       ar: "صانع الأفلام",     g: "▶" },
                  { l: "MARKETING",        ar: "وكيل التسويق",       g: "◆" },
                  { l: "CAMPAIGN_OPS",     ar: "مشغّل الحملات",     g: "✦" },
                  { l: "HOOKS_LIBRARY",    ar: "مكتبة الهوكس",      g: "◢" },
                  { l: "VIRALITY_MODEL",   ar: "متنبئ الفيرلة",     g: "▲" },
                  { l: "9_ANGLES",         ar: "9 زوايا",           g: "▦" },
                  { l: "STORYBOARD_GEN",   ar: "ستوري بورد",        g: "≡" },
                  { l: "AUTO_PUBLISHER",   ar: "ناشر تلقائي",       g: "↗" },
                  { l: "HIGGSFIELD_API",   ar: "Higgsfield API",   g: "⊕" },
                ].map((m, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", background: p.bg2, border: `1px solid ${p.border}`,
                    borderRight: `2px solid ${p.accent2}`,
                  }}>
                    <span style={{ fontSize: 14, color: p.accent2, width: 16, textAlign: "center" }}>{m.g}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, color: p.fg, letterSpacing: ".05em", lineHeight: 1.2 }}>{m.ar}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: p.dim, letterSpacing: ".15em" }}>{m.l}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* RECENT OPS */}
            <Panel p={p} padding={18}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>
                // RECENT_OPS · سجل
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { t: "منذ 4 دقائق", l: "5 هوكس × ليلى · فحص فيرلة", c: "ok",   tag: "DONE" },
                  { t: "منذ 18 د",   l: "وثائقي · الأهرامات · 5 دقائق", c: "ok",  tag: "DONE" },
                  { t: "منذ ساعة",   l: "بحث ترندات + 3 هوكس",        c: "ok",   tag: "DONE" },
                  { t: "منذ 3س",     l: "ترويج تطبيق · App_xx",        c: "hot",  tag: "RETRIED" },
                  { t: "أمس",        l: "9 زوايا · صورة منتج",          c: "ok",   tag: "DONE" },
                ].map((o, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "90px 1fr 70px",
                    gap: 8, alignItems: "center",
                    padding: "8px 10px", background: p.bg2, border: `1px solid ${p.border}`,
                  }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".15em" }}>{o.t}</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.fg }} dir="rtl">{o.l}</span>
                    <Tag p={p} color={o.c === "ok" ? p.accent2 : p.warn}>{o.tag}</Tag>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

// ---------- Token picker dropdown ----------
function TokenPicker({ p, type, items, onPick }) {
  const [open, setOpen] = saUseState(false);
  const [pos, setPos] = saUseState(null);
  const btnRef = saUseRef(null);
  const meta = TOKEN_TYPES[type];
  const col = meta ? p[meta.c] : p.accent;

  saUseEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-tp-menu="1"]')) return;
      setOpen(false);
    };
    const reflow = () => {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left });
      }
    };
    reflow();
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("resize", reflow);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("resize", reflow);
    };
  }, [open]);

  return (
    <div style={{ position: "relative", direction: "ltr", display: "inline-block" }}>
      <button ref={btnRef} onClick={() => setOpen(!open)} style={{
        padding: "5px 10px", background: open ? `${col}22` : "transparent",
        color: open ? col : p.dim, border: `1px solid ${open ? col : p.border}`,
        fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".15em",
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4,
      }}>
        + {meta.l}
      </button>
      {open && pos && ReactDOM.createPortal(
        <div data-tp-menu="1" style={{
          position: "fixed", top: pos.top, left: pos.left,
          minWidth: 240, background: p.bg1, border: `1px solid ${col}`,
          padding: 4, zIndex: 99999,
          boxShadow: `0 8px 24px rgba(0,0,0,.7), 0 0 18px ${col}44`,
        }}>
          <div style={{ padding: "6px 10px", fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", borderBottom: `1px solid ${p.border}`, marginBottom: 2 }}>
            INSERT @{type.toUpperCase()}
          </div>
          {items.map(it => (
            <button key={it.v} onClick={() => { onPick(it.v); setOpen(false); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${col}11`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                width: "100%", padding: "7px 10px",
                background: "transparent", border: "none",
                color: p.fg, cursor: "pointer", textAlign: "left",
                transition: "background .12s", gap: 12,
              }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: col, letterSpacing: ".1em" }}>{it.l}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: p.dim, direction: "rtl" }}>{it.ar}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ---------- Workflow chain visualization ----------
function WorkflowChain({ p, tokens, running, progress, done }) {
  // Build a synthetic chain from token types
  const hookTokens   = tokens.filter(t => t.type === "hook");
  const charTokens   = tokens.filter(t => t.type === "character");
  const toolTokens   = tokens.filter(t => t.type === "tool");
  const modTokens    = tokens.filter(t => t.type === "module");
  const constrTokens = tokens.filter(t => t.type === "constraint");

  const steps = [];
  steps.push({ icon: "1", l: "PARSE", ar: "تحليل النية", note: `${tokens.length} منشن` });
  if (modTokens.length || hookTokens.length) {
    steps.push({ icon: "2", l: "BRAINSTORM", ar: "عصف ذهني", note: `${Math.max(3, hookTokens.length * 3)} أفكار` });
  }
  if (charTokens.length || hookTokens.length) {
    steps.push({ icon: "3", l: "SCRIPT", ar: "كتابة سكربتات", note: `${charTokens.length || 1} × ${hookTokens.length || 1}` });
  }
  steps.push({ icon: "4", l: "STORYBOARD", ar: "ستوري بورد", note: "6 مشاهد" });
  steps.push({ icon: "5", l: "RENDER", ar: "توليد إطارات", note: "Higgsfield" });
  if (toolTokens.some(t => t.val.includes("virality")) || constrTokens.some(t => t.val.includes("virality"))) {
    steps.push({ icon: "▲", l: "VIRALITY_CHECK", ar: "فحص الفيرلة", note: "BEFORE assembly", warn: true });
  }
  steps.push({ icon: "6", l: "ASSEMBLE", ar: "تجميع", note: "audio + mix" });
  steps.push({ icon: "✓", l: "DELIVER", ar: "تسليم", note: "MP4 · 4K" });

  const activeStep = running ? Math.floor((progress / 100) * steps.length) : done ? steps.length : -1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {steps.map((s, i) => {
        const state = i < activeStep ? "done" : i === activeStep ? "active" : "pending";
        const col = state === "done" ? p.accent2 : state === "active" ? p.accent : p.dim;
        return (
          <div key={i} style={{ position: "relative" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "40px 1fr auto",
              gap: 14, alignItems: "center",
              padding: "10px 12px",
              background: state === "active" ? `${p.accent}11` : p.bg2,
              border: `1px solid ${state === "active" ? p.accent : p.border}`,
              borderRight: `2px solid ${col}`,
            }}>
              <div style={{
                width: 32, height: 32,
                background: state === "done" ? p.accent2 : state === "active" ? p.accent : "transparent",
                border: `1px solid ${col}`,
                color: state === "pending" ? p.dim : p.bg0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: ".05em",
                clipPath: "polygon(0 0, 100% 0, 100% 70%, 80% 100%, 0 100%)",
                position: "relative",
              }}>
                {s.icon}
                {state === "active" && <div style={{ position: "absolute", inset: -3, border: `1px solid ${p.accent}`, animation: "wf-pulse 1.2s ease-in-out infinite" }} />}
              </div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: p.fg, letterSpacing: ".06em", lineHeight: 1.2 }}>
                  {s.ar} {s.warn && <span style={{ color: p.warn, fontSize: 11 }}>▲</span>}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".18em" }}>
                  {s.l} · {s.note}
                </div>
              </div>
              <Tag p={p} color={col}>{state === "done" ? "✓" : state === "active" ? "● RUN" : "○"}</Tag>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 1, height: 6, background: i < activeStep ? p.accent2 : p.border, margin: "0 auto" }} />
            )}
          </div>
        );
      })}
      <style>{`@keyframes wf-pulse { 0%, 100% { opacity: .25; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }`}</style>
    </div>
  );
}

Object.assign(window, { ServiceAgentPage, TokenPicker, WorkflowChain });

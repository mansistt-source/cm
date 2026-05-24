// Marketing Studio — Campaign / Tools / Supercomputer modes
// Sister file to pages-marketing-studio.jsx

const { useState: msm2UseState, useEffect: msm2UseEffect } = React;

// ============================================================
// CAMPAIGN MODE — multi-platform campaign (existing → expanded)
// ============================================================
const CAMPAIGN_MODES = [
  { id: "trend",    name: "بحث الترندات",   desc: "Instagram · TikTok · YouTube — أحدث الترندات في مجالك" },
  { id: "campaign", name: "حملة تسويقية",   desc: "ريلز + إعلانات + UGC — كامل من برومبت واحد" },
  { id: "content",  name: "خطة محتوى",      desc: "جدول نشر كامل مع نصوص وهاشتاجز" },
  { id: "ugc",      name: "UGC واسع النطاق", desc: "100+ فيديو بأسلوب مؤثرين مختلفين" },
];

function CampaignMode({ p }) {
  const [sub, setSub] = msm2UseState("campaign");
  const [prompt, setPrompt] = msm2UseState("");
  const [loading, setLoading] = msm2UseState(false);
  const [progress, setProgress] = msm2UseState(0);
  const [results, setResults] = msm2UseState(null);

  const DEMO = {
    trend:    "ابحث عن أحدث ترندات محتوى العطور الفاخرة على TikTok وInstagram في الخليج.",
    campaign: "حملة كاملة لكافيه جديد في الرياض، 8 ريلز بأسلوبين مع كابشنز.",
    content:  "خطة محتوى أسبوع كامل لصفحة تعليمية عن تطوير الذات.",
    ugc:      "20 فيديو UGC بأسلوبات مؤثرين مختلفين لمنتج مكمل غذائي.",
  };

  function run() {
    if (!prompt.trim()) return;
    setLoading(true); setResults(null); setProgress(5);
    let pr = 5;
    const t = setInterval(() => {
      pr += 7 + Math.random() * 11;
      if (pr >= 100) { clearInterval(t); setProgress(100); setLoading(false); setResults({ items: 8 }); }
      else setProgress(Math.min(99, pr));
    }, 320);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {CAMPAIGN_MODES.map(m => {
          const on = sub === m.id;
          return (
            <button key={m.id} onClick={() => { setSub(m.id); setPrompt(""); }} style={{
              padding: 16, background: on ? p.bg2 : p.bg1,
              border: `1px solid ${on ? p.accent : p.border}`,
              cursor: "pointer", textAlign: "right", color: p.fg,
              clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
              position: "relative",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: on ? 50 : 22, height: 2, background: on ? p.accent : p.dim, transition: "width .25s" }} />
              <Tag p={p} color={on ? p.accent : p.dim}>{m.id.toUpperCase()}</Tag>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".06em", marginTop: 8, lineHeight: 1.2 }}>{m.name}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".1em", marginTop: 4, lineHeight: 1.5 }}>{m.desc}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel p={p} padding={18}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// AGENT_BRIEF · {sub.toUpperCase()}</div>
              <a onClick={() => setPrompt(DEMO[sub])} style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", cursor: "pointer", textDecoration: "underline" }}>↳ مثال</a>
            </div>
            <TacticalTextarea p={p} value={prompt} onChange={setPrompt} placeholder={DEMO[sub]} rows={6}
              hint="حدد المنصة · الجمهور · النبرة · المنطقة" />
          </Panel>

          <Panel p={p} padding={18}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>// OPTIONS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <CampaignField p={p} label="المنصات" opts={[["IG", true], ["TT", true], ["YT", true], ["FB", false], ["X", false]]} />
              <CampaignField p={p} label="المنطقة" opts={[["KSA", true], ["UAE", false], ["EG", false], ["GLB", false]]} />
              <CampaignField p={p} label="نبرة" opts={[["جاد", false], ["ودي", true], ["مرح", false]]} />
            </div>
          </Panel>

          <CrunchBtn p={p} label={loading ? "Higgsfield يعمل..." : "تشغيل الوكيل ◢"} solid icon="▶" full disabled={loading} onClick={run} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel p={p} padding={0}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${p.border}`, display: "flex", justifyContent: "space-between" }}>
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
  );
}

function CampaignField({ p, label, opts }) {
  return (
    <div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", marginBottom: 5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {opts.map(([l, on], i) => (
          <button key={i} style={{
            padding: "5px 9px",
            background: on ? `${p.accent}22` : p.bg2, color: on ? p.accent : p.dim,
            border: `1px solid ${on ? p.accent : p.border}`,
            fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".15em",
            cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// TOOLS MODE — 9-Angles · Virality Predictor · App Promo
// ============================================================
function ToolsMode({ p }) {
  const [tool, setTool] = msm2UseState("virality");
  const tools = [
    { id: "virality", name: "VIRALITY PREDICTOR", ar: "متنبئ الفيرلة",      icon: "▲", desc: "قيّم فيديو على 4 محاور قبل الإطلاق" },
    { id: "angles",   name: "9-ANGLES",          ar: "9 زوايا من صورة",     icon: "▦", desc: "صورة واحدة → 9 زوايا كاميرا" },
    { id: "promo",    name: "APP PROMO",         ar: "ترويج تطبيق",         icon: "↗", desc: "شخصية + رابط/سكرين → فيديو ترويج" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
        {tools.map(t => {
          const on = tool === t.id;
          return (
            <button key={t.id} onClick={() => setTool(t.id)} style={{
              padding: 18, background: on ? p.bg2 : p.bg1,
              border: `1px solid ${on ? p.accent : p.border}`,
              cursor: "pointer", textAlign: "right", color: p.fg,
              clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
              position: "relative",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: on ? 50 : 22, height: 2, background: on ? p.accent : p.dim }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Tag p={p} color={on ? p.accent : p.dim}>{t.name}</Tag>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: on ? p.accent : p.dim }}>{t.icon}</span>
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: p.fg, letterSpacing: ".06em", lineHeight: 1 }}>{t.ar}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".1em", marginTop: 6 }}>{t.desc}</div>
            </button>
          );
        })}
      </div>

      {tool === "virality" && <ViralityPredictor p={p} />}
      {tool === "angles"   && <NineAngles p={p} />}
      {tool === "promo"    && <AppPromo p={p} />}
    </div>
  );
}

// ---- Virality Predictor ----
function ViralityPredictor({ p }) {
  const [src, setSrc] = msm2UseState("");
  const [scored, setScored] = msm2UseState(null);
  const [analyzing, setAnalyzing] = msm2UseState(false);

  function analyze() {
    if (!src.trim()) return;
    setAnalyzing(true); setScored(null);
    setTimeout(() => {
      setAnalyzing(false);
      setScored({
        viral: 78,
        hook: 64,
        retention: 82,
        creative: 88,
        peakAt: 1.4,
        dropoff: 7.2,
        verdict: "STRONG · HOOK NEEDS WORK",
      });
    }, 1800);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel p={p} padding={18}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// INPUT_SOURCE</div>
          <TacticalInput p={p} label="رابط الفيديو" value={src} onChange={setSrc} placeholder="https://tiktok.com/@user/video/..." rtl={false} />
          <div style={{ marginTop: 10, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em" }}>
            ↳ يدعم TikTok · Instagram Reels · YouTube Shorts · MP4 رفع مباشر
          </div>
          <div style={{ marginTop: 14, padding: "16px 14px", border: `1px dashed ${p.border}`, textAlign: "center", color: p.dim, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".22em", cursor: "pointer" }}>
            + أو اسحب ملف MP4 هنا
          </div>
          <div style={{ marginTop: 14 }}>
            <CrunchBtn p={p} label={analyzing ? "تحليل..." : "حلّل الفيديو"} solid icon="▲" full disabled={analyzing} onClick={analyze} />
          </div>
        </Panel>

        <Panel p={p} padding={18}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// MODEL_INFO</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, lineHeight: 1.8, letterSpacing: ".06em" }} dir="rtl">
            <div>المحرك · <span style={{ color: p.accent }}>Higgsfield Predictor v2</span></div>
            <div>مدرّب على · <span style={{ color: p.fg }}>4.2M فيديو فيرلي</span></div>
            <div>دقة التنبؤ · <span style={{ color: p.accent2 }}>87.3%</span></div>
            <div>سرعة · <span style={{ color: p.fg }}>~12 ثانية</span></div>
          </div>
        </Panel>
      </div>

      <Panel p={p} padding={20}>
        {analyzing ? (
          <div style={{ position: "relative", height: 380 }}>
            <AuroraLoader p={p} interactive intensity={1.4} height="100%" />
            <div style={{ position: "absolute", top: 20, left: 20 }}>
              <ThinkingPulse p={p} label="يستخرج لقطات المفتاح · يقيس الشدّ" />
            </div>
          </div>
        ) : scored ? (
          <div>
            {/* big score */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 22, alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", marginBottom: 4 }}>VIRAL_SCORE</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 100, color: p.accent, lineHeight: 1, letterSpacing: ".02em", textShadow: `0 0 30px ${p.glow}` }}>
                  {scored.viral}<span style={{ fontSize: 24, color: p.dim }}>/100</span>
                </div>
                <Tag p={p} color={p.accent}>{scored.verdict}</Tag>
              </div>

              {/* mini gauge */}
              <div style={{ position: "relative", width: 180, height: 180 }}>
                <svg width="180" height="180" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" stroke={p.border} strokeWidth="1" fill="none" />
                  <circle cx="50" cy="50" r="44" stroke={p.accent} strokeWidth="3"
                    fill="none" strokeDasharray="276" strokeDashoffset={276 - (scored.viral / 100) * 276}
                    transform="rotate(-90 50 50)" style={{ filter: `drop-shadow(0 0 6px ${p.accent})` }} />
                  {Array.from({ length: 36 }).map((_, i) => {
                    const a = (i / 36) * Math.PI * 2;
                    const x1 = 50 + Math.cos(a) * 47, y1 = 50 + Math.sin(a) * 47;
                    const x2 = 50 + Math.cos(a) * 49, y2 = 50 + Math.sin(a) * 49;
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={p.dim} strokeWidth=".5" />;
                  })}
                </svg>
              </div>
            </div>

            {/* sub-scores */}
            <div style={{ paddingTop: 18, borderTop: `1px solid ${p.border}` }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 14 }}>// SUB_METRICS</div>
              <ScoreBar p={p} label="HOOK_STRENGTH"  v={scored.hook}       color={p.warn}    note="ضعيف في أول 1.2s — أضف انتقال" />
              <ScoreBar p={p} label="RETENTION"      v={scored.retention} color={p.accent}  note="هبوط 7.2s — أضف بوكر" />
              <ScoreBar p={p} label="CREATIVE_PERF"  v={scored.creative}  color={p.accent2} note="ممتاز · بصرياً متميز" />
              <ScoreBar p={p} label="VIRAL_RISK"     v={scored.viral}     color={p.accent}  note="مرشح للانتشار" />
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${p.border}` }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// RECOMMENDATIONS</div>
              {[
                { p: "▲", c: "warn",  m: "قوّي البداية — استبدل أول 1.5s بهوك أحدّ" },
                { p: "↓", c: "warn",  m: "هبوط في الثانية 7.2 — أضف انتقال بصري قوي" },
                { p: "✓", c: "ok",    m: "اللون والإضاءة ممتازين — احتفظ بهم" },
                { p: "+", c: "info",  m: "أضف نص متحرك في الثانية 5 لزيادة الاحتفاظ" },
              ].map((r, i) => {
                const color = r.c === "warn" ? p.warn : r.c === "ok" ? p.accent2 : p.accent;
                return (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0", borderBottom: i < 3 ? `1px dashed ${p.border}` : "none" }}>
                    <span style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 14, minWidth: 18 }}>{r.p}</span>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg, lineHeight: 1.6 }}>{r.m}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 380, gap: 14 }}>
            <Reticle p={p} size={100} color={p.dim} />
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: p.fg, letterSpacing: ".05em" }}>متنبئ الفيرلة</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em" }}>↳ ألصق رابط للتحليل</div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ScoreBar({ p, label, v, color, note }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em" }}>{label}</span>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color, letterSpacing: ".05em" }}>{v}</span>
      </div>
      <div style={{ height: 3, background: p.bg2, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, width: `${v}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      {note && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".08em", marginTop: 3 }} dir="rtl">↳ {note}</div>
      )}
    </div>
  );
}

// ---- 9 Angles ----
function NineAngles({ p }) {
  const [uploaded, setUploaded] = msm2UseState(false);
  const [generating, setGenerating] = msm2UseState(false);
  const [angles, setAngles] = msm2UseState([]);

  function generate() {
    setGenerating(true); setAngles([]);
    let n = 0;
    const t = setInterval(() => {
      n++; setAngles(prev => [...prev, n]);
      if (n >= 9) { clearInterval(t); setGenerating(false); }
    }, 320);
  }

  const angleNames = [
    "HIGH_3Q",  "FRONT",    "LOW_3Q",
    "SIDE_L",   "TOP_DOWN", "SIDE_R",
    "TILT_UP",  "BIRDS_EYE","WORM_EYE",
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 18 }}>
      <Panel p={p} padding={20}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 14 }}>// SOURCE_IMAGE</div>

        <div
          onClick={() => setUploaded(true)}
          style={{
            aspectRatio: "1", border: `1px ${uploaded ? "solid" : "dashed"} ${uploaded ? p.accent : p.border}`,
            background: uploaded ? p.bg2 : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", cursor: "pointer", color: p.dim,
            position: "relative", overflow: "hidden",
          }}>
          {uploaded ? (
            <>
              <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(45deg, ${p.line} 0 2px, transparent 2px 8px)`, opacity: .7 }} />
              <div style={{
                width: 36, height: 56, background: p.fg, opacity: .85, position: "relative", zIndex: 1,
                clipPath: "polygon(50% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)",
              }} />
              <div style={{ position: "absolute", top: 8, left: 8, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".15em" }}>
                ◤ SUBJECT_LOCKED
              </div>
              <Corners p={p} size={10} inset={4} color={p.accent} />
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>↑</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".18em" }}>اسحب صورة هنا</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".15em", marginTop: 4 }}>JPG · PNG · ≤ 8MB</div>
            </>
          )}
        </div>

        <div style={{ marginTop: 14, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em", lineHeight: 1.7 }} dir="rtl">
          • صورة واضحة، خلفية بسيطة
          <br/>• المنتج/الشخصية في الوسط
          <br/>• الموديل يكتشف الشكل تلقائياً
        </div>

        <div style={{ marginTop: 14 }}>
          <CrunchBtn p={p} label={generating ? "توليد الزوايا..." : "اصنع 9 زوايا · 45 CRED"} solid icon="▦" full disabled={!uploaded || generating} onClick={generate} />
        </div>
      </Panel>

      <Panel p={p} padding={20}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// ANGLE_GRID · 9</div>
          {angles.length === 9 && <CrunchBtn p={p} label="تحميل الكل" small icon="↓" />}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {angleNames.map((name, i) => {
            const filled = angles.length > i;
            const isHead = generating && angles.length === i + 1;
            return (
              <div key={i} style={{
                position: "relative", aspectRatio: "1",
                background: filled ? p.bg2 : p.bg0,
                border: `1px solid ${isHead ? p.accent : filled ? p.accent2 : p.border}`,
                overflow: "hidden",
                boxShadow: isHead ? `0 0 14px ${p.accent}88` : "none",
                transition: "all .25s",
              }}>
                {filled && (
                  <>
                    <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(${i * 30}deg, ${p.line} 0 2px, transparent 2px 8px)`, opacity: .7 }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{
                        width: 24, height: 36, background: p.fg, opacity: 0.85,
                        clipPath: "polygon(50% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)",
                        transform: `rotate(${(i - 4) * 6}deg) scale(${1 + ((i % 3) * 0.1 - 0.1)})`,
                      }} />
                    </div>
                  </>
                )}
                {!filled && !isHead && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: p.dim, fontSize: 18 }}>○</div>
                )}
                {isHead && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PulseRing p={p} size={20} />
                  </div>
                )}
                <div style={{ position: "absolute", top: 4, left: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: filled ? p.accent : p.dim, letterSpacing: ".15em", textShadow: filled ? "0 0 4px rgba(0,0,0,.7)" : "none" }}>
                  {i + 1}
                </div>
                <div style={{ position: "absolute", bottom: 4, left: 6, right: 6, fontFamily: "'Space Mono', monospace", fontSize: 8, color: filled ? p.fg : p.dim, letterSpacing: ".15em", textShadow: filled ? "0 0 4px rgba(0,0,0,.8)" : "none" }}>
                  {name}
                </div>
              </div>
            );
          })}
        </div>
        {generating && (
          <div style={{ marginTop: 12 }}>
            <ThinkingPulse p={p} label={`يولّد الزاوية ${angles.length}/9`} />
          </div>
        )}
      </Panel>
    </div>
  );
}

// ---- App Promo ----
function AppPromo({ p }) {
  const [appName, setAppName] = msm2UseState("");
  const [appLink, setAppLink] = msm2UseState("");
  const [character, setCharacter] = msm2UseState(null);
  const [hook, setHook] = msm2UseState("airplane_wing");
  const [duration, setDuration] = msm2UseState(15);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel p={p} padding={18}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>// APP_DETAILS</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "flex-start" }}>
            <div style={{
              width: 80, height: 80, background: p.bg2, border: `1px dashed ${p.border}`,
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
              color: p.dim, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".15em",
            }}>
              <div style={{ fontSize: 22 }}>+</div>
              ICON
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <TacticalInput p={p} label="اسم التطبيق" value={appName} onChange={setAppName} placeholder="مثال · ContentMachine" />
              <TacticalInput p={p} label="الرابط / Store URL" value={appLink} onChange={setAppLink} placeholder="https://apps.apple.com/..." rtl={false} />
            </div>
          </div>
        </Panel>

        <Panel p={p} padding={18}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// SCREENSHOTS · سحب 1-4</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                aspectRatio: "9/19", background: p.bg2,
                border: `1px ${i === 0 ? "solid" : "dashed"} ${p.border}`,
                position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: p.dim, fontFamily: "'Space Mono', monospace", fontSize: 14, cursor: "pointer",
              }}>
                {i === 0 ? (
                  <>
                    <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(0deg, ${p.line} 0 2px, transparent 2px 6px)`, opacity: .7 }} />
                    <div style={{ position: "absolute", top: 4, left: 6, fontFamily: "'Space Mono', monospace", fontSize: 8, color: p.accent, letterSpacing: ".15em" }}>SCN 01</div>
                  </>
                ) : "+"}
              </div>
            ))}
          </div>
        </Panel>

        <Panel p={p} padding={18}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// CHARACTER</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {[
              { id: "ava1", n: "ليلى" },
              { id: "ava2", n: "خالد" },
              { id: "ava3", n: "سارة" },
              { id: "ava4", n: "أحمد" },
              { id: "ava5", n: "نوف" },
            ].map(a => {
              const on = character === a.id;
              return (
                <button key={a.id} onClick={() => setCharacter(a.id)} style={{
                  padding: 8, background: on ? `${p.accent}22` : p.bg2,
                  border: `1px solid ${on ? p.accent : p.border}`,
                  cursor: "pointer", color: p.fg, textAlign: "center",
                }}>
                  <div style={{
                    width: "100%", aspectRatio: "1", background: p.bg0,
                    marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: p.dim,
                    border: `1px solid ${p.border}`,
                  }}>{a.n[0]}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: on ? p.accent : p.dim, letterSpacing: ".1em" }}>{a.n}</div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel p={p} padding={18}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// HOOK_SETTING</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
            {["airplane_wing", "volcano_rim", "skyscraper", "wall_breaker"].map(id => {
              const t = HOOK_TEMPLATES.find(h => h.id === id);
              const on = hook === id;
              return (
                <button key={id} onClick={() => setHook(id)} style={{
                  padding: 8, background: on ? `${p.accent}22` : p.bg2,
                  border: `1px solid ${on ? p.accent : p.border}`,
                  cursor: "pointer", color: p.fg, position: "relative",
                  aspectRatio: "9/12", overflow: "hidden",
                }}>
                  <HookGlyph env={t.env} p={p} />
                  <div style={{ position: "absolute", bottom: 4, left: 4, right: 4, fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, color: p.fg, letterSpacing: ".05em", textShadow: "0 0 6px rgba(0,0,0,.8)", lineHeight: 1.1 }}>
                    {t.ar}
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel p={p} padding={16}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// DURATION</div>
          <DurationSwitch p={p} value={duration} onChange={setDuration} min={5} max={60} />
        </Panel>

        <CrunchBtn p={p} label={`توليد فيديو الترويج · ${duration * 5} CRED`} solid icon="▶" full disabled={!character} />
      </div>

      <Panel p={p} padding={18}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 14 }}>// LIVE_PREVIEW</div>
        <div style={{ aspectRatio: "9/16", background: p.bg0, position: "relative", overflow: "hidden", border: `1px solid ${p.accent}` }}>
          <HookGlyph env={(HOOK_TEMPLATES.find(h => h.id === hook) || {}).env || "sky"} p={p} />
          <NoiseOverlay opacity={0.14} />
          {/* mock layered preview */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 16 }}>
            <div>
              <Tag p={p}>● 0:03 / 0:{duration.toString().padStart(2, "0")}</Tag>
            </div>
            <div style={{
              alignSelf: "center", width: "60%", aspectRatio: "9/19",
              background: p.bg2, border: `2px solid ${p.fg}`, position: "relative", overflow: "hidden",
              boxShadow: `0 0 24px ${p.fg}66`,
            }}>
              <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(0deg, ${p.line} 0 2px, transparent 2px 6px)`, opacity: .8 }} />
              <div style={{ position: "absolute", top: 8, left: 0, right: 0, textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.fg, letterSpacing: ".1em", textShadow: "0 0 6px rgba(0,0,0,.8)" }}>
                {appName || "APP_NAME"}
              </div>
              {/* CTA */}
              <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, padding: "6px 8px", background: p.accent, color: p.bg0, textAlign: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 11, letterSpacing: ".12em" }}>
                حمّل الآن ←
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: p.fg, letterSpacing: ".05em", textShadow: "0 0 12px rgba(0,0,0,.8)", lineHeight: 1 }}>
                جرّب {appName || "التطبيق"}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginTop: 6, textShadow: "0 0 8px rgba(0,0,0,.8)" }}>
                ↳ {appLink || "yourapp.com"}
              </div>
            </div>
          </div>
          <Corners p={p} size={14} inset={8} color={p.accent} />
        </div>
      </Panel>
    </div>
  );
}

// ============================================================
// SUPERCOMPUTER MODE — autonomous AI agent
// ============================================================
function SupercomputerMode({ p }) {
  const [running, setRunning] = msm2UseState(true);
  return (
    <div>
      {/* HERO STRIP */}
      <div style={{
        position: "relative", padding: "26px 28px", marginBottom: 18,
        background: p.bg1, border: `1px solid ${p.accent}`, overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
          <AuroraLoader p={p} interactive intensity={1.0} height="100%" />
        </div>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto", gap: 22, alignItems: "center" }}>
          <div>
            <Tag p={p} color={p.accent} glow>✦ CAMPAIGN_OPERATOR · 24/7</Tag>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 50, color: p.fg, letterSpacing: ".04em", marginTop: 10, lineHeight: .95 }}>
              مشغّل الحملات
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: p.accent2, letterSpacing: ".22em", marginTop: 8 }}>
              8x أرخص · 3x أسرع · POWERED BY GEMINI
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: p.fg, lineHeight: 1.7, marginTop: 12, maxWidth: 580 }} dir="rtl">
              مشغّل آلي لحملاتك التسويقية — يدرس الترندات، يصنع الفيديوهات، يتواصل مع العملاء، يكتب تقارير، ويحسّن الأداء بدون تدخّل.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 220 }}>
            <CrunchBtn p={p} label={running ? "● يعمل · إيقاف" : "تشغيل الوكيل"} solid icon={running ? "■" : "▶"} full onClick={() => setRunning(!running)} />
            <CrunchBtn p={p} label="ضبط الإعدادات" icon="⚙" full />
          </div>
        </div>
      </div>

      {/* TOP STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
        <StatTile p={p} label="STATUS"          value={running ? "ACTIVE" : "IDLE"} accent={running} mono />
        <StatTile p={p} label="TASKS_QUEUE"     value={running ? "3" : "0"} sub="2 يعمل · 1 منتظر" />
        <StatTile p={p} label="THIS_WEEK_RUNS"  value={142} sub="+38 من الأسبوع الماضي" />
        <StatTile p={p} label="CRED_BURN_RATE"  value="14/hr" sub="≈ 336 يوم" mono />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>

        {/* LEFT: Skills + Automations */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel p={p} padding={20}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// SKILLS · معارف الوكيل</div>
              <Tag p={p} color={p.accent2}>9 ACTIVE</Tag>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { n: "Personal Clipper",   ar: "قاطع المقاطع",        d: "يحوّل فيديو طويل إلى مقاطع فيرلية", on: true },
                { n: "Niche Scanner",      ar: "ماسح المجالات",        d: "يعثر على نِيشات بأعلى صرف",         on: true },
                { n: "Auto-Outreach",      ar: "تواصل تلقائي",          d: "يصمم ويرسل رسائل لمؤثرين",         on: true },
                { n: "Trend Watcher",      ar: "راصد الترندات",         d: "يراقب TikTok · IG · YT",            on: true },
                { n: "Hook A/B Tester",    ar: "اختبار الهوكس",         d: "يجرب 6 هوكس ويختار الفائز",        on: true },
                { n: "Captions Crafter",   ar: "صائغ الكابشن",          d: "يكتب كابشن لكل منصة",              on: true },
                { n: "Comment Replier",    ar: "ردّ التعليقات",         d: "ردود ذكية على جمهورك",             on: false },
                { n: "Weekly Report",      ar: "تقرير أسبوعي",          d: "تقرير أداء مفصل كل أحد",           on: true },
                { n: "Budget Sentinel",    ar: "حارس الميزانية",        d: "تنبيهات صرف وكفاءة",               on: true },
              ].map((s, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: 10, background: s.on ? p.bg2 : p.bg0,
                  border: `1px solid ${s.on ? p.accent2 + "55" : p.border}`,
                  borderRight: s.on ? `2px solid ${p.accent2}` : `1px solid ${p.border}`,
                }}>
                  <div style={{
                    width: 26, height: 26, background: s.on ? p.accent2 : p.bg2,
                    color: s.on ? p.bg0 : p.dim,
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{s.on ? "ON" : "—"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: s.on ? p.fg : p.dim, letterSpacing: ".05em", lineHeight: 1.2 }}>{s.ar}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".1em", marginTop: 2 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel p={p} padding={20}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// AUTOMATIONS · 24/7</div>
              <CrunchBtn p={p} label="+ أتمتة" small icon="+" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { trig: "كل يوم 8:00 ص",                 act: "افحص ترندات TikTok · جنرت 3 هوكس", state: "RUNNING" },
                { trig: "بعد كل فيديو يُنشر",             act: "تابع 24س · رتّب ردود التعليقات",   state: "RUNNING" },
                { trig: "كل أحد 7:00 م",                 act: "تقرير أداء مع توصيات",            state: "RUNNING" },
                { trig: "عند انخفاض كريديت تحت 500",      act: "اقتراح خطة شراء + إيقاف غير المهم", state: "PAUSED"  },
                { trig: "عند فيديو + 100K مشاهدة",        act: "ضع نسخ بنفس الفورمولا · 3x ميزانية", state: "RUNNING" },
              ].map((a, i) => (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 90px",
                  gap: 14, alignItems: "center", padding: "10px 12px",
                  background: p.bg2, border: `1px solid ${p.border}`,
                }}>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>WHEN</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.fg, marginTop: 2 }} dir="rtl">{a.trig}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>DO</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.fg, marginTop: 2 }} dir="rtl">{a.act}</div>
                  </div>
                  <Tag p={p} color={a.state === "RUNNING" ? p.accent2 : p.warn}>● {a.state}</Tag>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* RIGHT: Live agent thinking + memory */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Panel p={p} padding={0}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${p.border}`, display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <PulseRing p={p} size={10} color={running ? p.accent : p.dim} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
                  AGENT_STREAM · {running ? "LIVE" : "PAUSED"}
                </span>
              </div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent2, letterSpacing: ".18em" }}>2.1s ago</span>
            </div>
            <div style={{ padding: 14, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, lineHeight: 1.85, letterSpacing: ".06em", direction: "ltr", textAlign: "left", maxHeight: 320, overflow: "auto" }}>
              {[
                ["12:14:23", "ok",  "trend scan complete · 47 trends found"],
                ["12:14:24", "inf", "ranking by reach × niche fit..."],
                ["12:14:26", "hot", "top niche: skincare-mens-30s (score 0.92)"],
                ["12:14:28", "ok",  "brainstorming 6 hook angles..."],
                ["12:14:31", "inf", "selecting top 3 by predicted virality"],
                ["12:14:33", "ok",  "writing script 1 · pattern interrupt"],
                ["12:14:35", "ok",  "writing script 2 · UGC unboxing"],
                ["12:14:37", "ok",  "writing script 3 · stat hook"],
                ["12:14:40", "inf", "dispatching to higgsfield · 3 jobs queued"],
                ["12:14:42", "ok",  "job_a01 · storyboard complete"],
                ["12:14:46", "ok",  "job_a01 · frames 1/6 generated"],
              ].map((l, i) => {
                const color = l[1] === "ok" ? p.accent2 : l[1] === "hot" ? p.accent : p.warn;
                return (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <span style={{ color: p.dim }}>{l[0]}</span>
                    <span style={{ color, width: 36 }}>[{l[1].toUpperCase()}]</span>
                    <span style={{ color: p.fg, flex: 1 }}>{l[2]}</span>
                  </div>
                );
              })}
              {running && <ThinkingPulse p={p} label="awaiting next tick..." />}
            </div>
          </Panel>

          <Panel p={p} padding={18}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>// MEMORY · ما يعرفه الوكيل</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, lineHeight: 2, letterSpacing: ".06em" }} dir="rtl">
              <div>عملك · <span style={{ color: p.fg }}>كافيه في الرياض</span></div>
              <div>جمهور · <span style={{ color: p.fg }}>18-34 · ذكور 60% · إناث 40%</span></div>
              <div>أسلوب · <span style={{ color: p.fg }}>ودي · مرح · بدون رسميات</span></div>
              <div>منصات · <span style={{ color: p.fg }}>TikTok · IG · Snapchat</span></div>
              <div>أفضل وقت نشر · <span style={{ color: p.accent }}>الخميس 8:30 م</span></div>
              <div>هوكس فعّالة · <span style={{ color: p.accent2 }}>POV · Stat · Pattern</span></div>
              <div>تجنّب · <span style={{ color: p.warn }}>محتوى ديني/سياسي</span></div>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${p.border}` }}>
              <a style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.accent, letterSpacing: ".22em", cursor: "pointer" }}>↳ تعديل الذاكرة</a>
            </div>
          </Panel>

          <Panel p={p} padding={18}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>// WEEK_REPORT</div>
            {[
              { l: "VIDEOS_OUT",  v: 18 },
              { l: "AVG_VIEWS",   v: "42K" },
              { l: "BEST_HOOK",   v: "WALL_BREAK" },
              { l: "ROI",         v: "+312%", accent: true },
            ].map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 3 ? `1px dashed ${p.border}` : "none" }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em" }}>{r.l}</span>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: r.accent ? p.accent2 : p.fg, letterSpacing: ".04em" }}>{r.v}</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CampaignMode, ToolsMode, SupercomputerMode });

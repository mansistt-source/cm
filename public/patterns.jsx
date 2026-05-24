// Communication patterns library — all the ways the operation brain can interact.
// Plus a shader-loaders showcase board (aurora, liquid, thinking pulse, etc.).

function CommPatternsArtboard({ p, w = 1280, h = 1100 }) {
  return (
    <div dir="rtl" style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      background: p.bg0, color: p.fg, fontFamily: "'Inter', sans-serif",
    }}>
      <ParticleField p={p} density={0.4} showGrid={true} />
      <div style={{ position: "absolute", inset: 12, border: `1px solid ${p.border}` }} />
      <Corners p={p} size={22} inset={12} />

      {/* HEADER */}
      <div style={{ position: "relative", padding: "26px 36px 0", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".25em", color: p.accent, textTransform: "uppercase" }}>
          <span style={{ width: 8, height: 8, background: p.accent, transform: "rotate(45deg)" }} />
          // BRAIN_INPUT_LIBRARY · 12 patterns
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${p.border}, transparent)` }} />
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 46, letterSpacing: ".05em", lineHeight: 1, color: p.fg, textTransform: "uppercase" }}>
          أنماط التفاوض <span style={{ color: p.accent }}>·</span> <span style={{ color: p.dim, fontSize: 26 }}>كل طريقة ترد بها على البرين</span>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, padding: "26px 36px 36px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>

        {/* 01 — Yes/No */}
        <Pattern p={p} code="01" name="YES/NO" sub="binary decision" >
          <div style={{ display: "flex", gap: 6 }}>
            <Btn p={p} solid>نعم</Btn>
            <Btn p={p}>لا</Btn>
            <Btn p={p}>ربما</Btn>
          </div>
        </Pattern>

        {/* 02 — Choice buttons */}
        <Pattern p={p} code="02" name="MULTI-CHOICE" sub="pick exactly one" >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {["سينمائي", "وثائقي", "أنيمي", "إعلاني"].map((s, i) => (
              <Btn p={p} key={i} solid={i === 0} small>{s}</Btn>
            ))}
          </div>
        </Pattern>

        {/* 03 — Multi-select chips */}
        <Pattern p={p} code="03" name="MULTI-SELECT" sub="pick any number" >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {[
              { l: "مطر", on: true },
              { l: "ليل", on: true },
              { l: "نيون", on: false },
              { l: "ضباب", on: true },
              { l: "زحام", on: false },
            ].map((c, i) => (
              <span key={i} style={{
                padding: "5px 10px",
                background: c.on ? `${p.accent}22` : p.bg2,
                color: c.on ? p.accent : p.dim,
                border: `1px solid ${c.on ? p.accent : p.border}`,
                fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".1em",
                display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer",
              }}>
                <span style={{ width: 9, height: 9, border: `1px solid ${c.on ? p.accent : p.border}`, background: c.on ? p.accent : "transparent" }} />
                {c.l}
              </span>
            ))}
          </div>
        </Pattern>

        {/* 04 — Slider 0-1 */}
        <Pattern p={p} code="04" name="SLIDER" sub="value on a continuum" >
          <MiniSlider p={p} value={0.62} left="بطيء" right="سريع" suggested={0.5} />
        </Pattern>

        {/* 05 — Stepper */}
        <Pattern p={p} code="05" name="STEPPER" sub="discrete value" >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={{ width: 32, height: 32, background: p.bg2, border: `1px solid ${p.border}`, color: p.fg, cursor: "pointer", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18 }}>−</button>
            <div style={{ flex: 1, textAlign: "center", padding: "6px 0", background: p.bg2, border: `1px solid ${p.accent}`, fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: p.accent, letterSpacing: ".08em" }}>
              6 SCENES
            </div>
            <button style={{ width: 32, height: 32, background: p.accent, border: `1px solid ${p.accent}`, color: p.bg0, cursor: "pointer", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18 }}>+</button>
          </div>
        </Pattern>

        {/* 06 — Dial */}
        <Pattern p={p} code="06" name="DIAL" sub="rotational analog" >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Dial p={p} value={0.55} setValue={() => {}} size={88} />
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: p.accent, lineHeight: 1 }}>55%</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em", marginTop: 4 }}>INTENSITY</div>
            </div>
          </div>
        </Pattern>

        {/* 07 — Card picker */}
        <Pattern p={p} code="07" name="CARD PICK" sub="visual selection" >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
            {[
              { l: "محقق", g: "◆", hot: true },
              { l: "صحفية", g: "◇" },
              { l: "شاعر",  g: "✦" },
            ].map((c, i) => (
              <div key={i} style={{
                aspectRatio: ".82",
                background: c.hot ? `${p.accent}15` : p.bg2,
                border: `1px solid ${c.hot ? p.accent : p.border}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
                cursor: "pointer",
              }}>
                <div style={{ fontSize: 22, color: c.hot ? p.accent : p.dim, marginBottom: 6 }}>{c.g}</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, letterSpacing: ".08em", color: c.hot ? p.fg : p.dim }}>{c.l}</div>
              </div>
            ))}
          </div>
        </Pattern>

        {/* 08 — Rank / drag */}
        <Pattern p={p} code="08" name="RANK" sub="ordered list" >
          {["حزن", "أمل", "غضب", "ذهول"].map((l, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 8px", background: p.bg2, border: `1px solid ${p.border}`, marginBottom: 3,
            }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.accent, minWidth: 16 }}>#{i + 1}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.fg, flex: 1 }}>{l}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".18em" }}>⋮⋮</span>
            </div>
          ))}
        </Pattern>

        {/* 09 — Color palette */}
        <Pattern p={p} code="09" name="PALETTE" sub="pick a color set" >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { name: "NOIR",     cs: [p.bg0, p.bg2, "#3a1410", p.accent, "#8a2a20"], on: true },
              { name: "CLINICAL", cs: [p.bg0, "#0c1620", "#1a3047", p.accent2, "#7a99b8"] },
              { name: "DESERT",   cs: ["#1a1408", "#3a2a14", "#7a5a30", "#d99a40", "#f0d090"] },
            ].map((pal, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: 6, background: pal.on ? `${p.accent}15` : "transparent",
                border: `1px solid ${pal.on ? p.accent : p.border}`,
                cursor: "pointer",
              }}>
                <div style={{ display: "flex", gap: 2 }}>
                  {pal.cs.map((c, j) => (
                    <div key={j} style={{ width: 16, height: 16, background: c, border: `1px solid ${p.bg0}` }} />
                  ))}
                </div>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, color: pal.on ? p.accent : p.dim, letterSpacing: ".12em" }}>{pal.name}</span>
              </div>
            ))}
          </div>
        </Pattern>

        {/* 10 — Free text */}
        <Pattern p={p} code="10" name="FREE TEXT" sub="open input" >
          <div style={{
            padding: "10px 12px", background: p.bg2, border: `1px solid ${p.accent}`,
            borderRight: `2px solid ${p.accent}`, fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.fg, lineHeight: 1.6,
            minHeight: 70,
          }} dir="rtl">
            خل البطل يكتب قصيدة في آخر مشهد، ويترك ورقة لأخته
            <span style={{ display: "inline-block", width: 7, height: 14, background: p.accent, marginRight: 2, verticalAlign: "middle", animation: "blink-p 1s steps(2) infinite" }} />
          </div>
        </Pattern>

        {/* 11 — Voice / upload */}
        <Pattern p={p} code="11" name="UPLOAD / VOICE" sub="external input" >
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{
              flex: 1, padding: "16px 12px", textAlign: "center",
              border: `1px dashed ${p.border}`, background: p.bg2,
              fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em",
            }}>↑ DROP_FILE</div>
            <div style={{
              padding: "16px 12px", textAlign: "center",
              border: `1px solid ${p.accent}`, background: `${p.accent}11`,
              fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.accent, letterSpacing: ".18em",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}>
              <PulseRing p={p} size={14} />
              REC
            </div>
          </div>
        </Pattern>

        {/* 12 — Confirm with cost */}
        <Pattern p={p} code="12" name="CONFIRM" sub="commit with cost" >
          <div style={{ padding: 10, background: p.bg2, border: `1px solid ${p.accent}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>COMMIT</span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.accent }}>245 CRED</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ flex: 1, padding: "8px 0", background: "transparent", color: p.dim, border: `1px solid ${p.border}`, fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: ".15em", cursor: "pointer" }}>إلغاء</button>
              <button style={{ flex: 2, padding: "8px 0", background: p.accent, color: p.bg0, border: `1px solid ${p.accent}`, fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: ".15em", cursor: "pointer", clipPath: "polygon(0 0, 100% 0, 100% 70%, 90% 100%, 0 100%)" }}>تأكيد</button>
            </div>
          </div>
        </Pattern>

      </div>

      <style>{`@keyframes blink-p { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

function Pattern({ p, code, name, sub, children }) {
  return (
    <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}`, position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 24, height: 2, background: p.accent }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".25em" }}>// {code}</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".08em" }}>{name}</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".15em", marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Btn({ p, children, solid, small }) {
  return (
    <button style={{
      padding: small ? "6px 12px" : "10px 16px",
      background: solid ? p.accent : "transparent",
      color: solid ? p.bg0 : p.fg,
      border: `1px solid ${solid ? p.accent : p.border}`,
      fontFamily: "'Bebas Neue', sans-serif", fontSize: small ? 12 : 14, letterSpacing: ".15em",
      cursor: "pointer",
      clipPath: "polygon(0 0, 100% 0, 100% 75%, 90% 100%, 0 100%)",
    }}>{children}</button>
  );
}

function MiniSlider({ p, value, suggested, left, right }) {
  return (
    <div>
      <div style={{ position: "relative", height: 22, marginTop: 4 }}>
        <div style={{ position: "absolute", top: 10, left: 0, right: 0, height: 2, background: p.border }} />
        <div style={{ position: "absolute", top: 10, left: 0, width: `${value * 100}%`, height: 2, background: p.accent, boxShadow: `0 0 6px ${p.accent}` }} />
        {Array.from({ length: 21 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: `${(i / 20) * 100}%`, top: i % 5 === 0 ? 6 : 8, width: 1, height: i % 5 === 0 ? 10 : 5, background: i / 20 <= value ? p.accent : p.border }} />
        ))}
        <div style={{ position: "absolute", left: `calc(${value * 100}% - 5px)`, top: 4, width: 10, height: 14, background: p.accent, clipPath: "polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)" }} />
        {suggested != null && (
          <div style={{ position: "absolute", left: `calc(${suggested * 100}% - 4px)`, top: 6, width: 8, height: 10, border: `1px solid ${p.accent2}`, background: "transparent" }} />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".18em" }}>
        <span>{left}</span>
        <span style={{ color: p.accent }}>{Math.round(value * 100)}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

// =========================================================================
// LOADERS SHOWCASE
// =========================================================================

function LoadersArtboard({ p, w = 1280, h = 920 }) {
  return (
    <div style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      background: p.bg0, color: p.fg, fontFamily: "'Inter', sans-serif",
    }}>
      <ParticleField p={p} density={0.3} showGrid={true} />
      <div style={{ position: "absolute", inset: 12, border: `1px solid ${p.border}` }} />
      <Corners p={p} size={22} inset={12} />

      {/* HEADER */}
      <div style={{ position: "relative", padding: "26px 36px 0", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".25em", color: p.accent, textTransform: "uppercase" }}>
          <span style={{ width: 8, height: 8, background: p.accent, transform: "rotate(45deg)" }} />
          // BRAIN_THINKING_VISUALS · interactive
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${p.border}, transparent)` }} />
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 46, letterSpacing: ".05em", lineHeight: 1, textTransform: "uppercase" }}>
          شيدر اللوادر <span style={{ color: p.accent }}>·</span> <span style={{ color: p.dim, fontSize: 26 }}>عند تفكير العقل</span>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.dim, marginTop: 8, maxWidth: 580, lineHeight: 1.7 }} dir="rtl">
          أنماط بصرية تظهر أثناء معالجة العقل لطلبك. كلها تفاعلية مع حركة الماوس داخل المنطقة الخاصة بها.
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, padding: "26px 36px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>

        {/* LEFT: Aurora hero */}
        <div>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em" }}>// AURORA_PULSE · primary</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".2em" }}>MOUSE WARP →</div>
          </div>
          <div style={{ height: 320 }}>
            <AuroraLoader p={p} label="◤ BRAIN_THINKING // AURORA" interactive intensity={1.2} height="100%" />
          </div>

          {/* embedded in chat bubble */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", marginBottom: 8 }}>// EMBEDDED · in negotiation bubble</div>
            <div style={{ padding: 16, background: p.bg1, border: `1px solid ${p.border}`, borderRight: `2px solid ${p.accent}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <ThinkingPulse p={p} label="درست النص ▸ أحلل البنية..." />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim }}>2.4s</span>
              </div>
              <div style={{ height: 64 }}>
                <AuroraLoader p={p} interactive intensity={0.7} height="100%" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: variants */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", marginBottom: 6 }}>// LIQUID_METAL</div>
            <div style={{ height: 140 }}>
              <LiquidMetalLoader p={p} height="100%" label="◤ DEEP_PASS" />
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", marginBottom: 6 }}>// IRIDESCENT_FIELD</div>
            <div style={{ height: 140 }}>
              <IridescentField p={p} />
            </div>
          </div>

          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", marginBottom: 6 }}>// INLINE_INDICATORS</div>
            <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
              <ThinkingPulse p={p} label="BRAIN_THINKING" />
              <ThinkingPulse p={p} label="ANALYZING_PROMPT" color={p.accent2} />
              <ThinkingPulse p={p} label="ASSEMBLING_SHOT_PLAN" color={p.warn} />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <PulseRing p={p} size={14} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.accent, letterSpacing: ".22em" }}>LIVE · 2.1s ELAPSED</span>
              </div>
              <ProgressTokens p={p} done={62} total={100} />
            </div>
          </div>
        </div>
      </div>

      {/* IRIDESCENT CARD ROW — embedded as preview */}
      <div style={{ position: "absolute", left: 36, right: 36, bottom: 36, padding: 16, background: p.bg1, border: `1px solid ${p.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em" }}>// IRIDESCENT_CARDS · hover for full effect</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".2em" }}>MOUSE-REACTIVE</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <IridescentCard p={p} code="// EFX_01" title="SPECULAR" sub="hot-spot follows cursor" w="100%" h={170}
            glyph={<svg width="60" height="60" viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" stroke={p.accent} strokeWidth="1" fill="none" /><circle cx="38" cy="38" r="8" fill={p.fg} /></svg>} />
          <IridescentCard p={p} code="// EFX_02" title="IRIDESCENT" hot sub="conic sheen + tilt" w="100%" h={170}
            glyph={<svg width="60" height="60" viewBox="0 0 100 100"><polygon points="50,10 90,50 50,90 10,50" stroke={p.accent} strokeWidth="1" fill="none" /></svg>} />
          <IridescentCard p={p} code="// EFX_03" title="NOISE GRAIN" sub="film texture overlay" w="100%" h={170}
            glyph={<svg width="60" height="60" viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" stroke={p.accent} strokeWidth="1" fill="none" /></svg>} />
        </div>
      </div>
    </div>
  );
}

// Iridescent field — full panel of cycling iridescent gradient with noise
function IridescentField({ p }) {
  const ref = React.useRef(null);
  const [m, setM] = React.useState({ x: 0.5, y: 0.5 });
  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    setM({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  }
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: p.bg0, border: `1px solid ${p.border}` }}>
      <div style={{
        position: "absolute", inset: -30,
        background: `conic-gradient(from ${m.x * 360}deg at ${m.x * 100}% ${m.y * 100}%,
          ${p.accent} 0deg, ${p.accent2} 90deg, ${p.warn} 180deg, ${p.accent} 270deg, ${p.accent} 360deg)`,
        filter: "blur(40px)",
        opacity: 0.6,
        mixBlendMode: "screen",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at ${m.x * 100}% ${m.y * 100}%, rgba(255,255,255,0.16) 0%, transparent 30%)`,
        mixBlendMode: "screen",
      }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${p.bg0}aa 1px, transparent 1px)`, backgroundSize: "100% 3px", opacity: 0.5 }} />
      <NoiseOverlay opacity={0.12} />
      <Corners p={p} size={12} inset={6} color={p.accent} />
      <div style={{ position: "absolute", top: 12, left: 14, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.fg, letterSpacing: ".22em", textShadow: "0 0 8px rgba(0,0,0,.6)", textTransform: "uppercase" }}>
        ◤ DEEP_FIELD
      </div>
    </div>
  );
}

// Progress tokens — chunk-by-chunk LLM streaming visualization
function ProgressTokens({ p, done, total }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 2, marginBottom: 6 }}>
        {Array.from({ length: 40 }).map((_, i) => {
          const cur = (i / 40) * 100;
          const filled = cur < done;
          const head = cur >= done - 2.5 && cur < done;
          return <div key={i} style={{
            flex: 1, height: 10,
            background: head ? p.accent : filled ? `${p.accent}88` : p.bg2,
            border: `1px solid ${filled || head ? p.accent : p.border}`,
            boxShadow: head ? `0 0 6px ${p.accent}` : "none",
          }} />;
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>
        <span>STREAMING · {done} / {total} tokens</span>
        <span style={{ color: p.accent }}>● LIVE</span>
      </div>
    </div>
  );
}

Object.assign(window, { CommPatternsArtboard, LoadersArtboard, IridescentField, ProgressTokens });

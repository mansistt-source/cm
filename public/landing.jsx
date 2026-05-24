// Landing hero artboard — same content, themable by palette prop.
// Right-to-left Arabic UI (matches the Content Machine project).

function LandingArtboard({ p, w = 1280, h = 800 }) {
  return (
    <div dir="rtl" style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      background: p.bg0, color: p.fg,
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    }}>
      <ParticleField p={p} />

      {/* edge frame */}
      <div style={{ position: "absolute", inset: 12, border: `1px solid ${p.border}`, pointerEvents: "none" }} />
      <Corners p={p} size={22} thick={1.5} inset={12} />

      {/* NAV */}
      <div style={{
        position: "absolute", top: 12, left: 12, right: 12, height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", borderBottom: `1px solid ${p.border}`,
        zIndex: 5,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24">
            <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke={p.accent} strokeWidth="1.5" fill="none" />
            <polygon points="12,7 17,10 17,14 12,17 7,14 7,10" fill={p.accent} />
          </svg>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: ".22em", color: p.fg }}>
            CONTENT/MACHINE
          </div>
          <Tag p={p} color={p.accent2}>v.2.6</Tag>
        </div>

        {/* nav items */}
        <div style={{ display: "flex", alignItems: "center", gap: 30, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: p.dim }}>
          <span style={{ color: p.fg, position: "relative" }}>
            الرئيسية
            <span style={{ position: "absolute", bottom: -22, left: 0, right: 0, height: 2, background: p.accent }} />
          </span>
          <span>الباقات</span>
          <span>المعرض</span>
          <span>الدعم</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Tag p={p} glow>● ONLINE</Tag>
          <CrunchBtn p={p} label="دخول" small />
        </div>
      </div>

      {/* HERO content */}
      <div style={{ position: "absolute", top: 100, left: 36, right: 36, display: "flex", gap: 36, alignItems: "flex-start" }}>
        {/* Left: title block */}
        <div style={{ flex: 1.2, position: "relative", paddingTop: 30 }}>
          {/* code label */}
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11,
            letterSpacing: ".3em", color: p.accent, marginBottom: 22, textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <span style={{ width: 28, height: 1, background: p.accent }} />
            <span>SYS//AUTO_PIPELINE_07</span>
            <span style={{ flex: 1, height: 1, background: p.border }} />
          </div>

          {/* MASSIVE display title */}
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 140, lineHeight: .85, letterSpacing: ".005em",
            color: p.fg, fontWeight: 400, textTransform: "uppercase",
            position: "relative",
          }}>
            <div>بروميت<span style={{ color: p.accent, textShadow: `0 0 20px ${p.glow}` }}>.</span></div>
            <div style={{ position: "relative", display: "inline-block" }}>
              <span style={{
                background: `linear-gradient(180deg, ${p.fg} 0%, ${p.dim} 100%)`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>فيديو</span>
              {/* glitch slash */}
              <span style={{
                position: "absolute", right: -8, top: 12, width: 4, height: 80, background: p.accent,
                boxShadow: `0 0 14px ${p.glow}`,
              }} />
            </div>
          </div>

          {/* subtitle */}
          <div style={{ marginTop: 22, maxWidth: 460, color: p.dim, fontSize: 14, lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>
            اكتب فكرتك. النظام يخطّط، يصوّر، ويسلّمك الفيديو الجاهز
            <span style={{ color: p.accent2 }}> — تلقائياً</span>. خط أنابيب ذكاء اصطناعي بمستوى استوديو.
          </div>

          {/* CTA row */}
          <div style={{ marginTop: 30, display: "flex", gap: 14, alignItems: "center" }}>
            <CrunchBtn p={p} label="ابدأ المهمة" solid icon="▶" />
            <CrunchBtn p={p} label="عرض الديمو" icon="◇" />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginRight: 8 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: ".22em", color: p.dim, textTransform: "uppercase" }}>
                ACTIVE OPERATORS
              </div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: ".08em", color: p.fg }}>
                12,847 <span style={{ color: p.accent2, fontSize: 14 }}>↑</span>
              </div>
            </div>
          </div>

          {/* stat row */}
          <div style={{ display: "flex", gap: 26, marginTop: 50, paddingTop: 20, borderTop: `1px solid ${p.border}` }}>
            {[
              { v: "98.7%", l: "UPTIME" },
              { v: "< 4MIN", l: "AVG RENDER" },
              { v: "2.1M+", l: "CLIPS PROCESSED" },
            ].map((s, i) => (
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

        {/* Right: HUD console preview */}
        <div style={{ flex: 1, paddingTop: 10 }}>
          <HudCard p={p} padding={0}>
            <div style={{ borderBottom: `1px solid ${p.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 8, height: 8, background: p.accent, boxShadow: `0 0 8px ${p.accent}` }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".22em", color: p.dim, textTransform: "uppercase" }}>
                  JOB//07A2_LIVE
                </span>
              </div>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent2 }}>02:14</span>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em", marginBottom: 6, textTransform: "uppercase" }}>
                PROMPT
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg, lineHeight: 1.6, marginBottom: 16, padding: 10, background: p.bg2, borderRight: `2px solid ${p.accent}` }}>
                فيلم قصير بأسلوب هوليوود. شوارع مدينة ليلية، شخص يكتشف سراً يغيّر مصيره...
              </div>

              <StatusBar p={p} label="STORYBOARD" value={100} color={p.accent2} />
              <StatusBar p={p} label="FRAME_GEN" value={100} color={p.accent2} />
              <StatusBar p={p} label="CLIP_RENDER" value={74} color={p.accent} />
              <StatusBar p={p} label="ASSEMBLY" value={12} color={p.dim} />

              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    aspectRatio: "16/9",
                    background: i < 4 ? p.bg2 : p.bg1,
                    border: `1px solid ${i === 3 ? p.accent : p.border}`,
                    position: "relative",
                  }}>
                    {i < 4 && (
                      <div style={{
                        position: "absolute", inset: 0,
                        background: `repeating-linear-gradient(45deg, ${p.line} 0 2px, transparent 2px 6px)`,
                        opacity: .7,
                      }} />
                    )}
                    <div style={{ position: "absolute", top: 2, left: 3, fontFamily: "'Space Mono', monospace", fontSize: 8, color: p.dim, letterSpacing: ".1em" }}>
                      0{i+1}
                    </div>
                    {i === 3 && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.accent, boxShadow: `0 0 10px ${p.accent}` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </HudCard>

          {/* secondary HUD strip */}
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <Reticle p={p} size={70} />
            <div style={{ flex: 1 }}>
              <Tag p={p}>● TARGET_LOCKED</Tag>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".1em", marginTop: 8, marginBottom: 2 }}>
                CINEMATIC // 30s
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em" }}>
                EST_CRED 45 · LAT 2.1s
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* bottom HUD ticker */}
      <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, padding: "10px 24px", borderTop: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".2em", color: p.dim, textTransform: "uppercase", background: p.bg0 }}>
        <span><span style={{ color: p.accent }}>●</span> NET 142ms · REGION EU-1 · NODE/CASCADE-7</span>
        <span>{p.name} <span style={{ color: p.accent }}>//</span> {p.sub.toUpperCase()}</span>
        <span>F1 HELP · ESC ABORT · ⏎ EXECUTE</span>
      </div>
    </div>
  );
}

window.LandingArtboard = LandingArtboard;

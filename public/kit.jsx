// Component kit artboard — buttons, cards, HUD elements, palette swatches.

function KitArtboard({ p, w = 1280, h = 1100 }) {
  const cellPad = { padding: 22, background: p.bg1, border: `1px solid ${p.border}`, position: "relative" };

  return (
    <div style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      background: p.bg0, color: p.fg,
      fontFamily: "'Inter', sans-serif",
    }}>
      <ParticleField p={p} density={0.6} showScan={false} />
      <div style={{ position: "absolute", inset: 12, border: `1px solid ${p.border}` }} />
      <Corners p={p} size={20} inset={12} />

      {/* header */}
      <div style={{ position: "relative", padding: "30px 40px 0", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".25em", color: p.accent, textTransform: "uppercase" }}>
          <span style={{ width: 8, height: 8, background: p.accent, transform: "rotate(45deg)" }} />
          KIT//{p.id.toUpperCase()}_DECK
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${p.border}, transparent)` }} />
        </div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, letterSpacing: ".05em", color: p.fg, textTransform: "uppercase", lineHeight: 1 }}>
          {p.name} <span style={{ color: p.accent }}>·</span> <span style={{ color: p.dim, fontSize: 36 }}>{p.sub}</span>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 2, padding: "30px 40px", display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 22 }}>
        {/* LEFT col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Buttons */}
          <div style={cellPad}>
            <SectionLabel p={p} code="//01 BUTTONS" title="Crunchy interactives" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
              <CrunchBtn p={p} label="ابدأ" solid icon="▶" />
              <CrunchBtn p={p} label="إعدادات" icon="◇" />
              <CrunchBtn p={p} label="إلغاء" danger />
              <CrunchBtn p={p} label="حفظ" solid small />
              <CrunchBtn p={p} label="رجوع" small />
            </div>
            <div style={{ marginTop: 14, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em" }}>
              ↳ hover lifts the offset plate · press ratchets the button into it · 12px corner crunch
            </div>
          </div>

          {/* Palette */}
          <div style={cellPad}>
            <SectionLabel p={p} code="//02 PALETTE" title="Target colorway" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {[
                ["bg0", p.bg0, "void"],
                ["bg1", p.bg1, "panel"],
                ["bg2", p.bg2, "elev."],
                ["fg", p.fg, "text"],
                ["dim", p.dim, "muted"],
                ["accent", p.accent, "hot"],
                ["accent2", p.accent2, "cool"],
              ].map(([k, c, lbl]) => (
                <div key={k} style={{ aspectRatio: "1", background: c, border: `1px solid ${p.border}`, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", left: 6, top: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: ".1em", color: k === "fg" || k === "accent" || k === "accent2" ? p.bg0 : p.fg, textTransform: "uppercase" }}>
                    {lbl}
                  </div>
                  <div style={{ position: "absolute", right: 6, bottom: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: k === "fg" || k === "accent" || k === "accent2" ? p.bg0 : p.dim }}>
                    {c}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cards */}
          <div style={cellPad}>
            <SectionLabel p={p} code="//03 CARDS" title="Diagonal-cut panels" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { name: "STARTER", price: "150", cred: "1,500", badge: "للبداية", hot: false },
                { name: "GROWTH",  price: "300", cred: "3,300", badge: "للنمو",  hot: true },
                { name: "PRO",     price: "800", cred: "9,600", badge: "احترافي", hot: false },
              ].map((c, i) => (
                <HudCard key={i} p={p} hot={c.hot} padding={16}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", textTransform: "uppercase" }}>{c.badge}</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: ".1em", color: p.fg, marginTop: 4 }}>{c.name}</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 42, letterSpacing: ".02em", color: c.hot ? p.accent : p.fg, marginTop: 8, lineHeight: 1 }}>
                    ${c.price}<span style={{ fontSize: 12, color: p.dim, marginRight: 4 }}>/m</span>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, marginTop: 4 }}>{c.cred} CRED</div>
                  <div style={{ marginTop: 14 }}>
                    <CrunchBtn p={p} label="اشترك" small solid={c.hot} full />
                  </div>
                </HudCard>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={cellPad}>
            <SectionLabel p={p} code="//04 INPUTS" title="Tactical form controls" />
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 16 }}>
              <div>
                <label style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", textTransform: "uppercase" }}>PROMPT_INPUT</label>
                <div style={{ position: "relative", marginTop: 6 }}>
                  <div style={{
                    width: "100%", padding: "12px 14px 12px 36px",
                    background: p.bg0, border: `1px solid ${p.border}`,
                    fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg,
                    borderRight: `2px solid ${p.accent}`,
                    minHeight: 90,
                    lineHeight: 1.6,
                  }} dir="rtl">
                    شارع ليلي بمطر، شخصية بقبعة، إضاءة نيون كثيفة...
                    <span style={{ display: "inline-block", width: 7, height: 14, background: p.accent, marginRight: 2, verticalAlign: "middle", animation: "blink 1s steps(2) infinite" }} />
                  </div>
                  <div style={{ position: "absolute", left: 10, top: 10, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".1em" }}>
                    ▸ INP
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", textTransform: "uppercase" }}>DURATION</label>
                <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
                  {[
                    ["15s", false], ["30s", true], ["60s", false],
                    ["2m", false], ["5m", false], ["10m", false],
                  ].map(([lbl, on], i) => (
                    <button key={i} style={{
                      padding: "10px 0",
                      background: on ? p.accent : p.bg0,
                      color: on ? p.bg0 : p.fg,
                      border: `1px solid ${on ? p.accent : p.border}`,
                      fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: ".15em",
                      cursor: "pointer",
                    }}>{lbl}</button>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim }}>EST: 45 CRED</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Typography */}
          <div style={cellPad}>
            <SectionLabel p={p} code="//05 TYPE" title="Display // mono telemetry" />
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 72, lineHeight: .9, letterSpacing: ".04em", color: p.fg, textTransform: "uppercase" }}>
              EXECUTE.
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, lineHeight: 1, letterSpacing: ".06em", color: p.accent, marginTop: 6 }}>
              BEBAS NEUE / 700
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: ".18em", color: p.dim, marginTop: 14, textTransform: "uppercase" }}>
              SPACE MONO · 0.18em tracking · used for HUD telemetry, codes & metadata
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg, marginTop: 14, lineHeight: 1.7 }} dir="rtl">
              Inter — للنصوص الطبيعية، الفقرات، شرح المنتج. يدعم العربية بشكل ممتاز
            </div>
          </div>

          {/* Tags */}
          <div style={cellPad}>
            <SectionLabel p={p} code="//06 TAGS" title="Status & telemetry chips" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Tag p={p}>● LIVE</Tag>
              <Tag p={p} color={p.accent2}>● SYNCED</Tag>
              <Tag p={p} color={p.warn}>▲ QUEUED</Tag>
              <Tag p={p} color={p.dim}>OFFLINE</Tag>
              <Tag p={p} glow>HOT</Tag>
              <Tag p={p} color={p.accent2}>v.2.6</Tag>
              <Tag p={p}>EU/WEST-2</Tag>
              <Tag p={p} color={p.warn}>HIGH</Tag>
            </div>
          </div>

          {/* HUD readouts */}
          <div style={cellPad}>
            <SectionLabel p={p} code="//07 READOUTS" title="Real-time status bars" />
            <StatusBar p={p} label="CPU_LOAD" value={47} />
            <StatusBar p={p} label="GPU_RENDER" value={84} color={p.accent} />
            <StatusBar p={p} label="QUEUE_DEPTH" value={32} color={p.accent2} />
            <StatusBar p={p} label="CRED_BURN" value={68} color={p.warn} />
          </div>

          {/* Reticles */}
          <div style={cellPad}>
            <SectionLabel p={p} code="//08 MARKERS" title="Target reticles" />
            <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "space-around" }}>
              <div style={{ textAlign: "center" }}>
                <Reticle p={p} size={80} color={p.accent} />
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, marginTop: 6, letterSpacing: ".2em" }}>LOCK</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <Reticle p={p} size={80} color={p.accent2} />
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, marginTop: 6, letterSpacing: ".2em" }}>SCAN</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <Reticle p={p} size={80} color={p.warn} />
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, marginTop: 6, letterSpacing: ".2em" }}>WARN</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

window.KitArtboard = KitArtboard;

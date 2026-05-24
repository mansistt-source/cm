// Particle close-up + Dashboard preview artboard.

function ParticleDetailArtboard({ p, w = 1280, h = 760 }) {
  return (
    <div style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      background: p.bg0, color: p.fg,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* dense particle field */}
      <ParticleField p={p} density={1.4} showScan={true} />

      {/* frame */}
      <div style={{ position: "absolute", inset: 12, border: `1px solid ${p.border}` }} />
      <Corners p={p} size={22} inset={12} />

      {/* center HUD overlays */}
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, bottom: 12, pointerEvents: "none" }}>

        {/* top-left telemetry block */}
        <div style={{ position: "absolute", top: 30, left: 30, maxWidth: 380 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", marginBottom: 6 }}>
            ◤ FIELD//SILENT_MODE
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, color: p.fg, letterSpacing: ".05em", lineHeight: 1 }}>
            PARTICLE PROTOCOL
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".14em", marginTop: 10, lineHeight: 1.7 }}>
            // micro-dots breathing in shadow
            <br/>// cipher strings scramble → lock → fade
            <br/>// crosshair counters tally + dissolve
            <br/>// 1px crosses blink 3× &amp; vanish
          </div>
        </div>

        {/* top-right status */}
        <div style={{ position: "absolute", top: 30, right: 30, textAlign: "right" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".25em", marginBottom: 4 }}>FPS / DENSITY</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: p.accent, lineHeight: 1, letterSpacing: ".05em" }}>60·1.4</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent2, letterSpacing: ".2em", marginTop: 4 }}>● SILENT</div>
        </div>

        {/* center crosshair */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
          <Reticle p={p} size={180} color={p.accent} />
          <div style={{ position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)", fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".3em", whiteSpace: "nowrap" }}>
            X 0428 · Y 0312
          </div>
          <div style={{ position: "absolute", bottom: -28, left: "50%", transform: "translateX(-50%)", fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".3em", whiteSpace: "nowrap" }}>
            TARGET // ACQUIRED
          </div>
        </div>

        {/* bottom data panel */}
        <div style={{ position: "absolute", bottom: 30, left: 30, right: 30, display: "flex", gap: 16, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", marginBottom: 6 }}>BG_RENDER // METRICS</div>
            <StatusBar p={p} label="GPU" value={18} color={p.accent2} />
            <StatusBar p={p} label="MEM" value={34} color={p.accent2} />
            <StatusBar p={p} label="ACTORS_LIVE" value={62} color={p.accent} />
          </div>
          <div style={{ flex: 1.1, padding: 14, background: `${p.bg0}cc`, border: `1px solid ${p.border}` }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 6 }}>// SPAWN_RATE</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, lineHeight: 1.7, letterSpacing: ".05em" }}>
              <div><span style={{ color: p.accent2 }}>cipher</span>  every 1.9s · scramble 55% · lock @ 55%</div>
              <div><span style={{ color: p.accent2 }}>target</span>  every 3.4s · count 0→9999 ease-out</div>
              <div><span style={{ color: p.accent2 }}>blink </span>  every 0.7s · 3× strobe then fade</div>
              <div><span style={{ color: p.accent2 }}>line  </span>  every 1.6s · draw-in + tick + fade</div>
              <div><span style={{ color: p.accent  }}>dot   </span>  80 always-on, breathing alpha</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pure field — no overlays, just the new effect in full effect
function PureFieldArtboard({ p, density = 1.0, w = 1280, h = 520 }) {
  return (
    <div style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      background: p.bg0,
    }}>
      <ParticleField p={p} density={density} showScan={false} />
      <div style={{ position: "absolute", inset: 12, border: `1px solid ${p.border}`, pointerEvents: "none" }} />
      <Corners p={p} size={20} inset={12} />
      <div style={{ position: "absolute", bottom: 18, right: 22, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", pointerEvents: "none" }}>
        DENSITY {density.toFixed(1)} · {p.name}
      </div>
    </div>
  );
}

// ---------- Dashboard mini artboard ----------
function DashboardArtboard({ p, w = 1280, h = 800 }) {
  return (
    <div dir="rtl" style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      background: p.bg0, color: p.fg, fontFamily: "'Inter', sans-serif",
    }}>
      <ParticleField p={p} density={0.6} showScan={false} />
      <div style={{ position: "absolute", inset: 12, border: `1px solid ${p.border}` }} />
      <Corners p={p} size={22} inset={12} />

      {/* nav */}
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, height: 50, padding: "0 24px", borderBottom: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke={p.accent} strokeWidth="1.5" fill="none" />
            <polygon points="12,7 17,10 17,14 12,17 7,14 7,10" fill={p.accent} />
          </svg>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: ".2em" }}>CONTENT/MACHINE</div>
          <span style={{ color: p.dim, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".18em", marginRight: 14 }}>/// DASHBOARD</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Tag p={p}>CRED 4,820</Tag>
          <Tag p={p} color={p.accent2} glow>● OP_R74</Tag>
          <div style={{ width: 28, height: 28, background: p.accent, clipPath: "polygon(0 0,100% 0,100% 75%,75% 100%,0 100%)" }} />
        </div>
      </div>

      {/* body */}
      <div style={{ position: "absolute", top: 72, left: 22, right: 22, bottom: 22, display: "grid", gridTemplateColumns: "180px 1fr 280px", gap: 14 }}>
        {/* sidebar */}
        <div style={{ background: p.bg1, border: `1px solid ${p.border}`, padding: 14 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", marginBottom: 12 }}>// NAV</div>
          {[
            ["▸ المهام", true],
            ["  المعرض", false],
            ["  التحليلات", false],
            ["  الاتصالات", false],
            ["  الإعدادات", false],
          ].map(([lbl, on], i) => (
            <div key={i} style={{
              padding: "9px 10px",
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, letterSpacing: ".15em",
              color: on ? p.bg0 : p.dim,
              background: on ? p.accent : "transparent",
              borderLeft: on ? `2px solid ${p.fg}` : "2px solid transparent",
              marginBottom: 4,
            }}>{lbl}</div>
          ))}

          <div style={{ marginTop: 30, padding: 12, background: p.bg2, border: `1px solid ${p.border}` }}>
            <Tag p={p} color={p.warn}>LOW CRED</Tag>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: p.fg, marginTop: 6, lineHeight: 1 }}>4,820</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, marginTop: 4, letterSpacing: ".18em" }}>REMAINING</div>
            <div style={{ marginTop: 10 }}><CrunchBtn p={p} label="شحن" small solid full /></div>
          </div>
        </div>

        {/* main: project grid */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", marginBottom: 2 }}>// ACTIVE_OPERATIONS</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: ".05em" }}>المهام الجارية</div>
            </div>
            <CrunchBtn p={p} label="مهمة جديدة" solid icon="+" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { title: "حملة إطلاق المنتج", style: "CINEMATIC", dur: "30s", prog: 84, status: "RENDER", color: p.accent },
              { title: "وثائقي الحضارات", style: "DOC", dur: "5m", prog: 100, status: "DONE", color: p.accent2 },
              { title: "إعلان منتج جديد", style: "COMMERCIAL", dur: "15s", prog: 32, status: "FRAMES", color: p.warn },
              { title: "ميتيريال أنيمي", style: "ANIME", dur: "60s", prog: 12, status: "QUEUE", color: p.dim },
            ].map((c, i) => (
              <HudCard key={i} p={p} padding={14} hot={i === 0}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", marginBottom: 2 }}>JOB//{(i+1).toString().padStart(3,"0")}</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".06em", lineHeight: 1.15 }}>{c.title}</div>
                  </div>
                  <Tag p={p} color={c.color}>{c.status}</Tag>
                </div>
                <div style={{ display: "flex", gap: 12, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em", marginBottom: 10 }}>
                  <span>{c.style}</span>
                  <span style={{ color: p.fg }}>·</span>
                  <span>{c.dur}</span>
                </div>
                <StatusBar p={p} label="PROGRESS" value={c.prog} color={c.color} />
              </HudCard>
            ))}
          </div>
        </div>

        {/* right rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: p.bg1, border: `1px solid ${p.border}`, padding: 14, position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 32, height: 2, background: p.accent }} />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 8 }}>// SYS_STATUS</div>
            <StatusBar p={p} label="PIPELINE" value={92} />
            <StatusBar p={p} label="HIGGSFIELD" value={67} color={p.accent2} />
            <StatusBar p={p} label="LLM" value={88} color={p.accent} />
            <StatusBar p={p} label="STORAGE" value={41} color={p.dim} />
          </div>

          <div style={{ background: p.bg1, border: `1px solid ${p.border}`, padding: 14 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 8 }}>// LIVE_LOG</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, lineHeight: 1.7 }}>
              <div><span style={{ color: p.accent2 }}>02:14</span> ▸ scene_03 rendered</div>
              <div><span style={{ color: p.accent2 }}>02:09</span> ▸ frame_batch_b OK</div>
              <div><span style={{ color: p.accent }}>02:01</span> ▸ <span style={{ color: p.accent }}>hot</span>: clip_07 retry</div>
              <div><span style={{ color: p.accent2 }}>01:48</span> ▸ storyboard locked</div>
              <div><span style={{ color: p.accent2 }}>01:22</span> ▸ job 001 dispatched</div>
            </div>
          </div>

          <div style={{ background: p.bg1, border: `1px solid ${p.border}`, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <Reticle p={p} size={50} color={p.accent2} />
            <div>
              <Tag p={p} color={p.accent2}>● ONLINE</Tag>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, marginTop: 6, letterSpacing: ".06em" }}>OP_R74</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".18em" }}>RANK_S · EU/W2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ParticleDetailArtboard, DashboardArtboard, PureFieldArtboard });

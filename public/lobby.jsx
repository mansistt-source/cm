// Character creation / tactical loadout lobby — for adjusting video parameters:
// duration, style, mood, pace, intensity, POV, etc. With iridescent style cards,
// a live preview canvas, and stats readout.

function LobbyArtboard({ p, w = 1280, h = 1040 }) {
  // mock state (visual only)
  const [style, setStyle] = React.useState("noir");
  const [duration, setDuration] = React.useState(2); // index
  const [intensity, setIntensity] = React.useState(0.62);
  const [pace, setPace] = React.useState(0.55);
  const [pov, setPov] = React.useState("third");

  const durations = ["15s", "30s", "60s", "2m", "5m"];

  return (
    <div dir="rtl" style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      background: p.bg0, color: p.fg, fontFamily: "'Inter', sans-serif",
    }}>
      <ParticleField p={p} density={0.5} showGrid={true} />
      <div style={{ position: "absolute", inset: 12, border: `1px solid ${p.border}` }} />
      <Corners p={p} size={22} inset={12} />

      {/* HEADER */}
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, height: 60, padding: "0 26px", borderBottom: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 6, height: 22, background: p.accent }} />
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em" }}>// ASSEMBLY_BAY 03</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: ".1em" }}>LOADOUT // التشكيل</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Tag p={p} color={p.accent2}>● BRIEFING_LIVE</Tag>
          <Tag p={p}>OP_R74</Tag>
          <CrunchBtn p={p} label="فتح المفاوض" icon="◐" small />
        </div>
      </div>

      {/* MAIN BODY */}
      <div style={{ position: "absolute", top: 84, left: 26, right: 26, bottom: 80, display: "grid", gridTemplateColumns: "300px 1fr 280px", gap: 18 }}>

        {/* LEFT: parameter rails */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
          {/* DURATION */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// DURATION</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: p.fg, letterSpacing: ".1em" }}>{durations[duration]}</div>
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {durations.map((d, i) => (
                <button key={i} onClick={() => setDuration(i)} style={{
                  flex: 1, padding: "10px 0",
                  background: i === duration ? p.accent : p.bg0,
                  color: i === duration ? p.bg0 : p.dim,
                  border: `1px solid ${i === duration ? p.accent : p.border}`,
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: ".12em",
                  cursor: "pointer",
                }}>{d}</button>
              ))}
            </div>
          </div>

          {/* INTENSITY DIAL */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// INTENSITY</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: p.fg, letterSpacing: ".1em" }}>{Math.round(intensity * 100)}%</div>
            </div>
            <Dial p={p} value={intensity} setValue={setIntensity} size={120} />
          </div>

          {/* PACE SLIDER */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// PACE</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em" }}>
                {pace < 0.35 ? "SLOW_BURN" : pace < 0.7 ? "STEADY" : "FRENETIC"}
              </div>
            </div>
            <TickSlider p={p} value={pace} setValue={setPace} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".18em" }}>
              <span>SLOW</span><span>FAST</span>
            </div>
          </div>

          {/* POV — segmented */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}` }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 8 }}>// POV</div>
            <div style={{ display: "flex", gap: 3 }}>
              {[
                { id: "first", l: "FIRST" },
                { id: "third", l: "THIRD" },
                { id: "omni",  l: "OMNI" },
              ].map(o => (
                <button key={o.id} onClick={() => setPov(o.id)} style={{
                  flex: 1, padding: "9px 0",
                  background: pov === o.id ? p.accent : "transparent",
                  color: pov === o.id ? p.bg0 : p.dim,
                  border: `1px solid ${pov === o.id ? p.accent : p.border}`,
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: ".15em",
                  cursor: "pointer",
                }}>{o.l}</button>
              ))}
            </div>
          </div>

          {/* AUDIO toggle row */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}` }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 8 }}>// AUDIO_LAYERS</div>
            {[
              { l: "SCORE", on: true },
              { l: "DIALOGUE", on: true },
              { l: "FOLEY", on: true },
              { l: "VO_NARRATION", on: false },
            ].map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: a.on ? p.fg : p.dim, letterSpacing: ".15em" }}>{a.l}</span>
                <div style={{
                  width: 36, height: 16, background: a.on ? p.accent : p.bg0,
                  border: `1px solid ${a.on ? p.accent : p.border}`, position: "relative",
                  clipPath: "polygon(0 0, 100% 0, 100% 75%, 88% 100%, 0 100%)",
                }}>
                  <div style={{
                    position: "absolute", top: 2, [a.on ? "right" : "left"]: 2,
                    width: 10, height: 10, background: a.on ? p.bg0 : p.dim,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: live preview + style cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* preview frame */}
          <div style={{ position: "relative", aspectRatio: "16/9", background: p.bg1, border: `1px solid ${p.accent}`, overflow: "hidden", clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)" }}>
            <AuroraLoader p={p} height={"100%"} interactive={true} intensity={1.3} />
            {/* overlay grid + crosshair */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <Corners p={p} size={18} color={p.accent} inset={10} />
              {/* center crosshair */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                <Reticle p={p} size={100} color={p.fg} />
              </div>
              {/* top label */}
              <div style={{ position: "absolute", top: 14, left: 16, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", textShadow: `0 0 8px ${p.accent}aa`, textTransform: "uppercase" }}>
                ▸ PREVIEW_FRAME_007 · {durations[duration]} · {Math.round(intensity * 100)}% INTENSITY
              </div>
              {/* bottom timeline ticks */}
              <div style={{ position: "absolute", bottom: 14, left: 16, right: 16, display: "flex", gap: 2 }}>
                {Array.from({ length: 40 }, (_, i) => (
                  <div key={i} style={{ flex: 1, height: i % 5 === 0 ? 8 : 4, background: i < 22 ? p.accent : `${p.border}` }} />
                ))}
              </div>
            </div>
          </div>

          {/* style row */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", textTransform: "uppercase" }}>
                <span style={{ width: 8, height: 8, background: p.accent, transform: "rotate(45deg)" }} />
                // STYLE_SIGNATURE — choose 1
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em" }}>HOVER FOR IRIDESCENCE</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <IridescentCard p={p} hot={style === "noir"} code="// 01" title="NEO-NOIR"
                sub="rain · neon · shadow"
                meta={<><span>RUNTIME +18%</span><span>·</span><span>STARK</span></>}
                w="100%" h={290}
                glyph={
                  <svg width="80" height="80" viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 14px ${p.accent}88)` }}>
                    <rect x="20" y="20" width="60" height="60" fill="none" stroke={p.accent} strokeWidth="1" />
                    <rect x="32" y="32" width="36" height="36" fill="none" stroke={p.fg} strokeWidth=".5" opacity=".5" />
                    <line x1="50" y1="10" x2="50" y2="90" stroke={p.accent} strokeWidth=".5" opacity=".4" />
                    <line x1="10" y1="50" x2="90" y2="50" stroke={p.accent} strokeWidth=".5" opacity=".4" />
                  </svg>
                }
              />
              <IridescentCard p={p} hot={style === "doc"} code="// 02" title="DOC // STARK"
                sub="natural · grounded"
                meta={<><span>RUNTIME +0%</span><span>·</span><span>OBJECTIVE</span></>}
                w="100%" h={290}
                glyph={
                  <svg width="80" height="80" viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 14px ${p.accent}66)` }}>
                    <circle cx="50" cy="50" r="35" fill="none" stroke={p.accent} strokeWidth="1" />
                    <circle cx="50" cy="50" r="18" fill="none" stroke={p.fg} strokeWidth=".5" opacity=".5" />
                    <circle cx="50" cy="50" r="4" fill={p.accent} />
                  </svg>
                }
              />
              <IridescentCard p={p} hot={style === "anime"} code="// 03" title="ANIME"
                sub="stylized · kinetic"
                meta={<><span>RUNTIME +6%</span><span>·</span><span>EXPRESSIVE</span></>}
                w="100%" h={290}
                glyph={
                  <svg width="80" height="80" viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 14px ${p.accent}66)` }}>
                    <polygon points="50,8 92,50 50,92 8,50" fill="none" stroke={p.accent} strokeWidth="1" />
                    <polygon points="50,28 72,50 50,72 28,50" fill="none" stroke={p.fg} strokeWidth=".5" opacity=".5" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>

        {/* RIGHT: stats readout */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
          {/* COST */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}`, position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 40, height: 2, background: p.accent }} />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", marginBottom: 4 }}>EST_COST</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: p.fg, lineHeight: 1, letterSpacing: ".03em" }}>
              <CountUp value={245} /> <span style={{ fontSize: 14, color: p.dim }}>CRED</span>
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.accent2, letterSpacing: ".18em", marginTop: 6 }}>
              ↳ FROM WALLET 4,820
            </div>
          </div>

          {/* RENDER TIME */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}` }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", marginBottom: 4 }}>RENDER_TIME</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: p.accent, lineHeight: 1 }}>
              <CountUp value={252} format={t => `${Math.floor(t/60)}:${(t%60).toString().padStart(2,"0")}`} />
              <span style={{ fontSize: 12, color: p.dim, marginRight: 6 }}>EST</span>
            </div>
          </div>

          {/* INTENSITY METER (visual gauge) */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}` }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", marginBottom: 8 }}>SIGNATURE_PROFILE</div>
            {[
              { l: "DRAMA",      v: 0.78 },
              { l: "PACE",       v: pace },
              { l: "DENSITY",    v: 0.55 },
              { l: "BRIGHTNESS", v: 0.32 },
              { l: "GRAIN",      v: 0.66 },
            ].map((b, i) => (
              <StatusBar key={i} p={p} label={b.l} value={Math.round(b.v * 100)} color={i === 1 ? p.accent : i % 2 ? p.accent2 : p.fg} />
            ))}
          </div>

          {/* MISSION DIRECTIVES (log style) */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}`, flex: 1, overflow: "hidden" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 8 }}>// DIRECTIVES</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, lineHeight: 1.7 }}>
              <div><span style={{ color: p.accent2 }}>OK</span> · style locked: <span style={{ color: p.fg }}>NEO-NOIR</span></div>
              <div><span style={{ color: p.accent2 }}>OK</span> · 6 scenes mapped</div>
              <div><span style={{ color: p.accent }}>?</span> · protagonist arc undefined</div>
              <div><span style={{ color: p.warn }}>!</span> · runtime +18% surcharge</div>
              <div style={{ marginTop: 6 }}><ThinkingPulse p={p} label="DRAFTING SHOTS" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTION BAR */}
      <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, height: 64, padding: "0 26px", borderTop: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: p.bg0 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
          F1 HELP · ⌘K COMMAND · ⏎ ASSEMBLE · ESC ABORT
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <CrunchBtn p={p} label="رمي عشوائي" icon="◇" small />
          <CrunchBtn p={p} label="حفظ مسودة" small />
          <CrunchBtn p={p} label="جمّع التشكيل" solid icon="▶" />
        </div>
      </div>
    </div>
  );
}

// ---------- Dial (mouse drag arc) ----------
function Dial({ p, value, setValue, size = 120 }) {
  const ref = React.useRef(null);
  const [drag, setDrag] = React.useState(false);

  function onMove(e) {
    if (!drag) return;
    const r = ref.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const a = Math.atan2(e.clientY - cy, e.clientX - cx);
    // map [-PI, PI] to [0, 1], with 0 at left, full arc
    let t = (a + Math.PI) / (Math.PI * 2);
    t = Math.max(0, Math.min(1, t));
    setValue(t);
  }
  React.useEffect(() => {
    if (!drag) return;
    const up = () => setDrag(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", up);
    };
  }, [drag]);

  const arc = 270; // degrees of usable arc
  const start = 135;
  const cur = start + value * arc;

  const r = size / 2 - 8;
  const cx = size / 2, cy = size / 2;
  const polar = (deg, rr) => {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  };
  const arcPath = (from, to, rr) => {
    const [x1, y1] = polar(from, rr);
    const [x2, y2] = polar(to, rr);
    const large = to - from > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rr} ${rr} 0 ${large} 1 ${x2} ${y2}`;
  };

  return (
    <div
      ref={ref}
      onMouseDown={(e) => { setDrag(true); onMove(e); }}
      style={{ width: size, height: size, margin: "0 auto", cursor: "grab", position: "relative", userSelect: "none" }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* ticks */}
        {Array.from({ length: 25 }).map((_, i) => {
          const deg = start + (i / 24) * arc;
          const [x1, y1] = polar(deg, r + 2);
          const [x2, y2] = polar(deg, r - (i % 4 === 0 ? 8 : 4));
          const active = (start + value * arc) >= deg;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? p.accent : p.border} strokeWidth="1" />;
        })}
        {/* outer ring */}
        <path d={arcPath(start, start + arc, r)} stroke={p.border} strokeWidth="1" fill="none" />
        {/* value arc */}
        <path d={arcPath(start, cur, r)} stroke={p.accent} strokeWidth="2" fill="none" style={{ filter: `drop-shadow(0 0 4px ${p.accent})` }} />
        {/* needle */}
        {(() => {
          const [nx, ny] = polar(cur, r - 14);
          return <>
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={p.accent} strokeWidth="2" />
            <circle cx={nx} cy={ny} r="3" fill={p.accent} />
          </>;
        })()}
        {/* center hub */}
        <circle cx={cx} cy={cy} r="6" fill={p.bg0} stroke={p.accent} strokeWidth="1" />
      </svg>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, calc(-50% + 28px))", fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
        DRAG
      </div>
    </div>
  );
}

// ---------- Tick slider ----------
function TickSlider({ p, value, setValue }) {
  const ref = React.useRef(null);
  const [drag, setDrag] = React.useState(false);
  function move(e) {
    if (!drag) return;
    const r = ref.current.getBoundingClientRect();
    let t = (e.clientX - r.left) / r.width;
    setValue(Math.max(0, Math.min(1, t)));
  }
  React.useEffect(() => {
    if (!drag) return;
    const up = () => setDrag(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [drag]);

  return (
    <div ref={ref} onMouseDown={(e) => { setDrag(true); move(e); }}
      style={{ position: "relative", height: 24, cursor: "ew-resize", userSelect: "none" }}>
      <div style={{ position: "absolute", top: 11, left: 0, right: 0, height: 2, background: p.border }} />
      <div style={{ position: "absolute", top: 11, left: 0, width: `${value * 100}%`, height: 2, background: p.accent, boxShadow: `0 0 8px ${p.accent}` }} />
      {Array.from({ length: 21 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute", left: `${(i / 20) * 100}%`, top: i % 5 === 0 ? 6 : 9,
          width: 1, height: i % 5 === 0 ? 12 : 6,
          background: i / 20 <= value ? p.accent : p.dim, opacity: i / 20 <= value ? 1 : 0.45,
        }} />
      ))}
      {/* handle */}
      <div style={{
        position: "absolute", left: `calc(${value * 100}% - 5px)`, top: 4,
        width: 10, height: 16, background: p.accent,
        clipPath: "polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)",
        boxShadow: `0 0 10px ${p.accent}`,
      }} />
    </div>
  );
}

// ---------- CountUp ----------
function CountUp({ value, duration = 900, format }) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    let raf;
    const t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format ? format(v) : v.toLocaleString()}</>;
}

Object.assign(window, { LobbyArtboard, Dial, TickSlider, CountUp });

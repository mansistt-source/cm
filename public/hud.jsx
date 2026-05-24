// Shared HUD primitives + particle canvas.
// All components take a `p` (palette) prop.

const { useEffect, useRef, useState } = React;

// ---------- Particle field (silent, subtle, military) ----------
// Atmosphere — no constant motion, just quiet "operating" cues:
// - Micro-dots: 1px specks slowly drifting, breathing alpha
// - Cipher streams: short hex strings that scramble briefly, lock, fade out
// - Target counters: tiny crosshairs that pop in, count up to a number, dim away
// - Electrical blinks: small + markers that blink 2–3× and dissolve
// - Optional radial wash + breathing scan line (very faint)
//
// All actors live on a single canvas with pooled lifecycles + eased fades.
//
// Props:
//   density  — multiplier on actor counts / spawn rate
//   showGrid — subtle dotted background grid
//   showScan — slow vertical scan sweep (very subtle)
function ParticleField({ p, density = 1, showGrid = true, showScan = false }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);

    const accentRGB = hexToRgb(p.accent);
    const fgRGB     = hexToRgb(p.fg);
    const dimRGB    = hexToRgb(p.dim);

    // --- micro dots (always on, very subtle) ---
    const dotCount = Math.round(80 * density);
    const dots = Array.from({ length: dotCount }, () => ({
      x: Math.random() * 2000, y: Math.random() * 2000, // re-clamped after resize
      vx: (Math.random() - .5) * 0.025,
      vy: (Math.random() - .5) * 0.025,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0004 + Math.random() * 0.0007,
      hot: Math.random() < 0.06,
    }));
    // clamp dots to actual size on first resize
    for (const d of dots) {
      d.x = Math.random() * w; d.y = Math.random() * h;
    }

    // --- actor pools ---
    const ciphers = []; // encrypted text snippets
    const targets = []; // counting reticles
    const pulses  = []; // electrical blinks
    const lines   = []; // thin geometric strokes that draw + fade

    const CIPHER_HEX = "0123456789ABCDEF".split("");
    const CIPHER_NOISE = "0123456789ABCDEF░▒▓·×+◇◆■".split("");

    function spawnCipher() {
      const len = 5 + Math.floor(Math.random() * 7);
      const target = Array.from({ length: len }, () => CIPHER_HEX[Math.floor(Math.random() * 16)]);
      ciphers.push({
        x: 40 + Math.random() * (w - 120),
        y: 30 + Math.random() * (h - 60),
        chars: target.slice(),
        target,
        age: 0,
        life: 2600 + Math.random() * 1800,
        scrambleAcc: 0,
        prefix: Math.random() < 0.5 ? "0x" : "//",
      });
    }
    function spawnTarget() {
      targets.push({
        x: 80 + Math.random() * (w - 160),
        y: 60 + Math.random() * (h - 120),
        targetNum: Math.floor(Math.random() * 9000) + 1000,
        num: 0,
        age: 0,
        life: 3200 + Math.random() * 800,
      });
    }
    function spawnPulse() {
      pulses.push({
        x: Math.random() * w,
        y: Math.random() * h,
        age: 0,
        life: 900,
        big: Math.random() < 0.18,
      });
    }
    function spawnLine() {
      // small horizontal or vertical thin line that draws in then fades
      const horiz = Math.random() < 0.5;
      const len = 18 + Math.random() * 40;
      const x = 20 + Math.random() * (w - 60);
      const y = 20 + Math.random() * (h - 40);
      lines.push({
        x, y, horiz, len,
        age: 0,
        life: 1400 + Math.random() * 600,
      });
    }

    // seed
    for (let i = 0; i < 3; i++) spawnCipher();
    for (let i = 0; i < 2; i++) spawnTarget();
    for (let i = 0; i < 4; i++) spawnLine();

    let t0 = performance.now();
    let scanY = -200;
    let cipherAcc = 0, targetAcc = 0, pulseAcc = 0, lineAcc = 0;

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const fade = (t, inEnd, outStart) => {
      if (t < inEnd) return t / inEnd;
      if (t > outStart) return Math.max(0, 1 - (t - outStart) / (1 - outStart));
      return 1;
    };

    function loop(now) {
      const dt = Math.min(50, now - t0); t0 = now;
      ctx.clearRect(0, 0, w, h);

      // very faint radial wash, off-center
      const grd = ctx.createRadialGradient(w * .25, h * .8, 0, w * .25, h * .8, Math.max(w, h) * .8);
      grd.addColorStop(0, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},0.045)`);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      // spawn timers
      cipherAcc += dt; targetAcc += dt; pulseAcc += dt; lineAcc += dt;
      const spawnK = 1 / Math.max(0.4, density);
      if (cipherAcc > 1900 * spawnK) { spawnCipher(); cipherAcc = 0; }
      if (targetAcc > 3400 * spawnK) { spawnTarget(); targetAcc = 0; }
      if (pulseAcc  >  700 * spawnK) { spawnPulse();  pulseAcc  = 0; }
      if (lineAcc   > 1600 * spawnK) { spawnLine();   lineAcc   = 0; }

      // micro dots — breathing alpha, slow drift
      for (const d of dots) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.x < 0) d.x += w; if (d.x > w) d.x -= w;
        if (d.y < 0) d.y += h; if (d.y > h) d.y -= h;
        d.phase += d.speed * dt;
        const breath = Math.sin(d.phase) * 0.5 + 0.5; // 0–1
        const baseA = d.hot ? 0.55 : 0.28;
        const a = baseA * (0.4 + 0.6 * breath);
        const rgb = d.hot ? accentRGB : fgRGB;
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${a * 0.55})`;
        ctx.fillRect(d.x, d.y, 1, 1);
      }

      // very faint hot-dot connections (only when close)
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        if (!a.hot) continue;
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 70 * 70) {
            const al = (1 - Math.sqrt(d2) / 70) * 0.12;
            ctx.strokeStyle = `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},${al})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      // small drawn lines (sharp geometric markers)
      for (let i = lines.length - 1; i >= 0; i--) {
        const L = lines[i];
        L.age += dt;
        const t = L.age / L.life;
        if (t >= 1) { lines.splice(i, 1); continue; }
        // draw-in 0..0.25, hold, fade-out 0.7..1
        const drawT = Math.min(1, t / 0.25);
        const visLen = L.len * easeOut(drawT);
        const alpha = fade(t, 0.15, 0.7) * 0.35;
        ctx.strokeStyle = `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (L.horiz) { ctx.moveTo(L.x, L.y); ctx.lineTo(L.x + visLen, L.y); }
        else         { ctx.moveTo(L.x, L.y); ctx.lineTo(L.x, L.y + visLen); }
        ctx.stroke();
        // small terminator tick
        if (drawT >= 1) {
          ctx.fillStyle = `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},${alpha})`;
          if (L.horiz) ctx.fillRect(L.x + visLen - 1, L.y - 2, 1, 5);
          else         ctx.fillRect(L.x - 2, L.y + visLen - 1, 5, 1);
        }
      }

      // CIPHER STREAMS
      ctx.font = "10px 'Space Mono', monospace";
      ctx.textBaseline = "top";
      for (let i = ciphers.length - 1; i >= 0; i--) {
        const c = ciphers[i];
        c.age += dt;
        const t = c.age / c.life;
        if (t >= 1) { ciphers.splice(i, 1); continue; }

        c.scrambleAcc += dt;
        if (t < 0.55) {
          // scramble phase
          if (c.scrambleAcc > 55) {
            c.scrambleAcc = 0;
            for (let k = 0; k < c.chars.length; k++) {
              if (Math.random() < 0.55) {
                c.chars[k] = CIPHER_NOISE[Math.floor(Math.random() * CIPHER_NOISE.length)];
              }
            }
          }
        } else {
          // lock to target
          for (let k = 0; k < c.chars.length; k++) c.chars[k] = c.target[k];
        }

        // alpha: fade in 0..0.1, hold, fade out 0.65..1
        const alpha = fade(t, 0.1, 0.65) * 0.55;
        const settled = t >= 0.55;
        const rgb = settled ? accentRGB : fgRGB;

        // prefix
        ctx.fillStyle = `rgba(${dimRGB.r},${dimRGB.g},${dimRGB.b},${alpha * 0.7})`;
        ctx.fillText(c.prefix, c.x - 16, c.y);
        // body
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
        ctx.fillText(c.chars.join(""), c.x, c.y);

        // bracket when settled
        if (settled) {
          const ba = alpha * 0.5;
          ctx.strokeStyle = `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},${ba})`;
          ctx.lineWidth = 1;
          const bw = ctx.measureText(c.chars.join("")).width;
          ctx.beginPath();
          ctx.moveTo(c.x + bw + 4, c.y + 1);
          ctx.lineTo(c.x + bw + 8, c.y + 1);
          ctx.lineTo(c.x + bw + 8, c.y + 11);
          ctx.lineTo(c.x + bw + 4, c.y + 11);
          ctx.stroke();
        }
      }

      // TARGET COUNTERS
      for (let i = targets.length - 1; i >= 0; i--) {
        const T = targets[i];
        T.age += dt;
        const t = T.age / T.life;
        if (t >= 1) { targets.splice(i, 1); continue; }
        const alpha = fade(t, 0.12, 0.7) * 0.7;
        const c = `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},${alpha})`;

        // count animation 0..0.45 of life
        const cp = Math.min(1, t / 0.45);
        T.num = Math.floor(T.targetNum * easeOut(cp));

        // mini crosshair (12px)
        const s = 6;
        ctx.strokeStyle = c;
        ctx.lineWidth = 1;
        ctx.beginPath();
        // ticks (not full crosshair)
        ctx.moveTo(T.x - s, T.y); ctx.lineTo(T.x - s + 2, T.y);
        ctx.moveTo(T.x + s, T.y); ctx.lineTo(T.x + s - 2, T.y);
        ctx.moveTo(T.x, T.y - s); ctx.lineTo(T.x, T.y - s + 2);
        ctx.moveTo(T.x, T.y + s); ctx.lineTo(T.x, T.y + s - 2);
        // corner brackets
        ctx.moveTo(T.x - s, T.y - s + 2); ctx.lineTo(T.x - s, T.y - s); ctx.lineTo(T.x - s + 2, T.y - s);
        ctx.moveTo(T.x + s, T.y - s + 2); ctx.lineTo(T.x + s, T.y - s); ctx.lineTo(T.x + s - 2, T.y - s);
        ctx.moveTo(T.x - s, T.y + s - 2); ctx.lineTo(T.x - s, T.y + s); ctx.lineTo(T.x - s + 2, T.y + s);
        ctx.moveTo(T.x + s, T.y + s - 2); ctx.lineTo(T.x + s, T.y + s); ctx.lineTo(T.x + s - 2, T.y + s);
        ctx.stroke();
        ctx.fillStyle = c;
        ctx.fillRect(T.x, T.y, 1, 1);

        // number label
        ctx.font = "9px 'Space Mono', monospace";
        ctx.fillStyle = `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},${alpha * 0.95})`;
        const label = `▸ ${T.num.toString().padStart(4, "0")}`;
        ctx.fillText(label, T.x + s + 5, T.y - 4);
        // tiny prefix
        ctx.fillStyle = `rgba(${dimRGB.r},${dimRGB.g},${dimRGB.b},${alpha * 0.6})`;
        ctx.fillText("LOC", T.x - s - 22, T.y - 4);
      }

      // ELECTRICAL BLINKS — small plus markers
      for (let i = pulses.length - 1; i >= 0; i--) {
        const P = pulses[i];
        P.age += dt;
        const t = P.age / P.life;
        if (t >= 1) { pulses.splice(i, 1); continue; }

        // blink phase first 35% (3 fast strobes), then fade
        let alpha;
        if (t < 0.35) {
          const ph = (t / 0.35) * 3; // 0..3
          const f = ph - Math.floor(ph);
          alpha = f < 0.5 ? 0.85 : 0.15;
        } else {
          alpha = Math.max(0, 1 - (t - 0.35) / 0.65) * 0.45;
        }
        const sz = P.big ? 5 : 3;
        ctx.strokeStyle = `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(P.x - sz, P.y); ctx.lineTo(P.x + sz, P.y);
        ctx.moveTo(P.x, P.y - sz); ctx.lineTo(P.x, P.y + sz);
        ctx.stroke();
        if (P.big && t < 0.35) {
          // faint halo on first strike
          ctx.fillStyle = `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},${alpha * 0.2})`;
          ctx.fillRect(P.x - sz - 1, P.y - sz - 1, sz * 2 + 2, sz * 2 + 2);
        }
      }

      // optional ultra-subtle scan sweep
      if (showScan) {
        scanY += dt * 0.04;
        if (scanY > h + 60) scanY = -60;
        const sg = ctx.createLinearGradient(0, scanY - 120, 0, scanY + 2);
        sg.addColorStop(0, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},0)`);
        sg.addColorStop(1, `rgba(${accentRGB.r},${accentRGB.g},${accentRGB.b},0.05)`);
        ctx.fillStyle = sg;
        ctx.fillRect(0, scanY - 120, w, 122);
      }

      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [p.id, density, showScan]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {showGrid && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage:
            `radial-gradient(${p.line} 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          opacity: 0.6,
          maskImage: "radial-gradient(ellipse at center, #000 0%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, #000 0%, transparent 78%)",
        }} />
      )}
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  const n = m.length === 3
    ? m.split("").map(c => c + c).join("")
    : m;
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

// ---------- Corner brackets ----------
function Corners({ p, color, size = 14, thick = 1.5, inset = 0 }) {
  const c = color || p.accent;
  const s = size, t = thick;
  const Bracket = ({ style }) => (
    <div style={{
      position: "absolute", width: s, height: s, ...style,
      pointerEvents: "none",
    }} />
  );
  return (
    <>
      <Bracket style={{ top: inset, left: inset, borderTop: `${t}px solid ${c}`, borderLeft: `${t}px solid ${c}` }} />
      <Bracket style={{ top: inset, right: inset, borderTop: `${t}px solid ${c}`, borderRight: `${t}px solid ${c}` }} />
      <Bracket style={{ bottom: inset, left: inset, borderBottom: `${t}px solid ${c}`, borderLeft: `${t}px solid ${c}` }} />
      <Bracket style={{ bottom: inset, right: inset, borderBottom: `${t}px solid ${c}`, borderRight: `${t}px solid ${c}` }} />
    </>
  );
}

// ---------- Crunchy button ----------
// Sharp-angled clip-path with offset highlight that ratchets on hover/active.
function CrunchBtn({ p, label, solid, danger, small, onClick, disabled, full, icon }) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const clip = "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)";
  const accent = danger ? p.warn : p.accent;
  const bg = solid
    ? (down ? p.fg : hover ? p.fg : accent)
    : "transparent";
  const fg = solid ? p.bg0 : (hover ? accent : p.fg);
  const bord = solid ? "transparent" : (hover ? accent : p.border);

  return (
    <div style={{ position: "relative", display: full ? "block" : "inline-block", width: full ? "100%" : undefined }}>
      {/* Offset shadow plate for the crunch */}
      <div style={{
        position: "absolute", inset: 0,
        transform: `translate(${down ? 0 : 4}px, ${down ? 0 : 4}px)`,
        background: solid ? accent : "transparent",
        border: solid ? "none" : `1px solid ${accent}33`,
        clipPath: clip,
        opacity: hover ? 1 : 0.65,
        transition: "transform .08s ease-out, opacity .15s",
        pointerEvents: "none",
      }} />
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => { setHover(false); setDown(false); }}
        onMouseDown={() => setDown(true)}
        onMouseUp={() => setDown(false)}
        style={{
          position: "relative",
          background: bg,
          color: fg,
          border: `1px solid ${bord}`,
          padding: small ? "8px 16px" : "14px 26px",
          fontFamily: "'Bebas Neue', 'Oswald', sans-serif",
          fontSize: small ? 13 : 16,
          letterSpacing: ".22em",
          fontWeight: 700,
          textTransform: "uppercase",
          cursor: disabled ? "not-allowed" : "pointer",
          clipPath: clip,
          width: full ? "100%" : undefined,
          transition: "background .12s, color .12s, transform .08s",
          transform: down ? "translate(2px, 2px)" : "translate(0,0)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}>
        {/* internal corner sliver */}
        <span style={{
          position: "absolute", right: 0, bottom: 0,
          width: 12, height: 12,
          background: hover && !solid ? accent : "transparent",
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          transition: "background .12s",
        }} />
        {icon && <span style={{ fontFamily: "'Space Mono', monospace", fontSize: small ? 11 : 13, opacity: .9 }}>{icon}</span>}
        <span>{label}</span>
      </button>
    </div>
  );
}

// ---------- Telemetry chip (monospace HUD label) ----------
function Tag({ p, children, color, glow }) {
  const c = color || p.accent;
  return (
    <span style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 10,
      letterSpacing: ".18em",
      color: c,
      textTransform: "uppercase",
      padding: "3px 8px",
      border: `1px solid ${c}44`,
      background: `${c}10`,
      textShadow: glow ? `0 0 8px ${c}88` : "none",
      whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

// ---------- Section header line ----------
function SectionLabel({ p, code, title }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 6, height: 6, background: p.accent, transform: "rotate(45deg)" }} />
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".25em", color: p.dim, textTransform: "uppercase" }}>
          {code}
        </div>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${p.border}, transparent)` }} />
      </div>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: ".06em", color: p.fg, textTransform: "uppercase" }}>
        {title}
      </div>
    </div>
  );
}

// ---------- Diagonal-cut card ----------
function HudCard({ p, children, hot, style, onClick, padding = 20 }) {
  const [hover, setHover] = useState(false);
  const clip = "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)";
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        background: p.bg1,
        border: `1px solid ${hover || hot ? p.accent : p.border}`,
        padding,
        clipPath: clip,
        cursor: onClick ? "pointer" : "default",
        transition: "border-color .15s",
        ...style,
      }}>
      {/* corner accent */}
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: hover || hot ? 60 : 28, height: 2,
        background: hover || hot ? p.accent : p.dim,
        transition: "width .25s, background .15s",
      }} />
      <div style={{
        position: "absolute", bottom: 0, right: 0,
        width: 16, height: 16,
        background: hover || hot ? p.accent : "transparent",
        clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
        transition: "background .15s",
      }} />
      {children}
    </div>
  );
}

// ---------- Status bar (HUD readout) ----------
function StatusBar({ p, label, value, color }) {
  const c = color || p.accent;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase", color: p.dim }}>
        <span>{label}</span>
        <span style={{ color: c }}>{value}%</span>
      </div>
      <div style={{ height: 3, background: p.bg2, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, width: `${value}%`, background: c, boxShadow: `0 0 8px ${c}` }} />
        {/* tick marks */}
        {[25, 50, 75].map(t => (
          <div key={t} style={{ position: "absolute", left: `${t}%`, top: -1, width: 1, height: 5, background: p.bg0 }} />
        ))}
      </div>
    </div>
  );
}

// ---------- Target reticle ----------
function Reticle({ p, size = 80, color }) {
  const c = color || p.accent;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="38" stroke={c} strokeWidth="1" fill="none" opacity=".5" />
      <circle cx="50" cy="50" r="22" stroke={c} strokeWidth="1" fill="none" />
      <circle cx="50" cy="50" r="2" fill={c} />
      <line x1="50" y1="2" x2="50" y2="18" stroke={c} strokeWidth="1.5" />
      <line x1="50" y1="82" x2="50" y2="98" stroke={c} strokeWidth="1.5" />
      <line x1="2" y1="50" x2="18" y2="50" stroke={c} strokeWidth="1.5" />
      <line x1="82" y1="50" x2="98" y2="50" stroke={c} strokeWidth="1.5" />
      {/* notches */}
      <path d="M 30 22 L 22 22 L 22 30" stroke={c} strokeWidth="1.5" fill="none" />
      <path d="M 70 22 L 78 22 L 78 30" stroke={c} strokeWidth="1.5" fill="none" />
      <path d="M 30 78 L 22 78 L 22 70" stroke={c} strokeWidth="1.5" fill="none" />
      <path d="M 70 78 L 78 78 L 78 70" stroke={c} strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ---------- NumberSwitch (custom tactical stepper) ----------
// Replaces native <input type="number"> spinners. Big crunchy +/- buttons,
// hold-to-repeat (accelerating), click value to edit inline.
//
// Props:
//   value, onChange, min, max
//   step      — number OR function(currentValue) => number (dynamic step)
//   format    — function(value) => string display (default toLocaleString)
//   parse     — function(string) => number for inline edit (default parseFloat)
//   suffix    — string suffix in label, e.g. "$"
//   width     — total width of the control
//   small     — compact size
//   accent    — color override (default p.accent)
function NumberSwitch({ p, value, onChange, min = 0, max = 999999, step = 1, format, parse, suffix, prefix, width, small, accent }) {
  const c = accent || p.accent;
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const holdRef = React.useRef(null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const clamp = (v) => Math.max(min, Math.min(max, v));
  const getStep = typeof step === "function" ? step : () => step;

  function bump(dir) {
    const cur = valueRef.current;
    const s = getStep(cur);
    onChange(clamp(cur + dir * s));
  }
  function startHold(dir) {
    bump(dir);
    let delay = 380;
    function tick() {
      bump(dir);
      delay = Math.max(40, delay * 0.82);
      holdRef.current = setTimeout(tick, delay);
    }
    holdRef.current = setTimeout(tick, delay);
  }
  function stopHold() {
    clearTimeout(holdRef.current);
    holdRef.current = null;
  }
  React.useEffect(() => () => clearTimeout(holdRef.current), []);

  function startEdit() {
    setDraft(String(value));
    setEditing(true);
  }
  function commitEdit() {
    const fn = parse || parseFloat;
    const n = fn(draft);
    if (!isNaN(n)) onChange(clamp(n));
    setEditing(false);
  }

  const display = format ? format(value) : value.toLocaleString();
  const h = small ? 36 : 44;
  const btnW = small ? 36 : 44;

  return (
    <div style={{
      position: "relative", display: "inline-flex", alignItems: "stretch",
      width: width || "100%",
      background: p.bg0,
      border: `1px solid ${p.border}`,
      borderRight: `2px solid ${c}`,
      height: h, userSelect: "none",
    }}>
      {/* − */}
      <button
        onMouseDown={() => startHold(-1)} onMouseUp={stopHold} onMouseLeave={stopHold}
        onTouchStart={(e) => { e.preventDefault(); startHold(-1); }} onTouchEnd={stopHold}
        disabled={value <= min}
        style={{
          width: btnW, background: "transparent", border: "none",
          borderRight: `1px solid ${p.border}`,
          color: value <= min ? p.dim : c,
          fontFamily: "'Bebas Neue', sans-serif", fontSize: small ? 18 : 22, lineHeight: 1,
          cursor: value <= min ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "color .15s, background .12s",
        }}
        onMouseEnter={(e) => { if (value > min) e.currentTarget.style.background = `${c}22`; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
      >−</button>

      {/* value */}
      <div onClick={startEdit} style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        cursor: editing ? "text" : "pointer",
        fontFamily: "'Bebas Neue', sans-serif", fontSize: small ? 18 : 24,
        letterSpacing: ".05em", color: p.fg,
        position: "relative", direction: "ltr",
      }}>
        {prefix && !editing && <span style={{ color: c, marginLeft: 4, fontSize: small ? 14 : 18 }}>{prefix}</span>}
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            style={{
              width: "100%", height: "100%", textAlign: "center",
              background: "transparent", border: "none", outline: "none",
              color: c, fontFamily: "'Bebas Neue', sans-serif", fontSize: small ? 18 : 24,
              letterSpacing: ".05em",
            }}
          />
        ) : (
          <span style={{ pointerEvents: "none" }}>{display}</span>
        )}
        {suffix && !editing && <span style={{ color: c, marginRight: 4, fontSize: small ? 13 : 16 }}>{suffix}</span>}

        {/* tick marks under value, mapping current to min/max range */}
        {!editing && max - min > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 2, height: 2, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${((value - min) / (max - min)) * 100}%`, background: c, boxShadow: `0 0 6px ${c}` }} />
          </div>
        )}
      </div>

      {/* + */}
      <button
        onMouseDown={() => startHold(+1)} onMouseUp={stopHold} onMouseLeave={stopHold}
        onTouchStart={(e) => { e.preventDefault(); startHold(+1); }} onTouchEnd={stopHold}
        disabled={value >= max}
        style={{
          width: btnW, background: "transparent", border: "none",
          borderLeft: `1px solid ${p.border}`,
          color: value >= max ? p.dim : c,
          fontFamily: "'Bebas Neue', sans-serif", fontSize: small ? 18 : 22, lineHeight: 1,
          cursor: value >= max ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "color .15s, background .12s",
        }}
        onMouseEnter={(e) => { if (value < max) e.currentTarget.style.background = `${c}22`; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
      >+</button>
    </div>
  );
}

// ---------- DurationSwitch (1s to 60m) ----------
// Smart step: 1s under 1min, 5s under 5min, 30s under 30min, 60s above.
function DurationSwitch({ p, value, onChange, min = 1, max = 3600, width, small }) {
  const step = (v) => v < 60 ? 1 : v < 300 ? 5 : v < 1800 ? 30 : 60;
  const format = (v) => {
    if (v < 60) return `${v}s`;
    const m = Math.floor(v / 60), s = v % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  };
  return (
    <NumberSwitch
      p={p} value={value} onChange={onChange}
      min={min} max={max} step={step} format={format}
      width={width} small={small}
    />
  );
}

// ---------- TacticalDropdown (sharp custom select) ----------
// Drop-in replacement for native <select>. Tactical visual, crunchy hover,
// supports inline-render of option labels (or pass `render` for custom items).
function TacticalDropdown({ p, value, onChange, options, label, prefix, width, small, align = "right" }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const btnRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-td-menu="1"]')) return;
      setOpen(false);
    };
    const reflow = () => {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
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

  const current = options.find(o => o.value === value) || options[0];
  const h = small ? 32 : 38;

  return (
    <div style={{ position: "relative", width: width || "auto", display: "inline-block", direction: "ltr" }}>
      <button ref={btnRef} onClick={() => setOpen(!open)} style={{
        width: width || "auto",
        height: h,
        padding: "0 12px",
        background: open ? p.bg2 : p.bg1,
        border: `1px solid ${open ? p.accent : p.border}`,
        borderRight: `2px solid ${p.accent}`,
        color: p.fg,
        fontFamily: "'Space Mono', monospace", fontSize: small ? 10 : 11, letterSpacing: ".18em",
        cursor: "pointer", textTransform: "uppercase",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        transition: "all .12s",
      }}>
        <span style={{ color: p.dim }}>
          {prefix && <span style={{ marginRight: 6 }}>{prefix} ·</span>}
          {label && <span style={{ marginRight: 6 }}>{label} ·</span>}
          <span style={{ color: p.accent }}>{current.label}</span>
        </span>
        <span style={{
          color: p.accent,
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 14,
          transition: "transform .2s",
          transform: open ? "rotate(180deg)" : "rotate(0)",
        }}>▾</span>
      </button>

      {open && pos && ReactDOM.createPortal(
        <div data-td-menu="1" style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          minWidth: pos.width,
          background: p.bg1, border: `1px solid ${p.accent}`,
          padding: 4, zIndex: 99999,
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
          boxShadow: `0 8px 24px rgba(0,0,0,.6), 0 0 18px ${p.accent}33`,
          animation: "td-open .15s ease-out",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: 32, height: 1, background: p.accent }} />
          {options.map((o) => {
            const on = o.value === value;
            return (
              <button key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                onMouseEnter={(e) => { if (!on) { e.currentTarget.style.background = `${p.accent}11`; e.currentTarget.style.color = p.accent; } }}
                onMouseLeave={(e) => { if (!on) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = p.fg; } }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", padding: "8px 12px",
                  background: on ? `${p.accent}22` : "transparent",
                  color: on ? p.accent : p.fg,
                  border: "none", borderRight: on ? `2px solid ${p.accent}` : "2px solid transparent",
                  fontFamily: "'Space Mono', monospace", fontSize: small ? 10 : 11, letterSpacing: ".15em",
                  cursor: "pointer", textAlign: "left", textTransform: "uppercase",
                  transition: "all .1s",
                  gap: 14,
                }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 4, height: 4, background: on ? p.accent : p.border,
                    transform: "rotate(45deg)",
                    boxShadow: on ? `0 0 4px ${p.accent}` : "none",
                  }} />
                  {o.label}
                </span>
                {o.hint && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".15em" }}>
                    {o.hint}
                  </span>
                )}
              </button>
            );
          })}
          <style>{`@keyframes td-open { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>,
        document.body
      )}
    </div>
  );
}

Object.assign(window, { ParticleField, Corners, CrunchBtn, Tag, SectionLabel, HudCard, StatusBar, Reticle, hexToRgb, NumberSwitch, DurationSwitch, TacticalDropdown });

// Shader-style interactive surfaces — iridescent cards, aurora loader, liquid metal,
// thinking pulse, noise overlay. All take a palette prop `p`.
// We mimic the Claude design pattern (mouse-reactive specular + conic iridescence +
// noise + perspective tilt) but in our crimson tactical vocabulary.

const sh_h = window.hexToRgb;

// ---------- Reusable noise (SVG turbulence as background-image) ----------
const NOISE_URL = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.65'/></svg>\")";

function NoiseOverlay({ opacity = 0.08, mix = "overlay", clip }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      backgroundImage: NOISE_URL,
      mixBlendMode: mix,
      opacity,
      clipPath: clip,
      pointerEvents: "none",
    }} />
  );
}

// ---------- Iridescent card ----------
// Sharp clipped panel with: conic-gradient iridescent sheen + mouse-tracked specular +
// noise + perspective tilt + accent glow.
function IridescentCard({
  p, title, sub, code, meta, glyph,
  w, h = 360, hot,
}) {
  const ref = React.useRef(null);
  const [m, setM] = React.useState({ x: 0.5, y: 0.3, in: false });

  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    setM({
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
      in: true,
    });
  }
  function onLeave() { setM(prev => ({ ...prev, in: false })); }

  const tiltK = m.in ? 1 : 0;
  const rx = (m.y - 0.5) * -10 * tiltK;
  const ry = (m.x - 0.5) * 12 * tiltK;
  const angle = (m.x * 240 + m.y * 120);

  const clip = "polygon(0 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%)";

  return (
    <div style={{ perspective: 1200, width: w, height: h, position: "relative" }}>
      {/* outer glow halo */}
      <div style={{
        position: "absolute", inset: -8,
        background: `radial-gradient(circle at ${m.x * 100}% ${m.y * 100}%, ${p.accent}55, transparent 55%)`,
        opacity: m.in ? 0.7 : 0,
        transition: "opacity .25s",
        filter: "blur(20px)",
        pointerEvents: "none",
      }} />

      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          width: "100%", height: "100%",
          transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
          transformStyle: "preserve-3d",
          transition: m.in ? "transform .08s linear" : "transform .5s ease",
          position: "relative",
          cursor: "pointer",
        }}>
        {/* base panel */}
        <div style={{
          position: "absolute", inset: 0,
          background: p.bg1,
          clipPath: clip,
          border: `1px solid ${hot || m.in ? p.accent : p.border}`,
          transition: "border-color .15s",
        }} />

        {/* iridescent conic sheen (blurred) */}
        <div style={{
          position: "absolute", inset: 0,
          background: `conic-gradient(from ${angle}deg at ${m.x * 100}% ${m.y * 100}%,
            ${p.accent} 0deg, ${p.accent2} 80deg, ${p.warn} 160deg, ${p.accent} 240deg, ${p.accent2} 320deg, ${p.accent} 360deg)`,
          clipPath: clip,
          mixBlendMode: "screen",
          opacity: m.in ? 0.4 : 0.14,
          filter: "blur(34px)",
          transition: "opacity .25s",
        }} />

        {/* sharp iridescent rim — subtle conic ring on the panel edge */}
        <div style={{
          position: "absolute", inset: 0,
          background: `conic-gradient(from ${angle * 1.3}deg, ${p.accent2}99, ${p.accent}99, ${p.warn}99, ${p.accent2}99)`,
          clipPath: clip,
          opacity: m.in ? 0.18 : 0.06,
          mixBlendMode: "screen",
          transition: "opacity .25s",
        }} />

        {/* specular hotspot */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(circle at ${m.x * 100}% ${m.y * 100}%,
            rgba(255,255,255,${m.in ? 0.22 : 0.05}) 0%, transparent 22%)`,
          clipPath: clip,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }} />

        {/* noise grain */}
        <div style={{ position: "absolute", inset: 0, clipPath: clip, overflow: "hidden" }}>
          <NoiseOverlay opacity={0.09} />
        </div>

        {/* scan grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `linear-gradient(${p.border} 1px, transparent 1px)`,
          backgroundSize: "100% 4px",
          opacity: 0.18,
          clipPath: clip,
          pointerEvents: "none",
        }} />

        {/* content */}
        <div style={{ position: "absolute", inset: 0, padding: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", textTransform: "uppercase" }}>
              {code}
            </div>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.accent,
              letterSpacing: ".2em", border: `1px solid ${p.accent}55`, padding: "2px 6px",
            }}>
              {hot ? "● LOCKED" : "○ AVAIL"}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {glyph || (
              <svg width="84" height="84" viewBox="0 0 100 100" style={{ opacity: 0.85, filter: `drop-shadow(0 0 12px ${p.accent}66)` }}>
                <polygon points="50,4 92,28 92,72 50,96 8,72 8,28"
                  stroke={p.accent} strokeWidth="1" fill="none" />
                <polygon points="50,18 80,34 80,66 50,82 20,66 20,34"
                  stroke={p.fg} strokeWidth=".5" fill="none" opacity=".5" />
                <circle cx="50" cy="50" r="6" fill={p.accent} />
              </svg>
            )}
          </div>

          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: p.fg, letterSpacing: ".06em", lineHeight: 1, textTransform: "uppercase" }}>
              {title}
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em", marginTop: 6, textTransform: "uppercase" }}>
              {sub}
            </div>
            {meta && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${p.border}`, display: "flex", gap: 12, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent2, letterSpacing: ".15em" }}>
                {meta}
              </div>
            )}
          </div>
        </div>

        {/* bottom-right corner cut accent */}
        <div style={{
          position: "absolute", right: 0, bottom: 0,
          width: 22, height: 22,
          background: m.in || hot ? p.accent : "transparent",
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          transition: "background .15s",
        }} />

        {/* top accent strip */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: m.in || hot ? "55%" : "18%", height: 2, background: p.accent,
          transition: "width .25s",
        }} />
      </div>
    </div>
  );
}

// ---------- Aurora loader ----------
// Flowing layered sin-wave bands. The cursor acts as a gravitational disturbance
// on the wave field — waves bulge toward the cursor with a Gaussian falloff,
// stretched into a wake by cursor velocity. Clicks spawn expanding ripples.
function AuroraLoader({ p, label, height = 200, interactive = true, intensity = 1 }) {
  const cRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = cRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    function resize() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);

    // ---- cursor state (smoothed) ----
    const cur = {
      x: 0, y: 0,         // raw
      sx: 0, sy: 0,       // smoothed position
      vx: 0, vy: 0,       // smoothed velocity
      active: false,
      strength: 0,        // 0..1 ramp
    };
    const ripples = [];   // click-triggered

    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      cur.x = e.clientX - r.left;
      cur.y = e.clientY - r.top;
      cur.active = true;
    }
    function onLeave() { cur.active = false; }
    function onDown(e) {
      const r = canvas.getBoundingClientRect();
      ripples.push({
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        age: 0,
        life: 1900,
      });
    }
    if (interactive) {
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("pointerdown", onDown);
    }

    const accent  = sh_h(p.accent);
    const accent2 = sh_h(p.accent2);

    let t = 0, raf, lastNow = performance.now();

    function loop() {
      const now = performance.now();
      const dt = Math.min(50, now - lastNow);
      lastNow = now;

      // smooth cursor position + strength
      const target = cur.active ? 1 : 0;
      cur.strength += (target - cur.strength) * 0.08;
      const lerp = 0.18;
      // capture velocity from raw->smoothed delta
      const dx = (cur.x - cur.sx) * lerp;
      const dy = (cur.y - cur.sy) * lerp;
      cur.sx += dx; cur.sy += dy;
      cur.vx += (dx - cur.vx) * 0.25;
      cur.vy += (dy - cur.vy) * 0.25;
      const speed = Math.hypot(cur.vx, cur.vy);

      // age ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].age += dt;
        if (ripples[i].age >= ripples[i].life) ripples.splice(i, 1);
      }

      // bg
      ctx.fillStyle = p.bg0;
      ctx.fillRect(0, 0, W, H);

      const layers = 7;
      ctx.globalCompositeOperation = "screen";
      for (let L = 0; L < layers; L++) {
        ctx.beginPath();
        const layerSpeed = 0.0008 + L * 0.0004;
        const amp  = (24 - L * 2) * intensity;
        const baseY = H * (0.45 + L * 0.04);
        const depth = 1 - L / layers;  // front layers feel stronger

        // disturbance sigma stretches with cursor velocity (creates a wake)
        const sigmaX = 90 + Math.min(140, Math.abs(cur.vx) * 4);
        const sigmaY = 60 + Math.min(80,  Math.abs(cur.vy) * 3);

        for (let x = 0; x <= W; x += 3) {
          const xn = x / W * Math.PI * 2;
          let y = baseY
            + Math.sin(xn * 1.2 + t * layerSpeed) * amp
            + Math.sin(xn * 2.7 + t * layerSpeed * 1.7 + L) * (amp * 0.5)
            + Math.cos(xn * 0.8 - t * layerSpeed * 0.6 + L * 0.7) * (amp * 0.3);

          // --- cursor disturbance: Gaussian pull toward cursor.y ---
          if (cur.strength > 0.01) {
            const dx2 = (x - cur.sx);
            const fx  = Math.exp(-(dx2 * dx2) / (2 * sigmaX * sigmaX));
            // vertical falloff so the bump is centered on the cursor row
            const dy2 = (baseY - cur.sy);
            const fy  = Math.exp(-(dy2 * dy2) / (2 * (sigmaY + 80) * (sigmaY + 80)));
            const pull = (cur.sy - y) * fx * fy * cur.strength * 0.55 * depth;
            y += pull;

            // small trailing push from velocity — bumps the wave in motion dir
            y += -cur.vy * fx * depth * 0.4 * cur.strength;
          }

          // --- click ripples: concentric wave rings ---
          for (let r2 = 0; r2 < ripples.length; r2++) {
            const rip = ripples[r2];
            const rt = rip.age / rip.life;            // 0..1
            const radius = rt * Math.max(W, H) * 0.6;
            const ddx = x - rip.x;
            const ddy = baseY - rip.y;
            const dist = Math.hypot(ddx, ddy);
            const band = 36;
            const inside = Math.abs(dist - radius);
            if (inside < band) {
              const ringA = (1 - inside / band) * (1 - rt) * cur.strength * depth;
              const dir = ddy < 0 ? -1 : 1;
              y += Math.sin((dist - radius) * 0.08) * 22 * ringA * dir;
            }
          }

          if (x === 0) ctx.moveTo(x, y);
          else         ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();

        const useCool = L % 2 === 1;
        const c = useCool ? accent2 : accent;
        const a = (0.18 - L * 0.018) * intensity;
        const grd = ctx.createLinearGradient(0, baseY - 60, 0, H);
        grd.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${Math.max(0, a)})`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grd;
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // top crisp ridge (also gets disturbed)
      ctx.beginPath();
      const baseY = H * 0.45;
      const sigmaX = 90 + Math.min(140, Math.abs(cur.vx) * 4);
      for (let x = 0; x <= W; x += 3) {
        const xn = x / W * Math.PI * 2;
        let y = baseY
          + Math.sin(xn * 1.2 + t * 0.0008) * 24
          + Math.sin(xn * 2.7 + t * 0.0014) * 12;
        if (cur.strength > 0.01) {
          const dx2 = (x - cur.sx);
          const fx = Math.exp(-(dx2 * dx2) / (2 * sigmaX * sigmaX));
          y += (cur.sy - y) * fx * cur.strength * 0.55;
        }
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${accent.r},${accent.g},${accent.b},0.55)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // --- cursor indicator: tiny crosshair + soft glow + radius ring ---
      if (cur.strength > 0.02) {
        const cs = cur.strength;
        // soft glow under cursor
        const halo = ctx.createRadialGradient(cur.sx, cur.sy, 0, cur.sx, cur.sy, 90);
        halo.addColorStop(0, `rgba(${accent.r},${accent.g},${accent.b},${cs * 0.28})`);
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cur.sx, cur.sy, 90, 0, Math.PI * 2);
        ctx.fill();
        // crosshair
        ctx.strokeStyle = `rgba(${accent.r},${accent.g},${accent.b},${cs * 0.85})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cur.sx - 9, cur.sy); ctx.lineTo(cur.sx - 4, cur.sy);
        ctx.moveTo(cur.sx + 9, cur.sy); ctx.lineTo(cur.sx + 4, cur.sy);
        ctx.moveTo(cur.sx, cur.sy - 9); ctx.lineTo(cur.sx, cur.sy - 4);
        ctx.moveTo(cur.sx, cur.sy + 9); ctx.lineTo(cur.sx, cur.sy + 4);
        ctx.stroke();
        // breathing ring sized by velocity
        const ringR = 14 + Math.min(40, speed * 0.8);
        ctx.strokeStyle = `rgba(${accent.r},${accent.g},${accent.b},${cs * 0.45})`;
        ctx.beginPath();
        ctx.arc(cur.sx, cur.sy, ringR, 0, Math.PI * 2);
        ctx.stroke();
        // center pixel
        ctx.fillStyle = `rgba(${accent.r},${accent.g},${accent.b},${cs})`;
        ctx.fillRect(cur.sx - 0.5, cur.sy - 0.5, 1, 1);
      }

      // --- click ripple visible ring outline ---
      for (const rip of ripples) {
        const rt = rip.age / rip.life;
        const radius = rt * Math.max(W, H) * 0.6;
        ctx.strokeStyle = `rgba(${accent.r},${accent.g},${accent.b},${(1 - rt) * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      t += dt;
      raf = requestAnimationFrame(loop);
    }
    loop();
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      if (interactive) {
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerleave", onLeave);
        canvas.removeEventListener("pointerdown", onDown);
      }
    };
  }, [p.id, interactive, intensity]);

  return (
    <div style={{ position: "relative", width: "100%", height, overflow: "hidden", background: p.bg0, border: `1px solid ${p.border}` }}>
      <canvas ref={cRef} style={{ display: "block", width: "100%", height: "100%", cursor: interactive ? "crosshair" : "default" }} />
      <NoiseOverlay opacity={0.05} mix="overlay" />
      {label && (
        <div style={{ position: "absolute", top: 12, left: 14, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", textTransform: "uppercase", textShadow: `0 0 8px ${p.accent}88`, pointerEvents: "none" }}>
          {label}
        </div>
      )}
      {interactive && (
        <div style={{ position: "absolute", bottom: 10, right: 14, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", pointerEvents: "none" }}>
          DRAG · CLICK_TO_RIPPLE
        </div>
      )}
      <Corners p={p} size={12} inset={6} color={p.accent} />
    </div>
  );
}

// ---------- Liquid metal loader (CSS metaball goo) ----------
function LiquidMetalLoader({ p, height = 200, label }) {
  const id = React.useId().replace(/:/g, "_");
  return (
    <div style={{ position: "relative", width: "100%", height, overflow: "hidden", background: p.bg0, border: `1px solid ${p.border}` }}>
      <div style={{ position: "absolute", inset: 0, filter: "contrast(22) blur(14px)" }}>
        {[
          { c: p.accent,  cls: `b1-${id}` },
          { c: p.accent2, cls: `b2-${id}` },
          { c: p.accent,  cls: `b3-${id}` },
          { c: p.accent,  cls: `b4-${id}` },
        ].map((b, i) => (
          <div key={i} className={b.cls} style={{
            position: "absolute", borderRadius: "50%",
            width: 160, height: 160,
            background: `radial-gradient(circle, ${b.c} 0%, transparent 70%)`,
            mixBlendMode: "screen",
          }} />
        ))}
      </div>

      {/* desaturate + scanlines on top */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${p.bg0} 1px, transparent 1px)`,
        backgroundSize: "100% 3px",
        opacity: 0.4,
      }} />
      <NoiseOverlay opacity={0.08} />

      {label && (
        <div style={{ position: "absolute", top: 12, left: 14, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", textTransform: "uppercase", textShadow: `0 0 8px ${p.accent}88` }}>
          {label}
        </div>
      )}
      <Corners p={p} size={12} inset={6} color={p.accent} />

      <style>{`
        @keyframes liqA-${id} { 0%,100% { transform: translate(-30%, -20%); } 50% { transform: translate(60%, 40%); } }
        @keyframes liqB-${id} { 0%,100% { transform: translate(60%, -10%); } 50% { transform: translate(-10%, 50%); } }
        @keyframes liqC-${id} { 0%,100% { transform: translate(20%, 60%); } 50% { transform: translate(70%, -20%); } }
        @keyframes liqD-${id} { 0%,100% { transform: translate(80%, 30%); } 50% { transform: translate(20%, 80%); } }
        .b1-${id} { animation: liqA-${id} 9s ease-in-out infinite; }
        .b2-${id} { animation: liqB-${id} 11s ease-in-out infinite; }
        .b3-${id} { animation: liqC-${id} 13s ease-in-out infinite; }
        .b4-${id} { animation: liqD-${id} 15s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ---------- Thinking pulse (inline, small) ----------
function ThinkingPulse({ p, label = "BRAIN THINKING", color }) {
  const c = color || p.accent;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".22em", textTransform: "uppercase" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className={`tp-dot tp-dot-${i}`} style={{
            width: 6, height: 6, background: c,
            transform: "rotate(45deg)",
          }} />
        ))}
      </div>
      <span style={{ color: c }}>{label}</span>
      <style>{`
        .tp-dot { opacity: 0.3; }
        @keyframes tp-pulse { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; box-shadow: 0 0 8px currentColor; } }
        .tp-dot-0 { animation: tp-pulse 1.4s ease-in-out infinite; }
        .tp-dot-1 { animation: tp-pulse 1.4s ease-in-out infinite .2s; }
        .tp-dot-2 { animation: tp-pulse 1.4s ease-in-out infinite .4s; }
      `}</style>
    </div>
  );
}

// ---------- Pulse ring (small, inline circle that ripples) ----------
function PulseRing({ p, size = 16, color }) {
  const c = color || p.accent;
  return (
    <div style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
      <div style={{
        position: "absolute", inset: 0, border: `1px solid ${c}`,
        animation: "pr-ring 1.6s ease-out infinite",
      }} />
      <div style={{
        position: "absolute", inset: size * 0.3, background: c, boxShadow: `0 0 8px ${c}`,
      }} />
      <style>{`
        @keyframes pr-ring { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
      `}</style>
    </div>
  );
}

Object.assign(window, { IridescentCard, AuroraLoader, LiquidMetalLoader, ThinkingPulse, PulseRing, NoiseOverlay });

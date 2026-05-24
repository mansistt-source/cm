// Auth page (login/register) + 404

function AuthPage({ p, navigate }) {
  const [mode, setMode] = React.useState("login");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [err, setErr] = React.useState("");
  const [ok, setOk] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  function submit() {
    setErr(""); setOk("");
    if (!email || !pass || (mode === "register" && !name)) { setErr("يرجى ملء جميع الحقول"); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOk(mode === "register" ? "تم إنشاء الحساب · جاري التحويل..." : "أهلاً بك · جاري التحويل...");
      setTimeout(() => navigate("dashboard"), 700);
    }, 900);
  }

  return (
    <div dir="rtl" style={{
      background: p.bg0, color: p.fg, fontFamily: "'Inter', sans-serif",
      minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <ParticleField p={p} density={0.5} showGrid={true} />
      </div>

      {/* mini nav */}
      <nav style={{
        position: "relative", zIndex: 2,
        padding: "16px 32px", borderBottom: `1px solid ${p.border}`, background: `${p.bg0}cc`, backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("landing")}>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke={p.accent} strokeWidth="1.5" fill="none" />
            <polygon points="12,7 17,10 17,14 12,17 7,14 7,10" fill={p.accent} />
          </svg>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: ".22em", color: p.fg }}>
            CONTENT/<span style={{ color: p.accent }}>MACHINE</span>
          </div>
        </div>
        <a onClick={(e) => { e.preventDefault(); navigate("landing"); }} style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".22em", textTransform: "uppercase", cursor: "pointer" }}>
          ← رجوع
        </a>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", zIndex: 2 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".3em", color: p.accent, textTransform: "uppercase", marginBottom: 10 }}>
              ◤ {mode === "login" ? "OPERATOR_GATE" : "ENROLLMENT"} //07
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, letterSpacing: ".05em", color: p.fg, textTransform: "uppercase", lineHeight: 1 }}>
              {mode === "login" ? "أهلاً بعودتك" : "ابدأ الآن"}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.dim, marginTop: 8 }}>
              {mode === "login" ? "اعتماد الهوية للدخول إلى نظام التشغيل" : "إنشاء عملية مشغّل جديدة"}
            </div>
          </div>

          {/* Card */}
          <div style={{
            position: "relative", background: p.bg1, border: `1px solid ${p.border}`,
            padding: 28,
            clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 60, height: 2, background: p.accent }} />
            <Corners p={p} size={10} inset={4} color={p.accent} />

            {/* mode toggle */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 22 }}>
              {[
                { id: "login", l: "دخول" },
                { id: "register", l: "تسجيل" },
              ].map(m => (
                <button key={m.id} onClick={() => { setMode(m.id); setErr(""); setOk(""); }} style={{
                  padding: "10px",
                  background: mode === m.id ? p.accent : "transparent",
                  color: mode === m.id ? p.bg0 : p.dim,
                  border: `1px solid ${mode === m.id ? p.accent : p.border}`,
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: ".18em",
                  cursor: "pointer",
                }}>{m.l}</button>
              ))}
            </div>

            {/* google btn (styled mock) */}
            <button style={{
              width: "100%", padding: "12px 14px", background: p.bg0, border: `1px solid ${p.border}`,
              color: p.fg, fontFamily: "'Inter', sans-serif", fontSize: 13, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 14,
            }}>
              <svg width="16" height="16" viewBox="0 0 18 18">
                <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.23-7.06z" fill="#4285f4"/>
                <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" fill="#34a853"/>
                <path d="M4.5 10.48a4.8 4.8 0 010-3.04V5.37H1.83a8 8 0 000 7.18l2.67-2.07z" fill="#fbbc05"/>
                <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.37L4.5 7.44a4.77 4.77 0 014.48-3.26z" fill="#ea4335"/>
              </svg>
              المتابعة عبر Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, background: p.border }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>OR</span>
              <div style={{ flex: 1, height: 1, background: p.border }} />
            </div>

            {/* fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mode === "register" && (
                <TacticalInput p={p} label="الاسم" value={name} onChange={setName} placeholder="اسمك الكامل" />
              )}
              <TacticalInput p={p} label="البريد" value={email} onChange={setEmail} type="email" placeholder="you@operator.com" rtl={false} />
              <TacticalInput p={p} label="كلمة السر" value={pass} onChange={setPass} type="password" placeholder="••••••••" rtl={false} />

              {err && <Toast p={p} type="error">{err}</Toast>}
              {ok && <Toast p={p} type="success">{ok}</Toast>}

              <div style={{ marginTop: 4 }}>
                <CrunchBtn p={p} label={loading ? "جاري الاعتماد..." : mode === "login" ? "دخول" : "إنشاء الحساب"} solid icon="▶" full onClick={submit} disabled={loading} />
              </div>

              {mode === "login" && (
                <div style={{ textAlign: "center", marginTop: 10 }}>
                  <a style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em", textDecoration: "none", cursor: "pointer" }}>
                    ↳ نسيت كلمة السر؟
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* meta */}
          <div style={{ textAlign: "center", marginTop: 18, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", textTransform: "uppercase" }}>
            بتسجيل دخولك توافق على شروط الخدمة
          </div>

          {/* mock telemetry beneath */}
          <div style={{ marginTop: 24, padding: 12, background: `${p.bg0}cc`, border: `1px solid ${p.border}`, display: "flex", justifyContent: "space-between", gap: 14 }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".18em" }}>
              ● NODE EU-W2
            </span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.accent2, letterSpacing: ".18em" }}>
              SSL · END-TO-END · NO_TRACK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- 404 ----------
function NotFoundPage({ p, navigate }) {
  return (
    <div dir="rtl" style={{
      background: p.bg0, color: p.fg, fontFamily: "'Inter', sans-serif",
      minHeight: "100vh", position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <ParticleField p={p} density={0.6} showGrid={true} />
      </div>

      <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 600, padding: 32 }}>
        {/* glitchy 404 */}
        <div style={{ position: "relative", marginBottom: 24 }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 220, letterSpacing: ".05em",
            color: p.accent, lineHeight: 1, textShadow: `0 0 30px ${p.glow}`,
          }}>
            404
          </div>
          {/* offset glitch copy */}
          <div style={{
            position: "absolute", top: 4, left: 4, right: 0,
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 220, letterSpacing: ".05em",
            color: p.accent2, lineHeight: 1, opacity: 0.4, mixBlendMode: "screen",
          }}>
            404
          </div>
        </div>

        <Tag p={p} color={p.warn}>SIGNAL_LOST</Tag>

        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, letterSpacing: ".05em", color: p.fg, textTransform: "uppercase", marginTop: 14, marginBottom: 10, lineHeight: 1 }}>
          الإحداثيات غير صالحة
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: p.dim, lineHeight: 1.8, marginBottom: 28 }}>
          المسار المطلوب غير موجود في النظام. قد يكون نُقل أو حُذف.
          <br />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.accent, letterSpacing: ".18em" }}>
            PATH/{window?.location?.hash?.slice(2) || "unknown"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <CrunchBtn p={p} label="العودة للرئيسية" solid icon="◇" onClick={() => navigate("dashboard")} />
          <CrunchBtn p={p} label="إبلاغ النظام" icon="!" onClick={() => {}} />
        </div>

        {/* fake log */}
        <div style={{ marginTop: 40, padding: 14, background: p.bg1, border: `1px solid ${p.border}`, textAlign: "right" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 6 }}>// CRASH_LOG</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, lineHeight: 1.8, direction: "ltr", textAlign: "left" }}>
            <div><span style={{ color: p.warn }}>[ERR]</span> route_match_failed</div>
            <div><span style={{ color: p.dim }}>[INF]</span> attempted_path: <span style={{ color: p.fg }}>{window?.location?.hash?.slice(2) || "/unknown"}</span></div>
            <div><span style={{ color: p.dim }}>[INF]</span> fallback: 404_handler</div>
            <div><span style={{ color: p.accent2 }}>[OK]</span> systems_nominal</div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuthPage, NotFoundPage });

// Auth page (login/register/google/2FA) + 404

function AuthPage({ p, navigate }) {
  const [mode, setMode] = React.useState("login");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [err, setErr] = React.useState("");
  const [ok, setOk] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const [googleClientId, setGoogleClientId] = React.useState("");
  const [googleReady, setGoogleReady] = React.useState(false);
  const [googleNameStep, setGoogleNameStep] = React.useState(null);
  const [googleName, setGoogleName] = React.useState("");

  const [twoFaStep, setTwoFaStep] = React.useState(null);
  const [twoFaCode, setTwoFaCode] = React.useState("");
  const googleBtnRef = React.useRef(null);

  function finishAuth(data, successMessage) {
    if (!data.token || !data.user) throw new Error("استجابة الاعتماد غير مكتملة");
    window.CM_AUTH?.save(data.token, data.user);
    setOk(successMessage || "تم الاعتماد · جاري التحويل...");
    setTimeout(() => navigate("dashboard"), 500);
  }

  async function loadGoogleConfig() {
    try {
      const res = await fetch("/api/config", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setGoogleClientId(data.googleClientId || "");
    } catch (_) {
      setGoogleClientId("");
    }
  }

  React.useEffect(() => { loadGoogleConfig(); }, []);

  React.useEffect(() => {
    if (!googleClientId) return;
    function renderGoogleButton() {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          await handleGoogleCredential(response.credential);
        },
      });
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: Math.min(360, googleBtnRef.current.offsetWidth || 360),
      });
      setGoogleReady(true);
    }
    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return;
    }
    const existing = document.querySelector('script[data-cm-google="1"]');
    if (existing) {
      existing.addEventListener("load", renderGoogleButton, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.cmGoogle = "1";
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
  }, [googleClientId]);

  async function handleGoogleCredential(idToken) {
    setErr(""); setOk(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "فشل تسجيل الدخول عبر Google");
      if (data.needsName) {
        setGoogleNameStep(data);
        setGoogleName(data.suggestedName || "");
        setOk("الإيميل جديد · اكتب اسم الحساب لإكمال التسجيل");
        return;
      }
      if (data.requires2fa) {
        setTwoFaStep(data);
        setOk("أدخل رمز 2FA لإكمال الدخول");
        return;
      }
      finishAuth(data, "تم الدخول عبر Google · جاري التحويل...");
    } catch (error) {
      setErr(error.message || "حدث خطأ في Google Sign-In");
    } finally {
      setLoading(false);
    }
  }

  async function completeGoogleName() {
    setErr(""); setOk("");
    const cleanName = googleName.trim();
    if (!cleanName) return setErr("اكتب اسم الحساب أولًا");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleSession: googleNameStep.googleSession, name: cleanName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "فشل إكمال حساب Google");
      finishAuth(data, "تم إنشاء الحساب · جاري التحويل...");
    } catch (error) {
      setErr(error.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  async function submit2fa() {
    setErr(""); setOk("");
    if (!twoFaCode.trim()) return setErr("اكتب رمز 2FA");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: twoFaStep.challenge, code: twoFaCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || "رمز 2FA غير صحيح");
      finishAuth(data, "تم التحقق · جاري التحويل...");
    } catch (error) {
      setErr(error.message || "فشل التحقق");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setErr("");
    setOk("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !pass || (mode === "register" && !cleanName)) {
      setErr("يرجى ملء جميع الحقول");
      return;
    }

    setLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload = mode === "register"
        ? { name: cleanName, email: cleanEmail, password: pass }
        : { email: cleanEmail, password: pass };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || "فشل تسجيل الدخول");
      }

      if (data.requires2fa) {
        setTwoFaStep(data);
        setOk("أدخل رمز 2FA لإكمال الدخول");
        return;
      }

      finishAuth(data, mode === "register" ? "تم إنشاء الحساب · جاري التحويل..." : "أهلاً بك · جاري التحويل...");
    } catch (error) {
      setErr(error.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  const showGoogleName = Boolean(googleNameStep);
  const show2fa = Boolean(twoFaStep);

  return (
    <div dir="rtl" style={{
      background: p.bg0, color: p.fg, fontFamily: "'Inter', sans-serif",
      minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column",
    }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <ParticleField p={p} density={0.5} showGrid={true} />
      </div>

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
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".3em", color: p.accent, textTransform: "uppercase", marginBottom: 10 }}>
              ◤ {show2fa ? "TWO_FACTOR" : showGoogleName ? "GOOGLE_PROFILE" : mode === "login" ? "OPERATOR_GATE" : "ENROLLMENT"} //07
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, letterSpacing: ".05em", color: p.fg, textTransform: "uppercase", lineHeight: 1 }}>
              {show2fa ? "تحقق بالبريد" : showGoogleName ? "اسم الحساب" : mode === "login" ? "أهلاً بعودتك" : "ابدأ الآن"}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.dim, marginTop: 8 }}>
              {show2fa ? "اكتب كود الأمان المرسل إلى بريد الحساب" : showGoogleName ? "الإيميل جديد، اختر اسمًا قبل الدخول" : mode === "login" ? "اعتماد الهوية للدخول إلى نظام التشغيل" : "إنشاء عملية مشغّل جديدة"}
            </div>
          </div>

          <div style={{
            position: "relative", background: p.bg1, border: `1px solid ${p.border}`,
            padding: 28,
            clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 60, height: 2, background: p.accent }} />
            <Corners p={p} size={10} inset={4} color={p.accent} />

            {!showGoogleName && !show2fa && (
              <>
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

                <div style={{ width: "100%", minHeight: 44, padding: 6, background: p.bg0, border: `1px solid ${p.border}`, marginBottom: 14, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  {googleClientId ? <div ref={googleBtnRef} style={{ width: "100%", display: "flex", justifyContent: "center" }} /> : (
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".16em" }}>GOOGLE CLIENT ID NOT CONFIGURED</span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
                  <div style={{ flex: 1, height: 1, background: p.border }} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>OR</span>
                  <div style={{ flex: 1, height: 1, background: p.border }} />
                </div>

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
                </div>
              </>
            )}

            {showGoogleName && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Toast p={p} type="info">Google: {googleNameStep.email}</Toast>
                <TacticalInput p={p} label="اسم الحساب" value={googleName} onChange={setGoogleName} placeholder="اكتب اسمك الحقيقي" />
                {err && <Toast p={p} type="error">{err}</Toast>}
                {ok && <Toast p={p} type="success">{ok}</Toast>}
                <CrunchBtn p={p} label={loading ? "جاري الإنشاء..." : "إكمال التسجيل"} solid icon="▶" full onClick={completeGoogleName} disabled={loading} />
                <CrunchBtn p={p} label="رجوع" onClick={() => { setGoogleNameStep(null); setErr(""); setOk(""); }} full />
              </div>
            )}

            {show2fa && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Toast p={p} type="info">الحساب محمي بـ 2FA</Toast>
                <TacticalInput p={p} label="رمز 2FA" value={twoFaCode} onChange={setTwoFaCode} placeholder="123456" rtl={false} />
                {err && <Toast p={p} type="error">{err}</Toast>}
                {ok && <Toast p={p} type="success">{ok}</Toast>}
                <CrunchBtn p={p} label={loading ? "جاري التحقق..." : "تحقق"} solid icon="▶" full onClick={submit2fa} disabled={loading} />
                <CrunchBtn p={p} label="رجوع" onClick={() => { setTwoFaStep(null); setTwoFaCode(""); setErr(""); setOk(""); }} full />
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: 18, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", textTransform: "uppercase" }}>
            بتسجيل دخولك توافق على شروط الخدمة
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

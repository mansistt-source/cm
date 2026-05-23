import { LogoImg } from "@/components/Logo";
import { useState, useEffect } from "react";

declare global { interface Window { google: any; } }

function Star({ spinning }: { spinning: boolean }) {
  return <span className={spinning ? "star-spin" : "star-pulse"} style={{ fontSize: 20, display: "inline-block", userSelect: "none" }}>★</span>;
}

const S = {
  inp: {
    width: "100%",
    background: "#0a0a0a",
    border: "1px solid #1a1a1a",
    color: "#fff",
    padding: "12px 16px",
    fontFamily: "Arial,sans-serif",
    fontSize: 13,
    outline: "none",
    direction: "rtl" as const,
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  clip: "polygon(0 0,100% 0,100% 68%,93% 100%,0 100%)",
};

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);

  // Check if already logged in via cookie
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(r => r.ok ? (window.location.href = "/dashboard") : null)
      .catch(() => {});
  }, []);

  // Google Sign In
  useEffect(() => {
    const clientId = document.querySelector('meta[name="google-client-id"]')?.getAttribute("content") ?? "";
    if (!clientId || clientId.includes("%VITE")) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      window.google?.accounts.id.initialize({ client_id: clientId, callback: handleGoogle });
      window.google?.accounts.id.renderButton(document.getElementById("g-btn"), {
        theme: "filled_black", size: "large", width: 340, locale: "ar",
      });
    };
    document.head.appendChild(s);
  }, []);

  async function handleGoogle(res: any) {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ credential: res.credential }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "فشل");
      navigate("/dashboard");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleSubmit() {
    if (!email || !password || (mode === "register" && !name)) { setError("يرجى ملء جميع الحقول"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name };
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",  // cookie يتحفظ تلقائي
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "حدث خطأ");
      setSuccess(mode === "register" ? "تم إنشاء الحساب!" : "أهلاً بك!");
      setTimeout(() => navigate("/dashboard"), 600);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function navigate(path: string) {
    setSpinning(true);
    setTimeout(() => { window.location.href = path; }, 500);
  }

  return (
    <div className="page-in" style={{ fontFamily: "'Arial Black',Arial,sans-serif", direction: "rtl", background: "#000", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "fixed", inset: 0, opacity: .025, pointerEvents: "none", backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "44px 44px" }} />

      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", borderBottom: "1px solid #111", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => navigate("/")}>
          <Star spinning={spinning} />
          <span className="shiny-sm" style={{ fontSize: 13, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase" as const }}>مُحرك التسويق</span>
        </div>
        <a href="/" style={{ fontSize: 9, color: "#555", letterSpacing: ".15em", textTransform: "uppercase" as const, textDecoration: "none", fontFamily: "Arial,sans-serif" }}>← رجوع</a>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: ".04em" }}>
              <span className="shiny">{mode === "login" ? "أهلاً بعودتك" : "ابدأ الآن"}</span>
            </div>
          </div>

          <div style={{ background: "#080808", border: "1px solid #1a1a1a", padding: "28px" }}>

            {/* Mode toggle */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, marginBottom: 22 }}>
              {(["login", "register"] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                  className="val-btn"
                  style={{ padding: "10px", background: mode === m ? "#fff" : "transparent", border: `1px solid ${mode === m ? "#fff" : "#1a1a1a"}`, color: mode === m ? "#000" : "#666", fontFamily: "inherit", fontSize: 10, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase" as const, cursor: "pointer", position: "relative" as const }}>
                  <span>{m === "login" ? "دخول" : "تسجيل"}</span>
                </button>
              ))}
            </div>

            {/* Google */}
            <div id="g-btn" style={{ display: "flex", justifyContent: "center", minHeight: 42, marginBottom: 16 }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: "#111" }} />
              <span style={{ fontSize: 10, color: "#333", fontFamily: "Arial,sans-serif" }}>أو</span>
              <div style={{ flex: 1, height: 1, background: "#111" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mode === "register" && (
                <input className="val-input" style={S.inp} placeholder="الاسم الكامل" value={name} onChange={e => setName(e.target.value)} />
              )}
              <input className="val-input" style={S.inp} type="email" placeholder="الإيميل" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="val-input" style={S.inp} type="password" placeholder="كلمة السر" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />

              {error && <div style={{ background: "rgba(255,40,40,0.08)", border: "1px solid rgba(255,40,40,0.2)", padding: "10px 14px", fontSize: 12, color: "#ff5555", fontFamily: "Arial,sans-serif" }}>{error}</div>}
              {success && <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #222", padding: "10px 14px", fontSize: 12, color: "#fff", fontFamily: "Arial,sans-serif" }}>{success}</div>}

              <button onClick={handleSubmit} disabled={loading} className="val-btn"
                style={{ width: "100%", padding: "13px", background: loading ? "#111" : "#fff", border: "none", color: loading ? "#444" : "#000", fontWeight: 900, fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase" as const, cursor: loading ? "default" : "pointer", fontFamily: "inherit", clipPath: S.clip, position: "relative" as const }}>
                <span>{loading ? "..." : mode === "login" ? "دخول ←" : "إنشاء الحساب ←"}</span>
              </button>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 14, fontSize: 9, color: "#222", letterSpacing: ".1em", fontFamily: "Arial,sans-serif", textTransform: "uppercase" as const }}>
            بتسجيل دخولك توافق على شروط الخدمة
          </div>
        </div>
      </div>
    </div>
  );
}

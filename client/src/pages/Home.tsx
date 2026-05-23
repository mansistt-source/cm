import { useState } from "react";

const PLANS = [
  { key:"starter", name:"اشتراك ابتدائي", price:150,  credits:1500,  badge:"للبداية" },
  { key:"growth",  name:"اشتراك مُعزز",   price:300,  credits:3300,  badge:"للنمو" },
  { key:"pro",     name:"اشتراك احترافي", price:800,  credits:9600,  badge:"يزيد الوفرة", featured:true },
  { key:"agency",  name:"أقصى اشتراك",   price:1500, credits:19500, badge:"للوكالات" },
];

function Star({ spinning }: { spinning: boolean }) {
  return (
    <span
      className={spinning ? "star-spin" : "star-pulse"}
      style={{ fontSize: 20, display: "inline-block", userSelect: "none", lineHeight: 1 }}
    >
      ★
    </span>
  );
}

function Logo({ spinning }: { spinning?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Star spinning={!!spinning} />
      <span
        className="shiny-sm"
        style={{ fontSize: 13, fontWeight: 900, letterSpacing: ".1em", textTransform: "uppercase" as const }}
      >
        مُحرك التسويق
      </span>
    </div>
  );
}

function ValBtn({ label, solid, onClick, small, disabled }: {
  label: string; solid?: boolean; onClick?: () => void; small?: boolean; disabled?: boolean;
}) {
  const clip = "polygon(0 0,100% 0,100% 68%,93% 100%,0 100%)";
  return (
    <button
      className="val-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: solid && !disabled ? "#fff" : "transparent",
        border: `1px solid ${solid && !disabled ? "#fff" : disabled ? "#1a1a1a" : "#333"}`,
        color: solid && !disabled ? "#000" : disabled ? "#333" : "#fff",
        padding: small ? "7px 16px" : "11px 28px",
        fontFamily: "inherit",
        fontSize: small ? 9 : 11,
        fontWeight: 900,
        letterSpacing: ".1em",
        textTransform: "uppercase" as const,
        cursor: disabled ? "default" : "pointer",
        clipPath: clip,
        position: "relative" as const,
      }}
    >
      <span>{label}</span>
    </button>
  );
}

function SectionTitle({ label, title }: { label: string; title: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 9, letterSpacing: ".25em", textTransform: "uppercase" as const, color: "#555",
textShadow: "none", marginBottom: 6, fontFamily: "Arial,sans-serif" }}>
        {label}
 
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: ".06em", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 24, height: 2, background: "#fff", flexShrink: 0 }} />
        <span className="shiny">{title}</span>
        <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [spinning, setSpinning] = useState(false);
  const [paygAmount, setPaygAmount] = useState("");
  const [paygLoading, setPaygLoading] = useState(false);

  const paygNum = parseFloat(paygAmount) || 0;
  const paygCredits = paygNum > 0 ? Math.floor(paygNum / 0.0792) : 0;
  const paygValid = paygNum >= 5 && paygNum <= 5000;

  function navigate(path: string) {
    setSpinning(true);
    setTimeout(() => { window.location.href = path; }, 500);
  }

  function goToAuth() { navigate("/auth"); }
  function handleSubscribe() { navigate("/auth"); }

  async function handlePayg() {
    if (!paygValid) return;
    // Check auth via cookie
    const meRes = await fetch("/api/auth/me", { credentials:"include" });
    if (!meRes.ok) { navigate("/auth"); return; }
    setPaygLoading(true);
    try {
      const r = await fetch("/api/paypal/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: paygNum }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } catch { alert("خطأ في الاتصال"); }
    finally { setPaygLoading(false); }
  }

  const clip = "polygon(0 0,100% 0,100% 68%,93% 100%,0 100%)";

  return (
    <div
      className="page-in"
      style={{
        background: "#000",
        minHeight: "100vh",
        color: "#fff",
        fontFamily: "'Arial Black',Arial,sans-serif",
        direction: "rtl",
        overflowX: "hidden",
      }}
    >
      {/* ─── NAV ─────────────────────────────────────────────── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 40px",
          borderBottom: "1px solid #111",
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(0,0,0,0.94)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Logo spinning={spinning} />
        <ValBtn label="دخول" onClick={goToAuth} />
      </nav>

      {/* ─── HERO ────────────────────────────────────────────── */}
      <div
        style={{
          padding: "100px 40px 80px",
          position: "relative",
          borderBottom: "1px solid #0d0d0d",
        }}
      >
        {/* Thin geometric accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 1,
            height: "100%",
            background: "linear-gradient(180deg, transparent, #ffffff18, transparent)",
          }}
        />

        <div
          style={{
            fontSize: "clamp(44px,7vw,80px)",
            fontWeight: 900,
            lineHeight: 0.9,
            letterSpacing: "-0.02em",
            textTransform: "uppercase" as const,
            marginBottom: 20,
          }}
        >
          <span className="shiny" style={{ display: "block" }}>بروميت واحد.</span>
          <span style={{ display: "block", fontSize: "clamp(32px,5.5vw,60px)", marginTop: 8, color: "#4ade80", textShadow: "0 0 20px rgba(74,222,128,0.5), 0 0 50px rgba(74,222,128,0.18)" }}>
          يأتمت العملية.
          </span>
        </div>

        <p
          style={{
            fontSize: 14, color: "#8b5cf6", textShadow: "0 0 12px rgba(139,92,246,0.35)",
            maxWidth: 380,
            lineHeight: 1.8,
            fontFamily: "Arial,sans-serif",
            fontWeight: 400,
          }}
        >
          اكتب فكرتك — النظام يخطط ويصوّر ويسلّمك الفيديو النهائي تلقائياً.
        </p>
      </div>

      {/* ─── PLANS ───────────────────────────────────────────── */}
      <div style={{ padding: "60px 40px 0" }}>
        <SectionTitle label="الباقات الشهرية" title="خطط الكريديت" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2, marginBottom: 2 }}>
          {PLANS.map(p => (
            <div
              key={p.key}
              className="val-card"
              onClick={handleSubscribe}
              style={{
                background: "#080808",

                border: "1px solid #111",
                padding: "24px 20px",
                position: "relative" as const,
                boxShadow: "none",
              }}
            >
            

              <div
                style={{
                  fontSize: 8,
                  letterSpacing: ".15em",
                  textTransform: "uppercase" as const,
                  color: "#555",
                  marginBottom: 12,
                  fontFamily: "Arial,sans-serif",
                }}
              >
                {p.badge}
              </div>

              <div
                className="shiny-sm"
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  textTransform: "uppercase" as const,
                  letterSpacing: ".05em",
                  marginBottom: 8,
                  lineHeight: 1.3,
                }}
              >
                {p.name}
              </div>

              <div
                className="shiny"
                style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, marginBottom: 4 }}
              >
                ${p.price}
                <span style={{ fontSize: 10, fontWeight: 400, color: "#444", fontFamily: "Arial,sans-serif" }}>
                  {" "}/ شهر
                </span>
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: "#555",
                  fontFamily: "Arial,sans-serif",
                  marginBottom: 20,
                }}
              >
                {p.credits.toLocaleString()} كريديت
              </div>

              <ValBtn label="اشترك" small onClick={handleSubscribe} />
            </div>
          ))}
        </div>

        {/* ─── PAYG ──────────────────────────────────────────── */}
        <div
          style={{
            background: "#080808",
            border: "1px solid #111",
            padding: "22px 24px",
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap" as const,
            marginBottom: 60,
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontSize: 8,
                letterSpacing: ".2em",
                textTransform: "uppercase" as const,
                color: "#555",
                marginBottom: 8,
                fontFamily: "Arial,sans-serif",
              }}
            >
              بدون اشتراك شهري
            </div>
            <div
              className="shiny-sm"
              style={{
                fontSize: 14,
                fontWeight: 900,
                textTransform: "uppercase" as const,
                letterSpacing: ".06em",
                marginBottom: 4,
              }}
            >
              ادفع اللي استخدمته
            </div>
            <div style={{ fontSize: 11, color: "#555", fontFamily: "Arial,sans-serif" }}>
              $0.15 لكل كريديت — الحد الأقصى $5,000 للمعاملة الواحدة
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
            <div style={{ position: "relative" as const }}>
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#fff",
                  fontFamily: "'Arial Black',Arial,sans-serif",
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                $
              </span>
              <input
                type="number"
                min="1"
                max="5000"
                step="1"
                placeholder="0"
                value={paygAmount}
                onChange={e => setPaygAmount(e.target.value)}
                className="val-input"
                style={{
                  background: "#0a0a0a",
                  border: `1px solid ${paygNum > 5000 ? "#ff4444" : "#222"}`,
                  color: "#fff",
                  padding: "11px 40px 11px 12px",
                  fontFamily: "'Arial Black',Arial,sans-serif",
                  fontSize: 16,
                  fontWeight: 900,
                  width: 140,
                  direction: "ltr" as const,
                  outline: "none",
                }}
              />
            </div>

            {paygCredits > 0 && (
              <div style={{ fontSize: 12, color: "#888", fontFamily: "Arial,sans-serif", whiteSpace: "nowrap" as const }}>
                ={" "}
                <span className="shiny-sm" style={{ fontWeight: 900, fontSize: 16 }}>
                  {paygCredits.toLocaleString()}
                </span>{" "}
                كريديت
              </div>
            )}

            {paygNum > 5000 && (
              <div style={{ fontSize: 10, color: "#ff4444", fontFamily: "Arial,sans-serif" }}>
                الحد الأقصى $5,000
              </div>
            )}

            <button
              onClick={handlePayg}
              disabled={paygLoading || !paygValid}
              className="val-btn"
              style={{
                background: paygValid ? "#fff" : "#0a0a0a",
                border: `1px solid ${paygValid ? "#fff" : "#222"}`,
                color: paygValid ? "#000" : "#333",
                padding: "11px 24px",
                fontFamily: "inherit",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: ".1em",
                textTransform: "uppercase" as const,
                cursor: paygLoading || !paygValid ? "default" : "pointer",
                clipPath: clip,
                position: "relative" as const,
              }}
            >
              <span>{paygLoading ? "..." : "ادفع ←"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── CTA ─────────────────────────────────────────────── */}
      <div
        style={{
          padding: "80px 40px",
          textAlign: "center" as const,
          borderTop: "1px solid #0d0d0d",
          position: "relative" as const,
          overflow: "hidden",
        }}
      >
        {/* Geometric hex bg */}
        <svg
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            opacity: 0.03,
            pointerEvents: "none",
          }}
          width="600"
          height="400"
          viewBox="0 0 600 400"
        >
          <polygon points="300,10 540,130 540,270 300,390 60,270 60,130" fill="none" stroke="#fff" strokeWidth="1" />
          <polygon points="300,60 500,160 500,240 300,340 100,240 100,160" fill="none" stroke="#fff" strokeWidth=".5" />
        </svg>

        <div
          className="shiny"
          style={{
            fontSize: "clamp(28px,5vw,52px)",
            fontWeight: 900,
            textTransform: "uppercase" as const,
            letterSpacing: ".04em",
            marginBottom: 36,
            position: "relative",
          }}
        >
          جاهز تبدأ؟
        </div>

        <ValBtn label="ابدأ" solid onClick={goToAuth} />
      </div>

      {/* ─── FOOTER ──────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid #0d0d0d",
          padding: "20px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: "#222",
            letterSpacing: ".1em",
            fontFamily: "Arial,sans-serif",
            textTransform: "uppercase" as const,
          }}
        >
          © 2026 مُحرك التسويق — كل الحقوق محفوظة
        </div>
        <Logo spinning={spinning} />
      </footer>
    </div>
  );
}

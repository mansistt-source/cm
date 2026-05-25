// Shared shell: authed nav, page frame, helpers used across all logged-in pages.

const { useState: _u, useEffect: _e, useRef: _r } = React;


// ---- Auth storage helpers: single source of truth for logged-in user
function cmGetStoredUser() {
  try {
    const raw = localStorage.getItem("cm_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.email) return null;
    const safeName = (parsed.name || parsed.email || "مشغل").trim();
    return {
      ...parsed,
      name: safeName,
      initial: safeName.charAt(0).toUpperCase(),
    };
  } catch (_) {
    return null;
  }
}

function cmSaveAuthSession(token, user) {
  if (token) localStorage.setItem("cm_token", token);
  if (user) localStorage.setItem("cm_user", JSON.stringify(user));
  window.dispatchEvent(new Event("cm-auth-changed"));
}

function cmClearAuthSession() {
  localStorage.removeItem("cm_token");
  localStorage.removeItem("cm_user");
  window.dispatchEvent(new Event("cm-auth-changed"));
}

function cmGetAuthToken() {
  return localStorage.getItem("cm_token") || "";
}

function cmIsAuthenticated() {
  return Boolean(cmGetAuthToken() && cmGetStoredUser());
}

async function cmLogout(navigate) {
  const token = cmGetAuthToken();
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch (_) {}
  cmClearAuthSession();
  if (typeof navigate === "function") navigate("auth");
}

window.CM_AUTH = {
  getUser: cmGetStoredUser,
  save: cmSaveAuthSession,
  clear: cmClearAuthSession,
  token: cmGetAuthToken,
  isAuthed: cmIsAuthenticated,
  logout: cmLogout,
};

// ---- AuthedNav: top bar shown on all logged-in pages
function AuthedNav({ p, current, navigate, credits = 4820, user, onLogout }) {
  const currentUser = user || cmGetStoredUser() || { name: "مشغل", email: "operator@content.machine", initial: "م" };
  const safeName = (currentUser.name || currentUser.email || "مشغل").trim();
  const safeInitial = (currentUser.initial || safeName.charAt(0) || "م").toUpperCase();

  function handleLogout() {
    if (window.CM_AUTH?.logout) return window.CM_AUTH.logout(typeof onLogout === "function" ? onLogout : navigate);
    cmClearAuthSession();
    if (typeof onLogout === "function") onLogout();
    else navigate("auth");
  }
  const tabs = [
    { id: "dashboard",   l: "الرئيسية",     icon: "◇" },
    { id: "service-agent", l: "وكيل الخدمة", icon: "✦", hot: true },
    { id: "film-hub",    l: "صانع الأفلام", icon: "▶", aliases: ["create"] },
    { id: "market-hub",  l: "وكيل التسويق",  icon: "◆", aliases: ["market"] },
    { id: "ugc-avatar", l: "أفاتار UGC", icon: "◉" },
    { id: "library",   l: "المشاريع",   icon: "◫" },
    { id: "settings",  l: "الإعدادات",   icon: "⚙" },
  ];
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: `${p.bg0}f2`, backdropFilter: "blur(14px)",
      borderBottom: `1px solid ${p.border}`,
      padding: "12px 32px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => navigate("dashboard")}>
        <svg width="22" height="22" viewBox="0 0 24 24">
          <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke={p.accent} strokeWidth="1.5" fill="none" />
          <polygon points="12,7 17,10 17,14 12,17 7,14 7,10" fill={p.accent} />
        </svg>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: ".22em", color: p.fg }}>
          CONTENT/<span style={{ color: p.accent }}>MACHINE</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 2 }}>
        {tabs.map(t => {
          const on = current === t.id
            || (current === "project-detail" && t.id === "library")
            || (t.aliases && t.aliases.includes(current));
          return (
            <button key={t.id} onClick={() => navigate(t.id)} style={{
              padding: "8px 16px",
              background: on ? p.accent : "transparent",
              color: on ? p.bg0 : p.dim,
              border: `1px solid ${on ? p.accent : "transparent"}`,
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: ".14em",
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, opacity: .8 }}>{t.icon}</span>
              {t.l}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* credit chip */}
        <div style={{
          padding: "6px 14px", background: p.bg1, border: `1px solid ${p.border}`,
          fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em",
          display: "inline-flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 5, height: 5, background: p.accent2, transform: "rotate(45deg)" }} />
          CRED <span style={{ color: p.accent, fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: ".05em" }}>{credits.toLocaleString()}</span>
        </div>
        {/* avatar */}
        <div style={{
          width: 30, height: 30, background: p.accent,
          clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: p.bg0, letterSpacing: ".05em",
          cursor: "pointer",
        }} onClick={handleLogout} title={safeName}>
          {safeInitial}
        </div>
      </div>
    </nav>
  );
}

// ---- PageFrame: outer frame for any logged-in page
function PageFrame({ p, children, density = 0.4 }) {
  return (
    <div dir="rtl" style={{
      background: p.bg0, color: p.fg, fontFamily: "'Inter', sans-serif",
      minHeight: "100vh", position: "relative",
    }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <ParticleField p={p} density={density} showGrid={true} />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

// ---- SectionHead: standard section header
function SectionHead({ p, code, title, sub, right }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".25em", color: p.accent, textTransform: "uppercase" }}>
        <span style={{ width: 6, height: 6, background: p.accent, transform: "rotate(45deg)" }} />
        {code}
        <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${p.border}, transparent)` }} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, color: p.fg, letterSpacing: ".05em", lineHeight: 1, textTransform: "uppercase" }}>{title}</div>
          {sub && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.dim, marginTop: 6, lineHeight: 1.7 }}>{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}

// ---- HUD card variant: simple panel
function Panel({ p, children, padding = 22, style }) {
  return (
    <div style={{
      position: "relative", background: p.bg1, border: `1px solid ${p.border}`,
      padding,
      clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)",
      ...style,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 28, height: 2, background: p.accent }} />
      {children}
    </div>
  );
}

// ---- TacticalInput
function TacticalInput({ p, label, value, onChange, type = "text", placeholder, rtl = true, hint }) {
  return (
    <div>
      {label && (
        <label style={{ display: "block", fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 6, textTransform: "uppercase" }}>
          ▸ {label}
        </label>
      )}
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          width: "100%", background: p.bg0, border: `1px solid ${p.border}`, borderRight: `2px solid ${p.accent}`,
          color: p.fg, padding: "12px 14px",
          fontFamily: "'Inter', sans-serif", fontSize: 14, outline: "none",
          direction: rtl ? "rtl" : "ltr", boxSizing: "border-box",
        }}
      />
      {hint && (
        <div style={{ marginTop: 5, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".12em" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function TacticalTextarea({ p, label, value, onChange, placeholder, rows = 5, rtl = true, hint }) {
  return (
    <div>
      {label && (
        <label style={{ display: "block", fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 6, textTransform: "uppercase" }}>
          ▸ {label}
        </label>
      )}
      <textarea
        rows={rows} placeholder={placeholder} value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          width: "100%", background: p.bg0, border: `1px solid ${p.border}`, borderRight: `2px solid ${p.accent}`,
          color: p.fg, padding: "12px 14px",
          fontFamily: "'Inter', sans-serif", fontSize: 14, outline: "none", lineHeight: 1.7,
          direction: rtl ? "rtl" : "ltr", boxSizing: "border-box", resize: "vertical",
        }}
      />
      {hint && (
        <div style={{ marginTop: 5, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".12em" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// ---- Toast (mock)
function Toast({ p, type = "info", children }) {
  const color = type === "error" ? p.warn : type === "success" ? p.accent2 : p.accent;
  return (
    <div style={{
      padding: "10px 14px",
      background: `${color}11`, border: `1px solid ${color}55`, borderRight: `2px solid ${color}`,
      fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.fg,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span style={{ width: 6, height: 6, background: color, transform: "rotate(45deg)" }} />
      {children}
    </div>
  );
}

Object.assign(window, { AuthedNav, PageFrame, SectionHead, Panel, TacticalInput, TacticalTextarea, Toast });

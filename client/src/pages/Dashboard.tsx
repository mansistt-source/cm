import { useState, useEffect } from "react";
import { LogoImg } from "@/components/Logo";

const PLANS = [
  { key:"starter", name:"اشتراك ابتدائي", price:150,  credits:1500  },
  { key:"growth",  name:"اشتراك مُعزز",   price:300,  credits:3300  },
  { key:"pro",     name:"اشتراك احترافي", price:800,  credits:9600, featured:true },
  { key:"agency",  name:"أقصى اشتراك",   price:1500, credits:19500 },
];

async function authFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string,string> = { "Content-Type": "application/json", ...(opts.headers as any) };
  return fetch(path, { ...opts, credentials: "include", headers });
}

function Logo({ spinning }: { spinning?: boolean }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
      <LogoImg size={28} spinning={spinning} />
      <span className="shiny-sm" style={{ fontSize:13, fontWeight:900, letterSpacing:".1em", textTransform:"uppercase" as const }}>
        مُحرك التسويق
      </span>
    </div>
  );
}

function ValBtn({ label, solid, onClick, small, disabled }: any) {
  const clip = "polygon(0 0,100% 0,100% 68%,93% 100%,0 100%)";
  return (
    <button className="val-btn" onClick={onClick} disabled={disabled}
      style={{ background:solid&&!disabled?"#fff":"transparent", border:`1px solid ${solid&&!disabled?"#fff":disabled?"#1a1a1a":"#333"}`, color:solid&&!disabled?"#000":disabled?"#333":"#fff", padding:small?"7px 16px":"10px 22px", fontFamily:"inherit", fontSize:small?9:11, fontWeight:900, letterSpacing:".1em", textTransform:"uppercase" as const, cursor:disabled?"default":"pointer", clipPath:clip, position:"relative" as const }}>
      <span>{label}</span>
    </button>
  );
}

function TabBtn({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className="val-btn"
      style={{ padding:"8px 18px", background:active?"#fff":"transparent", border:`1px solid ${active?"#fff":"#1a1a1a"}`, color:active?"#000":"#777", fontFamily:"'Arial Black',Arial,sans-serif", fontSize:9, fontWeight:900, letterSpacing:".1em", textTransform:"uppercase" as const, cursor:"pointer", position:"relative" as const }}>
      <span>{label}</span>
    </button>
  );
}

function STitle({ label, title }: any) {
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ fontSize:9, letterSpacing:".2em", textTransform:"uppercase" as const, color:"#7c3aed", textShadow:"0 0 10px rgba(124,58,237,0.3)", marginBottom:6, fontFamily:"Arial,sans-serif" }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:900, textTransform:"uppercase" as const, letterSpacing:".06em", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:20, height:2, background:"#fff", flexShrink:0 }} />
        <span className="shiny">{title}</span>
        <div style={{ flex:1, height:1, background:"#111" }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState("home");
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);

  // Security
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confPass, setConfPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passErr, setPassErr] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  // PAYG
  const [paygAmount, setPaygAmount] = useState("");
  const [paygLoading, setPaygLoading] = useState(false);
  const paygNum = parseFloat(paygAmount) || 0;
  const paygCredits = paygNum > 0 ? Math.floor(paygNum / 0.0792) : 0;
  const paygValid = paygNum >= 5 && paygNum <= 5000;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab")) setTab(params.get("tab")!);
    const topupStatus = params.get("topup_status");
    if (topupStatus === "success") alert("تم شحن الكريديت بنجاح");
    if (topupStatus === "already_captured") alert("عملية الشحن دي اتسجلت قبل كده");
    if (topupStatus === "failed") alert(params.get("error") || "فشل تأكيد الدفع");
    if (topupStatus) window.history.replaceState({}, "", "/dashboard?tab=billing");
  }, []);

  useEffect(() => {
    authFetch("/api/auth/me")
      .then(r => {
        if (!r.ok) { window.location.href = "/auth"; return null; }
        return r.json();
      })
      .then(async u => {
        if (u) {
          setUser(u);
          const creditRes = await authFetch("/api/paypal/status");
          if (creditRes.ok) {
            const creditData = await creditRes.json();
            setCredits(creditData.creditsLeft ?? 0);
          }
          setLoading(false);
        }
      })
      .catch(() => { window.location.href = "/auth"; });
  }, []);

  function navigate(path: string) {
    setSpinning(true);
    setTimeout(() => { window.location.href = path; }, 500);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method:"POST", credentials:"include" });
    navigate("/");
  }

  async function handleSubscribe(planKey: string) {
    try {
      const r = await authFetch("/api/trpc/paypal.subscribe", {
        method:"POST", body:JSON.stringify({ json:{ plan: planKey } }),
      });
      const d = await r.json();
      const url = d?.result?.data?.json?.url;
      if (url) window.location.href = url;
    } catch { alert("خطأ في الاتصال"); }
  }

  async function handleChangePassword() {
    setPassErr(""); setPassMsg("");
    if (!curPass || !newPass || !confPass) { setPassErr("يرجى ملء جميع الحقول"); return; }
    if (newPass !== confPass) { setPassErr("كلمة السر الجديدة لا تطابق التأكيد"); return; }
    if (newPass.length < 8) { setPassErr("كلمة السر يجب أن تكون ٨ أحرف على الأقل"); return; }
    setPassLoading(true);
    try {
      const r = await authFetch("/api/auth/change-password", {
        method:"POST", body:JSON.stringify({ currentPassword: curPass, newPassword: newPass }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "خطأ");
      setPassMsg("✓ تم تغيير كلمة السر");
      setCurPass(""); setNewPass(""); setConfPass("");
    } catch(e:any) { setPassErr(e.message); }
    finally { setPassLoading(false); }
  }

  async function handlePayg() {
    if (!paygValid) return;
    setPaygLoading(true);
    try {
      const r = await authFetch("/api/paypal/topup", {
        method:"POST", body:JSON.stringify({ amount: paygNum }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } catch { alert("خطأ في الاتصال"); }
    finally { setPaygLoading(false); }
  }

  const inp: React.CSSProperties = {
    background:"#0a0a0a", border:"1px solid #1a1a1a", color:"#fff",
    padding:"11px 14px", fontFamily:"Arial,sans-serif", fontSize:13,
    width:"100%", outline:"none", direction:"rtl", boxSizing:"border-box",
  };
  const clip = "polygon(0 0,100% 0,100% 68%,93% 100%,0 100%)";

  if (loading) return (
    <div style={{ background:"#000", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontFamily:"'Arial Black',Arial,sans-serif", gap:12 }}>
      <LogoImg size={24} spinning />
      <span style={{ fontSize:11, letterSpacing:".15em", textTransform:"uppercase" }}>جاري التحميل...</span>
    </div>
  );

  return (
    <div className="page-in" style={{ background:"#000", minHeight:"100vh", color:"#fff", fontFamily:"'Arial Black',Arial,sans-serif", direction:"rtl" }}>
      <div style={{ position:"fixed", inset:0, opacity:.02, pointerEvents:"none", backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize:"44px 44px" }} />

      {/* NAV */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(0,0,0,0.95)", borderBottom:"1px solid #111", padding:"14px 40px", display:"flex", alignItems:"center", gap:12, backdropFilter:"blur(12px)" }}
        onClick={() => navigate("/")}>
        <Logo spinning={spinning} />
        <div style={{ marginRight:"auto", display:"flex", gap:4 }} onClick={e=>e.stopPropagation()}>
          <TabBtn label="الرئيسية"   active={tab==="home"}     onClick={()=>setTab("home")} />
          <TabBtn label="الاشتراك"   active={tab==="billing"}  onClick={()=>setTab("billing")} />
          <TabBtn label="الأمان"     active={tab==="security"} onClick={()=>setTab("security")} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }} onClick={e=>e.stopPropagation()}>
          <div style={{ border:"1px solid #1a1a1a", padding:"5px 14px", fontSize:10, fontFamily:"Arial,sans-serif", color:"#aaa" }}>
            <span className="shiny-sm" style={{ fontWeight:900 }}>{credits}</span> كريديت
          </div>
          <button onClick={()=>setShowSignOut(true)} className="val-btn"
            style={{ background:"transparent", border:"1px solid #1a1a1a", color:"#666", padding:"6px 14px", fontFamily:"inherit", fontSize:9, letterSpacing:".1em", textTransform:"uppercase" as const, cursor:"pointer", position:"relative" as const }}>
            <span>خروج</span>
          </button>
        </div>
      </nav>

      <div style={{ padding:"32px 40px 80px", maxWidth:820, margin:"0 auto", position:"relative", zIndex:1 }}>

        {/* ── HOME ── */}
        {tab==="home" && (
          <div className="page-in">
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:9, letterSpacing:".2em", textTransform:"uppercase" as const, color:"#7c3aed", textShadow:"0 0 10px rgba(124,58,237,0.3)", marginBottom:6, fontFamily:"Arial,sans-serif" }}>لوحة التحكم</div>
              <div className="shiny" style={{ fontSize:24, fontWeight:900, textTransform:"uppercase" as const }}>أهلاً {user?.name}</div>
            </div>

            {/* Credits */}
            <div style={{ background:"#080808", border:"1px solid #111", padding:"18px 20px", marginBottom:2 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ fontSize:9, letterSpacing:".15em", textTransform:"uppercase" as const, color:"#7c3aed", fontFamily:"Arial,sans-serif" }}>رصيد الكريديت</span>
                <span className="shiny-sm" style={{ fontSize:16, fontWeight:900 }}>{credits.toLocaleString()}</span>
              </div>
              <div style={{ height:2, background:"#111" }}>
                <div style={{ height:"100%", width:`${Math.min(100, credits > 0 ? 60 : 0)}%`, background:"#fff", transition:"width .5s" }} />
              </div>
              <div style={{ fontSize:9, color:"#7c3aed", marginTop:8, fontFamily:"Arial,sans-serif" }}>1 كريديت ≈ ثانية واحدة من الفيديو الاحترافي</div>
            </div>

            {/* TWO MAIN CARDS */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2, marginTop:2 }}>
              <div className="val-card" onClick={()=>navigate("/create")}
                style={{ background:"#080808", border:"1px solid #111", overflow:"hidden" }}>
                <div style={{ height:140, background:"linear-gradient(135deg,#0a0a0a,#111)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:48 }}>🎬</span>
                </div>
                <div style={{ padding:"16px 20px 20px", borderTop:"1px solid #111" }}>
                  <div className="shiny-sm" style={{ fontSize:14, fontWeight:900, textTransform:"uppercase" as const, letterSpacing:".06em", marginBottom:6 }}>صانع الأفلام</div>
                  <div style={{ fontSize:11, color:"#8b5cf6", textShadow:"0 0 8px rgba(139,92,246,0.3)", fontFamily:"Arial,sans-serif", lineHeight:1.7, marginBottom:16 }}>
                    فيلم سينمائي أو وثائقي احترافي — Claude يخطط، Higgsfield ينفّذ
                  </div>
                  <ValBtn label="ابدأ الإنتاج ←" small onClick={()=>navigate("/create")} />
                </div>
              </div>

              <div className="val-card" onClick={()=>navigate("/market")}
                style={{ background:"#080808", border:"1px solid #111", overflow:"hidden" }}>
                <div style={{ height:140, background:"linear-gradient(135deg,#0a0a0a,#111)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:48 }}>📱</span>
                </div>
                <div style={{ padding:"16px 20px 20px", borderTop:"1px solid #111" }}>
                  <div className="shiny-sm" style={{ fontSize:14, fontWeight:900, textTransform:"uppercase" as const, letterSpacing:".06em", marginBottom:6 }}>مسوق بزنسي</div>
                  <div style={{ fontSize:11, color:"#8b5cf6", textShadow:"0 0 8px rgba(139,92,246,0.3)", fontFamily:"Arial,sans-serif", lineHeight:1.7, marginBottom:16 }}>
                    وكيل تسويق كامل — ترندات، محتوى، إعلانات، UGC بضغطة واحدة
                  </div>
                  <ValBtn label="ابدأ التسويق ←" small onClick={()=>navigate("/market")} />
                </div>
              </div>
            </div>

            {credits === 0 && (
              <div style={{ background:"#080808", border:"1px solid #1a1a1a", padding:"16px 20px", marginTop:2, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div className="shiny-sm" style={{ fontSize:12, fontWeight:900, textTransform:"uppercase" as const, marginBottom:4 }}>رصيدك صفر</div>
                  <div style={{ fontSize:11, color:"#8b5cf6", fontFamily:"Arial,sans-serif" }}>اشترك أو اشحن كريديت عشان تبدأ</div>
                </div>
                <ValBtn label="اشترك الآن ←" solid small onClick={()=>setTab("billing")} />
              </div>
            )}
          </div>
        )}

        {/* ── BILLING ── */}
        {tab==="billing" && (
          <div className="page-in">
            <STitle label="المدفوعات" title="خطط الكريديت" />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:2, marginBottom:2 }}>
              {PLANS.map(p=>(
                <div key={p.key} className="val-card"
                  style={{ background:"#080808", border:"1px solid #111", padding:"22px 18px", position:"relative" as const }}>
                  <div style={{ fontSize:12, fontWeight:900, textTransform:"uppercase" as const, letterSpacing:".05em", marginBottom:6, lineHeight:1.3 }} className="shiny-sm">{p.name}</div>
                  <div className="shiny" style={{ fontSize:30, fontWeight:900, lineHeight:1, marginBottom:2 }}>
                    ${p.price}<span style={{ fontSize:10, fontWeight:400, color:"#555", fontFamily:"Arial,sans-serif" }}>/شهر</span>
                  </div>
                  <div style={{ fontSize:10, color:"#7c3aed", fontFamily:"Arial,sans-serif", marginBottom:18 }}>{p.credits.toLocaleString()} كريديت</div>
                  <ValBtn label="اشترك" solid={p.featured} small onClick={()=>handleSubscribe(p.key)} />
                </div>
              ))}
            </div>
            {/* PAYG */}
            <div style={{ background:"#080808", border:"1px solid #111", padding:"22px 24px" }}>
              <div className="shiny-sm" style={{ fontSize:14, fontWeight:900, textTransform:"uppercase" as const, letterSpacing:".06em", marginBottom:4 }}>ادفع اللي استخدمته</div>
              <div style={{ fontSize:11, color:"#7c3aed", fontFamily:"Arial,sans-serif", marginBottom:16 }}>$0.079 لكل كريديت — الحد الأقصى $5,000</div>
              <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" as const }}>
                <div style={{ position:"relative" as const }}>
                  <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#fff", fontFamily:"'Arial Black',Arial,sans-serif", fontSize:13, fontWeight:900 }}>$</span>
                  <input type="number" min="5" max="5000" placeholder="0" value={paygAmount}
                    onChange={e=>setPaygAmount(e.target.value)} className="val-input"
                    style={{ background:"#0a0a0a", border:`1px solid ${paygNum>5000?"#ff4444":"#222"}`, color:"#fff", padding:"11px 40px 11px 12px", fontFamily:"'Arial Black',Arial,sans-serif", fontSize:16, fontWeight:900, width:140, direction:"ltr" as const, outline:"none" }} />
                </div>
                {paygCredits > 0 && <div style={{ fontSize:12, color:"#888", fontFamily:"Arial,sans-serif" }}>= <span className="shiny-sm" style={{ fontWeight:900, fontSize:16 }}>{paygCredits.toLocaleString()}</span> كريديت</div>}
                <button onClick={handlePayg} disabled={paygLoading||!paygValid} className="val-btn"
                  style={{ background:paygValid?"#fff":"#0a0a0a", border:`1px solid ${paygValid?"#fff":"#222"}`, color:paygValid?"#000":"#333", padding:"11px 24px", fontFamily:"inherit", fontSize:10, fontWeight:900, letterSpacing:".1em", textTransform:"uppercase" as const, cursor:"pointer", clipPath:clip, position:"relative" as const }}>
                  <span>{paygLoading?"...":"ادفع ←"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SECURITY ── */}
        {tab==="security" && (
          <div className="page-in">
            <STitle label="الحساب" title="الأمان" />
            <div style={{ background:"#080808", border:"1px solid #111", padding:"24px", marginBottom:2 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14, paddingBottom:20, borderBottom:"1px solid #111", marginBottom:20 }}>
                <div style={{ width:50, height:50, border:"1px solid #333", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, clipPath:"polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)", background:"#111" }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="shiny-sm" style={{ fontSize:15, fontWeight:900, textTransform:"uppercase" as const }}>{user?.name}</div>
                  <div style={{ fontSize:11, color:"#7c3aed", fontFamily:"Arial,sans-serif", marginTop:3 }}>{user?.email}</div>
                </div>
              </div>
              <div style={{ fontSize:10, fontWeight:900, textTransform:"uppercase" as const, letterSpacing:".1em", color:"#aaa", marginBottom:14 }}>تغيير كلمة السر</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
                <input className="val-input" type="password" placeholder="كلمة السر الحالية" value={curPass} onChange={e=>setCurPass(e.target.value)} style={inp} />
                <input className="val-input" type="password" placeholder="كلمة السر الجديدة (٨+ أحرف)" value={newPass} onChange={e=>setNewPass(e.target.value)} style={inp} />
                <input className="val-input" type="password" placeholder="تأكيد كلمة السر الجديدة" value={confPass} onChange={e=>setConfPass(e.target.value)} style={inp} onKeyDown={e=>e.key==="Enter"&&handleChangePassword()} />
              </div>
              {passErr && <div style={{ fontSize:11, color:"#ff5555", fontFamily:"Arial,sans-serif", marginBottom:10, padding:"8px 12px", border:"1px solid rgba(255,85,85,0.2)", background:"rgba(255,85,85,0.06)" }}>{passErr}</div>}
              {passMsg && <div style={{ fontSize:11, color:"#aaa", fontFamily:"Arial,sans-serif", marginBottom:10, padding:"8px 12px", border:"1px solid #222" }}>{passMsg}</div>}
              <ValBtn label={passLoading?"جاري...":"حفظ كلمة السر الجديدة"} solid small onClick={handleChangePassword} disabled={passLoading} />
            </div>
            <button onClick={()=>setShowSignOut(true)} className="val-btn"
              style={{ width:"100%", marginTop:2, padding:"13px", background:"transparent", border:"1px solid #1a1a1a", color:"#666", fontWeight:900, fontSize:10, letterSpacing:".12em", textTransform:"uppercase" as const, cursor:"pointer", fontFamily:"inherit", position:"relative" as const }}>
              <span>تسجيل الخروج</span>
            </button>
          </div>
        )}
      </div>

      {/* SIGN OUT MODAL */}
      {showSignOut && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
          <div className="page-in" style={{ background:"#0a0a0a", border:"1px solid #222", padding:"32px", maxWidth:380, width:"90%", position:"relative" as const }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"#ff3333" }} />
            <div style={{ fontSize:14, fontWeight:900, textTransform:"uppercase" as const, letterSpacing:".08em", marginBottom:10 }}>تسجيل الخروج؟</div>
            <div style={{ fontSize:12, color:"#777", fontFamily:"Arial,sans-serif", lineHeight:1.7, marginBottom:24 }}>هل أنت متأكد؟ ستحتاج لإعادة تسجيل الدخول للوصول لحسابك.</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowSignOut(false)} className="val-btn"
                style={{ flex:1, padding:"11px", background:"transparent", border:"1px solid #333", color:"#fff", fontFamily:"inherit", fontSize:10, fontWeight:900, letterSpacing:".1em", textTransform:"uppercase" as const, cursor:"pointer", position:"relative" as const, clipPath:"polygon(0 0,100% 0,100% 68%,93% 100%,0 100%)" }}>
                <span>إلغاء</span>
              </button>
              <button onClick={logout}
                style={{ flex:1, padding:"11px", background:"#cc0000", border:"1px solid #cc0000", color:"#fff", fontFamily:"'Arial Black',Arial,sans-serif", fontSize:10, fontWeight:900, letterSpacing:".1em", textTransform:"uppercase" as const, cursor:"pointer", clipPath:"polygon(0 0,100% 0,100% 68%,93% 100%,0 100%)" }}>
                خروج ←
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

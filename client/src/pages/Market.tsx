import { useState, useEffect, useRef } from "react";
import { LogoImg } from "@/components/Logo";

const MODES = [
  { id:"trend",    icon:"📊", name:"بحث الترندات",    desc:"Instagram / TikTok / YouTube — أحدث الترندات في مجالك" },
  { id:"campaign", icon:"🎬", name:"حملة تسويقية",    desc:"ريلز + إعلانات + UGC — كامل من برومبت واحد" },
  { id:"content",  icon:"📅", name:"خطة محتوى أسبوع", desc:"جدول نشر كامل مع نصوص وهاشتاجز" },
  { id:"ugc",      icon:"👥", name:"UGC واسع النطاق",  desc:"١٠٠+ فيديو بأسلوب مؤثرين مختلفين" },
];

const DEMO_PROMPTS: Record<string,string> = {
  trend:    "ابحث عن أحدث ترندات محتوى العطور الفاخرة على TikTok وInstagram في الخليج العربي، وحدد الأسلوب الأمثل لبراند عطر يستهدف الرجال",
  campaign: "اعمل حملة تسويقية كاملة لكافيه جديد في الرياض يقدم مشروبات باردة، ٥ ريلز بأسلوبين مختلفين مع كابشنز وهاشتاجز جاهزة للنشر",
  content:  "اعمل خطة محتوى أسبوع كامل لصفحة تعليمية عن تطوير الذات باللغة العربية، مع كابشن كل بوست وأفضل وقت نشر",
  ugc:      "أنشئ ٢٠ فيديو UGC بأسلوبات مؤثرين مختلفين لمنتج مكمل غذائي للرياضيين، تنويع في الأعمار والأساليب والجنس",
};

async function authFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string,string> = { "Content-Type":"application/json", ...(opts.headers as any) };
  return fetch(path, { ...opts, credentials:"include", headers });
}

export default function Market() {
  const [mode, setMode] = useState("campaign");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string|null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const esRef = useRef<EventSource|null>(null);

  const clip = "polygon(0 0,100% 0,100% 68%,93% 100%,0 100%)";

  useEffect(() => {
    authFetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(u => {
      if (!u) { window.location.href = "/auth"; }
    });
    return () => { esRef.current?.close(); };
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) { setError("اكتب طلبك أولاً"); return; }
    setLoading(true); setError(""); setResult(null); setProgress(5);
    setProgressMsg("Higgsfield Supercomputer يعالج طلبك...");

    try {
      const r = await authFetch("/api/pipeline/start", {
        method:"POST",
        body: JSON.stringify({ type:"marketing", mode, clientPrompt: prompt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "فشل");

      setJobId(d.jobId);
      const es = new EventSource(`/api/pipeline/job/${d.jobId}/stream`);
      esRef.current = es;

      es.onmessage = (e) => {
        const job = JSON.parse(e.data);
        setProgress(job.progress || 0);
        setProgressMsg(job.progressMsg || "");
        if (job.status === "done")  { setResult(job.result); setLoading(false); es.close(); }
        if (job.status === "failed"){ setError(job.error || "فشل"); setLoading(false); es.close(); }
      };
      es.onerror = () => { setError("انقطع الاتصال"); setLoading(false); es.close(); };
    } catch(e:any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="page-in" style={{ background:"#000", minHeight:"100vh", color:"#fff", fontFamily:"'Arial Black',Arial,sans-serif", direction:"rtl" }}>
      <div style={{ position:"fixed", inset:0, opacity:.02, pointerEvents:"none", backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize:"44px 44px" }} />

      {/* NAV */}
      <nav style={{ position:"sticky", top:0, zIndex:100, background:"rgba(0,0,0,0.95)", borderBottom:"1px solid #111", padding:"14px 40px", display:"flex", alignItems:"center", gap:12, backdropFilter:"blur(12px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>window.location.href="/dashboard"}>
          <LogoImg size={26} />
          <span className="shiny-sm" style={{ fontSize:13, fontWeight:900, letterSpacing:".1em", textTransform:"uppercase" as const }}>مُحرك التسويق</span>
        </div>
        <div style={{ marginRight:"auto", display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:16, height:2, background:"#4ade80" }} />
          <span style={{ fontSize:14, fontWeight:900, textTransform:"uppercase" as const, letterSpacing:".06em", color:"#4ade80", textShadow:"0 0 16px rgba(74,222,128,0.4)" }}>مسوق بزنسي</span>
        </div>
        <a href="/dashboard" style={{ fontSize:9, color:"#555", letterSpacing:".15em", textTransform:"uppercase" as const, textDecoration:"none", fontFamily:"Arial,sans-serif" }}>← رجوع</a>
      </nav>

      <div style={{ padding:"32px 40px 80px", maxWidth:760, margin:"0 auto", position:"relative", zIndex:1 }}>

        {/* Supercomputer badge */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28, padding:"12px 16px", background:"#080808", border:"1px solid #1a1a1a" }}>
          <div style={{ width:8, height:8, background:"#4ade80", borderRadius:"50%", boxShadow:"0 0 8px rgba(74,222,128,0.8)", flexShrink:0 }} />
          <span style={{ fontSize:10, color:"#4ade80", fontFamily:"Arial,sans-serif", letterSpacing:".1em", textTransform:"uppercase" as const }}>Higgsfield Supercomputer — متصل</span>
          <div style={{ flex:1 }} />
          <span style={{ fontSize:9, color:"#444", fontFamily:"Arial,sans-serif" }}>يبحث • يخطط • ينتج • ينشر</span>
        </div>

        {/* MODES */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:9, letterSpacing:".2em", textTransform:"uppercase" as const, color:"#7c3aed", marginBottom:10, fontFamily:"Arial,sans-serif" }}>اختر المهمة</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:2 }}>
            {MODES.map(m=>(
              <div key={m.id} className="val-card" onClick={()=>{ setMode(m.id); setPrompt(""); }}
                style={{ background:"#080808", border:`1px solid ${mode===m.id?"#fff":"#111"}`, padding:"14px 16px", position:"relative" as const }}>
                {mode===m.id && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"#4ade80" }} />}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:18 }}>{m.icon}</span>
                  <div className="shiny-sm" style={{ fontSize:11, fontWeight:900, textTransform:"uppercase" as const, letterSpacing:".04em" }}>{m.name}</div>
                </div>
                <div style={{ fontSize:10, color:"#555", fontFamily:"Arial,sans-serif", lineHeight:1.5 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PROMPT */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:9, letterSpacing:".2em", textTransform:"uppercase" as const, color:"#7c3aed", marginBottom:10, fontFamily:"Arial,sans-serif" }}>أخبر الوكيل ماذا تريد</div>
          <textarea value={prompt} onChange={e=>setPrompt(e.target.value)}
            placeholder={DEMO_PROMPTS[mode]}
            className="val-input" rows={5}
            style={{ width:"100%", background:"#080808", border:"1px solid #1a1a1a", color:"#fff", padding:"14px 16px", fontFamily:"Arial,sans-serif", fontSize:13, resize:"vertical", outline:"none", direction:"rtl", boxSizing:"border-box" as const, lineHeight:1.7 }} />
          <button onClick={()=>setPrompt(DEMO_PROMPTS[mode])}
            style={{ marginTop:6, fontSize:9, color:"#555", background:"transparent", border:"none", cursor:"pointer", fontFamily:"Arial,sans-serif", textDecoration:"underline" }}>
            استخدم مثال
          </button>
        </div>

        {/* ERROR */}
        {error && <div style={{ background:"rgba(255,40,40,0.08)", border:"1px solid rgba(255,40,40,0.2)", padding:"12px 16px", fontSize:12, color:"#ff5555", fontFamily:"Arial,sans-serif", marginBottom:16 }}>{error}</div>}

        {/* PROGRESS */}
        {loading && (
          <div style={{ background:"#080808", border:"1px solid #111", padding:"20px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:10, color:"#4ade80", fontFamily:"Arial,sans-serif", letterSpacing:".1em" }}>{progressMsg}</span>
              <span style={{ fontSize:12, fontWeight:900, color:"#4ade80" }}>{progress}%</span>
            </div>
            <div style={{ height:2, background:"#111" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:"#4ade80", transition:"width .5s", boxShadow:"0 0 8px rgba(74,222,128,0.5)" }} />
            </div>
          </div>
        )}

        {/* RESULT */}
        {result && (
          <div style={{ background:"#080808", border:"1px solid #4ade80", padding:"20px", marginBottom:16 }}>
            <div style={{ fontSize:10, color:"#4ade80", letterSpacing:".15em", textTransform:"uppercase" as const, marginBottom:12, fontFamily:"Arial,sans-serif" }}>✓ تم التنفيذ</div>
            {result.summary && <p style={{ fontSize:13, color:"#ccc", fontFamily:"Arial,sans-serif", lineHeight:1.8, marginBottom:16 }}>{result.summary}</p>}
            {result.assets && result.assets.map((a: any, i: number) => (
              <div key={i} style={{ marginBottom:8 }}>
                {a.type === "video" && <video src={a.url} controls style={{ width:"100%", maxHeight:300, marginBottom:4 }} />}
                {a.type === "image" && <img src={a.url} alt="" style={{ width:"100%", maxHeight:300, objectFit:"cover", marginBottom:4 }} />}
                {a.caption && <p style={{ fontSize:11, color:"#666", fontFamily:"Arial,sans-serif" }}>{a.caption}</p>}
              </div>
            ))}
          </div>
        )}

        {/* GENERATE */}
        <button onClick={handleGenerate} disabled={loading} className="val-btn"
          style={{ width:"100%", padding:"16px", background:loading?"#111":"#fff", border:`1px solid ${loading?"#222":"#fff"}`, color:loading?"#444":"#000", fontFamily:"inherit", fontSize:12, fontWeight:900, letterSpacing:".1em", textTransform:"uppercase" as const, cursor:loading?"default":"pointer", clipPath:clip, position:"relative" as const }}>
          <span>{loading?"Higgsfield يعمل...":"تشغيل الوكيل ←"}</span>
        </button>
      </div>
    </div>
  );
}

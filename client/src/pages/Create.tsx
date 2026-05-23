import { useState, useEffect, useRef } from "react";
import { LogoImg } from "@/components/Logo";

const STYLES = [
  { id:"cinematic",  name:"سينمائي",      desc:"هوليوود — عمق ميدان — إضاءة درامية" },
  { id:"realistic",  name:"واقعي",        desc:"فوتوريالستيك — إضاءة طبيعية" },
  { id:"anime",      name:"أنيمي",        desc:"ألوان يابانية — حركة طلقة" },
  { id:"3d",         name:"ثلاثي أبعاد",  desc:"نماذج ثلاثية — إضاءة استوديو" },
  { id:"luxury",     name:"فاخر",         desc:"إضاءة ذهبية — أجواء برستيج" },
  { id:"commercial", name:"إعلاني",       desc:"محتوى تسويقي — سوشيال ميديا" },
];

const DURATIONS = [
  { secs:15,   label:"١٥ ث" },
  { secs:30,   label:"٣٠ ث" },
  { secs:60,   label:"دقيقة" },
  { secs:120,  label:"٢ د" },
  { secs:300,  label:"٥ د" },
];

const TYPES = [
  { id:"film",        name:"فيلم سينمائي",  desc:"قصة + مشاهد درامية + موسيقى" },
  { id:"documentary", name:"وثائقي يوتيوب", desc:"سرد + حقائق + صوت احترافي" },
];

async function authFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string,string> = { "Content-Type":"application/json", ...(opts.headers as any) };
  return fetch(path, { ...opts, credentials:"include", headers });
}

export default function Create() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [type, setType] = useState("film");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string|null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [credits, setCredits] = useState<number|null>(null);
  const esRef = useRef<EventSource|null>(null);

  const DEMO_PROMPT = type === "film"
    ? "فيلم قصير بأسلوب هوليوود الحديث، شوارع مدينة ليلية عصرية، شخص يكتشف سراً يغيّر حياته، لقطات درامية مع موسيقى تصويرية مؤثرة"
    : "وثائقي عن الحضارة المصرية القديمة، أسرار الأهرامات، سرد احترافي بأسلوب ناشيونال جيوغرافيك، تأثيرات بصرية سينمائية";

  const estimatedCredits = Math.ceil(duration * 1.5);
  const clip = "polygon(0 0,100% 0,100% 68%,93% 100%,0 100%)";

  useEffect(() => {
    authFetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(u => {
      if (!u) { window.location.href = "/auth"; return; }
    });
  }, []);

  useEffect(() => {
    return () => { esRef.current?.close(); };
  }, []);

  async function handleGenerate() {
    if (!prompt.trim()) { setError("اكتب وصف الفيديو أولاً"); return; }
    setLoading(true); setError(""); setResult(null); setProgress(5);
    setProgressMsg("جاري إرسال الطلب...");

    try {
      const r = await authFetch("/api/pipeline/start", {
        method:"POST",
        body: JSON.stringify({ type, clientPrompt: prompt, styleId: style, durationSeconds: duration }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "فشل في البدء");

      setJobId(d.jobId);
      const es = new EventSource(`/api/pipeline/job/${d.jobId}/stream`);
      esRef.current = es;

      es.onmessage = (e) => {
        const job = JSON.parse(e.data);
        setProgress(job.progress || 0);
        setProgressMsg(job.progressMsg || "");
        if (job.status === "done") {
          setResult(job.result);
          setLoading(false);
          es.close();
        }
        if (job.status === "failed") {
          setError(job.error || "فشل التوليد");
          setLoading(false);
          es.close();
        }
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
          <div style={{ width:16, height:2, background:"#fff" }} />
          <span className="shiny" style={{ fontSize:14, fontWeight:900, textTransform:"uppercase" as const, letterSpacing:".06em" }}>صانع الأفلام</span>
        </div>
        <a href="/dashboard" style={{ fontSize:9, color:"#555", letterSpacing:".15em", textTransform:"uppercase" as const, textDecoration:"none", fontFamily:"Arial,sans-serif" }}>← رجوع</a>
      </nav>

      <div style={{ padding:"32px 40px 80px", maxWidth:760, margin:"0 auto", position:"relative", zIndex:1 }}>

        {/* TYPE */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:9, letterSpacing:".2em", textTransform:"uppercase" as const, color:"#7c3aed", marginBottom:10, fontFamily:"Arial,sans-serif" }}>نوع المحتوى</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:2 }}>
            {TYPES.map(t=>(
              <div key={t.id} className="val-card" onClick={()=>setType(t.id)}
                style={{ background:"#080808", border:`1px solid ${type===t.id?"#fff":"#111"}`, padding:"16px 18px", position:"relative" as const }}>
                {type===t.id && <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"#fff" }} />}
                <div className="shiny-sm" style={{ fontSize:12, fontWeight:900, textTransform:"uppercase" as const, marginBottom:4 }}>{t.name}</div>
                <div style={{ fontSize:10, color:"#666", fontFamily:"Arial,sans-serif" }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PROMPT */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:9, letterSpacing:".2em", textTransform:"uppercase" as const, color:"#7c3aed", marginBottom:10, fontFamily:"Arial,sans-serif" }}>صف فيديوك</div>
          <textarea
            value={prompt}
            onChange={e=>setPrompt(e.target.value)}
            placeholder={DEMO_PROMPT}
            className="val-input"
            rows={4}
            style={{ width:"100%", background:"#080808", border:"1px solid #1a1a1a", color:"#fff", padding:"14px 16px", fontFamily:"Arial,sans-serif", fontSize:13, resize:"vertical", outline:"none", direction:"rtl", boxSizing:"border-box" as const, lineHeight:1.7 }}
          />
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:8 }}>
            <span style={{ fontSize:10, color:"#444", fontFamily:"Arial,sans-serif" }}>كن تفصيلياً — الشخصيات، المشاعر، الأماكن</span>
            <button onClick={()=>setPrompt(DEMO_PROMPT)}
              style={{ fontSize:9, color:"#555", background:"transparent", border:"none", cursor:"pointer", fontFamily:"Arial,sans-serif", textDecoration:"underline" }}>
              استخدم مثال
            </button>
          </div>
        </div>

        {/* STYLE */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:9, letterSpacing:".2em", textTransform:"uppercase" as const, color:"#7c3aed", marginBottom:10, fontFamily:"Arial,sans-serif" }}>الأسلوب البصري</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
            {STYLES.map(s=>(
              <div key={s.id} className="val-card" onClick={()=>setStyle(s.id)}
                style={{ background:"#080808", border:`1px solid ${style===s.id?"#fff":"#111"}`, padding:"12px 14px" }}>
                <div className="shiny-sm" style={{ fontSize:10, fontWeight:900, textTransform:"uppercase" as const, marginBottom:2 }}>{s.name}</div>
                <div style={{ fontSize:9, color:"#555", fontFamily:"Arial,sans-serif" }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DURATION */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:9, letterSpacing:".2em", textTransform:"uppercase" as const, color:"#7c3aed", marginBottom:10, fontFamily:"Arial,sans-serif" }}>المدة</div>
          <div style={{ display:"flex", gap:2 }}>
            {DURATIONS.map(d=>(
              <button key={d.secs} onClick={()=>setDuration(d.secs)} className="val-btn"
                style={{ flex:1, padding:"10px 4px", background:duration===d.secs?"#fff":"transparent", border:`1px solid ${duration===d.secs?"#fff":"#222"}`, color:duration===d.secs?"#000":"#666", fontFamily:"inherit", fontSize:10, fontWeight:900, cursor:"pointer", position:"relative" as const }}>
                <span>{d.label}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop:8, fontSize:9, color:"#444", fontFamily:"Arial,sans-serif" }}>
            التكلفة المتوقعة: <span className="shiny-sm" style={{ fontWeight:900 }}>{estimatedCredits}</span> كريديت
          </div>
        </div>

        {/* ERROR */}
        {error && <div style={{ background:"rgba(255,40,40,0.08)", border:"1px solid rgba(255,40,40,0.2)", padding:"12px 16px", fontSize:12, color:"#ff5555", fontFamily:"Arial,sans-serif", marginBottom:16 }}>{error}</div>}

        {/* PROGRESS */}
        {loading && (
          <div style={{ background:"#080808", border:"1px solid #111", padding:"20px", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:10, color:"#7c3aed", fontFamily:"Arial,sans-serif", letterSpacing:".1em" }}>{progressMsg}</span>
              <span className="shiny-sm" style={{ fontSize:12, fontWeight:900 }}>{progress}%</span>
            </div>
            <div style={{ height:2, background:"#111" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:"#fff", transition:"width .5s" }} />
            </div>
          </div>
        )}

        {/* RESULT */}
        {result?.videoUrl && (
          <div style={{ background:"#080808", border:"1px solid #fff", padding:"20px", marginBottom:16 }}>
            <div style={{ fontSize:10, letterSpacing:".15em", textTransform:"uppercase" as const, color:"#7c3aed", marginBottom:12, fontFamily:"Arial,sans-serif" }}>✓ تم التوليد</div>
            <video src={result.videoUrl} controls style={{ width:"100%", maxHeight:400 }} />
            <div style={{ marginTop:12 }}>
              <a href={result.videoUrl} download style={{ fontSize:10, color:"#fff", textDecoration:"none", border:"1px solid #333", padding:"8px 16px", display:"inline-block" }}>
                تحميل الفيديو ↓
              </a>
            </div>
          </div>
        )}

        {/* GENERATE BTN */}
        <button onClick={handleGenerate} disabled={loading} className="val-btn"
          style={{ width:"100%", padding:"16px", background:loading?"#111":"#fff", border:`1px solid ${loading?"#222":"#fff"}`, color:loading?"#444":"#000", fontFamily:"inherit", fontSize:12, fontWeight:900, letterSpacing:".1em", textTransform:"uppercase" as const, cursor:loading?"default":"pointer", clipPath:clip, position:"relative" as const }}>
          <span>{loading?"جاري التوليد...":"توليد الفيديو ←"}</span>
        </button>
      </div>
    </div>
  );
}

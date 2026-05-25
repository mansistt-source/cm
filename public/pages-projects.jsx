// Connected Project Library + Detail + Settings pages.

function projToken() { return localStorage.getItem("cm_token") || ""; }
function projCurrentUser() { try { return JSON.parse(localStorage.getItem("cm_user") || "null") || { name:"Operator", email:"" }; } catch { return { name:"Operator", email:"" }; } }
async function projApi(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { "Content-Type":"application/json", ...(opts.headers || {}), ...(projToken() ? { Authorization:`Bearer ${projToken()}` } : {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || "API request failed");
  return data;
}
function projLogout(navigate) { fetch("/api/auth/logout", { method:"POST", headers: projToken() ? { Authorization:`Bearer ${projToken()}` } : {} }).catch(()=>{}); localStorage.removeItem("cm_token"); localStorage.removeItem("cm_user"); window.dispatchEvent(new Event("cm-auth-changed")); history.replaceState(null, "", "#/auth"); navigate("auth"); }
function projStatusLabel(s) { return ({ draft:"DRAFT", pending_payment:"PAYMENT", paid:"PAID", in_production:"PRODUCTION", delivered:"DELIVERED", cancelled:"CANCELLED", failed:"FAILED" })[s] || String(s || "").toUpperCase(); }
function projStatusColor(p, s) { return ({ draft:p.dim, pending_payment:p.warn, paid:p.accent2, in_production:p.accent, delivered:p.accent2, cancelled:p.warn, failed:p.warn })[s] || p.dim; }
function projServiceLabel(s) { return ({ film_maker:"صانع الأفلام", marketing_agent:"وكيل التسويق", service_agent:"وكيل الخدمة", youtube_documentary:"وثائقي يوتيوب", ugc_avatar:"أفاتار UGC" })[s] || s || "مشروع"; }
function packageName(k) { return ({ starter:"Starter", growth:"Growth", pro:"Pro", agency:"Agency" })[k] || "غير محدد"; }
function fileToBase64(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result || "").split(",")[1] || ""); r.onerror = reject; r.readAsDataURL(file); }); }
async function authDownload(url, fileName) {
  const res = await fetch(url, { headers: projToken() ? { Authorization:`Bearer ${projToken()}` } : {} });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href; a.download = fileName || "download"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(href);
}

function LibraryPage({ p, navigate, credits = 0 }) {
  const [user, setUser] = React.useState(projCurrentUser());
  const [projects, setProjects] = React.useState([]);
  const [packages, setPackages] = React.useState([]);
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [showNew, setShowNew] = React.useState(false);

  async function load() {
    if (!projToken()) { navigate("auth"); return; }
    setLoading(true); setErr("");
    try {
      const me = await projApi("/api/auth/me");
      if (me.user) { setUser(me.user); localStorage.setItem("cm_user", JSON.stringify(me.user)); }
      const [list, packs] = await Promise.all([projApi("/api/projects"), fetch("/api/packages").then(r => r.json())]);
      setProjects(list.projects || []);
      setPackages(packs.packages || []);
    } catch (e) { setErr(e.message || "فشل تحميل المشاريع"); }
    finally { setLoading(false); }
  }
  React.useEffect(() => { load(); }, []);

  let filtered = projects;
  if (filter !== "all") filtered = filtered.filter(j => {
    if (filter === "active") return ["pending_payment", "paid", "in_production"].includes(j.status);
    if (filter === "done") return j.status === "delivered";
    if (filter === "draft") return j.status === "draft";
    return true;
  });
  if (search) filtered = filtered.filter(j => String(j.title || "").toLowerCase().includes(search.toLowerCase()));

  function openProject(id) { localStorage.setItem("cm_last_project_id", id); navigate("project-detail", { id }); }

  return <PageFrame p={p} density={0.35}>
    <AuthedNav p={p} current="library" navigate={navigate} credits={credits} user={user} onLogout={() => projLogout(navigate)} />
    <div style={{ padding:"32px", maxWidth:1400, margin:"0 auto" }}>
      <SectionHead p={p} code="// PROJECT_ARCHIVE" title="مكتبة المشاريع" sub={`${projects.length} مشروع · ${projects.filter(j => j.status === "delivered").length} مكتمل`} right={<CrunchBtn p={p} label="مشروع جديد" solid icon="+" onClick={() => setShowNew(true)} />} />
      {err && <div style={{ marginBottom:14 }}><Toast p={p} type="error">{err}</Toast></div>}
      <div style={{ display:"flex", justifyContent:"space-between", gap:16, marginBottom:18, flexWrap:"wrap" }}>
        <div style={{ display:"flex", gap:4 }}>
          {[{id:"all", l:`الكل (${projects.length})`}, {id:"active", l:"نشط"}, {id:"done", l:"مكتمل"}, {id:"draft", l:"مسودة"}].map(f => {
            const on = filter === f.id;
            return <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding:"8px 14px", background:on?p.accent:"transparent", color:on?p.bg0:p.dim, border:`1px solid ${on?p.accent:p.border}`, fontFamily:"'Bebas Neue', sans-serif", fontSize:12, letterSpacing:".15em", cursor:"pointer" }}>{f.l}</button>;
          })}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." style={{ padding:"8px 14px", background:p.bg1, border:`1px solid ${p.border}`, color:p.fg, fontFamily:"'Inter', sans-serif", fontSize:13, outline:"none", direction:"rtl", width:260 }} />
      </div>

      {loading ? <Panel p={p} padding={44} style={{ textAlign:"center" }}><AuroraLoader p={p} size={80} /><div style={{ marginTop:12, color:p.dim, fontFamily:"'Space Mono', monospace", letterSpacing:".18em", fontSize:10 }}>LOADING_PROJECTS</div></Panel> : null}
      {!loading && !filtered.length ? <Panel p={p} padding={48} style={{ textAlign:"center" }}><Reticle p={p} size={80} color={p.dim} /><div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:p.fg, letterSpacing:".05em", marginTop:16 }}>لا توجد مشاريع</div><div style={{ fontFamily:"'Inter', sans-serif", fontSize:13, color:p.dim, marginTop:6 }}>ابدأ بإنشاء مشروع جديد</div><div style={{ marginTop:18 }}><CrunchBtn p={p} label="مشروع جديد" solid icon="+" onClick={() => setShowNew(true)} /></div></Panel> : null}
      {!loading && !!filtered.length && <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:14 }}>{filtered.map(j => <ProjectCardConnected key={j.id} p={p} project={j} onOpen={() => openProject(j.id)} />)}</div>}
    </div>
    {showNew && <NewProjectModalConnected p={p} packages={packages} onClose={() => setShowNew(false)} onCreated={(project) => { setShowNew(false); openProject(project.id); }} />}
  </PageFrame>;
}

function ProjectCardConnected({ p, project, onOpen }) {
  const [hover, setHover] = React.useState(false);
  return <div onClick={onOpen} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ position:"relative", padding:18, background:p.bg1, border:`1px solid ${hover?p.accent:p.border}`, cursor:"pointer", transition:"all .15s", clipPath:"polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)", transform:hover?"translateY(-3px)":"translateY(0)" }}>
    <div style={{ position:"absolute", top:0, left:0, width:hover?60:24, height:2, background:p.accent, transition:"width .25s" }} />
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}><Tag p={p} color={projStatusColor(p, project.status)}>{projStatusLabel(project.status)}</Tag><div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:p.dim, letterSpacing:".18em" }}>JOB//{project.id.slice(-6).toUpperCase()}</div></div>
    <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:p.fg, letterSpacing:".06em", lineHeight:1.2, minHeight:56 }}>{project.title}</div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:14, paddingTop:12, borderTop:`1px dashed ${p.border}` }}>
      <MiniConnected p={p} l="SERVICE" v={projServiceLabel(project.serviceType)} mono />
      <MiniConnected p={p} l="PACKAGE" v={project.packageKey ? packageName(project.packageKey) : "غير محدد"} />
      <MiniConnected p={p} l="PRICE" v={Number(project.priceUsd || 0) ? `$${project.priceUsd}` : "بعد الاختيار"} accent />
      <MiniConnected p={p} l="PAYMENT" v={String(project.paymentStatus || "").toUpperCase()} mono />
    </div>
    <div style={{ marginTop:14 }}><CrunchBtn p={p} label="فتح ←" solid small /></div>
  </div>;
}
function MiniConnected({ p, l, v, accent, mono }) { return <div><div style={{ fontFamily:"'Space Mono', monospace", fontSize:8, color:p.dim, letterSpacing:".22em" }}>{l}</div><div style={{ fontFamily:mono?"'Space Mono', monospace":"'Bebas Neue', sans-serif", fontSize:mono?10:18, color:accent?p.accent:p.fg, letterSpacing:".04em", marginTop:2 }}>{v}</div></div>; }

function NewProjectModalConnected({ p, packages, onClose, onCreated }) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  async function create() {
    setErr("");
    if (!title.trim()) { setErr("اكتب اسم المشروع"); return; }
    setLoading(true);
    try {
      const data = await projApi("/api/projects", {
        method:"POST",
        body: JSON.stringify({
          title: title.trim(),
          brief: description.trim(),
          serviceType: "service_agent"
        })
      });
      onCreated(data.project);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  return <Modal p={p} onClose={onClose} title="مشروع جديد" code="// NEW_PROJECT">
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <TacticalInput p={p} label="اسم المشروع" value={title} onChange={setTitle} placeholder="مثال: حملة إطلاق العطر" />
      <TacticalTextarea p={p} label="وصف مختصر" value={description} onChange={setDescription} rows={4} placeholder="اكتب وصف بسيط فقط. نوع الخدمة، الباقة، الستايل، والمدة ستُضبط من داخل صفحة المشروع." />
      {err && <Toast p={p} type="error">{err}</Toast>}
      <div style={{ display:"flex", gap:10, marginTop:6 }}><CrunchBtn p={p} label="إلغاء" full onClick={onClose} /><CrunchBtn p={p} label={loading?"جاري الإنشاء...":"إنشاء وفتح"} solid icon="▶" full onClick={create} disabled={loading} /></div>
    </div>
  </Modal>;
}
function FormSelect({ p, label, value, onChange, options }) { return <div><label style={{ display:"block", fontFamily:"'Space Mono', monospace", fontSize:10, color:p.accent, letterSpacing:".22em", marginBottom:6, textTransform:"uppercase" }}>▸ {label}</label><select value={value} onChange={(e)=>onChange(e.target.value)} style={{ width:"100%", background:p.bg0, border:`1px solid ${p.border}`, borderRight:`2px solid ${p.accent}`, color:p.fg, padding:"12px 14px", fontFamily:"'Inter', sans-serif", fontSize:14, outline:"none", direction:"rtl" }}>{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>; }

function ProjectDetailPage({ p, navigate, projectId }) {
  const effectiveId = projectId && projectId !== 1 ? projectId : localStorage.getItem("cm_last_project_id");
  const [user] = React.useState(projCurrentUser());
  const [project, setProject] = React.useState(null);
  const [files, setFiles] = React.useState([]);
  const [deliverables, setDeliverables] = React.useState([]);
  const [paymentInfo, setPaymentInfo] = React.useState("");
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  async function load() {
    if (!effectiveId) { setErr("لم يتم اختيار مشروع"); setLoading(false); return; }
    setLoading(true); setErr("");
    try {
      const d = await projApi(`/api/projects/${effectiveId}`);
      setProject(d.project);
      const [f, del] = await Promise.all([projApi(`/api/projects/${effectiveId}/files`), projApi(`/api/projects/${effectiveId}/deliverables`)]);
      setFiles(f.files || []); setDeliverables(del.deliverables || []);
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  React.useEffect(() => { load(); }, [effectiveId]);
  async function checkout() { try { if (!project.packageKey || !Number(project.priceUsd || 0)) { setErr("اختار الباقة من إعدادات المشروع قبل الدفع"); return; } const d = await projApi(`/api/projects/${project.id}/checkout`, { method:"POST" }); setProject(d.project); setPaymentInfo(d.paymentInstructions || "تم إنشاء عملية دفع"); } catch(e) { setErr(e.message); } }
  if (!effectiveId) return <PageFrame p={p}><AuthedNav p={p} current="project-detail" navigate={navigate} user={user} onLogout={() => projLogout(navigate)} /><div style={{ padding:32 }}><Toast p={p} type="error">لا يوجد مشروع محدد</Toast></div></PageFrame>;
  return <PageFrame p={p} density={0.35}>
    <AuthedNav p={p} current="project-detail" navigate={navigate} user={user} onLogout={() => projLogout(navigate)} />
    <div style={{ padding:"32px", maxWidth:1200, margin:"0 auto" }}>
      <SectionHead p={p} code="// PROJECT_DETAIL" title={project ? project.title : "تفاصيل المشروع"} sub={project ? `${projServiceLabel(project.serviceType)} · ${project.packageKey ? packageName(project.packageKey) : "بدون باقة"}${Number(project.priceUsd || 0) ? ` · $${project.priceUsd}` : ""}` : "تحميل..."} right={<div style={{ display:"flex", gap:8 }}><CrunchBtn p={p} label="رجوع للمشاريع" onClick={() => navigate("library")} />{project && <CrunchBtn p={p} label="حذف المشروع" danger onClick={async()=>{ if(!window.confirm(`حذف المشروع: ${project.title}؟`)) return; await projApi(`/api/projects/${project.id}`, { method:"DELETE" }); navigate("library"); }} />}</div>} />
      {err && <div style={{ marginBottom:14 }}><Toast p={p} type="error">{err}</Toast></div>}
      {loading ? <Panel p={p} padding={40} style={{ textAlign:"center" }}><AuroraLoader p={p} size={80} /></Panel> : null}
      {project && !loading && <>
        <div style={{ display:"grid", gridTemplateColumns:"1.1fr .9fr", gap:18, marginBottom:18 }}>
          <Panel p={p} padding={22}>
            <Tag p={p} color={projStatusColor(p, project.status)}>{projStatusLabel(project.status)}</Tag>
            <div style={{ marginTop:14, fontFamily:"'Inter', sans-serif", fontSize:14, color:p.fg, lineHeight:1.8, whiteSpace:"pre-wrap" }}>{project.brief || "لا يوجد brief بعد."}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginTop:18 }}>
              <MiniConnected p={p} l="PAYMENT" v={String(project.paymentStatus).toUpperCase()} accent={project.paymentStatus === "paid"} />
              <MiniConnected p={p} l="PACKAGE" v={project.packageKey ? packageName(project.packageKey) : "غير محدد"} mono />
              <MiniConnected p={p} l="PRICE" v={Number(project.priceUsd || 0) ? `$${project.priceUsd}` : "بعد الاختيار"} />
            </div>
          </Panel>
          <Panel p={p} padding={22}>
            <Tag p={p}>PAYMENT</Tag>
            <div style={{ marginTop:14, color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13, lineHeight:1.8 }}>
              {project.paymentStatus === "paid" ? "تم تأكيد الدفع. الطلب جاهز للإنتاج." : project.packageKey ? "اضغط Checkout لإنشاء تعليمات الدفع. بعد الدفع، الأدمن يؤكد الطلب." : "اختار الباقة من إعدادات المشروع أولًا."}
            </div>
            <div style={{ marginTop:16 }}><CrunchBtn p={p} label={project.paymentStatus === "paid" ? "مدفوع" : "Checkout"} solid={project.paymentStatus !== "paid" && !!project.packageKey} disabled={project.paymentStatus === "paid" || !project.packageKey} full onClick={checkout} /></div>
            {paymentInfo && <div style={{ marginTop:12 }}><Toast p={p}>{paymentInfo}</Toast></div>}
          </Panel>
        </div>
        <ProjectConfigPanel p={p} project={project} packages={[]} onSaved={(next) => setProject(next)} />
        <ProjectUploadPanel p={p} projectId={project.id} onUploaded={load} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginTop:18 }}>
          <FileListPanel p={p} title="ملفات العميل" items={files} empty="لا توجد ملفات مرفوعة" />
          <FileListPanel p={p} title="التسليمات النهائية" items={deliverables} empty="لا توجد تسليمات بعد" />
        </div>
      </>}
    </div>
  </PageFrame>;
}

function ProjectConfigPanel({ p, project, packages, onSaved }) {
  const [title, setTitle] = React.useState(project.title || "");
  const [serviceType, setServiceType] = React.useState(project.serviceType || "service_agent");
  const [packageKey, setPackageKey] = React.useState(project.packageKey || "");
  const [style, setStyle] = React.useState(project.style || "");
  const [durationSeconds, setDurationSeconds] = React.useState(project.durationSeconds || "");
  const [brief, setBrief] = React.useState(project.brief || "");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [msg, setMsg] = React.useState("");
  async function save() {
    setErr(""); setMsg(""); setLoading(true);
    try {
      const d = await projApi(`/api/projects/${project.id}`, {
        method:"PATCH",
        body: JSON.stringify({ title, serviceType, packageKey, style, durationSeconds:Number(durationSeconds || 0), brief })
      });
      onSaved?.(d.project);
      setMsg("تم حفظ إعدادات المشروع");
    } catch(e) { setErr(e.message || "فشل حفظ الإعدادات"); }
    finally { setLoading(false); }
  }
  const pack = ({ starter:150, growth:300, pro:800, agency:1500 })[packageKey];
  return <Panel p={p} padding={22} style={{ marginBottom:18 }}>
    <Tag p={p}>PROJECT_CONFIGURATION</Tag>
    <div style={{ marginTop:12, color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13, lineHeight:1.7 }}>هنا يتم ضبط نوع الخدمة، الباقة، الستايل، والمدة بعد إنشاء المشروع. نافذة الإنشاء تبقى فقط للاسم والوصف.</div>
    <div style={{ marginTop:14 }}><TacticalInput p={p} label="اسم المشروع" value={title} onChange={setTitle} placeholder="اسم المشروع" /></div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:14 }}>
      <FormSelect p={p} label="نوع الخدمة" value={serviceType} onChange={setServiceType} options={[ ["service_agent","وكيل الخدمة"], ["film_maker","صانع الأفلام"], ["marketing_agent","وكيل التسويق"], ["youtube_documentary","وثائقي يوتيوب"], ["ugc_avatar","أفاتار UGC"] ]} />
      <FormSelect p={p} label="الباقة" value={packageKey} onChange={setPackageKey} options={[ ["","اختر الباقة لاحقًا"], ["starter","Starter · $150"], ["growth","Growth · $300"], ["pro","Pro · $800"], ["agency","Agency · $1500"] ]} />
      <TacticalInput p={p} label="الستايل" value={style} onChange={setStyle} placeholder="cinematic / realistic / luxury" rtl={false} />
      <TacticalInput p={p} label="المدة بالثواني" value={String(durationSeconds)} onChange={setDurationSeconds} type="number" rtl={false} />
    </div>
    <div style={{ marginTop:12 }}><TacticalTextarea p={p} label="Brief / وصف التشغيل" value={brief} onChange={setBrief} rows={4} placeholder="اكتب تفاصيل التشغيل هنا بعد فتح المشروع" /></div>
    {packageKey && <div style={{ marginTop:10 }}><Toast p={p}>الباقة المختارة: {packageName(packageKey)} · ${pack}</Toast></div>}
    {err && <div style={{ marginTop:10 }}><Toast p={p} type="error">{err}</Toast></div>}
    {msg && <div style={{ marginTop:10 }}><Toast p={p} type="success">{msg}</Toast></div>}
    <div style={{ marginTop:14 }}><CrunchBtn p={p} label={loading ? "جاري الحفظ..." : "حفظ إعدادات المشروع"} solid onClick={save} disabled={loading} /></div>
  </Panel>;
}

function ProjectUploadPanel({ p, projectId, onUploaded }) {
  const [file, setFile] = React.useState(null);
  const [kind, setKind] = React.useState("reference");
  const [err, setErr] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  async function upload() {
    setErr(""); setMsg("");
    if (!file) { setErr("اختار ملف الأول"); return; }
    setLoading(true);
    try {
      const dataBase64 = await fileToBase64(file);
      await projApi(`/api/projects/${projectId}/files`, { method:"POST", body:JSON.stringify({ fileName:file.name, mimeType:file.type || "application/octet-stream", kind, dataBase64 }) });
      setFile(null); setMsg("تم رفع الملف"); onUploaded?.();
    } catch(e) { setErr(e.message); }
    finally { setLoading(false); }
  }
  return <Panel p={p} padding={22}>
    <Tag p={p}>UPLOADS</Tag>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 180px auto", gap:10, alignItems:"end", marginTop:14 }}>
      <div><label style={{ display:"block", fontFamily:"'Space Mono', monospace", fontSize:10, color:p.accent, letterSpacing:".22em", marginBottom:6 }}>▸ FILE</label><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ width:"100%", color:p.dim, background:p.bg0, border:`1px solid ${p.border}`, padding:10 }} /></div>
      <FormSelect p={p} label="النوع" value={kind} onChange={setKind} options={[["reference","Reference"],["character","Character"],["product","Product"],["brief","Brief"],["other","Other"]]} />
      <CrunchBtn p={p} label={loading?"رفع...":"رفع"} solid onClick={upload} disabled={loading} />
    </div>
    <div style={{ marginTop:10 }}>{err && <Toast p={p} type="error">{err}</Toast>}{msg && <Toast p={p} type="success">{msg}</Toast>}</div>
  </Panel>;
}

function FileListPanel({ p, title, items, empty }) {
  return <Panel p={p} padding={20}><div style={{ fontFamily:"'Space Mono', monospace", fontSize:10, color:p.accent, letterSpacing:".22em", marginBottom:12 }}>// {title}</div>
    {!items.length ? <div style={{ color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13 }}>{empty}</div> : items.map(item => <div key={item.id} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, padding:"10px 0", borderBottom:`1px dashed ${p.border}` }}>
      <div><div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, color:p.fg, letterSpacing:".05em" }}>{item.title || item.fileName}</div><div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:p.dim, letterSpacing:".12em" }}>{item.kind || item.type || item.mimeType}</div></div>
      <CrunchBtn p={p} label="تحميل" small onClick={() => authDownload(item.downloadUrl, item.fileName || item.title)} />
    </div>)}
  </Panel>;
}


function SettingsPage({ p, navigate, credits = 0 }) {
  const [user, setUser] = React.useState(projCurrentUser());
  const [msg, setMsg] = React.useState("");
  const [err, setErr] = React.useState("");
  const [sessions, setSessions] = React.useState([]);
  const [showSecrets, setShowSecrets] = React.useState({ current:false, next:false, confirm:false, disable:false });
  const [pw, setPw] = React.useState({ currentPassword:"", newPassword:"", confirmPassword:"" });
  const [twofa, setTwofa] = React.useState({ secret:"", otpauthUrl:"", code:"", disablePassword:"", disableCode:"" });

  async function loadSecurity() {
    if (!projToken()) { navigate("auth"); return; }
    setErr("");
    try {
      const me = await projApi("/api/auth/me");
      if (me.user) { setUser(me.user); localStorage.setItem("cm_user", JSON.stringify(me.user)); }
      const s = await projApi("/api/security/sessions");
      setSessions(s.sessions || []);
    } catch (e) {
      setErr(e.message || "فشل تحميل إعدادات الأمان");
    }
  }
  React.useEffect(() => { loadSecurity(); }, []);

  function confirmLogout() {
    if (window.confirm("هل أنت متأكد من تسجيل الخروج؟")) projLogout(navigate);
  }

  async function changePassword() {
    setErr(""); setMsg("");
    if (!pw.newPassword || pw.newPassword !== pw.confirmPassword) { setErr("كلمة المرور الجديدة غير متطابقة"); return; }
    try {
      const d = await projApi("/api/security/change-password", { method:"POST", body:JSON.stringify(pw) });
      if (d.token) localStorage.setItem("cm_token", d.token);
      if (d.user) { localStorage.setItem("cm_user", JSON.stringify(d.user)); setUser(d.user); }
      setPw({ currentPassword:"", newPassword:"", confirmPassword:"" });
      setMsg("تم تغيير كلمة المرور وتحديث الجلسة الحالية");
      await loadSecurity();
    } catch (e) { setErr(e.message || "فشل تغيير كلمة المرور"); }
  }

  async function setup2fa() {
    setErr(""); setMsg("");
    try {
      const d = await projApi("/api/security/2fa/setup", { method:"POST" });
      setTwofa({ ...twofa, secret:d.secret || "", otpauthUrl:d.otpauthUrl || "" });
      setMsg("امسح الرابط أو انسخ السر في تطبيق المصادقة ثم اكتب الكود للتفعيل");
    } catch(e) { setErr(e.message || "فشل تجهيز المصادقة"); }
  }

  async function enable2fa() {
    setErr(""); setMsg("");
    try {
      const d = await projApi("/api/security/2fa/enable", { method:"POST", body:JSON.stringify({ code:twofa.code }) });
      if (d.user) { setUser(d.user); localStorage.setItem("cm_user", JSON.stringify(d.user)); }
      setTwofa({ secret:"", otpauthUrl:"", code:"", disablePassword:"", disableCode:"" });
      setMsg("تم تفعيل المصادقة الثنائية");
    } catch(e) { setErr(e.message || "فشل تفعيل المصادقة"); }
  }

  async function disable2fa() {
    setErr(""); setMsg("");
    try {
      const d = await projApi("/api/security/2fa/disable", { method:"POST", body:JSON.stringify({ password:twofa.disablePassword, code:twofa.disableCode }) });
      if (d.user) { setUser(d.user); localStorage.setItem("cm_user", JSON.stringify(d.user)); }
      setTwofa({ secret:"", otpauthUrl:"", code:"", disablePassword:"", disableCode:"" });
      setMsg("تم إلغاء المصادقة الثنائية");
    } catch(e) { setErr(e.message || "فشل إلغاء المصادقة"); }
  }

  async function revokeSession(session) {
    if (!window.confirm(`إنهاء جلسة ${session.deviceName}؟`)) return;
    setErr(""); setMsg("");
    try {
      const d = await projApi(`/api/security/sessions/${session.id}/revoke`, { method:"POST" });
      if (d.currentRevoked) { projLogout(navigate); return; }
      setMsg("تم إنهاء الجلسة");
      await loadSecurity();
    } catch(e) { setErr(e.message || "فشل إنهاء الجلسة"); }
  }

  async function logoutAll() {
    if (!window.confirm("إنهاء كل الجلسات على كل الأجهزة؟ سيتم تسجيل خروجك أيضاً.")) return;
    setErr(""); setMsg("");
    try { await projApi("/api/security/logout-all", { method:"POST" }); projLogout(navigate); }
    catch(e) { setErr(e.message || "فشل إنهاء الجلسات"); }
  }

  return <PageFrame p={p} density={0.35}>
    <AuthedNav p={p} current="settings" navigate={navigate} credits={credits} user={user} onLogout={confirmLogout} />
    <div style={{ padding:"32px", maxWidth:980, margin:"0 auto" }}>
      <SectionHead p={p} code="// ACCOUNT_SECURITY" title="الإعدادات والأمان" sub="الحساب، كلمة المرور، المصادقة، والجلسات النشطة" />
      {err && <div style={{ marginBottom:12 }}><Toast p={p} type="error">{err}</Toast></div>}
      {msg && <div style={{ marginBottom:12 }}><Toast p={p} type="success">{msg}</Toast></div>}

      <Panel p={p} padding={24} style={{ marginBottom:16 }}>
        <Tag p={p}>ACCOUNT</Tag>
        <div style={{ marginTop:14, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <MiniConnected p={p} l="NAME" v={user.name || "غير محدد"} />
          <MiniConnected p={p} l="EMAIL" v={user.email || ""} mono />
          <MiniConnected p={p} l="ROLE" v={user.role || "user"} accent />
        </div>
        <div style={{ marginTop:18 }}><CrunchBtn p={p} label="تسجيل خروج" danger icon="!" onClick={confirmLogout} /></div>
      </Panel>

      <Panel p={p} padding={24} style={{ marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center" }}>
          <Tag p={p}>TWO_FACTOR_AUTH</Tag>
          <Tag p={p} color={user.twoFactorEnabled ? p.accent2 : p.warn}>{user.twoFactorEnabled ? "مفعلة · ACTIVATED" : "غير مفعلة"}</Tag>
        </div>
        <div style={{ marginTop:14, color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13, lineHeight:1.8 }}>فعّل المصادقة بتطبيق Authenticator. النظام لا يخزن كودك، فقط السر المشفر داخليًا للتحقق.</div>
        {!user.twoFactorEnabled && <div style={{ marginTop:14 }}>
          <CrunchBtn p={p} label="تجهيز المصادقة" solid onClick={setup2fa} />
          {twofa.secret && <div style={{ marginTop:14, display:"grid", gap:10 }}>
            <div style={{ direction:"ltr", textAlign:"left", color:p.fg, background:p.bg0, border:`1px solid ${p.border}`, padding:12, fontFamily:"'Space Mono', monospace", fontSize:11, wordBreak:"break-all" }}>{twofa.otpauthUrl}</div>
            <div style={{ direction:"ltr", textAlign:"left", color:p.accent2, fontFamily:"'Space Mono', monospace", fontSize:12 }}>SECRET: {twofa.secret}</div>
            <TacticalInput p={p} label="كود المصادقة" value={twofa.code} onChange={(v)=>setTwofa({...twofa, code:v})} placeholder="123456" rtl={false} />
            <CrunchBtn p={p} label="تفعيل المصادقة" solid onClick={enable2fa} />
          </div>}
        </div>}
        {user.twoFactorEnabled && <div style={{ marginTop:14, display:"grid", gap:10 }}>
          <PasswordField p={p} label="كلمة المرور للتأكيد" value={twofa.disablePassword} onChange={(v)=>setTwofa({...twofa, disablePassword:v})} show={showSecrets.disable} onToggle={()=>setShowSecrets({...showSecrets, disable:!showSecrets.disable})} />
          <TacticalInput p={p} label="كود المصادقة" value={twofa.disableCode} onChange={(v)=>setTwofa({...twofa, disableCode:v})} placeholder="123456" rtl={false} />
          <CrunchBtn p={p} label="إلغاء المصادقة" danger onClick={disable2fa} />
        </div>}
      </Panel>

      <Panel p={p} padding={24} style={{ marginBottom:16 }}>
        <Tag p={p}>CHANGE_PASSWORD</Tag>
        <div style={{ marginTop:14, display:"grid", gap:12 }}>
          <PasswordField p={p} label="كلمة المرور الحالية" value={pw.currentPassword} onChange={(v)=>setPw({...pw,currentPassword:v})} show={showSecrets.current} onToggle={()=>setShowSecrets({...showSecrets,current:!showSecrets.current})} />
          <PasswordField p={p} label="كلمة المرور الجديدة" value={pw.newPassword} onChange={(v)=>setPw({...pw,newPassword:v})} show={showSecrets.next} onToggle={()=>setShowSecrets({...showSecrets,next:!showSecrets.next})} />
          <PasswordField p={p} label="أعد كتابة كلمة المرور" value={pw.confirmPassword} onChange={(v)=>setPw({...pw,confirmPassword:v})} show={showSecrets.confirm} onToggle={()=>setShowSecrets({...showSecrets,confirm:!showSecrets.confirm})} />
          <CrunchBtn p={p} label="تغيير كلمة المرور" solid onClick={changePassword} />
        </div>
      </Panel>

      <Panel p={p} padding={24}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <Tag p={p}>ACTIVE_SESSIONS</Tag>
          <CrunchBtn p={p} label="إنهاء كل الجلسات" danger onClick={logoutAll} />
        </div>
        <div style={{ marginTop:14, display:"grid", gap:10 }}>
          {!sessions.length && <div style={{ color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13 }}>لا توجد جلسات نشطة غير ظاهرة.</div>}
          {sessions.map((s) => <div key={s.id} style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, alignItems:"center", padding:12, background:p.bg0, border:`1px solid ${s.current ? p.accent : p.border}` }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, color:p.fg, letterSpacing:".06em" }}>{s.deviceName} {s.current ? "· الجهاز الحالي" : ""}</div>
              <div style={{ fontFamily:"'Space Mono', monospace", fontSize:9, color:p.dim, letterSpacing:".08em", marginTop:4 }}>IP: {s.ip} · METHOD: {s.method} · LAST: {new Date(s.lastSeenAt).toLocaleString()}</div>
            </div>
            <CrunchBtn p={p} label={s.current ? "إنهاء الحالية" : "إنهاء"} small danger onClick={() => revokeSession(s)} />
          </div>)}
        </div>
      </Panel>
    </div>
  </PageFrame>;
}

function PasswordField({ p, label, value, onChange, show, onToggle }) {
  return <div>
    <label style={{ display:"block", fontFamily:"'Space Mono', monospace", fontSize:10, color:p.accent, letterSpacing:".22em", marginBottom:6, textTransform:"uppercase" }}>▸ {label}</label>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 46px", gap:8 }}>
      <input type={show ? "text" : "password"} value={value} onChange={(e)=>onChange(e.target.value)} style={{ width:"100%", background:p.bg0, border:`1px solid ${p.border}`, borderRight:`2px solid ${p.accent}`, color:p.fg, padding:"12px 14px", fontFamily:"'Inter', sans-serif", fontSize:14, outline:"none", direction:"ltr" }} />
      <button type="button" onClick={onToggle} style={{ background:p.bg1, border:`1px solid ${p.border}`, color:show?p.accent:p.dim, cursor:"pointer", fontFamily:"'Space Mono', monospace" }}>{show ? "إخفاء" : "عين"}</button>
    </div>
  </div>;
}

function Modal({ p, onClose, title, code, warn, children }) {
  return <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", backdropFilter:"blur(8px)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} style={{ width:"100%", maxWidth:540, background:p.bg1, border:`1px solid ${warn?p.warn:p.accent}`, padding:26, position:"relative", clipPath:"polygon(0 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)" }}>
      <div style={{ position:"absolute", top:0, left:0, width:80, height:2, background:warn?p.warn:p.accent }} />
      <Corners p={p} size={10} inset={5} color={warn?p.warn:p.accent} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}><div><Tag p={p} color={warn?p.warn:p.accent}>{code}</Tag><div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, color:p.fg, letterSpacing:".05em", marginTop:6, lineHeight:1 }}>{title}</div></div><button onClick={onClose} style={{ background:"transparent", border:`1px solid ${p.border}`, color:p.dim, width:30, height:30, cursor:"pointer", fontFamily:"'Space Mono', monospace", fontSize:14 }}>✕</button></div>
      {children}
    </div>
  </div>;
}

Object.assign(window, { LibraryPage, ProjectDetailPage, SettingsPage });

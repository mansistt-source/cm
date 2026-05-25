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
  const [editProject, setEditProject] = React.useState(null);
  const [confirmAction, setConfirmAction] = React.useState(null);

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

  async function saveEditedProject(next) {
    setErr("");
    try {
      const d = await projApi(`/api/projects/${next.id}`, { method:"PATCH", body: JSON.stringify({ title: next.title, brief: next.brief || "" }) });
      setProjects(projects.map((x) => x.id === next.id ? d.project : x));
      setEditProject(null);
    } catch (e) {
      setErr(e.message || "فشل تعديل المشروع");
    }
  }

  function deleteProject(project) {
    setConfirmAction({
      title: "تأكيد حذف المشروع",
      message: `سيتم حذف المشروع: ${project.title}. لا يمكن التراجع عن هذه العملية.`,
      confirmLabel: "حذف المشروع",
      danger: true,
      onConfirm: async () => {
        setErr("");
        try {
          await projApi(`/api/projects/${project.id}`, { method:"DELETE" });
          setProjects(projects.filter((x) => x.id !== project.id));
          setConfirmAction(null);
        } catch (e) {
          setErr(e.message || "فشل حذف المشروع");
        }
      }
    });
  }

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
      {!loading && !!filtered.length && <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:14 }}>{filtered.map(j => <ProjectCardConnected key={j.id} p={p} project={j} onOpen={() => openProject(j.id)} onEdit={() => setEditProject(j)} onDelete={() => deleteProject(j)} />)}</div>}
    </div>
    {showNew && <NewProjectModalConnected p={p} packages={packages} onClose={() => setShowNew(false)} onCreated={(project) => { setShowNew(false); openProject(project.id); }} />}
    {editProject && <EditProjectModalConnected p={p} project={editProject} onClose={() => setEditProject(null)} onSave={saveEditedProject} />}
    {confirmAction && <ConfirmActionModal p={p} action={confirmAction} onClose={() => setConfirmAction(null)} />}
  </PageFrame>;
}

function ProjectCardConnected({ p, project, onOpen, onEdit, onDelete }) {
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
    <div style={{ marginTop:14, display:"flex", gap:8 }}><CrunchBtn p={p} label="فتح ←" solid small onClick={(e)=>{ e.stopPropagation(); onOpen(); }} /><CrunchBtn p={p} label="تعديل" small onClick={(e)=>{ e.stopPropagation(); onEdit?.(); }} /><CrunchBtn p={p} label="حذف" small danger onClick={(e)=>{ e.stopPropagation(); onDelete?.(); }} /></div>
  </div>;
}
function MiniConnected({ p, l, v, accent, mono }) { return <div><div style={{ fontFamily:"'Space Mono', monospace", fontSize:8, color:p.dim, letterSpacing:".22em" }}>{l}</div><div style={{ fontFamily:mono?"'Space Mono', monospace":"'Bebas Neue', sans-serif", fontSize:mono?10:18, color:accent?p.accent:p.fg, letterSpacing:".04em", marginTop:2 }}>{v}</div></div>; }

function EditProjectModalConnected({ p, project, onClose, onSave }) {
  const [title, setTitle] = React.useState(project.title || "");
  const [brief, setBrief] = React.useState(project.brief || "");
  return <Modal p={p} onClose={onClose} title="تعديل المشروع" code="// EDIT_PROJECT">
    <div style={{ display:"grid", gap:12 }}>
      <TacticalInput p={p} label="اسم المشروع" value={title} onChange={setTitle} placeholder="اسم المشروع" />
      <TacticalTextarea p={p} label="وصف مختصر" value={brief} onChange={setBrief} rows={4} placeholder="وصف مختصر للمشروع" />
      <div style={{ display:"flex", gap:10, marginTop:8 }}>
        <CrunchBtn p={p} label="إلغاء" full onClick={onClose} />
        <CrunchBtn p={p} label="حفظ" solid full onClick={() => onSave({ ...project, title: title.trim(), brief: brief.trim() })} />
      </div>
    </div>
  </Modal>;
}

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
      <TacticalTextarea p={p} label="وصف مختصر" value={description} onChange={setDescription} rows={4} placeholder="اكتب وصف بسيط للمشروع فقط." />
      {err && <Toast p={p} type="error">{err}</Toast>}
      <div style={{ display:"flex", gap:10, marginTop:6 }}><CrunchBtn p={p} label="إلغاء" full onClick={onClose} /><CrunchBtn p={p} label={loading?"جاري الإنشاء...":"إنشاء وفتح"} solid icon="▶" full onClick={create} disabled={loading} /></div>
    </div>
  </Modal>;
}
function FormSelect({ p, label, value, onChange, options }) { return <div><label style={{ display:"block", fontFamily:"'Space Mono', monospace", fontSize:10, color:p.accent, letterSpacing:".22em", marginBottom:6, textTransform:"uppercase" }}>▸ {label}</label><select value={value} onChange={(e)=>onChange(e.target.value)} style={{ width:"100%", background:p.bg0, border:`1px solid ${p.border}`, borderRight:`2px solid ${p.accent}`, color:p.fg, padding:"12px 14px", fontFamily:"'Inter', sans-serif", fontSize:14, outline:"none", direction:"rtl" }}>{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>; }

function ProjectDetailPage({ p, navigate, projectId }) {
  const [err, setErr] = React.useState("");
  React.useEffect(() => {
    async function openActualProjectPage() {
      try {
        const d = await projApi(`/api/projects/${projectId}`);
        const project = d.project;
        if (!project) throw new Error("المشروع غير موجود");
        localStorage.setItem("cm_last_project_id", project.id);
        if (project.serviceType === "marketing_agent") navigate("market", { project });
        else navigate("create", { project });
      } catch (e) {
        setErr(e.message || "فشل فتح المشروع");
      }
    }
    openActualProjectPage();
  }, [projectId]);
  return <PageFrame p={p} density={0.35}>
    <AuthedNav p={p} current="library" navigate={navigate} user={projCurrentUser()} onLogout={() => projLogout(navigate)} />
    <div style={{ padding:"32px", maxWidth:760, margin:"0 auto" }}>
      <Panel p={p} padding={42} style={{ textAlign:"center" }}>
        {err ? <Toast p={p} type="error">{err}</Toast> : <>
          <AuroraLoader p={p} size={90} />
          <div style={{ marginTop:14, color:p.dim, fontFamily:"'Space Mono', monospace", fontSize:10, letterSpacing:".18em" }}>OPENING_PROJECT_INTERFACE</div>
        </>}
      </Panel>
    </div>
  </PageFrame>;
}

function SettingsPage({ p, navigate, credits = 0 }) {
  const [user, setUser] = React.useState(projCurrentUser());
  const [sessions, setSessions] = React.useState([]);
  const [err, setErr] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [pw, setPw] = React.useState({ currentPassword:"", newPassword:"", confirmPassword:"" });
  const [twofa, setTwofa] = React.useState({ code:"", disablePassword:"", disableCode:"" });
  const [showSecrets, setShowSecrets] = React.useState({ current:false, next:false, confirm:false, disable:false });
  const [confirmAction, setConfirmAction] = React.useState(null);

  async function loadSecurity() {
    if (!projToken()) { navigate("auth"); return; }
    setErr("");
    try {
      const [me, ss] = await Promise.all([projApi("/api/auth/me"), projApi("/api/security/sessions")]);
      if (me.user) { setUser(me.user); localStorage.setItem("cm_user", JSON.stringify(me.user)); }
      setSessions(ss.sessions || []);
    } catch(e) { setErr(e.message || "فشل تحميل الإعدادات"); }
  }
  React.useEffect(() => { loadSecurity(); }, []);

  function confirmLogout() {
    setConfirmAction({ title:"تأكيد تسجيل الخروج", message:"هل أنت متأكد من تسجيل الخروج؟", confirmLabel:"تسجيل خروج", danger:true, onConfirm:() => projLogout(navigate) });
  }

  async function changePassword() {
    setErr(""); setMsg("");
    if (!pw.currentPassword || !pw.newPassword || !pw.confirmPassword) { setErr("املأ كل خانات كلمة المرور"); return; }
    if (pw.newPassword !== pw.confirmPassword) { setErr("إعادة كلمة المرور غير مطابقة"); return; }
    try {
      const d = await projApi("/api/security/change-password", { method:"POST", body:JSON.stringify(pw) });
      if (d.token) localStorage.setItem("cm_token", d.token);
      if (d.user) { setUser(d.user); localStorage.setItem("cm_user", JSON.stringify(d.user)); }
      setPw({ currentPassword:"", newPassword:"", confirmPassword:"" });
      setMsg("تم تغيير كلمة المرور بأمان");
      await loadSecurity();
    } catch(e) { setErr(e.message || "فشل تغيير كلمة المرور"); }
  }

  async function requestEnable2fa() {
    setErr(""); setMsg("");
    try {
      const d = await projApi("/api/security/2fa/setup", { method:"POST" });
      setMsg(d.devCode ? `تم تجهيز كود التفعيل. DEV CODE: ${d.devCode}` : "تم إرسال كود التفعيل إلى بريدك الإلكتروني");
    } catch(e) { setErr(e.message || "فشل إرسال كود التفعيل"); }
  }

  async function enable2fa() {
    setErr(""); setMsg("");
    try {
      const d = await projApi("/api/security/2fa/enable", { method:"POST", body:JSON.stringify({ code:twofa.code }) });
      if (d.user) { setUser(d.user); localStorage.setItem("cm_user", JSON.stringify(d.user)); }
      setTwofa({ code:"", disablePassword:"", disableCode:"" });
      setMsg("تم تفعيل المصادقة الثنائية عبر البريد");
    } catch(e) { setErr(e.message || "فشل تفعيل المصادقة"); }
  }

  async function requestDisable2fa() {
    setErr(""); setMsg("");
    try {
      const d = await projApi("/api/security/2fa/disable/request", { method:"POST" });
      setMsg(d.devCode ? `تم تجهيز كود التعطيل. DEV CODE: ${d.devCode}` : "تم إرسال كود تعطيل المصادقة إلى بريدك الإلكتروني");
    } catch(e) { setErr(e.message || "فشل إرسال كود التعطيل"); }
  }

  async function disable2fa() {
    setErr(""); setMsg("");
    try {
      const d = await projApi("/api/security/2fa/disable", { method:"POST", body:JSON.stringify({ password:twofa.disablePassword, code:twofa.disableCode }) });
      if (d.user) { setUser(d.user); localStorage.setItem("cm_user", JSON.stringify(d.user)); }
      setTwofa({ code:"", disablePassword:"", disableCode:"" });
      setMsg("تم إلغاء المصادقة الثنائية");
    } catch(e) { setErr(e.message || "فشل إلغاء المصادقة"); }
  }

  function revokeSession(session) {
    setConfirmAction({
      title:"إنهاء جلسة",
      message:`إنهاء جلسة ${session.deviceName}؟`,
      confirmLabel:"إنهاء الجلسة",
      danger:true,
      onConfirm: async () => {
        setErr(""); setMsg("");
        try {
          const d = await projApi(`/api/security/sessions/${session.id}/revoke`, { method:"POST" });
          setConfirmAction(null);
          if (d.currentRevoked) { projLogout(navigate); return; }
          setMsg("تم إنهاء الجلسة");
          await loadSecurity();
        } catch(e) { setErr(e.message || "فشل إنهاء الجلسة"); }
      }
    });
  }

  function logoutAll() {
    setConfirmAction({
      title:"إنهاء كل الجلسات",
      message:"إنهاء كل الجلسات على كل الأجهزة؟ سيتم تسجيل خروجك أيضاً.",
      confirmLabel:"إنهاء كل الجلسات",
      danger:true,
      onConfirm: async () => {
        setErr(""); setMsg("");
        try { await projApi("/api/security/logout-all", { method:"POST" }); projLogout(navigate); }
        catch(e) { setErr(e.message || "فشل إنهاء الجلسات"); }
      }
    });
  }

  return <PageFrame p={p} density={0.35}>
    <AuthedNav p={p} current="settings" navigate={navigate} credits={credits} user={user} onLogout={confirmLogout} />
    <div style={{ padding:"32px", maxWidth:980, margin:"0 auto" }}>
      <SectionHead p={p} code="// ACCOUNT_SETTINGS" title="الإعدادات" sub="الحساب، كلمة المرور، المصادقة، والجلسات النشطة" />
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
        <div style={{ marginTop:14, color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13, lineHeight:1.8 }}>المصادقة الثنائية تتم بكود من 6 أرقام يتم إرساله إلى بريد الحساب.</div>
        <div style={{ marginTop:14 }}>
          <CrunchBtn p={p} label={user.twoFactorEnabled ? "إدارة المصادقة الثنائية" : "تفعيل المصادقة الثنائية"} solid onClick={() => navigate("security-2fa")} />
        </div>
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
    {confirmAction && <ConfirmActionModal p={p} action={confirmAction} onClose={() => setConfirmAction(null)} />}
  </PageFrame>;
}

function TwoFactorActivationPage({ p, navigate, credits = 0 }) {
  const [user, setUser] = React.useState(projCurrentUser());
  const [code, setCode] = React.useState("");
  const [disablePassword, setDisablePassword] = React.useState("");
  const [disableCode, setDisableCode] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [err, setErr] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function load() {
    if (!projToken()) { navigate("auth"); return; }
    try {
      const me = await projApi("/api/auth/me");
      if (me.user) { setUser(me.user); localStorage.setItem("cm_user", JSON.stringify(me.user)); }
    } catch(e) { setErr(e.message || "فشل تحميل بيانات الحساب"); }
  }
  React.useEffect(() => { load(); }, []);

  async function requestEnable() {
    setErr(""); setMsg(""); setSending(true);
    try {
      const d = await projApi("/api/security/2fa/setup", { method:"POST" });
      setMsg(d.devCode ? `تم تجهيز الكود. DEV CODE: ${d.devCode}` : `تم إرسال كود من 6 أرقام إلى ${d.email || user.email}`);
    } catch(e) { setErr(e.message || "فشل إرسال كود التفعيل"); }
    finally { setSending(false); }
  }
  async function enable() {
    setErr(""); setMsg("");
    if (!/^\d{6}$/.test(code.trim())) { setErr("اكتب كود مكوّن من 6 أرقام"); return; }
    try {
      const d = await projApi("/api/security/2fa/enable", { method:"POST", body:JSON.stringify({ code:code.trim() }) });
      if (d.user) { setUser(d.user); localStorage.setItem("cm_user", JSON.stringify(d.user)); }
      setCode(""); setMsg("تم تفعيل المصادقة الثنائية");
    } catch(e) { setErr(e.message || "فشل تفعيل المصادقة"); }
  }
  async function requestDisable() {
    setErr(""); setMsg(""); setSending(true);
    try {
      const d = await projApi("/api/security/2fa/disable/request", { method:"POST" });
      setMsg(d.devCode ? `تم تجهيز كود التعطيل. DEV CODE: ${d.devCode}` : `تم إرسال كود التعطيل إلى ${d.email || user.email}`);
    } catch(e) { setErr(e.message || "فشل إرسال كود التعطيل"); }
    finally { setSending(false); }
  }
  async function disable() {
    setErr(""); setMsg("");
    if (!disablePassword || !/^\d{6}$/.test(disableCode.trim())) { setErr("اكتب كلمة المرور وكود البريد المكوّن من 6 أرقام"); return; }
    try {
      const d = await projApi("/api/security/2fa/disable", { method:"POST", body:JSON.stringify({ password:disablePassword, code:disableCode.trim() }) });
      if (d.user) { setUser(d.user); localStorage.setItem("cm_user", JSON.stringify(d.user)); }
      setDisablePassword(""); setDisableCode(""); setMsg("تم تعطيل المصادقة الثنائية");
    } catch(e) { setErr(e.message || "فشل تعطيل المصادقة"); }
  }

  return <PageFrame p={p} density={0.35}>
    <AuthedNav p={p} current="settings" navigate={navigate} credits={credits} user={user} onLogout={() => projLogout(navigate)} />
    <div style={{ padding:"32px", maxWidth:820, margin:"0 auto" }}>
      <SectionHead p={p} code="// EMAIL_2FA" title="المصادقة الثنائية" sub="تفعيل المصادقة بكود أمان يصل إلى بريد الحساب" right={<CrunchBtn p={p} label="رجوع للإعدادات" onClick={() => navigate("settings")} />} />
      {err && <div style={{ marginBottom:14 }}><Toast p={p} type="error">{err}</Toast></div>}
      {msg && <div style={{ marginBottom:14 }}><Toast p={p} type="success">{msg}</Toast></div>}
      <Panel p={p} padding={24}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <Tag p={p}>EMAIL_CODE_STATUS</Tag>
          <Tag p={p} color={user.twoFactorEnabled ? p.accent2 : p.warn}>{user.twoFactorEnabled ? "مفعلة · ACTIVATED" : "غير مفعلة"}</Tag>
        </div>
        <div style={{ marginTop:12, color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:13, lineHeight:1.9 }}>سيتم إرسال كود مكوّن من 6 أرقام إلى: <span style={{ color:p.fg }}>{user.email}</span>. الكود صالح لمدة 10 دقائق.</div>
        {!user.twoFactorEnabled ? <div style={{ display:"grid", gap:12, marginTop:18 }}>
          <CrunchBtn p={p} label={sending ? "جاري الإرسال..." : "إرسال كود التفعيل"} solid onClick={requestEnable} disabled={sending} />
          <TacticalInput p={p} label="كود التفعيل" value={code} onChange={setCode} placeholder="123456" rtl={false} />
          <CrunchBtn p={p} label="تفعيل المصادقة" solid onClick={enable} />
        </div> : <div style={{ display:"grid", gap:12, marginTop:18 }}>
          <CrunchBtn p={p} label={sending ? "جاري الإرسال..." : "إرسال كود التعطيل"} onClick={requestDisable} disabled={sending} />
          <PasswordField p={p} label="كلمة المرور للتأكيد" value={disablePassword} onChange={setDisablePassword} show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
          <TacticalInput p={p} label="كود التعطيل" value={disableCode} onChange={setDisableCode} placeholder="123456" rtl={false} />
          <CrunchBtn p={p} label="تعطيل المصادقة" danger onClick={disable} />
        </div>}
      </Panel>
    </div>
  </PageFrame>;
}

function PasswordField({ p, label, value, onChange, show, onToggle }) {
  return <div>
    <label style={{ display:"block", fontFamily:"'Space Mono', monospace", fontSize:10, color:p.accent, letterSpacing:".22em", marginBottom:6, textTransform:"uppercase" }}>▸ {label}</label>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 46px", gap:8 }}>
      <input type={show ? "text" : "password"} value={value} onChange={(e)=>onChange(e.target.value)} style={{ width:"100%", background:p.bg0, border:`1px solid ${p.border}`, borderRight:`2px solid ${p.accent}`, color:p.fg, padding:"12px 14px", fontFamily:"'Inter', sans-serif", fontSize:14, outline:"none", direction:"ltr" }} />
      <button type="button" onClick={onToggle} style={{ background:p.bg1, border:`1px solid ${p.border}`, color:show?p.accent:p.dim, cursor:"pointer", fontFamily:"'Space Mono', monospace" }}>{show ? "◉" : "👁"}</button>
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

function ConfirmActionModal({ p, action, onClose }) {
  return <Modal p={p} onClose={onClose} title={action.title || "تأكيد"} code="// CONFIRM" warn={action.danger}>
    <div style={{ color:p.dim, fontFamily:"'Inter', sans-serif", fontSize:14, lineHeight:1.9, marginBottom:18 }}>{action.message}</div>
    <div style={{ display:"flex", gap:10 }}>
      <CrunchBtn p={p} label="إلغاء" full onClick={onClose} />
      <CrunchBtn p={p} label={action.confirmLabel || "تأكيد"} solid danger={action.danger} full onClick={action.onConfirm} />
    </div>
  </Modal>;
}

Object.assign(window, { LibraryPage, ProjectDetailPage, SettingsPage, TwoFactorActivationPage });

// Live Film/Marketing hubs — restored after API projects connection.
// This file prevents black screens when clicking Film Maker / Marketing Agent nav items.

function hubToken() { return localStorage.getItem("cm_token") || ""; }
function hubUser() {
  try { return JSON.parse(localStorage.getItem("cm_user") || "null") || { name: "مشغل", email: "" }; }
  catch { return { name: "مشغل", email: "" }; }
}
function hubLogout(navigate) {
  fetch("/api/auth/logout", { method: "POST", headers: hubToken() ? { Authorization: `Bearer ${hubToken()}` } : {} }).catch(() => {});
  localStorage.removeItem("cm_token");
  localStorage.removeItem("cm_user");
  window.dispatchEvent(new Event("cm-auth-changed"));
  history.replaceState(null, "", "#/auth");
  navigate("auth");
}
async function hubApi(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
      ...(hubToken() ? { Authorization: `Bearer ${hubToken()}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "API request failed");
  return data;
}

function FilmHubPage({ p, navigate, credits = 0 }) {
  return <ToolHubPage p={p} navigate={navigate} credits={credits} tool="film" />;
}
function MarketHubPage({ p, navigate, credits = 0 }) {
  return <ToolHubPage p={p} navigate={navigate} credits={credits} tool="market" />;
}

function ToolHubPage({ p, navigate, credits = 0, tool }) {
  const user = hubUser();
  const meta = tool === "film" ? {
    code: "// FILM_OPS_CONTROL",
    title: "صانع الأفلام",
    sub: "اختر مشروعاً للدخول أو أنشئ طلب إنتاج جديد",
    current: "film-hub",
    serviceType: "film_maker",
    target: "create",
    newTitle: "مشروع فيلم جديد",
    briefPlaceholder: "اكتب فكرة الفيلم أو الوثائقي المطلوب...",
  } : {
    code: "// MARKETING_OPS_CONTROL",
    title: "وكيل التسويق",
    sub: "اختر حملة أو أنشئ طلب تسويق جديد",
    current: "market-hub",
    serviceType: "marketing_agent",
    target: "market",
    newTitle: "حملة تسويق جديدة",
    briefPlaceholder: "اكتب هدف الحملة، المنتج، الجمهور، والمنصات المطلوبة...",
  };

  const [projects, setProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [showNew, setShowNew] = React.useState(false);
  const [editProject, setEditProject] = React.useState(null);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({
    title: meta.newTitle,
    description: "",
  });

  async function load() {
    if (!hubToken()) { navigate("auth"); return; }
    setLoading(true); setErr("");
    try {
      const d = await hubApi("/api/projects");
      setProjects((d.projects || []).filter(x => x.serviceType === meta.serviceType));
    } catch (e) {
      setErr(e.message || "فشل تحميل المشاريع");
    } finally {
      setLoading(false);
    }
  }
  React.useEffect(() => { load(); }, [tool]);

  function openProject(project) {
    localStorage.setItem("cm_last_project_id", project.id);
    navigate(meta.target, { project });
  }

  async function createProject() {
    setErr("");
    if (!form.title.trim()) { setErr("اكتب اسم المشروع"); return; }
    setCreating(true);
    try {
      const d = await hubApi("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          serviceType: meta.serviceType,
          brief: form.description.trim(),
        }),
      });
      const project = d.project;
      localStorage.setItem("cm_last_project_id", project.id);
      setShowNew(false);
      navigate("project-detail", { id: project.id });
    } catch (e) {
      setErr(e.message || "فشل إنشاء المشروع");
    } finally {
      setCreating(false);
    }
  }


  async function saveEditedProject(next) {
    setErr("");
    try {
      const d = await hubApi(`/api/projects/${next.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: next.title, brief: next.brief || "" }),
      });
      setProjects(projects.map((x) => x.id === next.id ? d.project : x));
      setEditProject(null);
    } catch (e) {
      setErr(e.message || "فشل تعديل المشروع");
    }
  }

  async function deleteProject(project) {
    if (!window.confirm(`حذف المشروع: ${project.title}؟`)) return;
    setErr("");
    try {
      await hubApi(`/api/projects/${project.id}`, { method: "DELETE" });
      setProjects(projects.filter((x) => x.id !== project.id));
    } catch (e) {
      setErr(e.message || "فشل حذف المشروع");
    }
  }

  const paid = projects.filter(x => x.paymentStatus === "paid").length;
  const delivered = projects.filter(x => x.status === "delivered").length;
  const active = projects.filter(x => ["pending_payment", "paid", "in_production"].includes(x.status)).length;

  return <PageFrame p={p} density={0.35}>
    <AuthedNav p={p} current={meta.current} navigate={navigate} credits={credits} user={user} onLogout={() => hubLogout(navigate)} />
    <div style={{ padding: "32px", maxWidth: 1300, margin: "0 auto" }}>
      <SectionHead p={p} code={meta.code} title={meta.title} sub={meta.sub}
        right={<CrunchBtn p={p} label="إنشاء مشروع" solid icon="+" onClick={() => setShowNew(true)} />}
      />

      {err && <div style={{ marginBottom: 14 }}><Toast p={p} type="error">{err}</Toast></div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
        <HubStat p={p} label="TOTAL" value={projects.length} accent />
        <HubStat p={p} label="PAID" value={paid} />
        <HubStat p={p} label="ACTIVE" value={active} />
        <HubStat p={p} label="DELIVERED" value={delivered} />
      </div>

      {loading ? <Panel p={p} padding={42} style={{ textAlign: "center" }}><AuroraLoader p={p} size={90} /><div style={{ marginTop: 14, color: p.dim, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".18em" }}>LOADING_PROJECTS</div></Panel> : null}

      {!loading && !projects.length ? <Panel p={p} padding={54} style={{ textAlign: "center" }}>
        <Reticle p={p} size={86} color={p.dim} />
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: p.fg, letterSpacing: ".06em", marginTop: 20 }}>لا توجد مشاريع بعد</div>
        <div style={{ color: p.dim, fontFamily: "'Inter', sans-serif", fontSize: 13, marginTop: 8 }}>أنشئ أول طلب، ثم ارفق الملفات وابدأ الدفع من صفحة المشروع.</div>
        <div style={{ marginTop: 22 }}><CrunchBtn p={p} label="إنشاء أول مشروع" solid icon="+" onClick={() => setShowNew(true)} /></div>
      </Panel> : null}

      {!loading && projects.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {projects.map(project => <HubProjectCard key={project.id} p={p} project={project} onOpen={() => openProject(project)} onEdit={() => setEditProject(project)} onDelete={() => deleteProject(project)} />)}
      </div> : null}
    </div>

    {showNew && <Modal p={p} onClose={() => setShowNew(false)} title="مشروع جديد" code={meta.code}>
      <div style={{ display: "grid", gap: 12 }}>
        <TacticalInput p={p} label="اسم المشروع" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder={meta.newTitle} />
        <TacticalTextarea p={p} label="وصف مختصر" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="اكتب وصف بسيط للمشروع. تفاصيل الخدمة، الباقة، الستايل، والمدة ستُضبط من داخل المشروع." rows={5} />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <CrunchBtn p={p} label="إلغاء" full onClick={() => setShowNew(false)} />
          <CrunchBtn p={p} label={creating ? "جاري الإنشاء..." : "إنشاء وفتح"} solid full onClick={createProject} disabled={creating} />
        </div>
      </div>
    </Modal>}


    {editProject && <EditHubProjectModal p={p} project={editProject} onClose={() => setEditProject(null)} onSave={saveEditedProject} />}
  </PageFrame>;
}

function HubStat({ p, label, value, accent }) {
  return <Panel p={p} padding={18}>
    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>{label}</div>
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, color: accent ? p.accent : p.fg, lineHeight: 1, marginTop: 8 }}>{value}</div>
  </Panel>;
}
function HubProjectCard({ p, project, onOpen, onEdit, onDelete }) {
  const color = project.status === "delivered" ? p.accent2 : project.paymentStatus === "paid" ? p.accent2 : project.status === "pending_payment" ? p.warn : p.accent;
  return <div onClick={onOpen} style={{ position: "relative", padding: 18, background: p.bg1, border: `1px solid ${p.border}`, cursor: "pointer", clipPath: "polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)" }}>
    <div style={{ position: "absolute", top: 0, left: 0, width: 60, height: 2, background: color }} />
    <Tag p={p} color={color}>{String(project.status || "draft").toUpperCase()}</Tag>
    <div style={{ marginTop: 14, fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: p.fg, letterSpacing: ".06em", lineHeight: 1.1 }}>{project.title}</div>
    <div style={{ marginTop: 8, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".14em" }}>{project.serviceType} · {Number(project.priceUsd || 0) ? `$${project.priceUsd}` : 'بدون باقة'}</div>
    <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
      <CrunchBtn p={p} label="فتح" small solid onClick={(e) => { e.stopPropagation(); onOpen(); }} />
      <CrunchBtn p={p} label="تعديل" small onClick={(e) => { e.stopPropagation(); onEdit?.(); }} />
      <CrunchBtn p={p} label="حذف" small danger onClick={(e) => { e.stopPropagation(); onDelete?.(); }} />
    </div>
  </div>;
}

function EditHubProjectModal({ p, project, onClose, onSave }) {
  const [title, setTitle] = React.useState(project.title || "");
  const [brief, setBrief] = React.useState(project.brief || "");
  return <Modal p={p} onClose={onClose} title="تعديل المشروع" code="// EDIT_PROJECT">
    <div style={{ display: "grid", gap: 12 }}>
      <TacticalInput p={p} label="اسم المشروع" value={title} onChange={setTitle} placeholder="اسم المشروع" />
      <TacticalTextarea p={p} label="وصف مختصر" value={brief} onChange={setBrief} rows={4} placeholder="وصف مختصر للمشروع" />
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <CrunchBtn p={p} label="إلغاء" full onClick={onClose} />
        <CrunchBtn p={p} label="حفظ" solid full onClick={() => onSave({ ...project, title: title.trim(), brief: brief.trim() })} />
      </div>
    </div>
  </Modal>;
}

function HubSelect({ p, label, value, onChange, options }) {
  return <div><label style={{ display:"block", fontFamily:"'Space Mono', monospace", fontSize:10, color:p.accent, letterSpacing:".22em", marginBottom:6, textTransform:"uppercase" }}>▸ {label}</label><select value={value} onChange={(e) => onChange(e.target.value)} style={{ width:"100%", background:p.bg0, border:`1px solid ${p.border}`, borderRight:`2px solid ${p.accent}`, color:p.fg, padding:"12px 14px", fontFamily:"'Inter', sans-serif", fontSize:13, outline:"none" }}>{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></div>;
}

Object.assign(window, { FilmHubPage, MarketHubPage, ToolHubPage });

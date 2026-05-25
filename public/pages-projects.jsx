// Project Library + Project Detail + Settings pages.

const SAMPLE_PROJECTS = [
  { id: 1, title: "حملة إطلاق العطر",        genre: "CINEMATIC",   length: 30,  status: "rendering",    prog: 84,  scenes: 6, cred: 245, type: "film",   updated: "منذ 2د" },
  { id: 2, title: "وثائقي الحضارات",         genre: "DOCUMENTARY", length: 300, status: "completed",    prog: 100, scenes: 12,cred: 540, type: "doc",    updated: "منذ ساعة" },
  { id: 3, title: "إعلان منتج جديد",         genre: "COMMERCIAL",  length: 15,  status: "frames_gen",   prog: 32,  scenes: 4, cred: 60,  type: "ad",     updated: "منذ 3س" },
  { id: 4, title: "ميتيريال أنيمي",         genre: "ANIME",       length: 60,  status: "queued",       prog: 12,  scenes: 8, cred: 180, type: "anime",  updated: "أمس" },
  { id: 5, title: "بدائل لوحة قصصية #3",     genre: "CINEMATIC",   length: 45,  status: "draft",        prog: 0,   scenes: 6, cred: 0,   type: "film",   updated: "أمس" },
  { id: 6, title: "ريلز كوفي شوب",           genre: "COMMERCIAL",  length: 30,  status: "completed",    prog: 100, scenes: 5, cred: 90,  type: "ad",     updated: "3 أيام" },
  { id: 7, title: "وثائقي عن الصحراء",       genre: "DOCUMENTARY", length: 120, status: "completed",    prog: 100, scenes: 8, cred: 240, type: "doc",    updated: "أسبوع" },
  { id: 8, title: "فيلم قصير — الذاكرة",     genre: "CINEMATIC",   length: 90,  status: "failed",       prog: 67,  scenes: 7, cred: 0,   type: "film",   updated: "أسبوعين" },
];

function statusColor(p, s) {
  return ({
    completed:  p.accent2,
    rendering:  p.accent,
    frames_gen: p.accent,
    queued:     p.warn,
    draft:      p.dim,
    failed:     p.warn,
  })[s] || p.dim;
}
function statusLabel(s) {
  return ({
    completed:  "DONE",
    rendering:  "RENDER",
    frames_gen: "FRAMES",
    queued:     "QUEUE",
    draft:      "DRAFT",
    failed:     "FAILED",
  })[s] || s.toUpperCase();
}

// =========================================================================
// LIBRARY
// =========================================================================
function LibraryPage({ p, navigate, credits = 4820 }) {
  const [filter, setFilter] = React.useState("all");
  const [view, setView] = React.useState("grid");
  const [search, setSearch] = React.useState("");
  const [showNew, setShowNew] = React.useState(false);

  let projects = SAMPLE_PROJECTS;
  if (filter !== "all") projects = projects.filter(j => {
    if (filter === "active") return ["rendering", "frames_gen", "queued"].includes(j.status);
    if (filter === "done")   return j.status === "completed";
    if (filter === "draft")  return j.status === "draft";
    return true;
  });
  if (search) projects = projects.filter(j => j.title.includes(search));

  return (
    <PageFrame p={p} density={0.35}>
      <AuthedNav p={p} current="library" navigate={navigate} credits={credits} onLogout={() => navigate("auth")} />

      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
        <SectionHead p={p} code="// PROJECT_ARCHIVE" title="مكتبة المشاريع" sub={`${SAMPLE_PROJECTS.length} مشروع · ${SAMPLE_PROJECTS.filter(j => j.status === "completed").length} مكتمل`}
          right={<CrunchBtn p={p} label="مشروع جديد" solid icon="+" onClick={() => setShowNew(true)} />}
        />

        {/* filter row */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "all",    l: `الكل (${SAMPLE_PROJECTS.length})` },
              { id: "active", l: "نشط" },
              { id: "done",   l: "مكتمل" },
              { id: "draft",  l: "مسودة" },
            ].map(f => {
              const on = filter === f.id;
              return (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{
                  padding: "8px 14px",
                  background: on ? p.accent : "transparent",
                  color: on ? p.bg0 : p.dim,
                  border: `1px solid ${on ? p.accent : p.border}`,
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, letterSpacing: ".15em",
                  cursor: "pointer",
                }}>{f.l}</button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "stretch" }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." style={{
              padding: "8px 14px", background: p.bg1, border: `1px solid ${p.border}`, color: p.fg,
              fontFamily: "'Inter', sans-serif", fontSize: 13, outline: "none", direction: "rtl", width: 240,
            }} />
            {[
              { id: "grid", g: "▦" },
              { id: "list", g: "≡" },
            ].map(v => {
              const on = view === v.id;
              return (
                <button key={v.id} onClick={() => setView(v.id)} style={{
                  width: 38,
                  background: on ? p.accent : "transparent",
                  color: on ? p.bg0 : p.dim,
                  border: `1px solid ${on ? p.accent : p.border}`,
                  fontFamily: "'Space Mono', monospace", fontSize: 16,
                  cursor: "pointer",
                }}>{v.g}</button>
              );
            })}
          </div>
        </div>

        {/* projects */}
        {projects.length === 0 ? (
          <Panel p={p} padding={48} style={{ textAlign: "center" }}>
            <Reticle p={p} size={80} color={p.dim} />
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: p.fg, letterSpacing: ".05em", marginTop: 16 }}>
              لا توجد مشاريع
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.dim, marginTop: 6 }}>
              ابدأ بإنشاء مشروع جديد
            </div>
            <div style={{ marginTop: 18 }}>
              <CrunchBtn p={p} label="مشروع جديد" solid icon="+" onClick={() => setShowNew(true)} />
            </div>
          </Panel>
        ) : view === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {projects.map(j => <ProjectCard key={j.id} p={p} job={j} navigate={navigate} />)}
          </div>
        ) : (
          <Panel p={p} padding={0}>
            {projects.map((j, i) => (
              <div key={j.id} onClick={() => navigate("project-detail", { id: j.id })}
                style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto",
                  gap: 18, alignItems: "center",
                  padding: "14px 18px", borderBottom: i < projects.length - 1 ? `1px solid ${p.border}` : "none",
                  cursor: "pointer", transition: "background .15s",
                }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
                  JOB//{j.id.toString().padStart(3, "0")}
                </span>
                <div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.fg, letterSpacing: ".06em", lineHeight: 1.2 }}>{j.title}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em", marginTop: 2 }}>
                    {j.genre} · {j.length}s · {j.scenes} مشاهد
                  </div>
                </div>
                <div style={{ width: 120 }}>
                  <StatusBar p={p} label="" value={j.prog} color={statusColor(p, j.status)} />
                </div>
                <Tag p={p} color={statusColor(p, j.status)}>{statusLabel(j.status)}</Tag>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".15em" }}>{j.cred} CRED</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em", minWidth: 70, textAlign: "left" }}>{j.updated}</span>
              </div>
            ))}
          </Panel>
        )}
      </div>

      {showNew && <NewProjectModal p={p} onClose={() => setShowNew(false)} navigate={navigate} />}
    </PageFrame>
  );
}

function ProjectCard({ p, job, navigate }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onClick={() => navigate("project-detail", { id: job.id })}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", background: p.bg1,
        border: `1px solid ${hover ? p.accent : p.border}`,
        cursor: "pointer", transition: "all .15s",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)",
        transform: hover ? "translateY(-3px)" : "translateY(0)",
      }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: hover ? 50 : 24, height: 2, background: p.accent, transition: "width .25s", zIndex: 2 }} />
      {/* thumbnail */}
      <div style={{ position: "relative", aspectRatio: "16/9", background: p.bg2, overflow: "hidden", borderBottom: `1px solid ${p.border}` }}>
        <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(${job.id % 2 ? 45 : -45}deg, ${p.line} 0 2px, transparent 2px 8px)`, opacity: .8 }} />
        {/* play overlay for completed */}
        {job.status === "completed" && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 40, height: 40, borderRadius: "50%", background: `${p.bg0}cc`, border: `1px solid ${p.accent}`, display: "flex", alignItems: "center", justifyContent: "center", color: p.accent, fontSize: 14 }}>▶</div>
        )}
        {/* progress bar overlay */}
        {job.status !== "completed" && job.status !== "draft" && job.status !== "failed" && (
          <div style={{ position: "absolute", bottom: 0, left: 0, height: 2, width: `${job.prog}%`, background: statusColor(p, job.status) }} />
        )}
        <div style={{ position: "absolute", top: 6, right: 6 }}>
          <Tag p={p} color={statusColor(p, job.status)}>{statusLabel(job.status)}</Tag>
        </div>
        <div style={{ position: "absolute", top: 6, left: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.fg, letterSpacing: ".15em", textShadow: "0 0 6px rgba(0,0,0,.7)" }}>
          {job.length}s · {job.scenes} SCN
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>JOB//{job.id.toString().padStart(3, "0")} · {job.genre}</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".06em", lineHeight: 1.2, marginTop: 4, minHeight: 44 }}>{job.title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${p.border}`, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".12em" }}>
          <span>{job.updated}</span>
          {job.cred > 0 && <span style={{ color: p.accent }}>{job.cred} CRED</span>}
        </div>
      </div>
    </div>
  );
}

function NewProjectModal({ p, onClose, navigate }) {
  const [title, setTitle] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [genre, setGenre] = React.useState("cinematic");
  const [duration, setDuration] = React.useState(30);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", backdropFilter: "blur(8px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 580, background: p.bg1, border: `1px solid ${p.accent}`, padding: 28, position: "relative",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 80, height: 2, background: p.accent }} />
        <Corners p={p} size={12} inset={5} color={p.accent} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <Tag p={p}>NEW_PROJECT</Tag>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: p.fg, letterSpacing: ".05em", marginTop: 6, lineHeight: 1 }}>
              مشروع جديد
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${p.border}`, color: p.dim, width: 32, height: 32, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 14 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <TacticalInput p={p} label="عنوان المشروع" value={title} onChange={setTitle} placeholder="مثال · حملة إطلاق المنتج" />
          <TacticalTextarea p={p} label="الفكرة" value={prompt} onChange={setPrompt} placeholder="اوصف فكرتك بالتفصيل..." rows={3} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 6 }}>▸ النوع</div>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} style={{
                width: "100%", padding: "11px 14px", background: p.bg0, border: `1px solid ${p.border}`, borderRight: `2px solid ${p.accent}`,
                color: p.fg, fontFamily: "'Inter', sans-serif", fontSize: 13, outline: "none", direction: "rtl",
              }}>
                <option value="cinematic">سينمائي</option>
                <option value="realistic">واقعي</option>
                <option value="animated">أنيمي</option>
                <option value="stylized">مصمم</option>
                <option value="documentary">وثائقي</option>
              </select>
            </div>
            <TacticalInput p={p} label="المدة (ثواني)" value={duration} onChange={(v) => setDuration(parseInt(v) || 0)} type="number" placeholder="30" rtl={false} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <CrunchBtn p={p} label="إلغاء" full onClick={onClose} />
          <CrunchBtn p={p} label="إنشاء وفتح" solid icon="▶" full onClick={() => { onClose(); navigate("project-detail", { id: 99 }); }} />
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// PROJECT DETAIL
// =========================================================================
function ProjectDetailPage({ p, navigate, projectId = 1, credits = 4820 }) {
  const [tab, setTab] = React.useState("storyboard");
  const job = SAMPLE_PROJECTS.find(j => j.id === projectId) || SAMPLE_PROJECTS[0];

  return (
    <PageFrame p={p} density={0.3}>
      <AuthedNav p={p} current="project-detail" navigate={navigate} credits={credits} onLogout={() => navigate("auth")} />

      {/* header */}
      <div style={{ borderBottom: `1px solid ${p.border}`, padding: "20px 32px", background: `${p.bg0}cc` }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", gap: 18 }}>
          <button onClick={() => navigate("library")} style={{ background: "transparent", border: `1px solid ${p.border}`, color: p.dim, padding: "8px 14px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".22em" }}>
            ← مكتبة
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>JOB//{job.id.toString().padStart(3, "0")}</span>
              <Tag p={p} color={statusColor(p, job.status)}>{statusLabel(job.status)}</Tag>
              <Tag p={p}>{job.genre}</Tag>
              <Tag p={p} color={p.dim}>{job.length}s · {job.scenes} مشاهد</Tag>
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: p.fg, letterSpacing: ".05em", lineHeight: 1 }}>
              {job.title}
            </div>
          </div>
          {job.status === "completed" && (
            <div style={{ display: "flex", gap: 8 }}>
              <CrunchBtn p={p} label="تحميل" small icon="↓" />
              <CrunchBtn p={p} label="نشر" solid small icon="↗" />
            </div>
          )}
        </div>

        {/* pipeline progress */}
        {job.status !== "completed" && job.status !== "failed" && job.status !== "draft" && (
          <div style={{ maxWidth: 1400, margin: "16px auto 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em" }}>
              <ThinkingPulse p={p} label="PIPELINE EXECUTING" />
              <span style={{ color: p.accent }}>{job.prog}%</span>
            </div>
            <div style={{ height: 3, background: p.bg2 }}>
              <div style={{ height: "100%", width: `${job.prog}%`, background: p.accent, boxShadow: `0 0 8px ${p.accent}`, transition: "width .5s" }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
        {/* tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 22, borderBottom: `1px solid ${p.border}` }}>
          {[
            { id: "storyboard", l: "ستوري بورد",  icon: "▦" },
            { id: "progress",   l: "تقدم العملية", icon: "≡" },
            { id: "output",     l: "المخرجات",    icon: "▶" },
          ].map(t => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "10px 16px", background: "transparent",
                color: on ? p.accent : p.dim,
                border: "none", borderBottom: `2px solid ${on ? p.accent : "transparent"}`,
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: ".15em",
                cursor: "pointer", marginBottom: -1,
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, opacity: .8 }}>{t.icon}</span>
                {t.l}
              </button>
            );
          })}
        </div>

        {tab === "storyboard" && <DetailStoryboard p={p} job={job} />}
        {tab === "progress"   && <DetailProgress   p={p} job={job} />}
        {tab === "output"     && <DetailOutput     p={p} job={job} />}
      </div>
    </PageFrame>
  );
}

function DetailStoryboard({ p, job }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        {Array.from({ length: job.scenes }).map((_, i) => {
          const sceneStatus = i < Math.floor(job.prog / 100 * job.scenes) ? "done" : i === Math.floor(job.prog / 100 * job.scenes) ? "active" : "pending";
          return (
            <Panel key={i} p={p} padding={18}>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 18, alignItems: "flex-start" }}>
                <div style={{
                  width: 50, height: 50,
                  background: sceneStatus === "active" ? p.accent : sceneStatus === "done" ? p.bg2 : p.bg2,
                  border: `1px solid ${sceneStatus === "active" ? p.accent : sceneStatus === "done" ? p.accent2 : p.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: 22,
                  color: sceneStatus === "active" ? p.bg0 : sceneStatus === "done" ? p.accent2 : p.dim, letterSpacing: ".05em",
                }}>{i + 1}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".05em" }}>SCENE {(i+1).toString().padStart(2,"0")}</div>
                    <Tag p={p} color={sceneStatus === "active" ? p.accent : sceneStatus === "done" ? p.accent2 : p.dim}>
                      {sceneStatus === "active" ? "● RENDERING" : sceneStatus === "done" ? "✓ DONE" : "○ PENDING"}
                    </Tag>
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg, lineHeight: 1.7, marginBottom: 8 }} dir="rtl">
                    {[
                      "مشهد افتتاحي · لقطة واسعة لشارع ليلي ممطر · إضاءة نيون قرمزية تنعكس على الأسفلت",
                      "زاوية منخفضة · البطل يمشي ببطء · انعكاس وجهه في بركة الماء",
                      "كلوز-أب على عينيه · ضوء النيون يتراقص · لحظة الإدراك",
                      "قطع سريع · يد تمتد لتلتقط هاتفاً مرمياً",
                      "رسالة على الشاشة · العين تتسع · صدمة هادئة",
                      "البطل يرفع رأسه نحو السماء · المطر يخفّ · أمل خفيف",
                    ][i % 6]}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".18em" }}>
                      STYLE: {job.genre} · DURATION: {Math.round(job.length / job.scenes)}s
                    </span>
                  </div>
                </div>
                {/* frame previews */}
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1].map(f => (
                    <div key={f} style={{
                      width: 90, aspectRatio: "16/9", background: p.bg2, border: `1px solid ${sceneStatus === "active" ? p.accent : p.border}`,
                      position: "relative", overflow: "hidden",
                    }}>
                      {sceneStatus !== "pending" && (
                        <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(45deg, ${p.line} 0 1px, transparent 1px 5px)`, opacity: .8 }} />
                      )}
                      <div style={{ position: "absolute", top: 3, left: 4, fontFamily: "'Space Mono', monospace", fontSize: 8, color: p.dim, letterSpacing: ".1em" }}>
                        {f === 0 ? "START" : "END"}
                      </div>
                      {sceneStatus === "pending" && (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: p.dim, fontSize: 16 }}>○</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <CrunchBtn p={p} label="توليد الإطارات" solid icon="▶" disabled={job.status === "completed"} />
        <CrunchBtn p={p} label="توليد المقاطع" icon="◇" disabled={job.status !== "frames_done" && job.status !== "rendering"} />
        <CrunchBtn p={p} label="تركيب الفيديو" icon="⊟" disabled={job.status !== "rendering"} />
      </div>
    </div>
  );
}

function DetailProgress({ p, job }) {
  const framesPct = Math.min(100, (job.prog * 1.2));
  const clipsPct = Math.max(0, Math.min(100, (job.prog - 30) * 1.4));
  const assemblyPct = Math.max(0, Math.min(100, (job.prog - 70) * 3));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>
      <Panel p={p} padding={22}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 14 }}>// PIPELINE_STATUS</div>

        {[
          { l: "STORYBOARD",      v: 100,         color: p.accent2 },
          { l: "FRAMES_GEN",      v: framesPct,   color: framesPct >= 100 ? p.accent2 : p.accent },
          { l: "CLIPS_RENDER",    v: clipsPct,    color: clipsPct >= 100 ? p.accent2 : clipsPct > 0 ? p.accent : p.dim },
          { l: "AUDIO_MIX",       v: assemblyPct, color: assemblyPct > 0 ? p.accent : p.dim },
          { l: "FINAL_ASSEMBLY",  v: assemblyPct, color: assemblyPct > 0 ? p.accent : p.dim },
        ].map((s, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em" }}>{s.l}</span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: s.color, letterSpacing: ".05em" }}>{Math.round(s.v)}%</span>
            </div>
            <div style={{ height: 3, background: p.bg2, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, width: `${s.v}%`, background: s.color, boxShadow: s.v > 0 ? `0 0 6px ${s.color}` : "none" }} />
            </div>
          </div>
        ))}
      </Panel>

      <Panel p={p} padding={22}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 14 }}>// EVENT_LOG</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, lineHeight: 1.9, letterSpacing: ".06em" }}>
          {[
            ["02:14", "ok",   "scene_03 rendered"],
            ["02:09", "ok",   "frame_batch_b OK"],
            ["02:01", "hot",  "clip_07 retry"],
            ["01:48", "ok",   "storyboard locked"],
            ["01:22", "ok",   "job_001 dispatched"],
            ["01:15", "ok",   "pipeline initialized"],
            ["01:12", "inf",  "node_assigned EU-W2"],
            ["01:10", "ok",   "auth_verified"],
          ].map((row, i) => {
            const color = row[1] === "ok" ? p.accent2 : row[1] === "hot" ? p.accent : p.warn;
            return (
              <div key={i} style={{ display: "flex", gap: 8 }} dir="ltr">
                <span style={{ color: p.dim }}>{row[0]}</span>
                <span style={{ color, width: 38 }}>[{row[1].toUpperCase()}]</span>
                <span style={{ color: p.fg, flex: 1 }}>{row[2]}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function DetailOutput({ p, job }) {
  if (job.status !== "completed") {
    return (
      <Panel p={p} padding={56} style={{ textAlign: "center" }}>
        <Reticle p={p} size={100} color={p.dim} />
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: p.fg, marginTop: 20, letterSpacing: ".05em" }}>
          الفيديو لم يكتمل بعد
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em", marginTop: 8 }}>
          ↳ يظهر هنا عند اكتمال خط الإنتاج
        </div>
      </Panel>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
      <Panel p={p} padding={0}>
        <div style={{ position: "relative", aspectRatio: "16/9", background: p.bg0, overflow: "hidden" }}>
          <AuroraLoader p={p} interactive intensity={0.4} height="100%" />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 80, height: 80, borderRadius: "50%", background: `${p.bg0}cc`, border: `1px solid ${p.accent}`, display: "flex", alignItems: "center", justifyContent: "center", color: p.accent, fontSize: 32, cursor: "pointer" }}>▶</div>
          <Corners p={p} size={14} inset={8} color={p.accent} />
          {/* timeline */}
          <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: i % 5 === 0 ? 10 : 5, background: i < 14 ? p.accent : `${p.border}` }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.fg, letterSpacing: ".15em", textShadow: "0 0 6px rgba(0,0,0,.7)" }}>
              <span>00:10 / {Math.floor(job.length/60)}:{(job.length%60).toString().padStart(2,"0")}</span>
              <span>4K · 60FPS · {Math.round(job.length / 10)}MB</span>
            </div>
          </div>
        </div>
      </Panel>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Panel p={p} padding={18}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// EXPORT</div>
          <CrunchBtn p={p} label="تحميل MP4 · 4K" solid icon="↓" full />
          <div style={{ height: 4 }} />
          <CrunchBtn p={p} label="تحميل MP4 · 1080p" small full />
          <div style={{ height: 4 }} />
          <CrunchBtn p={p} label="تحميل GIF" small full />
        </Panel>

        <Panel p={p} padding={18}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// PUBLISH</div>
          {[
            ["Instagram", "IG"],
            ["TikTok",    "TT"],
            ["YouTube",   "YT"],
            ["X",         "X"],
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 3 ? `1px dashed ${p.border}` : "none" }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg }}>{s[0]}</span>
              <CrunchBtn p={p} label="نشر" small icon="↗" />
            </div>
          ))}
        </Panel>

        <Panel p={p} padding={18}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// META</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 5, columnGap: 14, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".08em" }}>
            <span>cred used</span><span style={{ color: p.accent }}>{job.cred}</span>
            <span>render time</span><span style={{ color: p.fg }}>4m 12s</span>
            <span>frames</span><span style={{ color: p.fg }}>{job.scenes * 2}</span>
            <span>clips</span><span style={{ color: p.fg }}>{job.scenes}</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// =========================================================================
// SETTINGS
// =========================================================================
const SETTINGS_TABS = [
  { id: "higgsfield", l: "Higgsfield",  desc: "API key للتوليد",   color: null },
  { id: "instagram",  l: "Instagram",   desc: "نشر مباشر",          color: "#e1306c" },
  { id: "youtube",    l: "YouTube",     desc: "نشر مباشر",          color: "#ff0000" },
  { id: "tiktok",     l: "TikTok",      desc: "نشر مباشر",          color: "#fff" },
  { id: "x",          l: "X · Twitter", desc: "نشر مباشر",          color: "#fff" },
];

function SettingsPage({ p, navigate, credits = 4820 }) {
  const [tab, setTab] = React.useState("higgsfield");
  const [creds, setCreds] = React.useState({});
  const [show, setShow] = React.useState({});
  const [valid, setValid] = React.useState({});

  const set = (k, v) => setCreds({ ...creds, [k]: v });

  return (
    <PageFrame p={p} density={0.3}>
      <AuthedNav p={p} current="settings" navigate={navigate} credits={credits} onLogout={() => navigate("auth")} />

      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
        <SectionHead p={p} code="// API_CREDENTIALS" title="الإعدادات" sub="إدارة المفاتيح والاتصالات الخارجية" />

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 18 }}>
          {/* sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {SETTINGS_TABS.map(t => {
              const on = tab === t.id;
              const validated = valid[t.id];
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: "14px 16px", background: on ? p.bg2 : p.bg1,
                  border: `1px solid ${on ? p.accent : p.border}`,
                  color: p.fg, cursor: "pointer", textAlign: "right",
                  position: "relative",
                  clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
                }}>
                  {on && <div style={{ position: "absolute", top: 0, right: 0, width: 3, height: "100%", background: p.accent }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: ".1em", color: on ? p.fg : p.dim }}>{t.l}</div>
                    {validated && <span style={{ width: 7, height: 7, background: p.accent2, transform: "rotate(45deg)" }} />}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".12em", marginTop: 2 }}>{t.desc}</div>
                </button>
              );
            })}

            {/* Security note */}
            <div style={{
              marginTop: 14, padding: 14, background: `${p.accent2}11`,
              border: `1px solid ${p.accent2}33`, borderRight: `2px solid ${p.accent2}`,
            }}>
              <Tag p={p} color={p.accent2}>⌬ SECURE</Tag>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.fg, lineHeight: 1.7, marginTop: 6 }}>
                كل المفاتيح مشفرة. لا نخزّن كلمات السر، ولا نشارك بياناتك مع أطراف ثالثة.
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <CrunchBtn p={p} label="تسجيل خروج" icon="↯" full onClick={() => window.CM_AUTH?.logout?.(navigate)} />
            </div>
          </div>

          {/* content */}
          <Panel p={p} padding={26}>
            <SettingsTab p={p} tab={tab} creds={creds} setCred={set} show={show} setShow={setShow} valid={valid} setValid={setValid} />
          </Panel>
        </div>
      </div>
    </PageFrame>
  );
}

function SettingsTab({ p, tab, creds, setCred, show, setShow, valid, setValid }) {
  const fields = ({
    higgsfield: [["higgsfield_api_key", "API Key", "Higgsfield API key"]],
    instagram:  [["ig_token",  "Access Token",       "Instagram access token"],
                 ["ig_acc_id", "Business Account ID", "IG business account ID"]],
    youtube:    [["yt_token",  "Access Token",       "YouTube access token"]],
    tiktok:     [["tt_token",  "Access Token",       "TikTok access token"],
                 ["tt_open_id","Open ID",            "TikTok Open ID"]],
    x:          [["x_token",   "Bearer Token",       "X API bearer token"],
                 ["x_secret",  "Secret",             "X consumer secret"]],
  })[tab];

  const meta = ({
    higgsfield: { name: "Higgsfield", desc: "محرك التوليد الأساسي. احصل على المفتاح من", link: "higgsfield.ai" },
    instagram:  { name: "Instagram",  desc: "حساب أعمال للنشر التلقائي. ربط عبر",      link: "developers.facebook.com" },
    youtube:    { name: "YouTube",    desc: "حساب YouTube للنشر التلقائي. ربط عبر",   link: "console.cloud.google.com" },
    tiktok:     { name: "TikTok",     desc: "حساب TikTok للنشر التلقائي. ربط عبر",    link: "developers.tiktok.com" },
    x:          { name: "X (Twitter)",desc: "حساب X للنشر التلقائي. ربط عبر",         link: "developer.x.com" },
  })[tab];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, paddingBottom: 18, borderBottom: `1px solid ${p.border}` }}>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em", textTransform: "uppercase" }}>// {tab.toUpperCase()}_CONFIG</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: p.fg, letterSpacing: ".05em", marginTop: 4, lineHeight: 1 }}>{meta.name}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.dim, marginTop: 6 }} dir="rtl">
            {meta.desc} <a style={{ color: p.accent, textDecoration: "underline", cursor: "pointer" }}>{meta.link}</a>
          </div>
        </div>
        {valid[tab] ? <Tag p={p} color={p.accent2} glow>✓ VALIDATED</Tag> : <Tag p={p} color={p.warn}>○ UNCONFIGURED</Tag>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {fields.map(([key, label, placeholder]) => (
          <div key={key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>▸ {label}</span>
              <button onClick={() => setShow({ ...show, [key]: !show[key] })} style={{ background: "transparent", border: "none", color: p.dim, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: ".18em", cursor: "pointer" }}>
                {show[key] ? "● HIDE" : "○ SHOW"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type={show[key] ? "text" : "password"} placeholder={placeholder}
                value={creds[key] || ""} onChange={(e) => setCred(key, e.target.value)}
                style={{
                  flex: 1, background: p.bg0, border: `1px solid ${p.border}`, borderRight: `2px solid ${p.accent}`,
                  color: p.fg, padding: "12px 14px",
                  fontFamily: "'Space Mono', monospace", fontSize: 13, outline: "none", direction: "ltr",
                  letterSpacing: ".05em",
                }} />
              <button onClick={() => setValid({ ...valid, [tab]: true })} style={{
                padding: "0 16px", background: p.bg2, border: `1px solid ${p.border}`, color: p.dim,
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, letterSpacing: ".15em",
                cursor: "pointer",
              }}>VALIDATE</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22, paddingTop: 22, borderTop: `1px solid ${p.border}`, display: "flex", gap: 10 }}>
        <CrunchBtn p={p} label="حفظ" solid icon="▶" onClick={() => setValid({ ...valid, [tab]: true })} />
        <CrunchBtn p={p} label="حذف الإعدادات" />
      </div>
    </>
  );
}

// =========================================================================
// FILM PROJECTS HUB — list/create/rename/delete film projects before entering Create.
// MARKET PROJECTS HUB — same for campaigns.
// Both designed for tactical "ops control" feel, blackalgo-influenced metrics-forward layout.
// =========================================================================

// Storage helpers — projects persist across reloads
const STORAGE_KEY = "cm_projects_v1";

function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  // seed sample data
  return {
    film: [
      { id: "f1", name: "حملة إطلاق العطر",   created: Date.now() - 86400e3 * 2,  lastRun: Date.now() - 600e3,    runs: 4, cred: 245, status: "rendering",  duration: 30 },
      { id: "f2", name: "وثائقي الحضارات",     created: Date.now() - 86400e3 * 7,  lastRun: Date.now() - 3600e3,   runs: 12,cred: 540, status: "completed",  duration: 300 },
      { id: "f3", name: "إعلان منتج جديد",     created: Date.now() - 86400e3 * 3,  lastRun: Date.now() - 86400e3,  runs: 2, cred: 60,  status: "frames_gen", duration: 15 },
      { id: "f4", name: "فيلم قصير — الذاكرة", created: Date.now() - 86400e3 * 14, lastRun: Date.now() - 86400e3*2,runs: 1, cred: 180, status: "draft",      duration: 90 },
    ],
    market: [
      { id: "m1", name: "كافيه الرياض · إطلاق",      created: Date.now() - 86400e3 * 1, lastRun: Date.now() - 300e3,    runs: 8,  cred: 320, status: "active",     mode: "campaign" },
      { id: "m2", name: "ترندات مكملات رياضية",      created: Date.now() - 86400e3 * 5, lastRun: Date.now() - 86400e3,  runs: 23, cred: 580, status: "completed",  mode: "trend" },
      { id: "m3", name: "خطة محتوى أسبوعية · فاشن",   created: Date.now() - 86400e3 * 3, lastRun: Date.now() - 3600e3,   runs: 5,  cred: 150, status: "active",     mode: "content" },
    ],
  };
}
function saveProjects(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function timeAgo(t) {
  const d = Date.now() - t;
  if (d < 60e3) return "الآن";
  if (d < 3600e3) return `منذ ${Math.floor(d/60e3)}د`;
  if (d < 86400e3) return `منذ ${Math.floor(d/3600e3)}س`;
  if (d < 86400e3 * 7) return `منذ ${Math.floor(d/86400e3)}ي`;
  return `منذ ${Math.floor(d/(86400e3*7))} أسابيع`;
}

function FilmHubPage({ p, navigate, credits = 4820 }) {
  return <ToolHubPage p={p} navigate={navigate} credits={credits} tool="film" />;
}
function MarketHubPage({ p, navigate, credits = 4820 }) {
  return <ToolHubPage p={p} navigate={navigate} credits={credits} tool="market" />;
}

function ToolHubPage({ p, navigate, credits, tool }) {
  const [store, setStore] = React.useState(loadProjects);
  React.useEffect(() => saveProjects(store), [store]);

  const items = store[tool] || [];

  const meta = tool === "film" ? {
    code:     "// FILM_OPS_CONTROL",
    title:    "صانع الأفلام",
    sub:      "اختر مشروعاً للدخول · أو ابدأ مشروع جديد",
    nounSing: "مشروع",
    nounPlur: "المشاريع",
    newCta:   "مشروع جديد",
    navTarget:"create",
    current:  "film-hub",
    accent:   p.accent,
    placeholder: "حملة إطلاق العطر · سبتمبر",
  } : {
    code:     "// MARKETING_OPS_CONTROL",
    title:    "وكيل التسويق",
    sub:      "اختر حملة · أو ابدأ حملة جديدة",
    nounSing: "حملة",
    nounPlur: "الحملات",
    newCta:   "حملة جديدة",
    navTarget:"market",
    current:  "market-hub",
    accent:   p.accent,
    placeholder: "إطلاق منتج · الربع الرابع",
  };

  // analytics
  const totalRuns = items.reduce((a, b) => a + b.runs, 0);
  const totalCred = items.reduce((a, b) => a + b.cred, 0);
  const activeCount = items.filter(j => ["rendering","frames_gen","active","queued"].includes(j.status)).length;
  const completedCount = items.filter(j => j.status === "completed").length;

  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("recent");
  const [view, setView] = React.useState("list");
  const [showNew, setShowNew] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [renameId, setRenameId] = React.useState(null);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [confirmDel, setConfirmDel] = React.useState(null);

  let filtered = items.filter(j => j.name.includes(search));
  filtered = [...filtered].sort((a, b) => {
    if (sort === "recent") return b.lastRun - a.lastRun;
    if (sort === "name")   return a.name.localeCompare(b.name, "ar");
    if (sort === "runs")   return b.runs - a.runs;
    if (sort === "cred")   return b.cred - a.cred;
    return 0;
  });

  function addProject() {
    if (!newName.trim()) return;
    const id = `${tool[0]}${Date.now()}`;
    const proj = tool === "film"
      ? { id, name: newName.trim(), created: Date.now(), lastRun: Date.now(), runs: 0, cred: 0, status: "draft", duration: 30 }
      : { id, name: newName.trim(), created: Date.now(), lastRun: Date.now(), runs: 0, cred: 0, status: "draft", mode: "campaign" };
    setStore({ ...store, [tool]: [proj, ...items] });
    setNewName(""); setShowNew(false);
  }
  function commitRename(id) {
    if (!renameDraft.trim()) { setRenameId(null); return; }
    setStore({
      ...store,
      [tool]: items.map(j => j.id === id ? { ...j, name: renameDraft.trim() } : j),
    });
    setRenameId(null); setRenameDraft("");
  }
  function delProject(id) {
    setStore({ ...store, [tool]: items.filter(j => j.id !== id) });
    setConfirmDel(null);
  }

  return (
    <PageFrame p={p} density={0.35}>
      <AuthedNav p={p} current={meta.current} navigate={navigate} credits={credits} onLogout={() => navigate("auth")} />

      <div style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>
        <SectionHead p={p} code={meta.code} title={meta.title} sub={meta.sub}
          right={<CrunchBtn p={p} label={meta.newCta} solid icon="+" onClick={() => setShowNew(true)} />}
        />

        {/* STATS STRIP */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 22 }}>
          <StatTile p={p} label={meta.nounPlur} value={items.length} sub={`${activeCount} نشط · ${completedCount} مكتمل`} accent />
          <StatTile p={p} label="RUNS_EXECUTED" value={totalRuns}            sub="عبر كل المشاريع" />
          <StatTile p={p} label="CRED_BURNED"   value={totalCred.toLocaleString()} suffix="CRED" sub="مجموع كلفة المشاريع" />
          <StatTile p={p} label="LAST_ACTIVITY" value={items.length ? timeAgo(Math.max(...items.map(i => i.lastRun))) : "—"} mono sub="منذ آخر تشغيل" />
        </div>

        {/* CONTROL BAR */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: p.dim, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".18em" }}>⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث..." style={{
                padding: "8px 30px 8px 14px", background: p.bg1, border: `1px solid ${p.border}`, color: p.fg,
                fontFamily: "'Inter', sans-serif", fontSize: 13, outline: "none", direction: "rtl", width: 280, height: 38,
              }} />
            </div>
            <TacticalDropdown p={p} value={sort} onChange={setSort}
              prefix="SORT"
              options={[
                { value: "recent", label: "Recent",   hint: "آخر تشغيل" },
                { value: "name",   label: "Name A→Z", hint: "أبجدياً" },
                { value: "runs",   label: "Runs",     hint: "الأكثر تشغيلاً" },
                { value: "cred",   label: "Cred",     hint: "الأكثر صرفاً" },
              ]}
              width={210}
            />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "list", g: "≡" },
              { id: "grid", g: "▦" },
            ].map(v => {
              const on = view === v.id;
              return (
                <button key={v.id} onClick={() => setView(v.id)} style={{
                  width: 38, height: 38,
                  background: on ? p.accent : "transparent",
                  color: on ? p.bg0 : p.dim,
                  border: `1px solid ${on ? p.accent : p.border}`,
                  fontFamily: "'Space Mono', monospace", fontSize: 16,
                  cursor: "pointer",
                }}>{v.g}</button>
              );
            })}
          </div>
        </div>

        {/* LIST / GRID / EMPTY */}
        {filtered.length === 0 ? (
          <EmptyHub p={p} tool={tool} meta={meta} onNew={() => setShowNew(true)} hasItems={items.length > 0} />
        ) : view === "list" ? (
          <Panel p={p} padding={0}>
            {/* row header */}
            <div style={{
              display: "grid", gridTemplateColumns: tool === "film"
                ? "1.6fr 110px 90px 90px 130px 130px 130px"
                : "1.6fr 110px 90px 90px 130px 130px 130px",
              gap: 14, alignItems: "center", padding: "10px 18px",
              fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em",
              borderBottom: `1px solid ${p.border}`,
            }}>
              <span>{meta.nounSing.toUpperCase()}</span>
              <span>STATUS</span>
              <span style={{ textAlign: "center" }}>RUNS</span>
              <span style={{ textAlign: "center" }}>CRED</span>
              <span>LAST_RUN</span>
              <span>CREATED</span>
              <span style={{ textAlign: "left" }}>ACTIONS</span>
            </div>
            {filtered.map((j, i) => (
              <ProjectRow
                key={j.id} p={p} job={j} tool={tool}
                lastInList={i === filtered.length - 1}
                onOpen={() => navigate(meta.navTarget, { project: j })}
                renaming={renameId === j.id}
                renameDraft={renameDraft}
                onRenameStart={() => { setRenameId(j.id); setRenameDraft(j.name); }}
                onRenameChange={setRenameDraft}
                onRenameCommit={() => commitRename(j.id)}
                onRenameCancel={() => setRenameId(null)}
                onDelete={() => setConfirmDel(j.id)}
              />
            ))}
          </Panel>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {filtered.map(j => (
              <ProjectCardHub
                key={j.id} p={p} job={j} tool={tool}
                onOpen={() => navigate(meta.navTarget, { project: j })}
                onRename={() => { setRenameId(j.id); setRenameDraft(j.name); }}
                onDelete={() => setConfirmDel(j.id)}
                renaming={renameId === j.id}
                renameDraft={renameDraft}
                onRenameChange={setRenameDraft}
                onRenameCommit={() => commitRename(j.id)}
                onRenameCancel={() => setRenameId(null)}
              />
            ))}
          </div>
        )}
      </div>

      {/* NEW PROJECT MODAL */}
      {showNew && (
        <Modal p={p} onClose={() => setShowNew(false)} title={meta.newCta} code={`// NEW_${tool.toUpperCase()}_PROJECT`}>
          <TacticalInput p={p} label={`اسم ${meta.nounSing}`} value={newName} onChange={setNewName} placeholder={meta.placeholder} />
          <div style={{ marginTop: 6, fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".12em" }}>
            ↳ يمكنك التعديل لاحقاً
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <CrunchBtn p={p} label="إلغاء" full onClick={() => setShowNew(false)} />
            <CrunchBtn p={p} label={`إنشاء وفتح`} solid icon="▶" full onClick={addProject} disabled={!newName.trim()} />
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRM */}
      {confirmDel && (
        <Modal p={p} onClose={() => setConfirmDel(null)} title="حذف نهائي؟" code="// DELETE_CONFIRM" warn>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: p.fg, lineHeight: 1.7 }}>
            سيتم حذف <span style={{ color: p.accent, fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: ".06em" }}>"{(items.find(j => j.id === confirmDel) || {}).name}"</span> نهائياً.
            <br/>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.warn, letterSpacing: ".15em" }}>
              ▲ لا يمكن التراجع · كل البيانات المرتبطة ستفقد
            </span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <CrunchBtn p={p} label="إلغاء" full onClick={() => setConfirmDel(null)} />
            <CrunchBtn p={p} label="حذف نهائي" danger icon="!" full onClick={() => delProject(confirmDel)} />
          </div>
        </Modal>
      )}
    </PageFrame>
  );
}

// ---------- StatTile (top stats strip) ----------
function StatTile({ p, label, value, sub, mono, accent, suffix }) {
  return (
    <div style={{
      padding: 16, background: p.bg1, border: `1px solid ${p.border}`,
      position: "relative",
      clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 24, height: 2, background: accent ? p.accent : p.dim }} />
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em", marginBottom: 6 }}>{label}</div>
      <div style={{
        fontFamily: mono ? "'Space Mono', monospace" : "'Bebas Neue', sans-serif",
        fontSize: mono ? 18 : 34,
        color: accent ? p.accent : p.fg,
        lineHeight: 1, letterSpacing: ".04em",
      }}>
        {value}{suffix && <span style={{ fontSize: 12, color: p.dim, marginRight: 6, fontFamily: "'Space Mono', monospace" }}>{suffix}</span>}
      </div>
      {sub && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".15em", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ---------- Single row in the list view ----------
function ProjectRow({ p, job, tool, lastInList, onOpen, renaming, renameDraft, onRenameStart, onRenameChange, onRenameCommit, onRenameCancel, onDelete }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "grid", gridTemplateColumns: "1.6fr 110px 90px 90px 130px 130px 130px",
        gap: 14, alignItems: "center", padding: "14px 18px",
        borderBottom: lastInList ? "none" : `1px solid ${p.border}`,
        background: hover ? p.bg2 : "transparent",
        transition: "background .15s",
      }}>
      {/* name */}
      <div>
        {renaming ? (
          <input
            autoFocus value={renameDraft} onChange={(e) => onRenameChange(e.target.value)}
            onBlur={onRenameCommit}
            onKeyDown={(e) => { if (e.key === "Enter") onRenameCommit(); if (e.key === "Escape") onRenameCancel(); }}
            style={{
              width: "100%", background: p.bg0, border: `1px solid ${p.accent}`, borderRight: `2px solid ${p.accent}`,
              color: p.fg, padding: "6px 10px", fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: ".06em",
              outline: "none", direction: "rtl",
            }}
          />
        ) : (
          <div onClick={onOpen} style={{ cursor: "pointer" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>
              {tool === "film" ? "FILM" : "CAMPAIGN"}//{job.id.toUpperCase()}
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, color: p.fg, letterSpacing: ".06em", lineHeight: 1.2, marginTop: 2 }}>
              {job.name}
            </div>
          </div>
        )}
      </div>
      <Tag p={p} color={statusColor(p, job.status)}>{statusLabel(job.status)}</Tag>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".05em", textAlign: "center" }}>{job.runs}</span>
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.accent, letterSpacing: ".05em", textAlign: "center" }}>{job.cred}</span>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".12em" }}>{timeAgo(job.lastRun)}</span>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".12em" }}>{timeAgo(job.created)}</span>
      <div style={{ display: "flex", gap: 4, justifyContent: "flex-start" }}>
        <IconButton p={p} title="فتح" onClick={onOpen}>▶</IconButton>
        <IconButton p={p} title="إعادة تسمية" onClick={onRenameStart}>✎</IconButton>
        <IconButton p={p} title="حذف" onClick={onDelete} danger>✕</IconButton>
      </div>
    </div>
  );
}

function IconButton({ p, children, onClick, danger, title }) {
  const [hover, setHover] = React.useState(false);
  const c = danger ? p.warn : p.accent;
  return (
    <button title={title} onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28, background: hover ? `${c}22` : "transparent",
        border: `1px solid ${hover ? c : p.border}`,
        color: hover ? c : p.dim,
        cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .15s",
      }}>
      {children}
    </button>
  );
}

// ---------- Grid card view ----------
function ProjectCardHub({ p, job, tool, onOpen, onRename, onDelete, renaming, renameDraft, onRenameChange, onRenameCommit, onRenameCancel }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", padding: 18, background: p.bg1,
        border: `1px solid ${hover ? p.accent : p.border}`,
        cursor: "pointer", transition: "all .15s",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)",
        transform: hover ? "translateY(-3px)" : "translateY(0)",
      }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: hover ? 60 : 24, height: 2, background: p.accent, transition: "width .25s" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <Tag p={p} color={statusColor(p, job.status)}>{statusLabel(job.status)}</Tag>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>
          {(tool === "film" ? "FILM" : "CAMP") + "//" + job.id.toUpperCase()}
        </div>
      </div>

      {renaming ? (
        <input
          autoFocus value={renameDraft} onChange={(e) => onRenameChange(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={(e) => { if (e.key === "Enter") onRenameCommit(); if (e.key === "Escape") onRenameCancel(); }}
          style={{
            width: "100%", background: p.bg0, border: `1px solid ${p.accent}`, borderRight: `2px solid ${p.accent}`,
            color: p.fg, padding: "8px 10px", fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: ".06em",
            outline: "none", direction: "rtl", marginBottom: 12,
          }}
        />
      ) : (
        <div onClick={onOpen} style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: p.fg, letterSpacing: ".06em", lineHeight: 1.2, minHeight: 54, marginBottom: 12 }}>
          {job.name}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, paddingTop: 10, borderTop: `1px dashed ${p.border}`, marginBottom: 12 }}>
        <Mini p={p} l="RUNS" v={job.runs} />
        <Mini p={p} l="CRED" v={job.cred} accent />
        <Mini p={p} l="LAST" v={timeAgo(job.lastRun)} mono />
        <Mini p={p} l="MADE" v={timeAgo(job.created)} mono />
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={(e) => { e.stopPropagation(); onOpen(); }} style={{
          flex: 1, padding: "8px 0", background: p.accent, color: p.bg0,
          border: "none", fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, letterSpacing: ".15em",
          cursor: "pointer", clipPath: "polygon(0 0, 100% 0, 100% 75%, 92% 100%, 0 100%)",
        }}>فتح ←</button>
        <IconButton p={p} title="إعادة تسمية" onClick={onRename}>✎</IconButton>
        <IconButton p={p} title="حذف" onClick={onDelete} danger>✕</IconButton>
      </div>
    </div>
  );
}

function Mini({ p, l, v, accent, mono }) {
  return (
    <div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, color: p.dim, letterSpacing: ".22em" }}>{l}</div>
      <div style={{
        fontFamily: mono ? "'Space Mono', monospace" : "'Bebas Neue', sans-serif",
        fontSize: mono ? 11 : 18, color: accent ? p.accent : p.fg, letterSpacing: ".04em",
        marginTop: 1,
      }}>{v}</div>
    </div>
  );
}

// ---------- Empty state ----------
function EmptyHub({ p, tool, meta, onNew, hasItems }) {
  return (
    <Panel p={p} padding={56} style={{ textAlign: "center" }}>
      <Reticle p={p} size={90} color={p.dim} />
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: p.fg, letterSpacing: ".05em", marginTop: 20 }}>
        {hasItems ? "لا توجد نتائج" : `لا توجد ${meta.nounPlur}`}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.dim, marginTop: 8 }}>
        {hasItems ? "جرب كلمات بحث أخرى" : `أنشئ أول ${meta.nounSing} لك للبدء`}
      </div>
      {!hasItems && (
        <div style={{ marginTop: 22 }}>
          <CrunchBtn p={p} label={meta.newCta} solid icon="+" onClick={onNew} />
        </div>
      )}
    </Panel>
  );
}

// ---------- Modal ----------
function Modal({ p, onClose, title, code, warn, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.88)", backdropFilter: "blur(8px)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480, background: p.bg1,
        border: `1px solid ${warn ? p.warn : p.accent}`, padding: 26, position: "relative",
        clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 80, height: 2, background: warn ? p.warn : p.accent }} />
        <Corners p={p} size={10} inset={5} color={warn ? p.warn : p.accent} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <Tag p={p} color={warn ? p.warn : p.accent}>{code}</Tag>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: p.fg, letterSpacing: ".05em", marginTop: 6, lineHeight: 1 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${p.border}`, color: p.dim, width: 30, height: 30, cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 14 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, { FilmHubPage, MarketHubPage, ToolHubPage, loadProjects, saveProjects, timeAgo, Modal });


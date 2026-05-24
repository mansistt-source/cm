// UGC Avatar Creator — simple focused page.
// Upload 3-6 photos of a person → train avatar → use across platform.

const { useState: avUseState, useRef: avUseRef, useEffect: avUseEffect } = React;

function UgcAvatarPage({ p, navigate, credits = 4820 }) {
  const [photos, setPhotos] = avUseState([]);
  const [name, setName] = avUseState("");
  const [gender, setGender] = avUseState("female");
  const [style, setStyle] = avUseState("natural");
  const [training, setTraining] = avUseState(false);
  const [progress, setProgress] = avUseState(0);
  const [stage, setStage] = avUseState("");
  const [done, setDone] = avUseState(false);
  const fileRef = avUseRef(null);

  const minPhotos = 3, maxPhotos = 8;
  const ready = photos.length >= minPhotos && name.trim();

  function handleFiles(files) {
    const incoming = Array.from(files).slice(0, maxPhotos - photos.length);
    const next = incoming.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      url: URL.createObjectURL(f),
    }));
    setPhotos([...photos, ...next]);
  }
  function removePhoto(id) {
    setPhotos(photos.filter(p => p.id !== id));
  }

  function train() {
    setTraining(true); setDone(false); setProgress(0);
    const stages = [
      [8,   "تحليل الوجه...",          "FACE_ANALYSIS"],
      [22,  "استخراج ملامح الهوية...",   "IDENTITY_LOCK"],
      [40,  "بناء نموذج الزوايا...",     "ANGLE_MODEL"],
      [62,  "تدريب على التعابير...",     "EXPRESSION_TRAIN"],
      [82,  "مزامنة الإضاءة...",        "LIGHT_SYNC"],
      [100, "✓ الأفاتار جاهز",          "READY"],
    ];
    let i = 0;
    const tick = () => {
      if (i >= stages.length) { setTraining(false); setDone(true); return; }
      const [pr, msg, st] = stages[i];
      setProgress(pr); setStage(msg);
      i++;
      setTimeout(tick, 900 + Math.random() * 400);
    };
    setTimeout(tick, 400);
  }

  return (
    <PageFrame p={p} density={0.3}>
     <AuthedNav p={p} current="ugc-avatar" navigate={navigate} credits={credits} onLogout={() => navigate("auth")} />

      <div style={{ padding: "26px 32px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".18em", textTransform: "uppercase" }}>
          <a onClick={() => navigate("market-hub")} style={{ color: p.dim, cursor: "pointer", textDecoration: "none" }}>الأدوات</a>
          <span>◂</span>
          <span style={{ color: p.fg }}>UGC AVATAR</span>
        </div>

        <SectionHead p={p} code="// UGC_AVATAR_BUILDER" title="حوّل شخصاً إلى أفاتار"
          sub="ارفع 3-8 صور · النظام يبني أفاتار UGC قابل لإعادة الاستخدام في كل الهوكس"
          right={done && <Tag p={p} color={p.accent2} glow>✓ READY</Tag>}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18 }}>

          {/* LEFT: input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* UPLOAD ZONE */}
            <Panel p={p} padding={20}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em" }}>// PHOTOS · {photos.length}/{maxPhotos}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: photos.length >= minPhotos ? p.accent2 : p.dim, letterSpacing: ".18em" }}>
                  {photos.length >= minPhotos ? "✓ MIN MET" : `نقص ${minPhotos - photos.length}`}
                </div>
              </div>

              {/* drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                style={{
                  padding: "32px 20px", border: `1px dashed ${p.border}`,
                  background: p.bg2, textAlign: "center", cursor: "pointer", marginBottom: 12,
                  position: "relative", overflow: "hidden",
                }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: p.accent, lineHeight: 1, marginBottom: 8 }}>↑</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".08em" }}>اسحب الصور هنا</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".15em", marginTop: 4 }}>أو اضغط للاختيار · JPG · PNG · ≤ 8MB</div>
                <input type="file" ref={fileRef} multiple accept="image/*" style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />
              </div>

              {/* photo grid */}
              {photos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {photos.map((ph, i) => (
                    <div key={ph.id} style={{
                      aspectRatio: "1", background: p.bg0, border: `1px solid ${p.accent}`, position: "relative", overflow: "hidden",
                    }}>
                      <img src={ph.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", top: 3, left: 4, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.fg, letterSpacing: ".15em", textShadow: "0 0 4px rgba(0,0,0,.8)" }}>0{i+1}</div>
                      <button onClick={() => removePhoto(ph.id)} style={{
                        position: "absolute", top: 3, right: 3, width: 18, height: 18,
                        background: `${p.bg0}cc`, border: `1px solid ${p.warn}`, color: p.warn,
                        cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>✕</button>
                    </div>
                  ))}
                  {/* placeholders to show remaining slots */}
                  {Array.from({ length: Math.max(0, minPhotos - photos.length) }).map((_, i) => (
                    <div key={`empty-${i}`} style={{
                      aspectRatio: "1", border: `1px dashed ${p.border}`, background: "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".15em",
                    }}>EMPTY</div>
                  ))}
                </div>
              )}

              {/* guidance */}
              <div style={{ marginTop: 14, padding: 10, background: `${p.accent2}11`, border: `1px solid ${p.accent2}33`, borderRight: `2px solid ${p.accent2}` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent2, letterSpacing: ".18em", marginBottom: 4 }}>◇ نصائح للأفضل</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: p.fg, lineHeight: 1.7 }} dir="rtl">
                  • وجه واضح · إضاءة جيدة · بدون نظارة شمسية<br/>
                  • زوايا مختلفة (وجه · ¾ · جانب)<br/>
                  • تعابير متنوعة (هادئ · مبتسم)
                </div>
              </div>
            </Panel>

            {/* AVATAR META */}
            <Panel p={p} padding={20}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 12 }}>// AVATAR_META</div>

              <TacticalInput p={p} label="اسم الأفاتار" value={name} onChange={setName} placeholder="مثال · ليلى" />

              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 6 }}>▸ الجنس</div>
                <div style={{ display: "flex", gap: 3 }}>
                  {[
                    { id: "female", l: "أنثى" },
                    { id: "male",   l: "ذكر" },
                  ].map(o => {
                    const on = gender === o.id;
                    return (
                      <button key={o.id} onClick={() => setGender(o.id)} style={{
                        flex: 1, padding: "10px 0",
                        background: on ? p.accent : "transparent",
                        color: on ? p.bg0 : p.dim,
                        border: `1px solid ${on ? p.accent : p.border}`,
                        fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: ".15em",
                        cursor: "pointer",
                      }}>{o.l}</button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 6 }}>▸ ستايل الأفاتار</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
                  {[
                    { id: "natural",   l: "طبيعي",  d: "UGC حقيقي" },
                    { id: "polished",  l: "مصقول",  d: "احترافي" },
                    { id: "stylized",  l: "مصمم",   d: "فني" },
                  ].map(s => {
                    const on = style === s.id;
                    return (
                      <button key={s.id} onClick={() => setStyle(s.id)} style={{
                        padding: "10px 8px",
                        background: on ? `${p.accent}22` : p.bg2,
                        color: p.fg, border: `1px solid ${on ? p.accent : p.border}`,
                        cursor: "pointer", textAlign: "right",
                      }}>
                        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: on ? p.accent : p.fg, letterSpacing: ".08em" }}>{s.l}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".12em", marginTop: 2 }}>{s.d}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Panel>

            <CrunchBtn p={p}
              label={training ? "تدريب..." : done ? "تصدير الأفاتار" : `ابدأ التدريب · 80 CRED`}
              solid icon="▶" full disabled={!ready || training}
              onClick={() => done ? null : train()}
            />
          </div>

          {/* RIGHT: preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel p={p} padding={0}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${p.border}`, display: "flex", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <PulseRing p={p} size={10} color={training ? p.accent : done ? p.accent2 : p.dim} />
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
                    AVATAR · {training ? "TRAINING" : done ? "READY" : "STANDBY"}
                  </span>
                </div>
                {(training || done) && <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.accent }}>{progress}%</span>}
              </div>

              <div style={{ position: "relative", aspectRatio: "1", overflow: "hidden" }}>
                {(training || done) ? (
                  <>
                    <AuroraLoader p={p} interactive intensity={training ? 1.3 : 0.5} height="100%" />
                    {done && photos[0] && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{
                          width: "60%", aspectRatio: "1", borderRadius: "50%",
                          background: `url(${photos[0].url}) center/cover`,
                          border: `2px solid ${p.accent}`,
                          boxShadow: `0 0 30px ${p.glow}`,
                        }} />
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                    <Reticle p={p} size={120} color={p.dim} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>ارفع الصور وابدأ</span>
                  </div>
                )}
                <Corners p={p} size={14} inset={8} color={done ? p.accent2 : p.accent} />
              </div>

              {training && (
                <div style={{ padding: 14, borderTop: `1px solid ${p.border}` }}>
                  <ThinkingPulse p={p} label={stage} />
                  <div style={{ marginTop: 10, height: 3, background: p.bg2 }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: p.accent, boxShadow: `0 0 8px ${p.accent}`, transition: "width .4s" }} />
                  </div>
                </div>
              )}
            </Panel>

            {done && (
              <Panel p={p} padding={16}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// USE_AVATAR_IN</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <CrunchBtn p={p} label="هوكس فيرلية ←" full icon="◢" onClick={() => navigate("market-hub")} />
                  <CrunchBtn p={p} label="ترويج تطبيق ←" full icon="↗" />
                  <CrunchBtn p={p} label="حملة كاملة ←" full icon="◆" />
                </div>
              </Panel>
            )}

            {/* sample outputs preview */}
            <Panel p={p} padding={16}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 10 }}>// AVATAR_SPEC</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, lineHeight: 2, letterSpacing: ".08em" }} dir="rtl">
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>الاسم</span><span style={{ color: p.fg }}>{name || "—"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>الجنس</span><span style={{ color: p.fg }}>{gender === "female" ? "أنثى" : "ذكر"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>الستايل</span><span style={{ color: p.fg }}>{({natural:"طبيعي",polished:"مصقول",stylized:"مصمم"})[style]}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>الصور</span><span style={{ color: p.accent }}>{photos.length}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>الكلفة</span><span style={{ color: p.accent }}>80 CRED</span></div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

window.UgcAvatarPage = UgcAvatarPage;

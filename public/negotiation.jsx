// Negotiation Console — chat with the operation brain.
// Each AI turn generates context-aware UI: button options, sliders, card pickers,
// rank lists, color swatches, etc. The user can also type freely.
// We mock multiple turns in a vertical history to demonstrate the dynamic UI per turn.

function NegotiationArtboard({ p, w = 1280, h = 1080 }) {
  return (
    <div dir="rtl" style={{
      width: w, height: h, position: "relative", overflow: "hidden",
      background: p.bg0, color: p.fg, fontFamily: "'Inter', sans-serif",
    }}>
      <ParticleField p={p} density={0.4} showGrid={true} />
      <div style={{ position: "absolute", inset: 12, border: `1px solid ${p.border}` }} />
      <Corners p={p} size={22} inset={12} />

      {/* HEADER */}
      <div style={{ position: "absolute", top: 12, left: 12, right: 12, height: 60, padding: "0 26px", borderBottom: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <PulseRing p={p} size={14} />
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".25em" }}>// NEGOTIATION_CONSOLE</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: ".1em" }}>OPERATION BRAIN // المفاوض</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* mode switch */}
          {[
            { l: "NEGOTIATE", on: true },
            { l: "DIRECT", on: false },
            { l: "QUERY", on: false },
          ].map((m, i) => (
            <button key={i} style={{
              padding: "6px 12px", background: m.on ? p.accent : "transparent",
              color: m.on ? p.bg0 : p.dim,
              border: `1px solid ${m.on ? p.accent : p.border}`,
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 12, letterSpacing: ".18em", cursor: "pointer",
            }}>{m.l}</button>
          ))}
          <Tag p={p} color={p.accent2}>● 3.4s</Tag>
        </div>
      </div>

      {/* BODY: split — chat history (left) + context rail (right) */}
      <div style={{ position: "absolute", top: 84, left: 24, right: 24, bottom: 144, display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>

        {/* CHAT HISTORY */}
        <div style={{ overflow: "auto", paddingLeft: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* TURN 1 — opening choice buttons */}
            <Turn p={p} role="ai" timestamp="00:00.4">
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                مرحباً ⏤ نبدأ من أين؟ صف الفكرة، أو اختر من الخيارات التالية.
              </div>
              <DynamicUI p={p} kind="buttons" options={[
                { l: "فيلم قصير", icon: "▶", hot: true },
                { l: "إعلان", icon: "◇" },
                { l: "وثائقي", icon: "◆" },
                { l: "أنا غير متأكد", icon: "?" },
                { l: "عندي سكربت", icon: "↑" },
              ]} />
            </Turn>

            {/* TURN 2 — user reply */}
            <Turn p={p} role="user">
              <div style={{ fontSize: 14 }}>فيلم نوار قصير، شخصية تكتشف خيانة في مدينة ممطرة.</div>
            </Turn>

            {/* TURN 3 — AI clarifying with SLIDER */}
            <Turn p={p} role="ai" timestamp="00:03.1">
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                جيد. درجة القتامة؟ — اسحب المؤشر، أو اختر <span style={{ color: p.accent2 }}>SUGGESTED</span>.
              </div>
              <DynamicUI p={p} kind="slider"
                label="DARKNESS"
                value={0.72}
                left="HOPEFUL" right="BLEAK"
                suggested={0.65}
              />
            </Turn>

            {/* TURN 4 — user reply */}
            <Turn p={p} role="user">
              <div style={{ fontSize: 14 }}>0.72 — لكن خل النهاية فيها أمل صغير.</div>
            </Turn>

            {/* TURN 5 — AI offering CARD PICKER */}
            <Turn p={p} role="ai" timestamp="00:05.8">
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                ممتاز. مَن البطل؟ اختر نموذج، أو اوصف بطل خاص:
              </div>
              <DynamicUI p={p} kind="cards" options={[
                { code: "01", l: "المحقق", sub: "متعب · عنيد · مدخن", glyph: "◆" },
                { code: "02", l: "الصحفية", sub: "ذكية · مقتنصة", glyph: "◇" },
                { code: "03", l: "الأخ", sub: "ساكن · خفي · موجوع", glyph: "✦" },
              ]} />
            </Turn>

            {/* TURN 6 — user reply */}
            <Turn p={p} role="user">
              <div style={{ fontSize: 14 }}>الأخ — بس خله شاعر فاشل، عمره 31.</div>
            </Turn>

            {/* TURN 7 — AI thinking with aurora pulse + multi-select */}
            <Turn p={p} role="ai" timestamp="00:08.2" thinking>
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                ممتاز. ما الذي يجب أن يحدث في الذروة؟ — اختر متعدد:
              </div>
              <DynamicUI p={p} kind="multiselect" options={[
                { l: "كشف الخائن", on: true },
                { l: "مواجهة فيزيائية", on: true },
                { l: "اعتراف عاطفي", on: false },
                { l: "اختفاء", on: false },
                { l: "موت", on: false },
              ]} />
            </Turn>

            {/* TURN 8 — user reply + ranked list */}
            <Turn p={p} role="user">
              <div style={{ fontSize: 14 }}>رتب لي المشاعر اللي يحس بها الجمهور بالنهاية، من الأقوى:</div>
              <DynamicUI p={p} kind="rank" options={[
                { l: "حزن مكتوم", rank: 1 },
                { l: "ذهول", rank: 2 },
                { l: "أمل خفيف", rank: 3 },
                { l: "غضب", rank: 4 },
              ]} byUser />
            </Turn>

            {/* TURN 9 — AI confirmation with COLOR + cost confirm */}
            <Turn p={p} role="ai" timestamp="00:13.7">
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                مفهوم. الخلاصة:
              </div>
              <DynamicUI p={p} kind="summary" data={[
                ["نوع", "فيلم نوار قصير"],
                ["البطل", "الأخ · شاعر فاشل · 31"],
                ["القتامة", "0.72 (نهاية بأمل)"],
                ["الذروة", "كشف الخائن + مواجهة"],
              ]} />
              <DynamicUI p={p} kind="palette" colors={[p.bg0, p.bg2, p.accent, p.warn, p.fg]} label="LIGHTING_PALETTE" />
              <DynamicUI p={p} kind="confirm" cost={245} time="4:12" />
            </Turn>

          </div>
        </div>

        {/* CONTEXT RAIL */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Live loadout snapshot */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}`, position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, width: 32, height: 2, background: p.accent }} />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 8 }}>// LIVE_CONTEXT</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, lineHeight: 1.9, letterSpacing: ".08em" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>genre</span><span style={{ color: p.fg }}>NOIR</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>duration</span><span style={{ color: p.fg }}>60s</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>protagonist</span><span style={{ color: p.fg }}>BROTHER/31</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>darkness</span><span style={{ color: p.accent }}>0.72</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>tone end</span><span style={{ color: p.accent2 }}>HOPEFUL</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>palette</span>
                <span style={{ display: "inline-flex", gap: 3 }}>
                  {[p.bg0, p.bg2, p.accent, p.warn].map((c, i) => (
                    <span key={i} style={{ width: 10, height: 10, background: c, border: `1px solid ${p.border}` }} />
                  ))}
                </span>
              </div>
            </div>
          </div>

          {/* AI confidence meter */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}` }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", marginBottom: 6 }}>BRAIN_CONFIDENCE</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: p.accent, lineHeight: 1 }}>87%</div>
            <StatusBar p={p} label="INTENT_CLARITY" value={92} color={p.accent2} />
            <StatusBar p={p} label="STYLE_LOCK"    value={84} color={p.accent2} />
            <StatusBar p={p} label="ARC_DEFINED"   value={67} color={p.accent} />
            <StatusBar p={p} label="DETAIL_DEPTH"  value={41} color={p.warn} />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, marginTop: 6, lineHeight: 1.6 }}>
              ↳ يحتاج: تفاصيل بصرية أكثر · بيئة مكانية محددة
            </div>
          </div>

          {/* Suggested next moves — meta-buttons */}
          <div style={{ padding: 14, background: p.bg1, border: `1px solid ${p.border}` }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.accent, letterSpacing: ".22em", marginBottom: 8 }}>// NEXT_MOVES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                "ارجع لتعديل الذروة",
                "أضف شخصية ثانوية",
                "ولّد لوحة قصة الآن",
                "صدّر الموجز كـ JSON",
              ].map((s, i) => (
                <button key={i} style={{
                  padding: "8px 10px", background: "transparent",
                  border: `1px solid ${p.border}`, color: p.dim,
                  fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".08em",
                  textAlign: "right", cursor: "pointer",
                }}>↳ {s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* INPUT BAR */}
      <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, height: 132, padding: "16px 26px", borderTop: `1px solid ${p.border}`, background: p.bg0 }}>
        {/* attachment row + suggested replies */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", alignSelf: "center" }}>SMART_REPLY</span>
          {["أضف مطر", "عتمة أكثر", "غيّر العمر", "ولّد الآن"].map((s, i) => (
            <button key={i} style={{
              padding: "5px 10px", background: i === 0 ? `${p.accent}22` : p.bg1,
              color: i === 0 ? p.accent : p.dim,
              border: `1px solid ${i === 0 ? p.accent : p.border}`,
              fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".12em",
              cursor: "pointer",
            }}>+ {s}</button>
          ))}
        </div>

        {/* text input row */}
        <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
          <button style={{
            padding: "0 14px", background: p.bg1, border: `1px solid ${p.border}`,
            color: p.dim, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".15em", cursor: "pointer",
          }}>+ ATTACH</button>
          <button style={{
            padding: "0 14px", background: p.bg1, border: `1px solid ${p.border}`,
            color: p.dim, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".15em", cursor: "pointer",
          }}>✱ VOICE</button>
          <div style={{ flex: 1, position: "relative", background: p.bg1, border: `1px solid ${p.accent}`, borderRight: `3px solid ${p.accent}` }}>
            <div style={{
              padding: "13px 16px", fontFamily: "'Inter', sans-serif", fontSize: 14, color: p.fg, lineHeight: 1.5,
            }} dir="rtl">
              أضف لقطة طويلة في المطر قبل اللحظة الأخيرة
              <span style={{ display: "inline-block", width: 8, height: 16, background: p.accent, marginRight: 2, verticalAlign: "middle", animation: "blink 1s steps(2) infinite" }} />
            </div>
            <div style={{ position: "absolute", left: 10, bottom: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".18em" }}>
              ⌘+⏎ SEND · 48/2000
            </div>
          </div>
          <CrunchBtn p={p} label="إرسال" solid icon="▶" />
        </div>
      </div>

      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}

// ---------- Turn wrapper ----------
function Turn({ p, role, timestamp, thinking, children }) {
  const ai = role === "ai";
  return (
    <div style={{ display: "flex", gap: 14, flexDirection: ai ? "row" : "row-reverse" }}>
      {/* avatar */}
      <div style={{ flexShrink: 0, width: 36, position: "relative" }}>
        <div style={{
          width: 36, height: 36, background: ai ? p.bg1 : p.accent,
          border: `1px solid ${ai ? p.accent : "transparent"}`,
          clipPath: "polygon(0 0, 100% 0, 100% 75%, 75% 100%, 0 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, color: ai ? p.accent : p.bg0, letterSpacing: ".1em",
        }}>{ai ? "AI" : "OP"}</div>
        {thinking && (
          <div style={{ position: "absolute", inset: -3, border: `1px solid ${p.accent}`, animation: "blink 1.4s ease-in-out infinite" }} />
        )}
      </div>

      {/* bubble */}
      <div style={{ flex: 1, maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, justifyContent: ai ? "flex-start" : "flex-end" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>
            {ai ? `BRAIN ▸ ${timestamp}` : "▸ OPERATOR"}
          </span>
          {thinking && <ThinkingPulse p={p} label="ANALYZING" />}
        </div>
        <div style={{
          padding: 14,
          background: ai ? p.bg1 : `${p.accent}11`,
          border: `1px solid ${ai ? p.border : p.accent + "44"}`,
          borderRight: ai ? `2px solid ${p.accent}` : "none",
          borderLeft: !ai ? `2px solid ${p.accent}` : "none",
          color: p.fg,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------- Dynamic UI dispatcher ----------
function DynamicUI({ p, kind, ...props }) {
  const wrap = (child) => (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${p.border}` }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.accent, letterSpacing: ".25em", marginBottom: 8, textTransform: "uppercase" }}>
        ◢ GENERATED // {kind.toUpperCase()}
      </div>
      {child}
    </div>
  );

  if (kind === "buttons") {
    return wrap(
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {props.options.map((o, i) => (
          <button key={i} style={{
            padding: "10px 16px",
            background: o.hot ? p.accent : "transparent",
            color: o.hot ? p.bg0 : p.fg,
            border: `1px solid ${o.hot ? p.accent : p.border}`,
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: ".15em",
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
            clipPath: "polygon(0 0, 100% 0, 100% 75%, 88% 100%, 0 100%)",
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, opacity: .8 }}>{o.icon}</span>
            {o.l}
          </button>
        ))}
      </div>
    );
  }

  if (kind === "slider") {
    return wrap(
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>{props.label}</span>
          <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.accent, letterSpacing: ".08em" }}>{Math.round(props.value * 100)}/100</span>
        </div>
        <div style={{ position: "relative", height: 26 }}>
          <div style={{ position: "absolute", top: 12, left: 0, right: 0, height: 2, background: p.border }} />
          <div style={{ position: "absolute", top: 12, left: 0, width: `${props.value * 100}%`, height: 2, background: p.accent, boxShadow: `0 0 8px ${p.accent}` }} />
          {Array.from({ length: 41 }).map((_, i) => (
            <div key={i} style={{ position: "absolute", left: `${(i / 40) * 100}%`, top: i % 5 === 0 ? 7 : 10, width: 1, height: i % 5 === 0 ? 12 : 6, background: i / 40 <= props.value ? p.accent : p.border }} />
          ))}
          {/* user handle */}
          <div style={{ position: "absolute", left: `calc(${props.value * 100}% - 6px)`, top: 4, width: 12, height: 18, background: p.accent, clipPath: "polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)", boxShadow: `0 0 10px ${p.accent}` }} />
          {/* suggested ghost handle */}
          <div style={{ position: "absolute", left: `calc(${props.suggested * 100}% - 5px)`, top: 6, width: 10, height: 14, border: `1px solid ${p.accent2}`, background: "transparent", clipPath: "polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".2em" }}>
          <span>{props.left}</span>
          <span style={{ color: p.accent2 }}>◇ SUGGESTED {Math.round(props.suggested * 100)}</span>
          <span>{props.right}</span>
        </div>
      </div>
    );
  }

  if (kind === "cards") {
    return wrap(
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {props.options.map((o, i) => (
          <div key={i} style={{
            position: "relative", padding: 12,
            background: p.bg2, border: `1px solid ${p.border}`,
            clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%)",
            cursor: "pointer",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>// {o.code}</span>
              <span style={{ fontSize: 18, color: p.accent }}>{o.glyph}</span>
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.fg, letterSpacing: ".06em" }}>{o.l}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".1em", marginTop: 4 }}>{o.sub}</div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "multiselect") {
    return wrap(
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {props.options.map((o, i) => (
          <button key={i} style={{
            padding: "8px 12px",
            background: o.on ? `${p.accent}22` : p.bg2,
            color: o.on ? p.accent : p.dim,
            border: `1px solid ${o.on ? p.accent : p.border}`,
            fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: ".1em",
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ width: 10, height: 10, border: `1px solid ${o.on ? p.accent : p.border}`, background: o.on ? p.accent : "transparent", display: "inline-block" }} />
            {o.l}
          </button>
        ))}
      </div>
    );
  }

  if (kind === "rank") {
    return wrap(
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {props.options.map((o, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "8px 12px", background: p.bg2, border: `1px solid ${p.border}`,
            cursor: "grab",
          }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: p.accent, letterSpacing: ".05em", minWidth: 18 }}>#{o.rank}</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg, flex: 1 }}>{o.l}</span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: p.dim, letterSpacing: ".22em" }}>⋮⋮ DRAG</span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "summary") {
    return wrap(
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", rowGap: 6, columnGap: 14 }}>
        {props.data.map(([k, v], i) => (
          <React.Fragment key={i}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: p.dim, letterSpacing: ".22em" }}>{k}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: p.fg }}>{v}</div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (kind === "palette") {
    return wrap(
      <div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em", marginBottom: 6 }}>{props.label}</div>
        <div style={{ display: "flex", gap: 4 }}>
          {props.colors.map((c, i) => (
            <div key={i} style={{ flex: 1, height: 34, background: c, border: `1px solid ${p.border}`, position: "relative" }}>
              <div style={{ position: "absolute", left: 4, bottom: 2, fontFamily: "'Space Mono', monospace", fontSize: 9, color: i < 2 ? p.fg : p.bg0, letterSpacing: ".08em" }}>{c}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "confirm") {
    return wrap(
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 12, background: p.bg2, border: `1px solid ${p.accent}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: p.dim, letterSpacing: ".22em" }}>EST_COST · TIME</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: p.fg, letterSpacing: ".05em" }}>
            <span style={{ color: p.accent }}>{props.cost}</span> CRED · {props.time}
          </div>
        </div>
        <CrunchBtn p={p} label="عدّل" small />
        <CrunchBtn p={p} label="ابدأ التوليد" solid icon="▶" />
      </div>
    );
  }
  return null;
}

Object.assign(window, { NegotiationArtboard, Turn, DynamicUI });

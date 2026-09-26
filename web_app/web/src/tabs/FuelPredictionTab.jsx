/**
 * FuelPredictionTab.jsx — QIEA-tuned XGBoost Fuel Consumption Predictor
 */
import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const VESSEL_TYPES = [
  { value: "container",     label: "Container Ship",  icon: "📦" },
  { value: "bulk_carrier",  label: "Bulk Carrier",    icon: "⚓" },
  { value: "tanker",        label: "Tanker",          icon: "🛢️" },
  { value: "general_cargo", label: "General Cargo",   icon: "🏗️" },
];

const FUEL_TYPES = [
  { value: "HFO",      label: "HFO",      fullLabel: "Heavy Fuel Oil",     color: "#f43f5e", icon: "🛢️" },
  { value: "LNG",      label: "LNG",      fullLabel: "Liquefied Nat. Gas", color: "#3b82f6", icon: "❄️"  },
  { value: "Methanol", label: "MeOH",     fullLabel: "Methanol",           color: "#a78bfa", icon: "⚗️"  },
  { value: "Hydrogen", label: "H₂",       fullLabel: "Green Hydrogen",     color: "#34d399", icon: "⚡"  },
  { value: "Ammonia",  label: "NH₃",      fullLabel: "Ammonia",            color: "#f59e0b", icon: "🌿"  },
];

const WEATHER_PRESETS = [
  { label: "Calm",     wave: 0.3, wind: 5  },
  { label: "Moderate", wave: 1.5, wind: 12 },
  { label: "Rough",    wave: 3.5, wind: 22 },
  { label: "Storm",    wave: 6.0, wind: 35 },
];

const EF   = { HFO: 3.114, LNG: 2.750, Methanol: 1.375, Hydrogen: 0.0, Ammonia: 0.0 };
const COST  = { HFO: 520,   LNG: 680,   Methanol: 650,   Hydrogen: 2500, Ammonia: 900 };

function GaugeRing({ pct, color, size = 90 }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const d = c * Math.min(1, Math.max(0, pct));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${d} ${c}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
    </svg>
  );
}

function Slider({ id, label, min, max, step, value, onChange, fmt, unit }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <label htmlFor={id} className="form-label" style={{ marginBottom: 0 }}>{label}</label>
        <span style={{ fontSize: "0.82rem", color: "var(--text-accent)", fontWeight: 600 }}>
          {fmt ? fmt(value) : value}{unit ? " " + unit : ""}
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--border-accent)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
        <span>{fmt ? fmt(min) : min}{unit ? " "+unit : ""}</span>
        <span>{fmt ? fmt(max) : max}{unit ? " "+unit : ""}</span>
      </div>
    </div>
  );
}

export default function FuelPredictionTab() {
  const [form, setForm] = useState({
    vessel_type: "container", displacement_tons: 80000, cargo_load_fraction: 0.70,
    speed_knots: 18, fuel_type: "LNG", distance_nm: 3000,
    wave_height_m: 1.5, wind_speed_knots: 10, model_type: "quantum",
  });
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [animate, setAnimate] = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  async function handlePredict() {
    setLoading(true); setError(null); setResult(null); setAnimate(false);
    try {
      const resp = await fetch(`${API_BASE}/api/predict-fuel`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!resp.ok) { const e = await resp.json().catch(()=>({})); throw new Error(e.detail||`HTTP ${resp.status}`); }
      const data = await resp.json();
      setResult(data);
      setTimeout(() => setAnimate(true), 60);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const sf  = FUEL_TYPES.find(f => f.value === form.fuel_type) || FUEL_TYPES[0];
  const ef  = EF[form.fuel_type] ?? 3.114;
  const zeroCO2 = ef === 0;

  const fuelPct = result ? Math.min(1, result.fuel_consumption_tons / 2500) : 0;
  const co2Pct  = result ? Math.min(1, result.co2_emissions_tons / 8000)    : 0;
  const costPct = result ? Math.min(1, result.estimated_cost_usd / 1500000) : 0;

  const S = { card: { background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 0 } };

  return (
    <div>
      {/* Banner */}
      <div style={{ ...S.card, marginBottom: 20, background: "linear-gradient(135deg,#0b1d3a,#0c2a2d)", borderColor: "rgba(39,174,185,0.3)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: "2.2rem" }}>⛽</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 6 }}>QIEA-Tuned XGBoost Fuel Consumption Predictor</div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 12 }}>
              Predict voyage fuel consumption using our{" "}
              <span style={{ color: "var(--text-accent)", fontWeight: 600 }}>Quantum-Inspired Evolutionary Algorithm (QIEA)</span>{" "}
              hyperparameter-tuned XGBoost model with quantum rotation-gate feature encoding.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {[{v:"quantum",l:"🧬 QIEA-XGBoost"},{v:"baseline",l:"📊 Baseline XGBoost"}].map(m => (
                <button key={m.v} onClick={() => setForm(f=>({...f,model_type:m.v}))} style={{
                  padding: "6px 14px", borderRadius: 7, border: `1px solid ${form.model_type===m.v?"var(--border-accent)":"var(--border)"}`,
                  background: form.model_type===m.v?"rgba(39,174,185,0.15)":"transparent",
                  color: form.model_type===m.v?"var(--text-accent)":"var(--text-muted)",
                  cursor: "pointer", fontFamily: "inherit", fontSize: "0.8rem",
                  fontWeight: form.model_type===m.v?600:400, transition: "all 0.2s",
                }}>{m.l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2-col layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Vessel */}
          <div style={S.card}>
            <div className="card-title">🚢 Vessel Configuration</div>
            <div className="form-group">
              <label className="form-label">Vessel Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {VESSEL_TYPES.map(vt => (
                  <button key={vt.value} onClick={() => setForm(f=>({...f,vessel_type:vt.value}))} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,
                    border:`1px solid ${form.vessel_type===vt.value?"var(--border-accent)":"var(--border)"}`,
                    background:form.vessel_type===vt.value?"rgba(39,174,185,0.12)":"var(--bg-surface)",
                    color:form.vessel_type===vt.value?"var(--text-accent)":"var(--text-muted)",
                    cursor:"pointer",fontFamily:"inherit",fontSize:"0.78rem",
                    fontWeight:form.vessel_type===vt.value?600:400,transition:"all 0.2s",
                  }}>
                    <span style={{fontSize:"1rem"}}>{vt.icon}</span><span>{vt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Slider id="disp"  label="Displacement"        min={5000}  max={300000} step={1000} value={form.displacement_tons}    onChange={set("displacement_tons")}    fmt={v=>v.toLocaleString()} unit="t" />
            <Slider id="cargo" label="Cargo Load Fraction"  min={0.05}  max={1.00}   step={0.01} value={form.cargo_load_fraction}  onChange={set("cargo_load_fraction")}  fmt={v=>`${(v*100).toFixed(0)}%`} />
            <Slider id="spd"   label="Speed"                min={8}     max={28}     step={0.5}  value={form.speed_knots}           onChange={set("speed_knots")}           fmt={v=>v.toFixed(1)} unit="kts" />
            <Slider id="dist"  label="Voyage Distance"      min={200}   max={9000}   step={50}   value={form.distance_nm}           onChange={set("distance_nm")}           fmt={v=>v.toLocaleString()} unit="nm" />
          </div>

          {/* Fuel */}
          <div style={S.card}>
            <div className="card-title">⛽ Fuel Type</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 12 }}>
              {FUEL_TYPES.map(ft => (
                <button key={ft.value} onClick={() => setForm(f=>({...f,fuel_type:ft.value}))} style={{
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                  padding:"10px 4px",borderRadius:10,cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s",
                  border:`1px solid ${form.fuel_type===ft.value?ft.color:"var(--border)"}`,
                  background:form.fuel_type===ft.value?`${ft.color}18`:"var(--bg-surface)",
                  boxShadow:form.fuel_type===ft.value?`0 0 12px ${ft.color}40`:"none",
                }}>
                  <span style={{fontSize:"1.25rem"}}>{ft.icon}</span>
                  <span style={{fontSize:"0.7rem",fontWeight:700,color:form.fuel_type===ft.value?ft.color:"var(--text-muted)"}}>{ft.label}</span>
                  <span style={{fontSize:"0.58rem",color:"var(--text-muted)"}}>{EF[ft.value]===0?"0 CO₂":`${EF[ft.value]}x`}</span>
                </button>
              ))}
            </div>
            <div style={{padding:"10px 12px",borderRadius:8,border:`1px solid ${sf.color}50`,background:`${sf.color}10`,fontSize:"0.79rem",lineHeight:1.6}}>
              <span style={{color:sf.color,fontWeight:700}}>{sf.icon} {sf.fullLabel}</span>
              <span style={{color:"var(--text-muted)"}}> · ${COST[form.fuel_type]}/ton · {zeroCO2?"Zero-carbon 🌿":`${ef} t CO₂/t`}</span>
            </div>
          </div>

          {/* Weather */}
          <div style={S.card}>
            <div className="card-title">🌊 Sea &amp; Weather Conditions</div>
            <div className="form-group">
              <label className="form-label">Quick Presets</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {WEATHER_PRESETS.map(p => {
                  const a = form.wave_height_m===p.wave && form.wind_speed_knots===p.wind;
                  return (
                    <button key={p.label} onClick={() => setForm(f=>({...f,wave_height_m:p.wave,wind_speed_knots:p.wind}))} style={{
                      padding:"6px 14px",borderRadius:7,fontFamily:"inherit",fontSize:"0.78rem",cursor:"pointer",transition:"all 0.2s",
                      border:`1px solid ${a?"var(--border-accent)":"var(--border)"}`,
                      background:a?"rgba(39,174,185,0.15)":"var(--bg-surface)",
                      color:a?"var(--text-accent)":"var(--text-muted)",fontWeight:a?600:400,
                    }}>{p.label}</button>
                  );
                })}
              </div>
            </div>
            <Slider id="wave" label="Wave Height" min={0} max={8}  step={0.1} value={form.wave_height_m}    onChange={set("wave_height_m")}    fmt={v=>v.toFixed(1)} unit="m" />
            <Slider id="wind" label="Wind Speed"  min={0} max={50} step={1}   value={form.wind_speed_knots} onChange={set("wind_speed_knots")} fmt={v=>`${v}`} unit="kts" />
          </div>

          {/* Predict btn */}
          <button id="predict-fuel-btn" onClick={handlePredict} disabled={loading} style={{
            width:"100%",padding:"14px 0",borderRadius:10,border:"none",cursor:loading?"not-allowed":"pointer",
            background:loading?"var(--border)":"linear-gradient(135deg,var(--blue-grad-from),var(--blue-grad-to))",
            color:"white",fontFamily:"inherit",fontSize:"1rem",fontWeight:700,letterSpacing:"0.02em",
            boxShadow:loading?"none":"0 4px 16px rgba(0,180,216,0.4)",transition:"all 0.25s",
            display:"flex",alignItems:"center",justifyContent:"center",gap:10,
          }}>
            {loading ? <><span className="fp-spinner" /> Running QIEA-XGBoost Model…</> : <>⚡ Predict Fuel Consumption</>}
          </button>
          {error && <div className="error-banner">⚠️ <strong>Prediction Error:</strong> {error}</div>}
        </div>

        {/* RIGHT */}
        <div>
          {!result && !loading && (
            <div style={{ ...S.card, border: "1px dashed var(--border)", textAlign: "center", padding: "48px 28px" }}>
              <div style={{ fontSize: "3rem", marginBottom: 14, opacity: 0.45 }}>📊</div>
              <h3 style={{ color: "var(--text-primary)", marginBottom: 8 }}>Awaiting Prediction</h3>
              <p style={{ fontSize: "0.82rem", lineHeight: 1.7, color: "var(--text-muted)", maxWidth: 300, margin: "0 auto 20px" }}>
                Configure vessel parameters and click <strong>Predict Fuel Consumption</strong> to run the QIEA-tuned XGBoost model.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 240, margin: "0 auto", textAlign: "left" }}>
                {["Select vessel type & displacement","Choose fuel type","Set sea conditions","Click Predict"].map((s,i)=>(
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <span style={{ width:22,height:22,borderRadius:"50%",flexShrink:0,background:"rgba(39,174,185,0.15)",border:"1px solid var(--border-accent)",color:"var(--text-accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:700 }}>{i+1}</span>
                    <span style={{ fontSize:"0.79rem",color:"var(--text-muted)" }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div style={{ ...S.card, textAlign:"center", padding:"52px 28px" }}>
              <div className="fp-loading-rings" style={{ margin:"0 auto 20px" }}>
                <div className="fp-ring fp-ring-1"/><div className="fp-ring fp-ring-2"/><div className="fp-ring fp-ring-3"/>
                <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem" }}>⚛️</div>
              </div>
              <div style={{ fontSize:"0.92rem",fontWeight:600,color:"var(--text-primary)",marginBottom:4 }}>QIEA-XGBoost Inference</div>
              <div style={{ fontSize:"0.78rem",color:"var(--text-muted)" }}>Quantum-inspired feature encoding…</div>
            </div>
          )}

          {result && (
            <div className={`fp-result ${animate?"visible":""}`} style={{ ...S.card, padding:0, overflow:"hidden" }}>
              {/* Badge */}
              <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 18px",borderBottom:"1px solid var(--border)",background:"rgba(39,174,185,0.06)",fontSize:"0.76rem",color:"var(--text-accent)" }}>
                <span style={{ width:7,height:7,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 6px #34d399" }}/>
                {result.model_used}
              </div>

              {/* Gauges */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",padding:"20px 16px",borderBottom:"1px solid var(--border)" }}>
                {[
                  { pct:fuelPct, color:"#27AEB9", val:result.fuel_consumption_tons.toFixed(1), unit:"t",      lbl:"Fuel Consumed" },
                  { pct:co2Pct,  color:zeroCO2?"#34d399":"#f43f5e", val:result.co2_emissions_tons.toFixed(1), unit:"t CO₂", lbl:"CO₂ Emissions" },
                  { pct:costPct, color:"#f59e0b", val:`$${(result.estimated_cost_usd/1000).toFixed(0)}k`, unit:"", lbl:"Est. Cost" },
                ].map(g=>(
                  <div key={g.lbl} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
                    <div style={{ position:"relative",width:90,height:90 }}>
                      <GaugeRing pct={g.pct} color={g.color} size={90}/>
                      <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                        <span style={{ fontSize:"0.72rem",fontWeight:700,color:g.color }}>{g.val}</span>
                        {g.unit&&<span style={{ fontSize:"0.58rem",color:"var(--text-muted)" }}>{g.unit}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize:"0.7rem",color:"var(--text-muted)",textAlign:"center" }}>{g.lbl}</span>
                  </div>
                ))}
              </div>

              {/* KPIs */}
              <div style={{ padding:"14px 18px",borderBottom:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:8 }}>
                {[
                  { l:"Fuel Consumption", v:`${result.fuel_consumption_tons.toFixed(3)} t`,    c:"#27AEB9",                          i:"⛽", s:`${(result.fuel_consumption_tons*1000).toFixed(0)} kg` },
                  { l:"CO₂ Emissions",    v:`${result.co2_emissions_tons.toFixed(3)} t`,        c:zeroCO2?"#34d399":"#f43f5e",       i:zeroCO2?"🌿":"🏭", s:zeroCO2?"Zero-carbon fuel":`EF: ${ef} t CO₂/t` },
                  { l:"Fuel Cost (Est.)", v:`$${result.estimated_cost_usd.toLocaleString(undefined,{maximumFractionDigits:0})}`,  c:"#f59e0b", i:"💰", s:`${sf.fullLabel} @ $${COST[form.fuel_type]}/t` },
                  { l:"Efficiency",       v:`${(result.fuel_consumption_tons/(form.distance_nm/1000)).toFixed(3)} t/1000nm`, c:"#a78bfa", i:"📈", s:`${(result.fuel_consumption_tons/form.distance_nm*100).toFixed(4)} t/nm` },
                ].map(k=>(
                  <div key={k.l} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",borderRadius:8,background:"var(--bg-surface)",border:"1px solid var(--border)" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ color:k.c,fontSize:"0.9rem" }}>{k.i}</span>
                      <div>
                        <div style={{ fontSize:"0.76rem",color:"var(--text-muted)" }}>{k.l}</div>
                        {k.s&&<div style={{ fontSize:"0.66rem",color:"var(--text-muted)",opacity:0.7 }}>{k.s}</div>}
                      </div>
                    </div>
                    <span style={{ fontSize:"0.83rem",fontWeight:700,color:k.c }}>{k.v}</span>
                  </div>
                ))}
              </div>

              {/* Input echo */}
              <div style={{ padding:"14px 18px",borderBottom:"1px solid var(--border)" }}>
                <div style={{ fontSize:"0.68rem",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--text-muted)",marginBottom:8 }}>Prediction Inputs</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px 14px" }}>
                  {[
                    ["Vessel Type",  VESSEL_TYPES.find(v=>v.value===form.vessel_type)?.label],
                    ["Displacement", `${form.displacement_tons.toLocaleString()} t`],
                    ["Cargo Load",   `${(form.cargo_load_fraction*100).toFixed(0)}%`],
                    ["Speed",        `${form.speed_knots} kts`],
                    ["Fuel",         form.fuel_type],
                    ["Distance",     `${form.distance_nm.toLocaleString()} nm`],
                    ["Wave Height",  `${form.wave_height_m} m`],
                    ["Wind Speed",   `${form.wind_speed_knots} kts`],
                  ].map(([k,v])=>(
                    <div key={k} style={{ display:"flex",justifyContent:"space-between",fontSize:"0.74rem",padding:"2px 0" }}>
                      <span style={{ color:"var(--text-muted)" }}>{k}</span>
                      <span style={{ color:"var(--text-accent)",fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model note */}
              <div style={{ padding:"14px 18px" }}>
                <div className="info-box" style={{ margin:0 }}>
                  🧬 <strong>Model:</strong> {result.model_used} — QIEA quantum-rotation-gate update rule (Han &amp; Kim, 2002)
                  tunes XGBoost hyperparameters via qubit-amplitude rotation. Numeric features encoded as cos(θ)/sin(θ) expansions.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import { useState } from "react";

const SAMPLES = {
  monday: {
    dm: "Hey Monday — your pieces have such a distinct identity; the minimal cuts and muted palette really stand out in a saturated market. We represent a tight roster of UGC creators and lifestyle influencers who shoot specifically in coastal and resort settings. A few of them are based in Bali and Byron Bay with engaged audiences in the 50K–200K range. Would love to explore a content collaboration — happy to share some creator profiles if it's a fit.",
    email_subject: "Creator collab for Monday Swimwear",
    email_body: "Hi Monday team,\n\nI run a boutique influencer agency focused exclusively on swimwear and resort brands. We represent a curated group of UGC creators and lifestyle influencers — all with high-engagement audiences and a track record of converting content into sales.\n\nGiven Monday's aesthetic, I think we have a few creators who would be a natural fit — particularly for coastal editorial and hotel-stay content.\n\nWould you be open to a quick 20-minute call to explore?\n\nBest, Jason",
  },
  frankies: {
    dm: "Hey Frankies — the Y2K-meets-resort energy you've been putting out lately is doing numbers. We work with a select group of influencers and UGC creators who specialise in that nostalgic-luxe aesthetic — several with strong US and AU audiences. Would love to connect your next drop with the right faces. Open to a quick chat?",
    email_subject: "Influencer partnership — Frankies Bikinis",
    email_body: "Hi Frankies team,\n\nLove what the brand has been building — the aesthetic consistency across your recent campaigns is genuinely impressive.\n\nWe're a boutique influencer agency that places UGC creators and influencers with premium swimwear brands. Our roster skews lifestyle-forward with strong engagement in the US, Australia, and global beach markets.\n\nI'd love to share a few creator profiles. Are you exploring creator partnerships for your next season?\n\nLooking forward to connecting, Jason",
  },
  default: {
    dm: "Hey {brand} — really love the direction you're taking with {niche}. We represent a curated roster of UGC creators and lifestyle influencers who specialise in coastal and resort content. Given your {followers} following in the {market} market, I think we have some creators who'd be a natural fit. Would love to share a few profiles — open to a quick chat?",
    email_subject: "Creator collaboration for {brand}",
    email_body: "Hi {brand} team,\n\nI run a boutique influencer agency focused on swimwear and resort brands. We work with a tight roster of creators across {market} markets — all with strong engagement and content that actually converts.\n\nGiven your positioning in {niche}, I think there's a real fit here. Would love to share some creator portfolios.\n\nAre you currently working with influencers for upcoming campaigns?\n\nBest, Jason",
  },
};

function wc(t) { return t.trim().split(/\s+/).filter(Boolean).length; }

function getSample({ brandName, niche, followers, market }) {
  const key = Object.keys(SAMPLES).find(k => k !== "default" && brandName.toLowerCase().includes(k));
  const t = SAMPLES[key || "default"];
  const f = s => s.replace(/{brand}/g, brandName).replace(/{niche}/g, niche).replace(/{followers}/g, followers).replace(/{market}/g, market);
  return { dm: f(t.dm), email_subject: f(t.email_subject), email_body: f(t.email_body) };
}

function Card({ label, content, approved, onApprove, onRegen }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content);
  if (!editing && text !== content) setText(content);
  return (
    <div className={`card ${approved ? "approved" : ""}`}>
      <div className="card-top">
        <span className="card-label">{label}</span>
        {approved && <span className="badge-ok">✓ Approved</span>}
      </div>
      {editing
        ? <textarea className="edit-area" value={text} rows={7} onChange={e => setText(e.target.value)} />
        : <p className="card-body">{text}</p>}
      <div className="word-ct">{wc(text)} words</div>
      <div className="btn-row">
        <button className="btn-approve" onClick={() => onApprove(text)} disabled={approved}>✓ approve</button>
        <button className="btn-action" onClick={() => setEditing(!editing)}>{editing ? "✓ done" : "✎ edit"}</button>
        <button className="btn-action" onClick={onRegen}>↺ redo</button>
      </div>
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState({ brandName: "", handle: "", niche: "", followers: "", market: "" });
  const [phase, setPhase] = useState("empty");
  const [result, setResult] = useState(null);
  const [genCount, setGenCount] = useState(0);
  const [gk, setGk] = useState(0);
  const [dmOk, setDmOk] = useState(false);
  const [emOk, setEmOk] = useState(false);
  const [pipe, setPipe] = useState([]);

  const go = () => {
    if (!form.brandName || !form.niche || !form.followers || !form.market) return;
    if (genCount >= 5) { setPhase("limit"); return; }
    setGenCount(c => c + 1); setGk(k => k + 1);
    setDmOk(false); setEmOk(false);
    setPhase("loading");
    setTimeout(() => { setResult(getSample(form)); setPhase("done"); }, 1500);
  };

  const approve = (type) => {
    if (type === "dm") setDmOk(true); else setEmOk(true);
    if (!pipe.find(p => p.b === form.brandName)) {
      setPipe(prev => [...prev, {
        b: form.brandName, h: form.handle || "—", n: form.niche,
        dm: (result?.dm || "").slice(0, 48) + "…",
        em: (result?.email_body || "").slice(0, 48) + "…",
        st: "Approved",
        t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
    }
  };

  const tog = i => setPipe(prev => prev.map((p, idx) => idx === i ? { ...p, st: p.st === "Approved" ? "Sent" : "Approved" } : p));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="root">
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        .root{background:#0d0d0d;color:#ede9e3;font-family:system-ui,sans-serif;font-size:14px;min-height:100vh}
        .topbar{border-bottom:1px solid #1e1e1e;padding:12px 22px;display:flex;align-items:center;justify-content:space-between}
        .topbar-title{font-size:15px;font-weight:600;letter-spacing:-0.02em}
        .topbar-sub{font-size:11px;color:#4a4845;font-family:monospace;margin-top:2px}
        .demo-tag{font-size:10px;font-family:monospace;background:rgba(216,90,48,.14);color:#D85A30;border:1px solid rgba(216,90,48,.28);padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:.05em}
        .main{max-width:860px;margin:0 auto;padding:22px 18px}
        .layout{display:grid;grid-template-columns:240px 1fr;gap:18px}
        .sec-lbl{font-size:10px;font-family:monospace;color:#4a4845;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
        .form-box{background:#141414;border:1px solid #1e1e1e;border-radius:12px;padding:16px}
        .field{margin-bottom:11px}
        .field label{display:block;font-size:11px;color:#7a7672;font-family:monospace;margin-bottom:4px}
        .field input,.field select{width:100%;background:#1c1c1c;border:1px solid #2a2a2a;border-radius:6px;padding:7px 10px;color:#ede9e3;font-family:inherit;font-size:13px;outline:none}
        .field select option{background:#1c1c1c}
        .gen-btn{width:100%;background:#D85A30;color:#fff;border:none;border-radius:7px;padding:10px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;margin-top:4px}
        .gen-btn:disabled{background:#252525;color:#555;cursor:not-allowed}
        .empty-box{background:#141414;border:1px dashed #222;border-radius:12px;height:200px;display:flex;align-items:center;justify-content:center;color:#3a3835;font-size:12px;font-family:monospace}
        .loading-box{background:#141414;border:1px solid #1e1e1e;border-radius:12px;height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;color:#6a6662;font-family:monospace;font-size:12px}
        .spinner{width:22px;height:22px;border:2px solid rgba(216,90,48,.2);border-top-color:#D85A30;border-radius:50%;animation:spin .7s linear infinite}
        .limit-box{background:rgba(216,90,48,.06);border:1px solid rgba(216,90,48,.22);border-radius:10px;padding:13px 15px;font-size:12px;color:#7a7672;line-height:1.7}
        .limit-box span{color:#D85A30}
        .cards{display:grid;grid-template-columns:1fr 1fr;gap:11px}
        .card{background:#141414;border:1px solid #1e1e1e;border-radius:10px;padding:13px;display:flex;flex-direction:column;gap:9px;transition:border-color .2s}
        .card.approved{border-color:rgba(99,153,34,.45)}
        .card-top{display:flex;align-items:center;justify-content:space-between}
        .card-label{font-size:10px;font-family:monospace;color:#4a4845;text-transform:uppercase;letter-spacing:.08em}
        .badge-ok{font-size:9px;font-family:monospace;background:rgba(99,153,34,.13);color:#639922;border:1px solid rgba(99,153,34,.28);padding:2px 7px;border-radius:20px;text-transform:uppercase}
        .subj-bar{background:#141414;border:1px solid #1e1e1e;border-radius:8px;padding:7px 11px;font-size:11px;font-family:monospace;color:#7a7672}
        .subj-bar span{color:#4a4845}
        .card-body{font-size:12px;color:#7a7672;line-height:1.7;white-space:pre-wrap;flex:1}
        .edit-area{width:100%;background:#1c1c1c;border:1px solid #2a2a2a;border-radius:6px;padding:8px;color:#ede9e3;font-family:monospace;font-size:11px;line-height:1.6;resize:none;outline:none}
        .word-ct{font-size:10px;font-family:monospace;color:#4a4845}
        .btn-row{display:flex;gap:5px}
        .btn-approve{flex:1;background:rgba(99,153,34,.11);border:1px solid rgba(99,153,34,.28);border-radius:5px;padding:6px 4px;color:#639922;font-family:monospace;font-size:10px;cursor:pointer}
        .btn-approve:disabled{opacity:.35;cursor:not-allowed}
        .btn-action{flex:1;background:#1c1c1c;border:1px solid #2a2a2a;border-radius:5px;padding:6px 4px;color:#6a6662;font-family:monospace;font-size:10px;cursor:pointer}
        .pipe-section{margin-top:28px}
        .pipe-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:11px}
        .pipe-ct{font-size:10px;font-family:monospace;background:rgba(216,90,48,.13);color:#D85A30;border:1px solid rgba(216,90,48,.22);padding:2px 8px;border-radius:20px}
        .pipe-wrap{border:1px solid #1e1e1e;border-radius:10px;overflow:hidden}
        table{width:100%;border-collapse:collapse;font-size:12px}
        thead tr{background:#141414;border-bottom:1px solid #1e1e1e}
        th{padding:8px 11px;text-align:left;font-size:9px;font-family:monospace;color:#4a4845;text-transform:uppercase;letter-spacing:.08em;font-weight:400}
        tbody tr{border-bottom:1px solid #191919}
        tbody tr:last-child{border-bottom:none}
        td{padding:9px 11px;color:#7a7672;vertical-align:top}
        .brand-name{color:#ede9e3;font-weight:500;font-size:12px}
        .brand-handle{font-family:monospace;font-size:10px;color:#4a4845}
        .prev-cell{max-width:115px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}
        .st-pill{font-size:9px;font-family:monospace;padding:3px 8px;border-radius:20px;cursor:pointer;border:1px solid;text-transform:uppercase;letter-spacing:.05em;user-select:none;display:inline-block}
        .st-ok{background:rgba(99,153,34,.11);color:#639922;border-color:rgba(99,153,34,.28)}
        .st-sent{background:rgba(55,138,221,.11);color:#378ADD;border-color:rgba(55,138,221,.28)}
        .time-cell{font-family:monospace;font-size:10px;color:#4a4845}
      `}</style>

      <div className="topbar">
        <div>
          <div className="topbar-title">Agency Outreach Generator</div>
          <div className="topbar-sub">Powered by Claude AI — Swimwear Influencer Agency</div>
        </div>
        <span className="demo-tag">Demo</span>
      </div>

      <div className="main">
        <div className="layout">
          <div>
            <div className="sec-lbl">Brand Details</div>
            <div className="form-box">
              <div className="field"><label>Brand Name *</label><input value={form.brandName} onChange={e => set("brandName", e.target.value)} onKeyDown={e => e.key === "Enter" && go()} placeholder="e.g. Monday Swimwear" /></div>
              <div className="field"><label>Instagram Handle</label><input value={form.handle} onChange={e => set("handle", e.target.value)} placeholder="e.g. mondayswimwear" /></div>
              <div className="field"><label>Niche / Vibe *</label>
                <select value={form.niche} onChange={e => set("niche", e.target.value)}>
                  <option value="">Select...</option>
                  {["Swimwear","Resort Wear","Sustainable Swimwear","Luxury Swimwear","Surf & Active"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="field"><label>Follower Count *</label>
                <select value={form.followers} onChange={e => set("followers", e.target.value)}>
                  <option value="">Select...</option>
                  {["Under 10K","10K–100K","100K–500K","500K+"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="field"><label>Target Market *</label>
                <select value={form.market} onChange={e => set("market", e.target.value)}>
                  <option value="">Select...</option>
                  {["US","EU","SEA","Global"].map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <button className="gen-btn" onClick={go} disabled={phase === "loading"}>
                {phase === "loading" ? "Generating..." : "Generate Outreach"}
              </button>
            </div>
          </div>

          <div>
            <div className="sec-lbl">Generated Outreach</div>
            {phase === "empty" && <div className="empty-box">fill in brand details and click generate</div>}
            {phase === "loading" && <div className="loading-box"><div className="spinner" />crafting your outreach...</div>}
            {phase === "limit" && <div className="limit-box">You've hit the demo limit (5/hour). This tool is intentionally rate-limited to keep it available. Want to see the full system? → <span>jasonkhanani.com</span></div>}
            {phase === "done" && result && (
              <div className="cards">
                <Card key={`dm-${gk}`} label="Instagram DM" content={result.dm} approved={dmOk} onApprove={() => approve("dm")} onRegen={go} />
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div className="subj-bar"><span>subj: </span>{result.email_subject}</div>
                  <Card key={`em-${gk}`} label="Cold Email" content={result.email_body} approved={emOk} onApprove={() => approve("em")} onRegen={go} />
                </div>
              </div>
            )}
          </div>
        </div>

        {pipe.length > 0 && (
          <div className="pipe-section">
            <div className="pipe-head">
              <div className="sec-lbl" style={{ marginBottom: 0 }}>Pipeline Log</div>
              <span className="pipe-ct">{pipe.length} approved</span>
            </div>
            <div className="pipe-wrap">
              <table>
                <thead><tr>{["Brand","Niche","DM Preview","Email Preview","Status","Time"].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {pipe.map((p, i) => (
                    <tr key={i}>
                      <td><div className="brand-name">{p.b}</div><div className="brand-handle">@{p.h}</div></td>
                      <td>{p.n}</td>
                      <td className="prev-cell">{p.dm}</td>
                      <td className="prev-cell">{p.em}</td>
                      <td><span className={`st-pill ${p.st === "Sent" ? "st-sent" : "st-ok"}`} onClick={() => tog(i)}>{p.st}</span></td>
                      <td className="time-cell">{p.t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

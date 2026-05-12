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

function wordCount(t) {
  return t.trim().split(/\s+/).filter(Boolean).length;
}

function getSample({ brandName, niche, followers, market }) {
  const key = Object.keys(SAMPLES).find(
    (k) => k !== "default" && brandName.toLowerCase().includes(k)
  );
  const t = SAMPLES[key || "default"];
  const fill = (s) =>
    s
      .replace(/{brand}/g, brandName)
      .replace(/{niche}/g, niche)
      .replace(/{followers}/g, followers)
      .replace(/{market}/g, market);
  return {
    dm: fill(t.dm),
    email_subject: fill(t.email_subject),
    email_body: fill(t.email_body),
  };
}

function MsgCard({ label, content, subject, approved, onApprove, onRegenerate }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(content);

  // sync when content changes (regenerate)
  if (!editing && text !== content) setText(content);

  return (
    <div
      style={{
        background: "#161616",
        border: `0.5px solid ${approved ? "rgba(99,153,34,0.5)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 10,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontFamily: "monospace", color: "#555350", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        {approved && (
          <span style={{ fontSize: 9, fontFamily: "monospace", background: "rgba(99,153,34,0.15)", color: "#639922", border: "0.5px solid rgba(99,153,34,0.3)", padding: "2px 7px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Approved
          </span>
        )}
      </div>

      {subject && (
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#555350", borderLeft: "2px solid rgba(216,90,48,0.4)", paddingLeft: 8 }}>
          <span style={{ color: "#888680" }}>{subject}</span>
        </div>
      )}

      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          style={{ width: "100%", background: "#1e1e1e", border: "0.5px solid rgba(255,255,255,0.14)", borderRadius: 6, padding: 8, color: "#f0ede8", fontFamily: "monospace", fontSize: 11, lineHeight: 1.6, resize: "none", outline: "none" }}
        />
      ) : (
        <p style={{ fontSize: 12, color: "#888680", lineHeight: 1.6, flex: 1, whiteSpace: "pre-wrap", margin: 0 }}>{text}</p>
      )}

      <div style={{ fontSize: 10, fontFamily: "monospace", color: "#555350" }}>{wordCount(text)} words</div>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => onApprove(text)}
          disabled={approved}
          style={{ flex: 1, background: "rgba(99,153,34,0.12)", border: "0.5px solid rgba(99,153,34,0.3)", borderRadius: 5, padding: "6px 4px", color: approved ? "#555" : "#639922", fontFamily: "monospace", fontSize: 10, cursor: approved ? "not-allowed" : "pointer", opacity: approved ? 0.5 : 1 }}
        >
          ✓ approve
        </button>
        <button
          onClick={() => setEditing(!editing)}
          style={{ flex: 1, background: "#1e1e1e", border: "0.5px solid rgba(255,255,255,0.14)", borderRadius: 5, padding: "6px 4px", color: "#888680", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}
        >
          {editing ? "✓ done" : "✎ edit"}
        </button>
        <button
          onClick={onRegenerate}
          style={{ flex: 1, background: "#1e1e1e", border: "0.5px solid rgba(255,255,255,0.14)", borderRadius: 5, padding: "6px 4px", color: "#888680", fontFamily: "monospace", fontSize: 10, cursor: "pointer" }}
        >
          ↺ redo
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [form, setForm] = useState({ brandName: "", handle: "", niche: "", followers: "", market: "" });
  const [state, setState] = useState("empty"); // empty | loading | result | ratelimit
  const [result, setResult] = useState(null);
  const [genCount, setGenCount] = useState(0);
  const [dmApproved, setDmApproved] = useState(false);
  const [emailApproved, setEmailApproved] = useState(false);
  const [pipeline, setPipeline] = useState([]);

  const handleGenerate = () => {
    if (!form.brandName || !form.niche || !form.followers || !form.market) return;
    if (genCount >= 5) { setState("ratelimit"); return; }

    setGenCount((c) => c + 1);
    setDmApproved(false);
    setEmailApproved(false);
    setState("loading");

    setTimeout(() => {
      setResult(getSample(form));
      setState("result");
    }, 1600);
  };

  const handleApprove = (type, text) => {
    if (type === "dm") setDmApproved(true);
    else setEmailApproved(true);

    if (!pipeline.find((p) => p.brandName === form.brandName)) {
      setPipeline((prev) => [
        ...prev,
        {
          brandName: form.brandName,
          handle: form.handle || "—",
          niche: form.niche,
          dm: (result?.dm || "").substring(0, 52) + "…",
          email: (result?.email_body || "").substring(0, 52) + "…",
          status: "Approved",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  const toggleStatus = (i) => {
    setPipeline((prev) =>
      prev.map((p, idx) => idx === i ? { ...p, status: p.status === "Approved" ? "Sent" : "Approved" } : p)
    );
  };

  const inputStyle = {
    width: "100%", background: "#1e1e1e", border: "0.5px solid rgba(255,255,255,0.14)",
    borderRadius: 6, padding: "8px 10px", color: "#f0ede8", fontFamily: "inherit",
    fontSize: 13, outline: "none", appearance: "none",
  };

  const labelStyle = { display: "block", fontSize: 11, color: "#888680", marginBottom: 5, fontFamily: "monospace" };

  return (
    <div style={{ background: "#0e0e0e", color: "#f0ede8", fontFamily: "'Segoe UI', sans-serif", minHeight: "100vh", fontSize: 14 }}>
      {/* Header */}
      <div style={{ borderBottom: "0.5px solid rgba(255,255,255,0.08)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.02em" }}>Agency Outreach Generator</div>
          <div style={{ fontSize: 11, color: "#555350", fontFamily: "monospace", marginTop: 2 }}>Powered by Claude AI — Swimwear Influencer Agency</div>
        </div>
        <span style={{ fontSize: 10, fontFamily: "monospace", background: "rgba(216,90,48,0.15)", color: "#D85A30", border: "0.5px solid rgba(216,90,48,0.3)", padding: "3px 10px", borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Demo
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>
          {/* Form */}
          <div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#555350", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Brand Details</div>
            <div style={{ background: "#161616", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 18 }}>
              {[
                { label: "Brand Name *", key: "brandName", placeholder: "e.g. Monday Swimwear", type: "input" },
                { label: "Instagram Handle", key: "handle", placeholder: "e.g. mondayswimwear", type: "input" },
              ].map(({ label, key, placeholder }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder={placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}

              {[
                { label: "Niche / Vibe *", key: "niche", options: ["Swimwear", "Resort Wear", "Sustainable Swimwear", "Luxury Swimwear", "Surf & Active"] },
                { label: "Follower Count *", key: "followers", options: ["Under 10K", "10K–100K", "100K–500K", "500K+"] },
                { label: "Target Market *", key: "market", options: ["US", "EU", "SEA", "Global"] },
              ].map(({ label, key, options }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{label}</label>
                  <select value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">Select...</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}

              <button
                onClick={handleGenerate}
                disabled={state === "loading"}
                style={{ width: "100%", background: state === "loading" ? "#333" : "#D85A30", color: state === "loading" ? "#888" : "white", border: "none", borderRadius: 6, padding: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: state === "loading" ? "not-allowed" : "pointer", marginTop: 4, letterSpacing: "-0.01em" }}
              >
                {state === "loading" ? "Generating..." : "Generate Outreach"}
              </button>
            </div>
          </div>

          {/* Output */}
          <div>
            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#555350", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Generated Outreach</div>

            {state === "empty" && (
              <div style={{ background: "#161616", border: "0.5px dashed rgba(255,255,255,0.14)", borderRadius: 12, height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#555350", fontSize: 12, fontFamily: "monospace" }}>
                fill in brand details and click generate
              </div>
            )}

            {state === "loading" && (
              <div style={{ background: "#161616", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 12, height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#888680", fontFamily: "monospace", fontSize: 12 }}>
                <div style={{ width: 24, height: 24, border: "2px solid rgba(216,90,48,0.2)", borderTopColor: "#D85A30", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                crafting your outreach...
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {state === "ratelimit" && (
              <div style={{ background: "rgba(216,90,48,0.08)", border: "0.5px solid rgba(216,90,48,0.25)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#888680", lineHeight: 1.6 }}>
                You've hit the demo limit (5 generations/hour). This tool is intentionally rate-limited to keep it available. Want to see the full system? →{" "}
                <a href="https://jasonkhanani.com" style={{ color: "#D85A30" }}>jasonkhanani.com</a>
              </div>
            )}

            {state === "result" && result && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <MsgCard
                  key={`dm-${genCount}`}
                  label="Instagram DM"
                  content={result.dm}
                  approved={dmApproved}
                  onApprove={(t) => handleApprove("dm", t)}
                  onRegenerate={handleGenerate}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ background: "#161616", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 12px" }}>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#555350" }}>subj: </span>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#888680" }}>{result.email_subject}</span>
                  </div>
                  <MsgCard
                    key={`email-${genCount}`}
                    label="Cold Email"
                    content={result.email_body}
                    approved={emailApproved}
                    onApprove={(t) => handleApprove("email", t)}
                    onRegenerate={handleGenerate}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline */}
        {pipeline.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#555350", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pipeline Log</div>
              <span style={{ fontSize: 10, fontFamily: "monospace", background: "rgba(216,90,48,0.15)", color: "#D85A30", border: "0.5px solid rgba(216,90,48,0.25)", padding: "2px 8px", borderRadius: 20 }}>
                {pipeline.length} approved
              </span>
            </div>
            <div style={{ border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#161616", borderBottom: "0.5px solid rgba(255,255,255,0.08)" }}>
                    {["Brand", "Niche", "DM Preview", "Email Preview", "Status", "Time"].map((h) => (
                      <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 9, fontFamily: "monospace", color: "#555350", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pipeline.map((p, i) => (
                    <tr key={i} style={{ borderBottom: i < pipeline.length - 1 ? "0.5px solid rgba(255,255,255,0.08)" : "none" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ color: "#f0ede8", fontWeight: 500 }}>{p.brandName}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 11, color: "#555350" }}>@{p.handle}</div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#888680" }}>{p.niche}</td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "#888680", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.dm}</td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: "#888680", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          onClick={() => toggleStatus(i)}
                          style={{ fontSize: 9, fontFamily: "monospace", padding: "3px 8px", borderRadius: 20, cursor: "pointer", border: "0.5px solid", textTransform: "uppercase", letterSpacing: "0.05em", background: p.status === "Sent" ? "rgba(55,138,221,0.12)" : "rgba(99,153,34,0.12)", color: p.status === "Sent" ? "#378ADD" : "#639922", borderColor: p.status === "Sent" ? "rgba(55,138,221,0.3)" : "rgba(99,153,34,0.3)" }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 10, color: "#555350" }}>{p.time}</td>
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

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── THEME TOKENS ───────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    name: "Dark",
    bg: "#0d0f1a",
    sidebar: "#111320",
    panel: "#151828",
    panelBorder: "rgba(255,255,255,0.07)",
    topbar: "rgba(10,12,28,0.96)",
    editorBg: "#0a0c18",
    editorText: "#c8d3f5",
    lineNum: "rgba(100,110,180,0.38)",
    accent: "#6c7fff",
    accentSoft: "rgba(108,127,255,0.15)",
    green: "#22d98e",
    red: "#f53d5b",
    orange: "#f5973d",
    text: "#dde3ff",
    text2: "#7880aa",
    divider: "rgba(255,255,255,0.07)",
    scrollThumb: "rgba(108,127,255,0.18)",
    snipBg: "rgba(108,127,255,0.12)",
    snipBorder: "rgba(108,127,255,0.22)",
    snipText: "#8899ff",
    statusBg: "rgba(0,0,0,0.4)",
    previewBg: "#f8f9ff",
    tabActive: "#6c7fff",
    tabBg: "rgba(255,255,255,0.05)",
  },
  light: {
    name: "Light",
    bg: "#f0f2ff",
    sidebar: "#e8ebff",
    panel: "#f5f6ff",
    panelBorder: "rgba(80,100,200,0.1)",
    topbar: "rgba(240,242,255,0.97)",
    editorBg: "#ffffff",
    editorText: "#1a1c3a",
    lineNum: "rgba(100,110,180,0.4)",
    accent: "#5b6ef5",
    accentSoft: "rgba(91,110,245,0.12)",
    green: "#18a875",
    red: "#e03050",
    orange: "#e07820",
    text: "#1a1c3a",
    text2: "#5a5e88",
    divider: "rgba(80,100,200,0.1)",
    scrollThumb: "rgba(91,110,245,0.2)",
    snipBg: "rgba(91,110,245,0.08)",
    snipBorder: "rgba(91,110,245,0.2)",
    snipText: "#5b6ef5",
    statusBg: "rgba(220,225,255,0.8)",
    previewBg: "#ffffff",
    tabActive: "#5b6ef5",
    tabBg: "rgba(80,100,200,0.07)",
  },
};

// ─── SYNTAX HIGHLIGHT ────────────────────────────────────────────────────────
function highlight(code, isDark) {
  const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const c = {
    tag:     isDark ? "#f07178" : "#d63031",
    attr:    isDark ? "#ffcb6b" : "#e17055",
    str:     isDark ? "#c3e88d" : "#00b894",
    comment: isDark ? "#546e7a" : "#95a5a6",
    doctype: isDark ? "#c792ea" : "#6c5ce7",
    cssKey:  isDark ? "#89ddff" : "#0984e3",
    cssVal:  isDark ? "#f78c6c" : "#e17055",
    jsKw:    isDark ? "#c792ea" : "#6c5ce7",
    jsStr:   isDark ? "#c3e88d" : "#00b894",
    jsFn:    isDark ? "#82aaff" : "#0984e3",
    jsNum:   isDark ? "#f78c6c" : "#e17055",
  };

  let out = esc(code);

  // DOCTYPE
  out = out.replace(/(&lt;!DOCTYPE[^&]*&gt;)/gi,
    `<span style="color:${c.doctype}">$1</span>`);
  // HTML Comments
  out = out.replace(/(&lt;!--[\s\S]*?--&gt;)/g,
    `<span style="color:${c.comment};font-style:italic">$1</span>`);
  // Script/style content blocks (simplified)
  out = out.replace(
    /(&lt;(style|script)[^&]*&gt;)([\s\S]*?)(&lt;\/(style|script)&gt;)/gi,
    (_, open, tag, inner, close) => {
      // css-like coloring inside style/script
      let coloredInner = inner
        .replace(/\/\*[\s\S]*?\*\//g, m => `<span style="color:${c.comment}">${m}</span>`)
        .replace(/\/\/.*/g, m => `<span style="color:${c.comment}">${m}</span>`)
        .replace(/(["'`])(.*?)\1/g, (m) => `<span style="color:${c.jsStr}">${m}</span>`)
        .replace(/\b(\d+\.?\d*)(px|em|rem|%|vh|vw|s|ms)?\b/g,
          (m, n, u) => `<span style="color:${c.jsNum}">${n}</span>${u||""}`)
        .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|new|this|async|await|true|false|null|undefined)\b/g,
          (m) => `<span style="color:${c.jsKw}">${m}</span>`);
      return `<span style="color:${c.tag}">${open}</span>${coloredInner}<span style="color:${c.tag}">${close}</span>`;
    }
  );
  // Tags
  out = out.replace(/(&lt;\/?)([\w-]+)([^&]*?)(\/?&gt;)/g, (_, open, name, attrs, close) => {
    const coloredAttrs = attrs
      .replace(/([\w-]+)(=)/g, `<span style="color:${c.attr}">$1</span>$2`)
      .replace(/(["'])(.*?)\1/g, `<span style="color:${c.str}">$1$2$1</span>`);
    return `<span style="color:${c.tag}">${open}<span style="color:${c.tag};font-weight:600">${name}</span>${coloredAttrs}${close}</span>`;
  });
  return out;
}

// ─── SNIPPETS ────────────────────────────────────────────────────────────────
const SNIPPETS = [
  { label: "html5", code: `<!DOCTYPE html>\n<html lang="ne">\n<head>\n<meta charset="UTF-8">\n<title>Title</title>\n</head>\n<body>\n  \n</body>\n</html>` },
  { label: "div", code: `<div class="">\n  \n</div>` },
  { label: "p", code: `<p></p>` },
  { label: "h1", code: `<h1></h1>` },
  { label: "a", code: `<a href="#">Link</a>` },
  { label: "img", code: `<img src="" alt="" style="max-width:100%">` },
  { label: "button", code: `<button onclick="">Click</button>` },
  { label: "input", code: `<input type="text" placeholder="Type here...">` },
  { label: "ul", code: `<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>` },
  { label: "table", code: `<table border="1">\n  <tr><th>A</th><th>B</th></tr>\n  <tr><td>1</td><td>2</td></tr>\n</table>` },
  { label: "flex", code: `style="display:flex;gap:12px;align-items:center;"` },
  { label: "grid", code: `style="display:grid;grid-template-columns:1fr 1fr;gap:16px;"` },
  { label: "style", code: `<style>\n  body { margin: 0; font-family: sans-serif; }\n</style>` },
  { label: "script", code: `<script>\n  document.addEventListener('DOMContentLoaded', () => {\n    \n  });\n</script>` },
  { label: "card", code: `<div style="background:white;border-radius:16px;padding:24px;box-shadow:0 4px 24px rgba(0,0,0,0.1);max-width:360px;margin:20px auto">\n  <h2 style="margin:0 0 8px">Title</h2>\n  <p style="color:#666;margin:0">Description here.</p>\n</div>` },
  { label: "navbar", code: `<nav style="background:#333;padding:12px 24px;display:flex;align-items:center;gap:20px">\n  <a href="#" style="color:white;text-decoration:none;font-weight:700">Logo</a>\n  <a href="#" style="color:#ccc;text-decoration:none">Home</a>\n  <a href="#" style="color:#ccc;text-decoration:none">About</a>\n</nav>` },
];

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="ne">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>मेरो पेज</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .card {
    background: white;
    border-radius: 24px;
    padding: 48px 40px;
    text-align: center;
    box-shadow: 0 24px 80px rgba(0,0,0,0.25);
    max-width: 400px;
    width: 90%;
  }
  h1 { color: #667eea; font-size: 2rem; margin-bottom: 12px; }
  p { color: #666; line-height: 1.6; margin-bottom: 24px; }
  button {
    padding: 12px 28px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 20px rgba(102,126,234,0.4);
  }
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(102,126,234,0.5);
  }
</style>
</head>
<body>
  <div class="card">
    <h1>🙏 नमस्ते!</h1>
    <p>माथि code लेख्नुस् — तल तुरुन्तै preview देख्नुस्!<br>यो real-time live editor हो।</p>
    <button onclick="this.textContent='🎉 काम गर्यो!'">Click गर्नुस्</button>
  </div>
</body>
</html>`;

// ─── DEVICE FRAMES ──────────────────────────────────────────────────────────
const DEVICES = [
  { id: "full",    label: "🖥",  w: "100%",  h: "100%" },
  { id: "laptop",  label: "💻",  w: "960px", h: "600px" },
  { id: "tablet",  label: "📱",  w: "768px", h: "1024px" },
  { id: "mobile",  label: "📱",  w: "390px", h: "844px" },
];

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function App() {
  const [code, setCode]           = useState(DEFAULT_HTML);
  const [themeName, setThemeName] = useState("dark");
  const [tab, setTab]             = useState("split");    // split | editor | preview
  const [device, setDevice]       = useState("full");
  const [fontSize, setFontSize]   = useState(13);
  const [wordWrap, setWordWrap]   = useState(false);
  const [showFind, setShowFind]   = useState(false);
  const [findVal, setFindVal]     = useState("");
  const [replaceVal, setReplaceVal] = useState("");
  const [cursor, setCursor]       = useState({ ln: 1, col: 1 });
  const [toast, setToast]         = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [aiPanel, setAiPanel]     = useState(false);
  const [aiPrompt, setAiPrompt]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [history, setHistory]     = useState([DEFAULT_HTML]);
  const [histIdx, setHistIdx]     = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [shareUrl, setShareUrl]   = useState("");

  const editorRef   = useRef(null);
  const highlightRef = useRef(null);
  const toastTimer  = useRef(null);
  const histTimer   = useRef(null);

  const T = THEMES[themeName];
  const isDark = themeName === "dark";

  // ── Highlighted HTML ──────────────────────────────────────────────────────
  const highlightedHtml = useMemo(() => highlight(code, isDark), [code, isDark]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, dur = 2200) => {
    setToast(msg);
    setToastVisible(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), dur);
  }, []);

  // ── History ───────────────────────────────────────────────────────────────
  const pushHistory = useCallback((val) => {
    setHistory(h => {
      const base = h.slice(0, histIdx + 1);
      const next = [...base, val].slice(-60);
      return next;
    });
    setHistIdx(i => Math.min(i + 1, 59));
  }, [histIdx]);

  // ── Sync scroll: editor ↔ highlight overlay ───────────────────────────────
  const syncScroll = (e) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop  = e.target.scrollTop;
      highlightRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // ── Handle text change ────────────────────────────────────────────────────
  const handleChange = (e) => {
    const val = e.target.value;
    setCode(val);
    // cursor pos
    const pos = e.target.selectionStart;
    const before = val.slice(0, pos);
    const ln = before.split("\n").length;
    const col = before.split("\n").pop().length + 1;
    setCursor({ ln, col });
    // debounced history
    clearTimeout(histTimer.current);
    histTimer.current = setTimeout(() => pushHistory(val), 800);
    // find count
    if (findVal) {
      try {
        const rx = new RegExp(findVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        setMatchCount((val.match(rx) || []).length);
      } catch { setMatchCount(0); }
    }
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    const ta = e.target;
    const s  = ta.selectionStart;
    const en = ta.selectionEnd;

    // Tab → 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const newVal = code.slice(0, s) + "  " + code.slice(en);
      setCode(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
      return;
    }
    // Enter → auto-indent
    if (e.key === "Enter") {
      e.preventDefault();
      const lines = code.slice(0, s).split("\n");
      const lastLine = lines[lines.length - 1];
      const indent = lastLine.match(/^(\s*)/)[1];
      const extra = lastLine.trimEnd().endsWith(">") ? "  " : "";
      const ins = "\n" + indent + extra;
      const newVal = code.slice(0, s) + ins + code.slice(en);
      setCode(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + ins.length; });
      return;
    }
    // Ctrl+Z
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
      e.preventDefault();
      if (histIdx > 0) { setHistIdx(i => i - 1); setCode(history[histIdx - 1]); showToast("↩ Undo"); }
      return;
    }
    // Ctrl+Y / Ctrl+Shift+Z
    if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
      e.preventDefault();
      if (histIdx < history.length - 1) { setHistIdx(i => i + 1); setCode(history[histIdx + 1]); showToast("↪ Redo"); }
      return;
    }
    // Ctrl+S
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave(); return; }
    // Ctrl+F
    if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); setShowFind(f => !f); return; }
    // Ctrl+D  — duplicate line
    if ((e.ctrlKey || e.metaKey) && e.key === "d") {
      e.preventDefault();
      const lines = code.split("\n");
      const before = code.slice(0, s);
      const lineIdx = before.split("\n").length - 1;
      const line = lines[lineIdx];
      lines.splice(lineIdx + 1, 0, line);
      const newVal = lines.join("\n");
      setCode(newVal);
      showToast("📋 Line duplicated");
      return;
    }
    // Ctrl+/ — comment/uncomment
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      const before2 = code.slice(0, s);
      const lineIdx = before2.split("\n").length - 1;
      const lines2 = code.split("\n");
      const line2 = lines2[lineIdx];
      lines2[lineIdx] = line2.trimStart().startsWith("<!--")
        ? line2.replace(/<!--\s?/, "").replace(/\s?-->/, "")
        : `<!-- ${line2} -->`;
      setCode(lines2.join("\n"));
      return;
    }
    // Auto-close brackets
    const pairs = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
    if (pairs[e.key] && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const sel = code.slice(s, en);
      const ins = e.key + (sel || "") + pairs[e.key];
      const newVal = code.slice(0, s) + ins + code.slice(en);
      setCode(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 1 + (sel ? sel.length : 0); });
    }
  };

  // ── Insert snippet ────────────────────────────────────────────────────────
  const insertSnippet = (snipCode) => {
    const ta = editorRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const newVal = code.slice(0, s) + snipCode + code.slice(e);
    setCode(newVal);
    pushHistory(newVal);
    requestAnimationFrame(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = s + snipCode.length; });
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    const blob = new Blob([code], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "index.html"; a.click();
    URL.revokeObjectURL(url);
    showToast("💾 index.html saved!");
  };

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard?.writeText(code).then(() => showToast("📋 Code copied!"));
  };

  // ── Format ────────────────────────────────────────────────────────────────
  const handleFormat = () => {
    let formatted = code;
    let indent = 0;
    const lines = formatted.split("\n").map(l => l.trim()).filter(Boolean);
    formatted = lines.map(line => {
      if (line.match(/^<\//)) indent = Math.max(0, indent - 1);
      const out = "  ".repeat(indent) + line;
      if (line.match(/^<[^/!][^>]*[^/]>$/) && !line.match(/^<(br|hr|img|input|meta|link)/i)) indent++;
      return out;
    }).join("\n");
    setCode(formatted);
    pushHistory(formatted);
    showToast("✨ Code formatted!");
  };

  // ── Find & Replace ────────────────────────────────────────────────────────
  const handleFind = () => {
    if (!findVal) return;
    try {
      const rx = new RegExp(findVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      setMatchCount((code.match(rx) || []).length);
    } catch { setMatchCount(0); }
  };

  const handleReplace = () => {
    if (!findVal) return;
    try {
      const rx = new RegExp(findVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const newCode = code.replace(rx, replaceVal);
      setCode(newCode);
      pushHistory(newCode);
      showToast("✅ Replace done!");
    } catch { showToast("❌ Invalid search"); }
  };

  // ── Share via URL ─────────────────────────────────────────────────────────
  const handleShare = () => {
    try {
      const encoded = btoa(unescape(encodeURIComponent(code)));
      const url = `data:text/html;base64,${encoded}`;
      setShareUrl(url);
      navigator.clipboard?.writeText(url).then(() => showToast("🔗 Share URL copied!"));
    } catch { showToast("❌ Share failed"); }
  };

  // ── Export ZIP (just HTML for now, single file) ───────────────────────────
  const handleExport = () => {
    // extract CSS and JS, create 3 files
    const cssMatch  = code.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const jsMatch   = code.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const cssContent  = cssMatch  ? cssMatch[1].trim()  : "/* styles */";
    const jsContent   = jsMatch   ? jsMatch[1].trim()   : "// scripts";
    let htmlClean = code
      .replace(/<style[^>]*>[\s\S]*?<\/style>/i, '<link rel="stylesheet" href="style.css">')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/i, '<script src="script.js"></script>');

    const files = [
      { name: "index.html",  content: htmlClean },
      { name: "style.css",   content: cssContent },
      { name: "script.js",   content: jsContent },
    ];
    files.forEach(f => {
      const blob = new Blob([f.content], { type: "text/plain" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = f.name; a.click();
      URL.revokeObjectURL(url);
    });
    showToast("📦 3 files exported!");
  };

  // ── AI Assist ─────────────────────────────────────────────────────────────
  const handleAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `You are an expert HTML/CSS/JS developer. The user will give you their HTML code and a request.
Return ONLY the complete updated HTML code, nothing else — no explanation, no markdown backticks, just raw HTML.`,
          messages: [{
            role: "user",
            content: `Current code:\n\`\`\`html\n${code}\n\`\`\`\n\nRequest: ${aiPrompt}`,
          }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const newCode = data.content?.map(b => b.text || "").join("").trim();
      if (newCode) {
        setCode(newCode);
        pushHistory(newCode);
        showToast("🤖 AI ले update गर्यो!");
        setAiPrompt("");
      } else {
        throw new Error("Empty response");
      }
    } catch (err) {
      setAiError("❌ " + (err.message || "AI error. Retry गर्नुस्।"));
    } finally {
      setAiLoading(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const charCount = code.length;
  const lineCount = code.split("\n").length;
  const dev = DEVICES.find(d => d.id === device) || DEVICES[0];

  // ── Preview iframe srcDoc (always live) ───────────────────────────────────
  // We use a key change on manual refresh; otherwise srcDoc tracks `code` directly
  const iframeSrcDoc = code;

  // ─── RENDER ──────────────────────────────────────────────────────────────
  const mono = "'Fira Code','SF Mono','Cascadia Code','Courier New',monospace";
  const ui   = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

  const Btn = ({ onClick, title, children, style: s = {} }) => (
    <button onClick={onClick} title={title} style={{
      background: "rgba(255,255,255,0.07)", border: `1px solid ${T.panelBorder}`,
      borderRadius: 8, color: T.text, fontSize: 13, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 10px", height: 30, whiteSpace: "nowrap", fontFamily: ui,
      transition: "background 0.12s", ...s,
    }}>{children}</button>
  );

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: T.bg, fontFamily: ui, color: T.text,
      overflow: "hidden", fontSize: 13,
    }}>

      {/* ══ TOPBAR ══════════════════════════════════════════════════════════ */}
      <div style={{
        height: 48, display: "flex", alignItems: "center", gap: 6,
        padding: "0 10px",
        background: T.topbar,
        backdropFilter: "blur(24px)",
        borderBottom: `1px solid ${T.divider}`,
        flexShrink: 0, zIndex: 20,
      }}>
        {/* Logo */}
        <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 800, color: T.accent, flexShrink: 0 }}>
          {"<"}<span style={{ color: T.green }}>/</span>{">"}
          <span style={{ color: T.text2, fontWeight: 400, fontSize: 11, marginLeft: 6 }}>LiveEdit</span>
        </span>

        {/* Live badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "rgba(34,217,142,0.12)", border: "1px solid rgba(34,217,142,0.25)",
          borderRadius: 20, padding: "2px 8px", flexShrink: 0,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", background: T.green,
            animation: "pulse 2s infinite",
          }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: T.green }}>LIVE</span>
        </div>

        {/* View tabs */}
        <div style={{
          display: "flex", gap: 2,
          background: T.tabBg,
          border: `1px solid ${T.panelBorder}`,
          borderRadius: 9, padding: 2, marginLeft: 4,
        }}>
          {[
            { id: "split",   label: "⊞ Split" },
            { id: "editor",  label: "✏️ Code" },
            { id: "preview", label: "👁 Preview" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "4px 11px", borderRadius: 6, border: "none",
              background: tab === t.id ? T.tabActive : "transparent",
              color: tab === t.id ? "white" : T.text2,
              fontSize: 11, fontWeight: 700, cursor: "pointer",
              fontFamily: ui, transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Device (preview mode) */}
        {(tab === "preview" || tab === "split") && (
          <div style={{ display: "flex", gap: 2, marginLeft: 2 }}>
            {DEVICES.map(d => (
              <button key={d.id} onClick={() => setDevice(d.id)} title={d.id} style={{
                width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.panelBorder}`,
                background: device === d.id ? T.accentSoft : "transparent",
                fontSize: 14, cursor: "pointer",
                outline: device === d.id ? `1.5px solid ${T.accent}` : "none",
              }}>{d.label}</button>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <Btn onClick={handleSave} title="Save (Ctrl+S)">💾</Btn>
          <Btn onClick={handleCopy} title="Copy code">📋</Btn>
          <Btn onClick={handleExport} title="Export HTML+CSS+JS">📦</Btn>
          <Btn onClick={handleShare} title="Share URL">🔗</Btn>
          <Btn onClick={() => setShowFind(f => !f)} title="Find & Replace (Ctrl+F)"
            style={{ background: showFind ? T.accentSoft : undefined }}>🔍</Btn>
          <Btn onClick={() => setAiPanel(p => !p)} title="AI Assist"
            style={{ background: aiPanel ? "rgba(108,127,255,0.2)" : undefined, color: T.accent, fontWeight: 700 }}>
            🤖 AI
          </Btn>
          {/* Theme */}
          <button onClick={() => setThemeName(n => n === "dark" ? "light" : "dark")}
            title="Toggle theme" style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(255,255,255,0.07)", border: `1px solid ${T.panelBorder}`,
              fontSize: 15, cursor: "pointer",
            }}>{isDark ? "☀️" : "🌙"}</button>
        </div>
      </div>

      {/* ══ FIND & REPLACE BAR ══════════════════════════════════════════════ */}
      {showFind && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
          background: T.panel, borderBottom: `1px solid ${T.divider}`,
          flexShrink: 0, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 12, color: T.text2, fontWeight: 700 }}>🔍 Find</span>
          <input value={findVal} onChange={e => { setFindVal(e.target.value); handleFind(); }}
            placeholder="Search..." style={{
              background: T.editorBg, border: `1px solid ${T.panelBorder}`,
              borderRadius: 6, padding: "4px 10px", color: T.text,
              fontFamily: mono, fontSize: 12, outline: "none", width: 140,
            }} />
          {matchCount > 0 && (
            <span style={{ fontSize: 11, color: T.green, fontWeight: 700 }}>{matchCount} found</span>
          )}
          <span style={{ fontSize: 12, color: T.text2, fontWeight: 700 }}>→</span>
          <input value={replaceVal} onChange={e => setReplaceVal(e.target.value)}
            placeholder="Replace with..." style={{
              background: T.editorBg, border: `1px solid ${T.panelBorder}`,
              borderRadius: 6, padding: "4px 10px", color: T.text,
              fontFamily: mono, fontSize: 12, outline: "none", width: 140,
            }} />
          <Btn onClick={handleReplace} style={{ background: T.accentSoft, color: T.accent, fontWeight: 700 }}>Replace All</Btn>
          <button onClick={() => setShowFind(false)} style={{
            background: "none", border: "none", color: T.text2,
            fontSize: 16, cursor: "pointer", marginLeft: "auto",
          }}>✕</button>
        </div>
      )}

      {/* ══ AI PANEL ════════════════════════════════════════════════════════ */}
      {aiPanel && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
          background: "rgba(108,127,255,0.08)",
          borderBottom: `1px solid rgba(108,127,255,0.2)`,
          flexShrink: 0, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>🤖 AI Assist</span>
          <input
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAI()}
            placeholder='e.g. "dark mode थप्नुस्", "navbar बनाउनुस्", "animation हाल्नुस्"'
            style={{
              flex: 1, minWidth: 200,
              background: T.editorBg, border: `1px solid rgba(108,127,255,0.3)`,
              borderRadius: 8, padding: "6px 12px",
              color: T.text, fontFamily: ui, fontSize: 13, outline: "none",
            }}
          />
          <button onClick={handleAI} disabled={aiLoading} style={{
            background: T.accent, border: "none", borderRadius: 8,
            color: "white", fontWeight: 700, fontSize: 13, padding: "6px 16px",
            cursor: aiLoading ? "not-allowed" : "pointer", opacity: aiLoading ? 0.6 : 1,
            fontFamily: ui,
          }}>
            {aiLoading ? "⏳ सोच्दैछ..." : "✨ Generate"}
          </button>
          {aiError && <span style={{ color: T.red, fontSize: 12, width: "100%" }}>{aiError}</span>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: "100%" }}>
            {["Dark mode थप्नुस्","Button animation हाल्नुस्","Responsive बनाउनुस्","Navbar थप्नुस्","Footer थप्नुस्"].map(s => (
              <button key={s} onClick={() => setAiPrompt(s)} style={{
                background: T.accentSoft, border: `1px solid ${T.accent}30`,
                borderRadius: 20, padding: "3px 10px",
                fontSize: 11, color: T.accent, cursor: "pointer", fontFamily: ui,
              }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* ══ MAIN WORKSPACE ══════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* ── EDITOR PANEL ─────────────────────────────────────────────── */}
        {(tab === "editor" || tab === "split") && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            overflow: "hidden", minWidth: 0,
            borderRight: tab === "split" ? `1px solid ${T.divider}` : "none",
          }}>

            {/* Snippet toolbar */}
            <div style={{
              display: "flex", gap: 4, padding: "5px 8px",
              overflowX: "auto", flexShrink: 0,
              background: T.panel, borderBottom: `1px solid ${T.divider}`,
              scrollbarWidth: "none", alignItems: "center",
            }}>
              {SNIPPETS.map(s => (
                <button key={s.label} onClick={() => insertSnippet(s.code)} style={{
                  background: T.snipBg, border: `1px solid ${T.snipBorder}`,
                  borderRadius: 6, padding: "3px 9px",
                  fontSize: 11, fontWeight: 700, fontFamily: mono,
                  color: T.snipText, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                }}>{s.label}</button>
              ))}
              <div style={{ width: 1, height: 20, background: T.divider, flexShrink: 0, margin: "0 2px" }} />
              {/* Tools */}
              {[
                { icon: "✨", label: "Format", fn: handleFormat, color: T.green },
                { icon: "⏎", label: wordWrap ? "Wrap ON" : "Wrap", fn: () => setWordWrap(w => !w),
                  color: wordWrap ? T.accent : T.text2, bg: wordWrap ? T.accentSoft : undefined },
                { icon: "A+", label: "Font+", fn: () => setFontSize(f => Math.min(f+1,22)) },
                { icon: "A−", label: "Font−", fn: () => setFontSize(f => Math.max(f-1,9)) },
              ].map(b => (
                <button key={b.label} onClick={b.fn} title={b.label} style={{
                  background: b.bg || "rgba(255,255,255,0.05)",
                  border: `1px solid ${T.panelBorder}`,
                  borderRadius: 6, padding: "3px 9px",
                  fontSize: 11, fontWeight: 700, fontFamily: mono,
                  color: b.color || T.text2, cursor: "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>{b.icon}</button>
              ))}
            </div>

            {/* Code editor with syntax highlight overlay */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
              {/* Line numbers */}
              <div style={{
                width: 42, background: "rgba(0,0,0,0.2)",
                borderRight: `1px solid ${T.divider}`,
                padding: "13px 0", fontFamily: mono, fontSize: fontSize - 1,
                lineHeight: 1.65, color: T.lineNum,
                textAlign: "right", flexShrink: 0,
                userSelect: "none", overflowY: "hidden",
              }}>
                {code.split("\n").map((_, i) => (
                  <div key={i} style={{ paddingRight: 8, lineHeight: "1.65" }}>{i + 1}</div>
                ))}
              </div>

              {/* Highlight layer (behind textarea) */}
              <pre ref={highlightRef}
                aria-hidden="true"
                style={{
                  position: "absolute", left: 42, right: 0, top: 0, bottom: 0,
                  margin: 0, padding: "13px 12px",
                  fontFamily: mono, fontSize: fontSize, lineHeight: 1.65,
                  color: "transparent",
                  background: T.editorBg,
                  overflow: "hidden",
                  whiteSpace: wordWrap ? "pre-wrap" : "pre",
                  overflowWrap: wordWrap ? "break-word" : "normal",
                  pointerEvents: "none",
                  tabSize: 2,
                  borderRadius: 0,
                }}
                dangerouslySetInnerHTML={{ __html: highlightedHtml + "\n" }}
              />

              {/* Actual textarea (transparent text, on top) */}
              <textarea
                ref={editorRef}
                value={code}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={syncScroll}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                style={{
                  position: "absolute", left: 42, right: 0, top: 0, bottom: 0,
                  background: "transparent",
                  border: "none", outline: "none",
                  fontFamily: mono, fontSize: fontSize,
                  lineHeight: 1.65,
                  color: "transparent",
                  caretColor: T.accent,
                  padding: "13px 12px",
                  resize: "none",
                  overflow: "auto",
                  whiteSpace: wordWrap ? "pre-wrap" : "pre",
                  overflowWrap: wordWrap ? "break-word" : "normal",
                  tabSize: 2,
                  zIndex: 2,
                }}
              />
            </div>

            {/* Status bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "3px 12px", fontSize: 10, fontFamily: mono,
              color: T.text2, background: T.statusBg,
              borderTop: `1px solid ${T.divider}`, flexShrink: 0,
            }}>
              <span style={{ color: T.green, fontWeight: 700 }}>⚡ LIVE</span>
              <span>Ln {cursor.ln} · Col {cursor.col}</span>
              <span>{charCount} chars</span>
              <span style={{ marginLeft: "auto" }}>{lineCount} lines</span>
              <span>{fontSize}px</span>
              <span>HTML</span>
            </div>
          </div>
        )}

        {/* ── PREVIEW PANEL ────────────────────────────────────────────── */}
        {(tab === "preview" || tab === "split") && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            overflow: "hidden", minWidth: 0,
            background: isDark ? "#1a1a2e" : "#e8eaff",
          }}>
            {/* Preview chrome bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
              background: T.panel, borderBottom: `1px solid ${T.divider}`,
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", gap: 5 }}>
                {["#ff5f57","#febc2e","#28c840"].map(c => (
                  <div key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
                ))}
              </div>
              <div style={{
                flex: 1, background: T.tabBg,
                border: `1px solid ${T.panelBorder}`,
                borderRadius: 7, padding: "3px 10px",
                fontSize: 11, fontFamily: mono, color: T.text2,
              }}>
                🌐 live preview — {dev.id === "mobile" ? "390×844 (iPhone)" : dev.id === "tablet" ? "768×1024 (iPad)" : dev.id === "laptop" ? "960px" : "full"}
              </div>
              <button onClick={() => setPreviewKey(k => k+1)} title="Hard refresh" style={{
                background: "none", border: "none", fontSize: 15,
                cursor: "pointer", color: T.green, padding: 2,
              }}>🔄</button>
            </div>

            {/* Device frame wrapper */}
            <div style={{
              flex: 1, overflow: "auto", display: "flex",
              alignItems: dev.id === "full" ? "stretch" : "center",
              justifyContent: dev.id === "full" ? "stretch" : "center",
              padding: dev.id === "full" ? 0 : 16,
              background: dev.id === "full" ? T.previewBg : (isDark ? "#12131f" : "#d8daf0"),
            }}>
              <div style={{
                width: dev.w, height: dev.h,
                maxWidth: "100%",
                borderRadius: dev.id === "mobile" ? 32 : dev.id === "tablet" ? 20 : 0,
                overflow: "hidden",
                boxShadow: dev.id !== "full" ? "0 24px 80px rgba(0,0,0,0.4)" : "none",
                border: dev.id !== "full" ? `2px solid rgba(255,255,255,0.15)` : "none",
                display: "flex", flexDirection: "column", flexShrink: 0,
              }}>
                <iframe
                  key={previewKey}
                  srcDoc={iframeSrcDoc}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                  style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
                  title="Live Preview"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ TOAST ═══════════════════════════════════════════════════════════ */}
      <div style={{
        position: "fixed", bottom: 16, left: "50%",
        transform: `translateX(-50%) translateY(${toastVisible ? 0 : 12}px)`,
        opacity: toastVisible ? 1 : 0,
        transition: "all 0.22s cubic-bezier(0.32,0.72,0,1)",
        background: "rgba(15,17,35,0.93)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 22, padding: "8px 20px",
        fontSize: 13, fontWeight: 600, color: "white",
        pointerEvents: "none", whiteSpace: "nowrap", zIndex: 999,
      }}>{toast}</div>

      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 3px rgba(34,217,142,0.2); opacity: 1; }
          50% { box-shadow: 0 0 0 7px rgba(34,217,142,0); opacity: 0.7; }
        }
        textarea { -webkit-user-select: text !important; user-select: text !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.scrollThumb}; border-radius: 4px; }
        button:hover { filter: brightness(1.1); }
        input::placeholder { color: ${T.text2}; opacity: 0.6; }
      `}</style>
    </div>
  );
}

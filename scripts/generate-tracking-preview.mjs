/**
 * Generates docs/tracking-window-preview.html — static preview of TrackingWindow scenes.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "docs", "patwadi-tracking-window-india-v2.html");
const outPath = path.join(root, "docs", "tracking-window-preview.html");

const PREVIEW_CITIES = [
  { label: "Delhi", locIndex: 0 },
  { label: "Mumbai", locIndex: 7 },
  { label: "Hyderabad", locIndex: 9 },
  { label: "Manali (HP fallback)", locIndex: 23 },
  { label: "Chandigarh", locIndex: 5 },
  { label: "Amritsar", locIndex: 4 },
];

const W = 340;
const H = 250;
const TIME = "afternoon";

const html = fs.readFileSync(htmlPath, "utf8");
const scriptStart = html.indexOf("<script>") + "<script>".length;
const scriptEnd = html.indexOf("</script>", scriptStart);
const script = html.slice(scriptStart, scriptEnd);

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function extractConst(name) {
  const start = script.indexOf(`const ${name} =`);
  if (start < 0) throw new Error(`Missing ${name}`);
  let j = script.indexOf("=", start) + 1;
  while (script[j] === " ") j++;
  const open = script[j];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  for (; j < script.length; j++) {
    if (script[j] === open) depth++;
    else if (script[j] === close) {
      depth--;
      if (depth === 0) return script.slice(start, j + 1);
    }
  }
  throw new Error(`Unclosed ${name}`);
}

const evalScript = `
const __rand = (${mulberry32.toString()})(42);
function rnd(a,b){ return a + __rand()*(b-a); }
${extractConst("TIMES").replace(/^const TIMES/, "TIMES")}
${extractConst("CITY_SCENES").replace(/^const CITY_SCENES/, "CITY_SCENES")}
${extractConst("STATE_SCENES").replace(/^const STATE_SCENES/, "STATE_SCENES")}
${extractConst("LOCATIONS").replace(/^const LOCATIONS/, "LOCATIONS")}
function resolveScene(loc){
  if (loc.aliasOf) return { kind:'city', name:loc.aliasOf, scene:CITY_SCENES[loc.aliasOf] };
  if (CITY_SCENES[loc.city]) return { kind:'city', name:loc.city, scene:CITY_SCENES[loc.city] };
  return { kind:'state', name:loc.state, scene:STATE_SCENES[loc.state] };
}
`;

const sandbox = { Math, Array, document: { getElementById: () => null } };
vm.createContext(sandbox);
vm.runInContext(evalScript, sandbox);

const { TIMES, LOCATIONS, resolveScene } = sandbox;
const t = TIMES[TIME];

function buildSceneSvg(resolved) {
  const stars =
    t.starOpacity > 0
      ? [
          [28, 15, 0.9, 0.55],
          [61, 35, 0.6, 0.35],
          [105, 20, 1.1, 0.7],
          [150, 45, 0.7, 0.4],
          [194, 12, 0.8, 0.5],
          [224, 30, 1.0, 0.65],
          [252, 55, 0.5, 0.3],
          [282, 22, 0.9, 0.55],
          [313, 40, 0.7, 0.45],
        ]
          .map(
            ([x, y, r, o]) =>
              `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o * t.starOpacity}"/>`
          )
          .join("")
      : "";

  let celestial = "";
  if (TIME === "morning") {
    celestial = `<radialGradient id="cel" cx="50%" cy="50%"><stop offset="0%" stop-color="#FFF3D6"/><stop offset="60%" stop-color="#FFD98A"/><stop offset="100%" stop-color="#FFD98A" stop-opacity="0"/></radialGradient><circle cx="${W * 0.24}" cy="${H * 0.22}" r="68" fill="url(#cel)"/><circle cx="${W * 0.24}" cy="${H * 0.22}" r="22" fill="#FFEFC2"/>`;
  } else if (TIME === "afternoon") {
    celestial = `<circle cx="${W * 0.8}" cy="${H * 0.13}" r="16" fill="#FFF7DE"/><circle cx="${W * 0.8}" cy="${H * 0.13}" r="27" fill="#FFF7DE" opacity=".3"/>`;
  } else if (TIME === "evening") {
    celestial = `<radialGradient id="cel" cx="50%" cy="50%"><stop offset="0%" stop-color="#FFD9A0"/><stop offset="100%" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient><circle cx="${W * 0.5}" cy="${H * 0.38}" r="50" fill="url(#cel)"/><circle cx="${W * 0.5}" cy="${H * 0.38}" r="17" fill="#FFCB7D"/>`;
  } else {
    celestial = `<radialGradient id="cel" cx="50%" cy="50%"><stop offset="0%" stop-color="#F4EFE0" stop-opacity=".45"/><stop offset="100%" stop-color="#F4EFE0" stop-opacity="0"/></radialGradient><circle cx="${W * 0.76}" cy="${H * 0.16}" r="34" fill="url(#cel)"/><circle cx="${W * 0.76}" cy="${H * 0.16}" r="14" fill="#F4EFE0"/><circle cx="${W * 0.76 + 4}" cy="${H * 0.16 - 3}" r="14" fill="#1A1430" opacity=".45"/>`;
  }

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <defs>${t.sky()}</defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    ${stars}${celestial}${resolved.scene.skyline(W, H)}
    <rect width="${W}" height="${H}" fill="${t.tint}"/>
  </svg>`;
}

const cards = PREVIEW_CITIES.map(({ label, locIndex }) => {
  const loc = LOCATIONS[locIndex];
  const resolved = resolveScene(loc);
  const displayCity = loc.city;
  const kindTag =
    resolved.kind === "city"
      ? `<span class="resolve-tag city">city scene</span>`
      : `<span class="resolve-tag state">state default</span>`;

  return `<section class="preview-card">
  <div class="card-head">
    <h3>${label}</h3>
    ${kindTag}
    <span class="resolve-name">→ <b>${resolved.name}</b></span>
  </div>
  <div class="window">
    ${buildSceneSvg(resolved)}
    <div class="sash"><div class="pane-border"></div><div class="mullion-v"></div><div class="mullion-h"></div></div>
    <div class="sill"></div>
    <div class="city-chip"><span>${displayCity}</span></div>
    <div class="status-chip"><div class="status-dot" style="background:${t.chipColor}"></div><span>${t.statusText}</span></div>
  </div>
  <p class="motif">${resolved.scene.motif}</p>
</section>`;
}).join("\n");

const page = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Patwadi TrackingWindow Preview — Afternoon</title>
<style>
  :root{ --ink:#241F1C; --paper:#FBF6EE; --frame-wood:#7A5236; --frame-wood-dark:#5C3D27; --accent:#C7491F; --line:#E4D9C8; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#F1E7D8;color:var(--ink);padding:32px 20px 60px}
  h1{font-size:1.5rem;margin-bottom:6px}
  .lead{color:#5C534C;font-size:14px;margin-bottom:28px;max-width:720px;line-height:1.5}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:28px;max-width:1200px}
  .preview-card{background:#fff;border-radius:16px;padding:18px;border:1px solid var(--line);box-shadow:0 12px 30px rgba(36,31,28,.08)}
  .card-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
  .card-head h3{font-size:15px}
  .resolve-tag{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:2px 7px;border-radius:10px}
  .resolve-tag.city{background:#FBE0D5;color:#A8442E}
  .resolve-tag.state{background:#E3EEE8;color:#3C6B52}
  .resolve-name{font-size:11px;color:#5C534C}
  .window{position:relative;border-radius:18px;overflow:hidden;height:250px;width:340px;max-width:100%;margin:0 auto;background:#FBF6EE;box-shadow:0 10px 24px -8px rgba(36,31,28,.25)}
  .window svg{display:block;width:100%;height:100%}
  .sash{position:absolute;inset:0;pointer-events:none}
  .mullion-v{position:absolute;top:0;bottom:0;left:50%;width:10px;margin-left:-5px;background:var(--frame-wood);box-shadow:0 0 6px rgba(0,0,0,.25)}
  .mullion-h{position:absolute;left:0;right:0;top:50%;height:9px;margin-top:-4.5px;background:var(--frame-wood-dark);box-shadow:0 0 6px rgba(0,0,0,.25)}
  .pane-border{position:absolute;inset:0;border:9px solid var(--frame-wood);box-shadow:inset 0 2px 8px rgba(0,0,0,.18)}
  .sill{position:absolute;left:-3px;right:-3px;bottom:-4px;height:14px;background:var(--frame-wood);border-radius:0 0 14px 14px;box-shadow:0 4px 8px rgba(0,0,0,.2)}
  .city-chip{position:absolute;top:14px;left:14px;z-index:5;background:rgba(36,31,28,.45);border-radius:20px;padding:6px 11px}
  .city-chip span{font-size:10.5px;font-weight:600;color:#fff}
  .status-chip{position:absolute;top:14px;right:14px;z-index:5;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.85);border-radius:20px;padding:6px 12px 6px 8px;box-shadow:0 4px 14px rgba(0,0,0,.15)}
  .status-dot{width:7px;height:7px;border-radius:50%}
  .status-chip span{font-size:10.5px;font-weight:600}
  .motif{font-size:10.5px;color:#B5A892;font-style:italic;margin-top:12px;text-align:center}
  code{background:#FBF6EE;padding:2px 6px;border-radius:4px;font-size:12px}
</style>
</head>
<body>
<h1>TrackingWindow preview — afternoon</h1>
<p class="lead">Static browser snapshot of the same scenery data ported to React Native (<code>trackingSkylineRenderers.tsx</code> via <code>SvgXml</code>). Wood frame, sky gradient, celestial, landmarks, city/status chips — matching <code>TrackingWindow.tsx</code> at 340×250.</p>
<div class="grid">
${cards}
</div>
</body>
</html>`;

fs.writeFileSync(outPath, page);
console.log("Wrote", outPath);

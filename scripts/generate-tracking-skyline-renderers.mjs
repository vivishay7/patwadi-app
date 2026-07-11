/**
 * Generates trackingSkylineRenderers.tsx using baked SVG XML + SvgXml (faithful to HTML at 340×250).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "docs", "patwadi-tracking-window-india-v2.html");
const outPath = path.join(root, "src", "lib", "domain", "trackingSkylineRenderers.tsx");

const W = 340;
const H = 250;

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

function extractBlock(name) {
  const start = script.indexOf(`const ${name} = {`);
  let depth = 0;
  let i = script.indexOf("{", start);
  for (; i < script.length; i++) {
    if (script[i] === "{") depth++;
    else if (script[i] === "}") {
      depth--;
      if (depth === 0) return script.slice(start, i + 1);
    }
  }
  throw new Error(`Unclosed ${name}`);
}

const evalScript = `
const __rand = (${mulberry32.toString()})(42);
function rnd(a,b){ return a + __rand()*(b-a); }
${extractBlock("CITY_SCENES").replace(/^const CITY_SCENES/, "CITY_SCENES")}
${extractBlock("STATE_SCENES").replace(/^const STATE_SCENES/, "STATE_SCENES")}
`;

const sandbox = { Math, Array, W, H };
vm.createContext(sandbox);
vm.runInContext(evalScript, sandbox);
const { CITY_SCENES, STATE_SCENES } = sandbox;

function toExportName(name) {
  return (
    name
      .replace(/&/g, "And")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .trim()
      .split(" ")
      .map((w, i) =>
        i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      )
      .join("") + "Skyline"
  );
}

function escapeXml(xml) {
  return xml
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function buildRenderer(name, scene) {
  const exportName = toExportName(name);
  const xml = scene.skyline(W, H).replace(/<!--[\s\S]*?-->/g, "").trim();
  return {
    exportName,
    code: `export const ${exportName}: SkylineRenderer = (_W, _H) => (\n  <SvgXml xml={\`${escapeXml(xml)}\`} />\n);`,
    meta: { name, dot: scene.dot, motif: scene.motif, exportName },
  };
}

const cityRenderers = Object.entries(CITY_SCENES).map(([n, s]) => buildRenderer(n, s));
const stateRenderers = Object.entries(STATE_SCENES).map(([n, s]) => buildRenderer(n, s));

const file = `import React from "react";
import { SvgXml } from "react-native-svg";
import { SkylineRenderer } from "./trackingScenery";

${cityRenderers.map((r) => r.code).join("\n\n")}

${stateRenderers.map((r) => r.code).join("\n\n")}
`;

fs.writeFileSync(outPath, file);
console.log(`Generated ${cityRenderers.length} city + ${stateRenderers.length} state renderers (SvgXml)`);

fs.writeFileSync(
  path.join(root, "scripts", ".tracking-scene-meta.json"),
  JSON.stringify(
    { cities: cityRenderers.map((r) => r.meta), states: stateRenderers.map((r) => r.meta) },
    null,
    2
  )
);

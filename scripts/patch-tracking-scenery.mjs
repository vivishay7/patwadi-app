/**
 * Patches CITY_SCENES / STATE_SCENES imports in trackingScenery.ts from scene meta.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const meta = JSON.parse(
  fs.readFileSync(path.join(root, "scripts", ".tracking-scene-meta.json"), "utf8")
);
const sceneryPath = path.join(root, "src", "lib", "domain", "trackingScenery.ts");
let src = fs.readFileSync(sceneryPath, "utf8");

const importNames = [
  ...meta.cities.map((c) => c.exportName),
  ...meta.states.map((s) => s.exportName),
];
const importBlock = `import {\n  ${importNames.join(",\n  ")},\n} from "./trackingSkylineRenderers";`;

src = src.replace(
  /import \{[^}]+\} from "\.\/trackingSkylineRenderers";/,
  importBlock
);

function sceneEntry({ name, dot, motif, exportName }) {
  const key = name.includes("&") || name.includes(" ") ? `"${name}"` : name;
  return `  ${key}: {\n    dot: "${dot}",\n    motif: "${motif.replace(/"/g, '\\"')}",\n    renderSkyline: ${exportName},\n  }`;
}

const cityBlock = `export const CITY_SCENES: Record<string, SceneDefinition> = {\n${meta.cities.map(sceneEntry).join(",\n")},\n};`;
const stateBlock = `export const STATE_SCENES: Record<string, SceneDefinition> = {\n${meta.states.map(sceneEntry).join(",\n")},\n};`;

src = src.replace(
  /export const CITY_SCENES:[\s\S]*?^};/m,
  cityBlock
);
src = src.replace(
  /export const STATE_SCENES:[\s\S]*?^};/m,
  stateBlock
);

src = src.replace(
  /export function resolveScene\(loc: LocationEntry\): ResolvedScene \{[\s\S]*?\n\}/,
  `export function resolveScene(loc: LocationEntry): ResolvedScene {
  if (loc.aliasOf && CITY_SCENES[loc.aliasOf]) {
    return { kind: "city", name: loc.aliasOf, scene: CITY_SCENES[loc.aliasOf] };
  }
  if (CITY_SCENES[loc.city]) {
    return { kind: "city", name: loc.city, scene: CITY_SCENES[loc.city] };
  }
  if (loc.state && STATE_SCENES[loc.state]) {
    return { kind: "state", name: loc.state, scene: STATE_SCENES[loc.state] };
  }
  return { kind: "city", name: "Delhi", scene: CITY_SCENES.Delhi };
}`
);

fs.writeFileSync(sceneryPath, src);
console.log("Updated trackingScenery.ts");

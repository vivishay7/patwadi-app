import { readFileSync } from "fs";
const x = readFileSync("ui-dump.xml", "utf8");
const nodes = x.match(/<node[^>]+>/g) || [];
for (const n of nodes) {
  const text = n.match(/text="([^"]*)"/)?.[1];
  const cls = n.match(/class="([^"]*)"/)?.[1];
  const bounds = n.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (text || cls?.includes("Edit")) {
    const cx = bounds ? Math.floor((+bounds[1] + +bounds[3]) / 2) : "?";
    const cy = bounds ? Math.floor((+bounds[2] + +bounds[4]) / 2) : "?";
    console.log(JSON.stringify({ text: text || "", cls, cx, cy }));
  }
}

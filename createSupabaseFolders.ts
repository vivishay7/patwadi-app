import * as fs from "fs";
import * as path from "path";

// Absolute path to your project root
const root = process.cwd();

const dirs: string[] = [
  "supabase",
  "supabase/functions",
  "supabase/functions/dim-ai",
];

dirs.forEach((dir) => {
  const fullPath = path.join(root, dir);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log("Created:", fullPath);
  } else {
    console.log("Exists:", fullPath);
  }
});

// Create index.ts if missing
const indexFile = path.join(root, "supabase/functions/dim-ai/index.ts");

const defaultCode = `import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  return new Response(JSON.stringify({ message: "dim-ai function works" }), {
    headers: { "Content-Type": "application/json" },
  });
});
`;

if (!fs.existsSync(indexFile)) {
  fs.writeFileSync(indexFile, defaultCode);
  console.log("Created index.ts");
} else {
  console.log("index.ts already exists");
}


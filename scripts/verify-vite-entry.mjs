import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const indexPath = resolve("index.html");
const expectedEntry = "/src/main.tsx";
const entryPath = resolve("src/main.tsx");

if (!existsSync(indexPath)) {
  console.error("Codemagic preflight failed: index.html is missing.");
  process.exit(1);
}

const indexHtml = readFileSync(indexPath, "utf8");

if (!indexHtml.includes(`src="${expectedEntry}"`)) {
  console.error(`Codemagic preflight failed: index.html must point to ${expectedEntry}.`);
  process.exit(1);
}

if (!existsSync(entryPath)) {
  console.error(`Codemagic preflight failed: ${expectedEntry} is missing from this GitHub checkout.`);
  process.exit(1);
}

console.log(`Codemagic preflight passed: ${expectedEntry} exists and is referenced by index.html.`);
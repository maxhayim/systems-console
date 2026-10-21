#!/usr/bin/env node
// Usage: node src/cli.mjs <github_user> <systems spec> <output.svg[?titles=false]> [more outputs...]
// The systems spec is one "TITLE: slug, slug=Label" line per panel (Simple Icons slugs).
// Reads GITHUB_TOKEN and SYSTEMS_CONSOLE_TITLES (true/false) from the environment.
// Set SYSTEMS_CONSOLE_STATS to a saved stats JSON to render offline; set SYSTEMS_CONSOLE_SAVE to write one.
import fs from "node:fs";
import path from "node:path";
import { getStats, parseSystems } from "./stats.mjs";
import { buildSvg } from "./render.mjs";

const [user, spec, ...rest] = process.argv.slice(2);
const outputs = rest.flatMap((a) => a.split("\n")).map((a) => a.trim()).filter(Boolean);
if (!user || !spec || !outputs.length) {
  console.error("Usage: node src/cli.mjs <github_user> <systems spec> <output.svg[?titles=false]> [more outputs...]");
  process.exit(1);
}

let stats;
try {
  stats = process.env.SYSTEMS_CONSOLE_STATS
    ? JSON.parse(fs.readFileSync(process.env.SYSTEMS_CONSOLE_STATS, "utf8"))
    : await getStats(user.trim(), process.env.GITHUB_TOKEN, parseSystems(spec));
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
if (process.env.SYSTEMS_CONSOLE_SAVE) fs.writeFileSync(process.env.SYSTEMS_CONSOLE_SAVE, JSON.stringify(stats, null, 2) + "\n");
console.log(`${stats.login}: ${stats.groups.map((g) => `${g.title} (${g.items.length})`).join(", ")}`);

for (const out of outputs) {
  const [file, query = ""] = out.split("?");
  const titles = !/^(false|no|off|0)$/i.test((new URLSearchParams(query).get("titles") || process.env.SYSTEMS_CONSOLE_TITLES || "true").trim());
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, buildSvg(stats, { titles }));
  console.log(`wrote ${file}${titles ? "" : " (no titles)"}`);
}

// Checks tracker.json for unsupported or badly sourced claims. Run: node tools/validate.mjs
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate, countByStatus } from "./validate-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(await readFile(join(root, "data", "tracker.json"), "utf8"));
const { errors, warnings, entries } = validate(data);

console.log(`Products: ${data.products.length} | Entries: ${entries.length} | Sources: ${Object.keys(data.sources).length}`);
console.log("By status:", countByStatus(entries));
for (const w of warnings) console.log("WARN", w);
for (const err of errors) console.log("ERROR", err);
if (errors.length) {
  console.log(`FAILED with ${errors.length} error(s).`);
  process.exit(1);
}
console.log("OK: every maker-based status rests on a complete, verbatim maker fitment statement that names this trim and covers these years.");

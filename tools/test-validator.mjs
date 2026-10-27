// Regression tests: each test re-introduces one known error class into a copy of the real data
// and checks the validator rejects it. Run: node tools/test-validator.mjs
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "./validate-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pristine = await readFile(join(root, "data", "tracker.json"), "utf8");
const fresh = () => JSON.parse(pristine);
const prod = (d, id) => d.products.find((p) => p.id === id);

const cases = [
  ["real data passes", () => fresh(), null],
  ["E1 wiring-only answer used for condition-dependent", (d) => {
    const c = prod(d, "dd-ditch").cells["TRD Off-Road|i-FORCE MAX hybrid"];
    c.status = "condition"; c.condition = "Use the included harness.";
    return d;
  }, "is not supported"],
  ["E2 related-trim generalisation (grille requirement applied to SR)", (d) => {
    const r = prod(d, "dd-trd-grille").refs["needs-pro-grille"];
    r.status = "condition"; r.condition = "Requires a TRD Pro grille.";
    return d;
  }, "is not supported"],
  ["E3 vehicle-level conditional treated as trim-level", (d) => {
    const r = prod(d, "bd-grille-conversion").refs["conversion-only"];
    r.status = "condition"; r.condition = "Requires the grille conversion.";
    return d;
  }, "is not supported"],
  ["E3b whole-vehicle 'yes' used as manufacturer-confirmed", (d) => {
    const x = prod(d, "dd-ss5-crosslink").extraEntries[0];
    x.status = "mfr-yes"; x.evidence[0].polarity = "yes";
    return d;
  }, "is not supported"],
  ["E4 conflict by implication only", (d) => {
    prod(d, "bd-s2-pocket").cells["Trailhunter"].status = "conflicting";
    return d;
  }, "needs two credible fitment statements"],
  ["E5 year extrapolation (2025 answer applied to 2024-2026)", (d) => {
    delete prod(d, "dd-ss6-fog").cells["TRD Pro"].years;
    return d;
  }, "go beyond the years"],
  ["E5b truncated supporting quote", (d) => {
    prod(d, "dd-ss6-fog").cells["TRD Pro"].evidence[0].complete = false;
    return d;
  }, "not marked complete"],
  ["status resting on a retailer listing", (d) => {
    prod(d, "bd-grille-trd-pro").cells["TRD Pro"].evidence = [
      { source: "RT-OVERLANDKITTED", location: "x", quote: "2024+ Toyota Tacoma (incl. TRD Pro)", addresses: "fitment", trims: ["TRD Pro"], polarity: "yes", complete: true }
    ];
    return d;
  }, "manufacturer sources only"],
  ["missing manufacturer quote", (d) => {
    for (const e of prod(d, "dd-trd-grille").cells["TRD Pro"].evidence) e.quote = "";
    return d;
  }, "verbatim manufacturer quote"],
  ["unknown status such as 'fits'", (d) => {
    prod(d, "dd-ss6-fog").cells["Trailhunter"].status = "fits";
    return d;
  }, 'unknown status "fits"'],
  ["condition-dependent without condition text", (d) => {
    delete prod(d, "dd-ss6-fog").cells["SR"].condition;
    return d;
  }, "no condition text"],
  ["evidence without an 'addresses' field", (d) => {
    delete prod(d, "dd-form-fog").cells["SR"].evidence[0].addresses;
    return d;
  }, "must say what it addresses"],
  ["E6 unverified entries without an open-question note", (d) => {
    delete prod(d, "dd-ss5-crosslink").defaultGap;
    return d;
  }, "no open-question (gap) note"],
  ["E6 unverified ref without an open-question note", (d) => {
    delete prod(d, "dd-trd-grille").refs["needs-pro-grille"].gap;
    return d;
  }, "no open-question (gap) note"],
  ["E7 correction link that is an email address", (d) => {
    d.meta.correctionUrl = "mailto:someone@example.com";
    return d;
  }, "meta.correctionUrl must be null"],
  ["E7 well-formed issue-form link is accepted", (d) => {
    d.meta.correctionUrl = "https://github.com/example-user/tacoma-evidence-tracker/issues/new?template=correction.yml";
    return d;
  }, null]
];

let failed = 0;
for (const [name, mutate, expected] of cases) {
  const { errors } = validate(mutate(fresh()));
  const ok = expected === null ? errors.length === 0 : errors.some((e) => e.includes(expected));
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      got: ${errors.slice(0, 3).join(" || ") || "(no errors)"}`}`);
  if (!ok) failed++;
}
console.log(failed ? `${failed} test(s) failed.` : `All ${cases.length} tests passed.`);
process.exit(failed ? 1 : 0);

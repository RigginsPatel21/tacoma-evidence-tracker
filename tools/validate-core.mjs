// Validation rules for tracker.json. Used by tools/validate.mjs (CLI) and tools/test-validator.mjs.
import { expand, STATUSES } from "../assets/data-model.js";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const MAKER_STATUSES = ["mfr-yes", "mfr-no", "condition"];
const ADDRESSES = ["fitment", "wiring", "other"];
const POLARITIES = ["yes", "no", "condition", "untested", "info", "only"];

// What a single maker statement says about one trim: "yes", "no", "condition", or null if it doesn't address the trim.
function sayAbout(ev, trim) {
  if (ev.polarity === "only") {
    if (!Array.isArray(ev.onlyTrims) || !ev.onlyTrims.length) return null;
    return ev.onlyTrims.includes(trim) ? "yes" : "no";
  }
  const trims = ev.trims || [];
  if (trims.includes(trim)) return ev.polarity;
  if (trims.includes("*")) return ev.polarity === "no" ? "no" : null; // a whole-vehicle exclusion covers every trim; a whole-vehicle "yes" does not
  return null;
}

const WANT = { "mfr-yes": "yes", "mfr-no": "no", condition: "condition" };

export function validate(data) {
  const errors = [];
  const warnings = [];

  for (const [id, s] of Object.entries(data.sources || {})) {
    if (!/^https:\/\//.test(s.url || "")) errors.push(`source ${id}: URL must be https`);
    if (!isoDate.test(s.checked || "")) errors.push(`source ${id}: checked date must be YYYY-MM-DD`);
    if (!["manufacturer", "retailer", "owner"].includes(s.type)) errors.push(`source ${id}: bad type "${s.type}"`);
  }

  // E7: the correction link may only be the repository's public issue form (never an email address or other personal contact).
  const cu = data.meta && data.meta.correctionUrl;
  if (cu !== null && cu !== undefined && !/^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/issues\/new\?template=correction\.yml$/.test(cu)) {
    errors.push("meta.correctionUrl must be null or https://github.com/OWNER/REPO/issues/new?template=correction.yml");
  }

  let entries = [];
  try {
    entries = expand(data);
  } catch (e) {
    errors.push(`expand failed: ${e.message}`);
    return { errors, warnings, entries };
  }

  const ids = new Set();
  for (const e of entries) {
    const where = `${e.id} (${e.vehicle} ${e.years.join("/")} ${e.trim} / ${e.configuration})`;
    if (ids.has(e.id)) errors.push(`${where}: duplicate id`);
    ids.add(e.id);
    if (!STATUSES[e.status]) { errors.push(`${where}: unknown status "${e.status}"`); continue; }
    if (!e.claim) errors.push(`${where}: missing claim text`);
    if (!e.evidence.length) errors.push(`${where}: no evidence`);
    if (!e.years.length) errors.push(`${where}: no model years`);
    if (/\bfits?\b/i.test(STATUSES[e.status].label)) errors.push(`${where}: status label must not say "fits"`);

    for (const ev of e.evidence) {
      if (ev.paraphrase) continue;
      if (!ADDRESSES.includes(ev.addresses)) errors.push(`${where}: evidence from ${ev.sourceId} must say what it addresses (fitment / wiring / other)`);
      if (!POLARITIES.includes(ev.polarity)) errors.push(`${where}: evidence from ${ev.sourceId} needs a polarity`);
    }
    for (const r of e.retailerConflicts) {
      if (r.sourceInfo.type !== "retailer") errors.push(`${where}: retailer conflict cites non-retailer source ${r.sourceId}`);
    }

    if (MAKER_STATUSES.includes(e.status)) {
      if (e.evidence.some((x) => x.sourceInfo.type !== "manufacturer")) {
        errors.push(`${where}: maker-based status must rest on manufacturer sources only`);
      }
      const quoted = e.evidence.filter((x) => x.sourceInfo.type === "manufacturer" && x.quote && !x.paraphrase);
      if (!quoted.length) errors.push(`${where}: status "${e.status}" needs at least one verbatim manufacturer quote`);
      if (e.status === "condition" && !e.condition) errors.push(`${where}: condition-dependent entry has no condition text`);

      // E1-E3, E5: some fitment statement must speak about THIS trim, in the right direction, for these years, with a complete quote.
      const supporting = quoted.filter((x) => x.addresses === "fitment" && sayAbout(x, e.trim) === WANT[e.status]);
      if (!supporting.length) {
        const why = quoted.some((x) => x.addresses !== "fitment")
          ? "only wiring/other statements, or no statement naming this trim"
          : "no fitment statement names this trim with this result";
        if (e.review) warnings.push(`${where}: under manual review (${why})`);
        else errors.push(`${where}: status "${e.status}" is not supported: ${why}`);
      } else {
        const yearOk = supporting.some((x) => !x.years || e.years.every((y) => x.years.includes(y)));
        if (!yearOk) errors.push(`${where}: entry years ${e.years.join(", ")} go beyond the years the maker statement covers`);
        if (!supporting.some((x) => x.complete === true)) errors.push(`${where}: supporting quote is not marked complete; check it isn't truncated before its conclusion`);
      }
    }

    if (e.status === "conflicting") {
      const said = new Set(
        e.evidence.filter((x) => x.addresses === "fitment").map((x) => sayAbout(x, e.trim)).filter((v) => v === "yes" || v === "no")
      );
      if (!(said.has("yes") && said.has("no"))) {
        errors.push(`${where}: "conflicting" needs two credible fitment statements about this trim that disagree (yes vs no)`);
      }
    }

    // E6: an unverified entry must say which question the maker hasn't answered, so it reads as an evidence gap, not a result.
    if (e.status === "unverified" && !(e.gap && e.gap.trim())) errors.push(`${where}: unverified entry has no open-question (gap) note`);

    if (e.review) warnings.push(`${where}: manual review note present`);
    if (e.oldestCheck && data.meta.lastReviewed && e.oldestCheck < data.meta.lastReviewed) {
      warnings.push(`${where}: a source was last checked ${e.oldestCheck}, before the review date ${data.meta.lastReviewed}`);
    }
  }

  return { errors, warnings, entries };
}

export function countByStatus(entries) {
  const counts = {};
  for (const e of entries) counts[e.status] = (counts[e.status] || 0) + 1;
  return counts;
}

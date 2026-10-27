// Turns the compact tracker.json into one entry per vehicle / year range / trim / configuration.
// Shared by the browser app and tools/validate.mjs so both see exactly the same entries.

export const STATUSES = {
  "mfr-yes": {
    label: "Manufacturer-confirmed: compatible",
    short: "Maker: compatible",
    help: "The manufacturer's current documentation explicitly names this combination as compatible."
  },
  "mfr-no": {
    label: "Manufacturer-confirmed: not compatible",
    short: "Maker: not compatible",
    help: "The manufacturer says it does not fit: its current documentation explicitly excludes this combination."
  },
  condition: {
    label: "Condition-dependent",
    short: "Condition-dependent",
    help: "The manufacturer documents this only under stated conditions. Read the condition before relying on it."
  },
  conflicting: {
    label: "Conflicting",
    short: "Conflicting",
    help: "Credible sources disagree. The conflict is shown and left unresolved."
  },
  unverified: {
    label: "Unverified",
    short: "Unverified",
    help: "The manufacturer has not confirmed this either way. It is NOT a \"does not fit\" result (those are labelled \"Manufacturer-confirmed: not compatible\") and NOT a \"fits\" result. Each entry names the evidence gap: what the maker hasn't said."
  }
};

export const STATUS_ORDER = ["mfr-yes", "mfr-no", "condition", "conflicting", "unverified"];

const DEFAULT_CONFIGURATION = "Any / not specified by maker";

function resolveCell(product, cell) {
  if (!cell) return null;
  if (cell.ref) {
    const target = product.refs && product.refs[cell.ref];
    if (!target) throw new Error(`Product ${product.id}: unknown ref "${cell.ref}"`);
    return { ...target, ...cell, ref: undefined };
  }
  return cell;
}

function defaultCell(product) {
  if (product.defaultRef) return resolveCell(product, { ref: product.defaultRef });
  return {
    status: "unverified",
    claim:
      product.defaultClaim ||
      "The maker lists Toyota Tacoma 2024-2026 for this kit but does not state this trim.",
    evidence: [
      {
        source: product.defaultSource,
        location: "Fitment section of the product page",
        quote: "Fitment lists the vehicle and years only; no trim is named.",
        paraphrase: true
      }
    ],
    gap: product.defaultGap || null,
    caveat:
      "A vehicle-level fitment line is not treated as trim-level confirmation. On sibling products, the same makers exclude some trims."
  };
}

function attachSources(list, sources, productId) {
  return (list || []).map((item) => {
    const src = sources[item.source];
    if (!src) throw new Error(`Product ${productId}: unknown source "${item.source}"`);
    return { ...item, sourceId: item.source, sourceInfo: src };
  });
}

function buildEntry(data, product, base, cell, idSuffix) {
  const evidence = attachSources(cell.evidence, data.sources, product.id);
  const retailerConflicts = attachSources(cell.retailerConflicts, data.sources, product.id);
  const checkedDates = [...evidence, ...retailerConflicts].map((e) => e.sourceInfo.checked).sort();
  return {
    id: `${product.id}--${idSuffix}`,
    productId: product.id,
    brand: product.brand,
    product: product.name,
    category: product.category,
    partNumbers: product.partNumbers || [],
    productNotes: product.productNotes || [],
    vehicle: base.vehicle,
    years: cell.years || base.years,
    trim: base.trim,
    configuration: base.configuration || DEFAULT_CONFIGURATION,
    status: cell.status,
    claim: cell.claim,
    condition: cell.condition || null,
    caveat: cell.caveat || null,
    review: cell.review || null,
    gap: cell.gap || null,
    evidence,
    retailerConflicts,
    oldestCheck: checkedDates[0] || null,
    isDefault: Boolean(cell.__default)
  };
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function expand(data) {
  const entries = [];
  for (const product of data.products) {
    const vehicle = data.meta.vehicles[product.vehicle];
    if (!vehicle) throw new Error(`Product ${product.id}: unknown vehicle "${product.vehicle}"`);
    const cells = product.cells || {};
    for (const trim of vehicle.trims) {
      let cell = resolveCell(product, cells[trim]);
      if (!cell) cell = { ...defaultCell(product), __default: true };
      entries.push(
        buildEntry(data, product, { vehicle: product.vehicle, years: product.years, trim }, cell, slug(trim))
      );
    }
    // Cells keyed "Trim|Configuration" add a separate row; they never replace the plain trim row.
    for (const [key, raw] of Object.entries(cells)) {
      if (!key.includes("|")) continue;
      const cell = resolveCell(product, raw);
      entries.push(
        buildEntry(
          data,
          product,
          { vehicle: product.vehicle, years: product.years, trim: cell.trim, configuration: cell.configuration },
          cell,
          slug(key)
        )
      );
    }
    (product.extraEntries || []).forEach((extra, i) => {
      entries.push(
        buildEntry(
          data,
          product,
          { vehicle: extra.vehicle, years: extra.years, trim: extra.trim, configuration: extra.configuration },
          extra,
          `extra-${i + 1}-${slug(extra.vehicle)}`
        )
      );
    });
  }
  return entries;
}

export function formatYears(years) {
  if (!years || !years.length) return "";
  const sorted = [...years].sort();
  const contiguous = sorted.every((y, i) => i === 0 || y === sorted[i - 1] + 1);
  return contiguous && sorted.length > 1 ? `${sorted[0]}–${sorted[sorted.length - 1]}` : sorted.join(", ");
}

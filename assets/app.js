import { expand, STATUSES, STATUS_ORDER, formatYears } from "./data-model.js";

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid !== null && kid !== undefined) node.append(kid);
  return node;
};

const fmtDate = (iso) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "unknown";

// Only a Condition-dependent entry has a fit condition; on other labels the same field holds an installation or context note.
const conditionLabel = (e) => (e.status === "condition" ? "Condition: " : "Note: ");

const statusBadge = (status) =>
  el("span", { class: `badge badge-${status}` }, el("span", { class: "badge-mark", "aria-hidden": "true" }), STATUSES[status].label);

let DATA = null;
let ENTRIES = [];

const FILTER_KEYS = ["q", "vehicle", "year", "trim", "category", "status"];

function fillSelect(select, options, allLabel) {
  select.replaceChildren(el("option", { value: "", text: allLabel }), ...options.map((o) => el("option", { value: o.value, text: o.label })));
}

function setupFilters() {
  const vehicles = Object.keys(DATA.meta.vehicles);
  fillSelect($("#f-vehicle"), vehicles.map((v) => ({ value: v, label: v })), "All vehicles");
  const years = [...new Set(ENTRIES.flatMap((e) => e.years))].sort();
  fillSelect($("#f-year"), years.map((y) => ({ value: String(y), label: String(y) })), "All years");
  const trims = [...new Set(ENTRIES.map((e) => e.trim))];
  fillSelect($("#f-trim"), trims.map((t) => ({ value: t, label: t })), "All trims");
  const cats = [...new Set(ENTRIES.map((e) => e.category))].sort();
  fillSelect($("#f-category"), cats.map((c) => ({ value: c, label: c })), "All categories");
  fillSelect($("#f-status"), [{ value: "all", label: "All entries, including unverified" }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUSES[s].label }))], "Maker statements and reviews");

  const params = new URLSearchParams(location.search);
  for (const key of FILTER_KEYS) {
    const input = $(`#f-${key}`);
    const val = params.get(key);
    if (val !== null && (input.tagName === "INPUT" || [...input.options].some((o) => o.value === val))) input.value = val;
    input.addEventListener("input", onFilterChange);
  }
  $("#f-reset").addEventListener("click", () => {
    for (const key of FILTER_KEYS) $(`#f-${key}`).value = "";
    onFilterChange();
    $("#f-q").focus();
  });
}

function currentFilters() {
  const f = {};
  for (const key of FILTER_KEYS) f[key] = $(`#f-${key}`).value.trim();
  return f;
}

function onFilterChange() {
  const f = currentFilters();
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) params.set(k, v);
  const qs = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  render();
}

function matches(e, f) {
  if (f.vehicle && e.vehicle !== f.vehicle) return false;
  if (f.year && !e.years.includes(Number(f.year))) return false;
  if (f.trim && e.trim !== f.trim) return false;
  if (f.category && e.category !== f.category) return false;
  if (!f.status && e.status === "unverified" && !e.review) return false; // default view: what the makers actually said
  if (f.status && f.status !== "all" && e.status !== f.status) return false;
  if (f.q) {
    const hay = [e.brand, e.product, e.category, ...e.partNumbers].join(" ").toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

function render() {
  const f = currentFilters();
  const rank = (e) => STATUS_ORDER.indexOf(e.status);
  const list = ENTRIES.filter((e) => matches(e, f)).sort((x, y) => rank(x) - rank(y));
  const hidden = f.status ? 0 : ENTRIES.filter((e) => matches(e, { ...f, status: "all" })).length - list.length;
  const rows = list.map((e) => {
    const conflictFlag = e.retailerConflicts.length
      ? el("p", { class: "flag" }, el("span", { "aria-hidden": "true", text: "⚠ " }), `A retailer listing disagrees with the manufacturer (${e.retailerConflicts.length}).`)
      : null;
    return el(
      "tr",
      { class: e.isDefault ? "row-default" : null },
      el("td", { "data-label": "Accessory" },
        el("strong", { text: `${e.brand} ${e.product}` }),
        el("span", { class: "muted block", text: e.category }),
        el("span", { class: "parts", text: e.partNumbers.join(" · ") })),
      el("td", { "data-label": "Vehicle" }, el("span", { class: "strong", text: e.vehicle }), el("span", { class: "block", text: formatYears(e.years) })),
      el("td", { "data-label": "Trim" }, el("span", { class: "strong", text: e.trim }), el("span", { class: "muted block", text: e.configuration })),
      el("td", { "data-label": "Status" }, statusBadge(e.status)),
      el("td", { "data-label": "Evidence" },
        el("p", { class: "claim", text: e.claim }),
        e.condition ? el("p", { class: e.status === "condition" ? "condition" : "caveat" }, el("strong", { text: conditionLabel(e) }), e.condition) : null,
        e.gap ? el("p", { class: "gap" }, el("strong", { text: "Evidence gap: " }), e.gap) : null,
        e.review ? el("p", { class: "review" }, el("strong", { text: "Under review: " }), e.review) : null,
        conflictFlag),
      el("td", { "data-label": "Sources" },
        el("button", { type: "button", class: "btn-details", "data-id": e.id, "aria-haspopup": "dialog" }, "Sources & details",
          el("span", { class: "visually-hidden", text: ` for ${e.brand} ${e.product}, ${e.vehicle} ${e.trim}` })),
        el("span", { class: "muted block small", text: `Checked ${fmtDate(e.oldestCheck)}` }))
    );
  });
  $("#rows").replaceChildren(...rows);
  $("#empty").hidden = list.length > 0;
  $("#empty-text").textContent = hidden
    ? "No maker statements match these filters."
    : "No entries match these filters. That does not mean a part doesn't exist or doesn't fit; this tracker covers only the products listed in its scope.";
  $("#hidden-note").hidden = hidden === 0;
  $("#hidden-text").textContent = `${hidden} unverified ${hidden === 1 ? "entry is" : "entries are"} hidden. ${hidden === 1 ? "It marks a question the maker hasn't answered, not a \"does not fit\" result." : "They mark questions the makers haven't answered, not \"does not fit\" results."}`;
  const counts = STATUS_ORDER.map((s) => [s, list.filter((e) => e.status === s).length]).filter(([, n]) => n);
  $("#result-count").textContent =
    `${list.length} of ${ENTRIES.length} entries shown` +
    (counts.length ? ` (${counts.map(([s, n]) => `${n} ${STATUSES[s].short.toLowerCase()}`).join(", ")})` : "");
}

let lastTrigger = null;
function openDetail(id) {
  const e = ENTRIES.find((x) => x.id === id);
  if (!e) return;
  $("#detail-title").textContent = `${e.brand} ${e.product}`;
  const body = $("#detail-body");
  const sourceItem = (item) =>
    el("li", { class: `source source-${item.sourceInfo.type}` },
      el("p", { class: "source-type", text: `${item.sourceInfo.type === "manufacturer" ? "Manufacturer" : item.sourceInfo.type === "retailer" ? "Retailer" : "Owner report"}: ${item.sourceInfo.publisher}` }),
      el("p", {}, el("a", { href: item.sourceInfo.url, rel: "noopener noreferrer", target: "_blank" }, item.sourceInfo.title, el("span", { class: "visually-hidden", text: " (opens in a new tab)" }))),
      item.location ? el("p", { class: "muted small", text: item.location }) : null,
      item.quote ? (item.paraphrase ? el("p", { class: "paraphrase", text: item.quote }) : el("blockquote", { text: `"${item.quote}"` })) : null,
      item.claim ? el("p", { class: "retailer-claim", text: item.claim }) : null,
      el("p", { class: "muted small", text: `Last checked ${fmtDate(item.sourceInfo.checked)}` }));

  const parts = [
    el("dl", { class: "facts" },
      el("dt", { text: "Vehicle" }), el("dd", { text: `${e.vehicle}, ${formatYears(e.years)}` }),
      el("dt", { text: "Trim" }), el("dd", { text: e.trim }),
      el("dt", { text: "Configuration" }), el("dd", { text: e.configuration }),
      el("dt", { text: "Part numbers" }), el("dd", { text: e.partNumbers.join(" · ") || "Not shown" }),
      el("dt", { text: "Evidence status" }), el("dd", {}, statusBadge(e.status), el("p", { class: "muted small", text: STATUSES[e.status].help }))),
    el("h3", { text: "What the evidence says" }),
    el("p", { text: e.claim }),
    e.condition ? el("p", { class: e.status === "condition" ? "condition" : "caveat" }, el("strong", { text: conditionLabel(e) }), e.condition) : null,
    e.caveat ? el("p", { class: "caveat" }, el("strong", { text: "Caveat: " }), e.caveat) : null,
    e.gap ? el("p", { class: "gap" }, el("strong", { text: "Evidence gap: " }), e.gap) : null,
    e.review ? el("p", { class: "review" }, el("strong", { text: "Under review: " }), e.review) : null,
    el("h3", { text: "Manufacturer evidence" }),
    el("ul", { class: "sources" }, e.evidence.map(sourceItem)),
    e.retailerConflicts.length
      ? [el("h3", { text: "Retailer listings that disagree (not used for the status)" }), el("ul", { class: "sources" }, e.retailerConflicts.map(sourceItem))]
      : null,
    e.productNotes.length ? [el("h3", { text: "Product notes" }), el("ul", { class: "plain-list" }, e.productNotes.map((n) => el("li", { text: n })))] : null,
    el("p", { class: "dialog-disclaimer", text: "Informational only. Confirm fitment with the manufacturer before purchasing or installing." })
  ];
  body.replaceChildren(...parts.flat().filter(Boolean));
  const dlg = $("#detail");
  dlg.showModal();
  $("#detail-close").focus();
}

function closeDetail() {
  $("#detail").close();
}

async function init() {
  try {
    const res = await fetch("data/tracker.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
    ENTRIES = expand(DATA);
  } catch (err) {
    $("#result-count").textContent = `The data could not be loaded (${err.message}). If you opened this file directly, serve the folder over HTTP instead.`;
    return;
  }
  $("#scope-text").textContent = `Scope of this version: ${DATA.meta.scope}`;
  $("#last-reviewed").textContent = fmtDate(DATA.meta.lastReviewed);
  $("#version").textContent = DATA.meta.version;
  $("#legend").replaceChildren(...STATUS_ORDER.flatMap((s) => [el("dt", {}, statusBadge(s)), el("dd", { text: STATUSES[s].help })]));
  $("#not-covered").replaceChildren(...DATA.notYetCovered.map((n) => el("li", {}, el("strong", { text: `${n.item}: ` }), n.reason)));
  $("#correction-link-text").textContent = DATA.meta.correctionUrl
    ? ""
    : "The public correction link will be added when the site is published. Until then, corrections are not being collected.";
  if (DATA.meta.correctionUrl) {
    $("#correction-link-text").append(
      el("a", { href: DATA.meta.correctionUrl, rel: "noopener noreferrer" }, "Open a correction report on GitHub"),
      ". Reports are public GitHub issues: you need a free GitHub account, and your username and everything you write can be seen by anyone and indexed by search engines."
    );
  }

  setupFilters();
  render();
  $("#show-unverified").addEventListener("click", () => {
    $("#f-status").value = "all";
    onFilterChange();
    $("#f-status").focus();
  });

  $("#rows").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".btn-details");
    if (!btn) return;
    lastTrigger = btn;
    openDetail(btn.dataset.id);
  });
  $("#detail-close").addEventListener("click", closeDetail);
  $("#detail").addEventListener("close", () => lastTrigger && lastTrigger.focus());
  $("#detail").addEventListener("click", (ev) => { if (ev.target === ev.currentTarget) closeDetail(); });
  $("#copy-template").addEventListener("click", async () => {
    const text = $("#correction-template").value;
    try {
      await navigator.clipboard.writeText(text);
      $("#copy-status").textContent = "Copied.";
    } catch {
      $("#correction-template").select();
      $("#copy-status").textContent = "Select the text and copy it manually.";
    }
  });
}

init();

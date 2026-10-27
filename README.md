# Tacoma & 4Runner Accessory Evidence Tracker (prototype)

A non-commercial, evidence-graded compatibility tracker. **No ads, affiliate links, sales or supplier forms.**

**Status:** prototype, version 0.3.1, sources checked 19 Oct 2026 (links re-checked 20 Oct). See `CHANGELOG.md` for every label change and its prior value.

## What's in it

- **Scope:** front-end lighting kits from Diode Dynamics and Baja Designs on the 2024–2026 Tacoma, plus the 4Runner statements those makers publish.
- **Size:** 11 products and 92 entries.
- **Sources:** 17, all reopened on 19 Oct 2026.

| Evidence label | Entries |
|---|---|
| Manufacturer-confirmed: compatible | 6 |
| Manufacturer-confirmed: not compatible | 26 |
| Condition-dependent | 1 (under review) |
| Conflicting | 0 |
| Unverified | 59 |

**Default view:** the page opens on "Maker statements and reviews" (33 entries). The 59 unverified entries are hidden behind a visible count and a "Show unverified entries too" button. Each one carries an **evidence gap** note saying what the maker hasn't said. Unverified is never a "does not fit" result.

**Deliberately left out:** proposed topics 2–5, plus five lighting kits with no trim-level statements (see "Not covered yet" on the page).

## Stack

Plain HTML, CSS and JavaScript (ES modules). No dependencies, no build step. All data is in `data/tracker.json`.

| File | Purpose |
|---|---|
| `index.html`, `assets/styles.css`, `assets/app.js` | The site |
| `assets/data-model.js` | Expands the JSON into one entry per vehicle / years / trim / configuration |
| `tools/validate-core.mjs`, `tools/validate.mjs` | Evidence rules; `node tools/validate.mjs` must print OK and exit 0 |
| `tools/test-validator.mjs` | 17 regression tests; each re-introduces a known error class and expects rejection |
| `tools/serve.mjs` | Local preview only (`node tools/serve.mjs 4870`) |
| `.github/ISSUE_TEMPLATE/` | The public correction form (used once the repository is on GitHub) |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## Evidence rules (enforced by the validator)

Every quoted piece of evidence records:

| Field | Values |
|---|---|
| `addresses` | `fitment` / `wiring` / `other` |
| `trims` | The trims it names. `"*"` means the whole vehicle. Or `onlyTrims` for "only" statements |
| `polarity` | `yes` / `no` / `condition` / `untested` / `info` / `only` |
| `years` (optional) | The model years the statement concerns |
| `complete` | `true` once you've checked the quote isn't cut before its conclusion |

A "Manufacturer-confirmed" or "Condition-dependent" label needs all of the following:
- a complete manufacturer **fitment** statement;
- that **names this trim**, or excludes it through an explicit "only" list;
- in the right direction;
- covering the entry's years.

Further rules:
- A whole-vehicle "yes" never confirms a trim; a whole-vehicle "no" excludes all trims.
- "Conflicting" needs two fitment statements that disagree.
- Retailer and owner sources never set a label.
- Every unverified entry needs a `gap` note (on the cell or ref, or `defaultGap` on the product).
- `meta.correctionUrl` must be `null` or this repository's issue-form link. It can never be an email address.
- Entries with a `review` note show "Under review" on the page.

## Updating

1. Reopen the source and check every quote character for character, including Q&A tabs and forum replies. Read the question each answer responds to, and quote the whole answer up to its conclusion.
2. Edit `data/tracker.json` and update `checked` dates and `meta.lastReviewed`.
3. Run `node tools/validate.mjs` and `node tools/test-validator.mjs`. Both must exit 0.
4. Add a `CHANGELOG.md` line with the old and new label for every entry you changed.

## Corrections

Readers report problems through the repository's **public** GitHub issue form, `.github/ISSUE_TEMPLATE/correction.yml`. Blank issues are switched off.

- **What the reporter needs:** a GitHub account (GitHub's terms require users to be at least 13).
- **What becomes public:** the reporter's username and everything they write. Search engines may index it.
- **What the form asks for:** the entry, the problem, the manufacturer link, the exact wording and the date seen. It asks for no personal details and includes a privacy tick-box.

Handling a report:
1. Reopen the cited manufacturer source yourself. Never apply a correction from a retailer or owner report, or from wording you can't find.
2. If the source supports a change, follow "Updating" above, then close the issue with a link to the commit.
3. If it doesn't, reply with what the source actually says and close the issue.
4. If a report contains personal information (a name, email, phone, VIN or plate), delete the issue. Repository owners can delete issues; editing the text alone leaves it in the edit history. Ask the reporter to resubmit without it.
5. If spam starts, use the repository's temporary interaction limits, or switch Issues off. The page then needs `correctionUrl` set back to `null`.

## Publish gate

- [x] Useful page with primary-source evidence (front-end lighting, 11 products).
- [x] Independent audit of every entry against reopened sources; every change is listed in `CHANGELOG.md`.
- [x] Validator and 17 tests pass.
- [x] Checked at 1280 px desktop and 375 px mobile; keyboard dialog works; controls are labelled. No screen-reader or Lighthouse audit yet.
- [x] No secrets or personal data in the folder.
- [ ] **Hosting:** the owner opens a GitHub account and public repository (GitHub's terms require users to be at least 13). Pages is free for public repositories on free accounts and must not be used to run an online business or e-commerce site.
- [ ] **Corrections:** set `meta.correctionUrl` to `https://github.com/OWNER/REPO/issues/new?template=correction.yml`, then re-run the validator.
- [ ] Re-check any source older than 30 days on the day of publishing.

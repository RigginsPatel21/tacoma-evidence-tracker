# Changelog

Every label change, with its previous value. No entry has ever been upgraded. All sources were reopened on 19 Oct 2026.

## 0.3.1 (20 Oct 2026)

**No data or label changed.** Display fix only: on a Manufacturer-confirmed entry, the installation or context note was headed "Condition:" in the same amber style as the Condition-dependent label, which could suggest a fit condition. It is now headed "Note:" in neutral style. This affects 2 entries: the Diode TRD Pro grille kit on the TRD Pro (switch note) and on the TRD Sport (TRD Pro grille note). Only Condition-dependent entries show "Condition:".

## 0.3.0 (19 Oct 2026)

**No label changed.** Counts are unchanged: 6 compatible, 26 not compatible, 1 condition-dependent, 0 conflicting, 59 unverified (92 entries).

| Entry | What changed | Before |
|---|---|---|
| Diode SS6, SR | The stored maker reply was completed. Condition, claim and review note were reworded: a factory SR does not meet the condition, and Diode has not said outright whether the kit is compatible. Label stays Condition-dependent, **under review** | Quote stopped after "…with fog lamps." and was marked complete. The second sentence was missing: "That would be an add-on kit that we do not advertise or offer at this time." |
| Diode SS6, TRD Off-Road | Wiring quote completed (", which controls the main beam.") | Cut mid-sentence; marked incomplete |
| Diode ditch kit, TRD Off-Road hybrid | Wiring quote completed ("…from the positive terminal post, which will be within the engine bay (even though the battery is in the cab).") | Cut mid-sentence; marked incomplete |
| Diode ditch kit, Trailhunter | "Not tested" quote completed ("…with that trim level either.") | Cut mid-sentence; **wrongly marked complete** |
| Diode ditch kit, 2025–2026 4Runner | Wiring quote completed ("…for control.") | Cut mid-sentence; **wrongly marked complete** |
| All 59 unverified entries | Each now carries an "Evidence gap" note: what the maker hasn't said | No gap note |

Page changes:
- The default view shows maker statements and reviewed entries first. A visible count and button reveal the unverified entries.
- "Unverified" is now explained as "the maker hasn't said either way", never "does not fit".
- A public GitHub issue form (`.github/ISSUE_TEMPLATE/correction.yml`) has been added, with blank issues switched off.

New validator rules:
- **E6:** every unverified entry needs a gap note.
- **E7:** the correction link must be `null` or this repository's issue form, never an email address.

There are 17 regression tests.

## 0.2.0 (19 Oct 2026): independent audit

| Entry | 0.1.0 label | 0.2.0 label | Reason |
|---|---|---|---|
| Diode SS6, TRD Pro | Not compatible (2024–2026) | Not compatible (**2025 only**), plus a new Unverified entry for 2024 and 2026 | The maker's answer concerned a 2025 truck. The quote was also completed |
| Diode ditch kit, TRD Off-Road hybrid | Condition-dependent | Unverified | The answer addressed wiring, not fit |
| Diode TRD Pro grille kit: SR, SR5, TRD PreRunner, TRD Off-Road, Limited | Condition-dependent | Unverified | The requirement was stated for other trims |
| Baja grille conversion kit: SR, SR5, TRD PreRunner, TRD Sport, TRD Off-Road, Limited | Condition-dependent | Unverified | "To their stock Tacoma" names no trim |
| Baja S2 Sport pocket kit and S2 SAE replacement kit, Trailhunter | Conflicting | Unverified | Neither page mentions the Trailhunter |
| Diode ditch kit, 2025 4Runner | Condition-dependent | Unverified (2025–2026, vehicle level) | Diode's own 4Runner page names no trim |

Counts went from 6 / 26 / 14 / 2 / 43 (91 entries) to 6 / 26 / 1 / 0 / 59 (92 entries).

## 0.1.0 (19 Oct 2026)

First prototype.

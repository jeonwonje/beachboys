# 2. Requirements

*ASI-301 Engineering Report · Section 2*

[Previous: Section 1, Introduction](01-introduction.md) · [Contents](../README.md) · [Next: Section 3, System design](03-system-design.md)

Numbers in square brackets are the report's reference numbers. Section 2.4 lists them.

## 2.1 Design requirements

The gaps in [Section 1.2](01-introduction.md#12-technical-review-of-current-solutions), the contractor's pain points and the operating constraints set the design requirements. Table 2 groups the ten requirements into four families: functional, technical, user and safety.

| ID | Requirement | Source | Threshold |
|---|---|---|---|
| **Functional** | | | |
| D1 | Collect debris in wet sand | Gap 2 (wet sand). Contractor pain point: small item | Collection rate ≥0.80 per class [9], [10] |
| D2 | Separate wet sand from debris | Gap 2 (wet sand) | Majority of sand settles on the tray. Debris loss ≤0.05 [9], [11] |
| D3 | Operate below noise threshold | Contractor pain point: noise | Under 60 dB(A) at 1 m [12], [13] |
| **Technical** | | | |
| D4 | Mass within carrier capacity | Constraint | Moves with the bin at a 10 kg payload |
| D5 | Resist salt and wet sand | Constraint | No corrosion initiation or binding |
| D6 | Traverse the wet band | Contractor pain point: terrain | Observed to traverse in both sand conditions |
| **User** | | | |
| D7 | Shift-end clearing, hand tools only | Gap 1 | Two people, hand tools only |
| D8 | Reduce strain of clearing | Contractor pain point: strain | Physical demand below the current manual workflow |
| D9 | Operable by contractor worker unaided | Constraint | 5 of 6 tasks unaided |
| **Safety** | | | |
| D10 | Operate safely near the public | Constraint | All motion ceases upon emergency stop [14], [15] |

*Table 2: Design requirements, grouped by family: functional, technical, user and safety.*

Collection rate is the primary field metric. It is the proportion of placed debris that the machine takes off the sand and carries clear of the conveyor in one pass.

$$\text{collection rate} = \text{intake} \times \text{transfer}$$

The metric excludes discharge into the bin, because an item that leaves the sand counts as collected.

Source: Report Section 1.3, Table 2, Glossary.

## 2.2 Compliance matrix

Table 12 gives the result for each requirement against the thresholds of Table 2. The Evidence column links to the test results in Section 6.

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| **Functional** | | | |
| D1 | Updated: Collect debris in wet band (wet sand and cross-slope) | Fail on field (37.5% at best on dry sand, 6.3% at best on wet sand). On the bench, wet flat intake (50%) and wet long transfer (63%) stayed below 80%. | [Section 6.6.1: Figure 18](06-test-and-evaluation.md#661-collection-rate). [Section 6.6.2: Figure 19](06-test-and-evaluation.md#662-intake-and-transfer-by-condition). [Section 6.4.1: Figure 17](06-test-and-evaluation.md#641-results) |
| D2 | Separate wet sand from debris | Fail on settling. The majority is still split between the V plate and tray. Debris loss passes at 0%. | [Section 6.6.6: Figure 25](06-test-and-evaluation.md#666-sand-separation-and-clear-out) |
| D3 | Operate below noise threshold | Pass | [Section 6.5: Table 10, M8](06-test-and-evaluation.md#65-noise-and-emergency-stop-asi-b50) |
| **Technical** | | | |
| D4 | Mass within carrier capacity | Pass, with a 10 kg payload | [Section 6.3: Table 7, M9](06-test-and-evaluation.md#63-locomotion-check-asi-b30b) |
| D5 | Resist salt and wet sand | Not tested | None |
| D6 | Traverse the wet band | Pass, with limits. Jams impede motion and wheels slip in wet sand. | [Section 6.6.5: Figure 24](06-test-and-evaluation.md#665-locomotion). [Section 6.6.7: Table I.3, M10](06-test-and-evaluation.md#667-summary-metrics) |
| **User** | | | |
| D7 | Shift-end clearing, hand tools only | Pass on bench and field tests | [Section 6.2.1](06-test-and-evaluation.md#621-results). [Section 6.6.7: Table I.3, M13](06-test-and-evaluation.md#667-summary-metrics) |
| D8 | Reduce strain of clearing | Pass, qualitative | [Section 6.7: Table 11, M12](06-test-and-evaluation.md#67-user-metrics) |
| D9 | Operable by contractor worker unaided | Pass | [Section 6.7: Table 11, M11](06-test-and-evaluation.md#67-user-metrics) |
| **Safety** | | | |
| D10 | Operate safely near the public | Pass | [Section 6.5: Table 10, M14](06-test-and-evaluation.md#65-noise-and-emergency-stop-asi-b50) |

*Table 12: Problem-solution fit, against the requirements and thresholds of Table 2.*

The ten results fall into four groups:

- Pass: D3, D4 (with a 10 kg payload), D7, D9 and D10.
- Pass with a qualifier: D6 (with limits) and D8 (qualitative).
- Fail: D1 (on field) and D2 (on settling).
- Not tested: D5.

The report concludes that BeachBoy answers the workflow problem that the contractor described. It does not yet fully answer the collection problem that the team built it for.

Source: Report Section 4.3, Table 12, Section 4.1.1, Section 4.2, Table 7, Table 10, Table 11, Table I.3, Figure 17.

### 2.2.1 Notes on the results

**D1.** The team updated D1 after field testing. The wet band lies on a cross-slope, steeper than anticipated, so debris on the conveyor slid back off sideways before it reached the half-drum. The updated D1 requires BeachBoy to collect debris in the wet band, on wet sand and at a cross-slope.

**D2.** The debris loss value of 0% is the value that Table 12 states.

**D4.** The team checked mobility with a 10 kg payload, on road and on sand. In the sandpit, the machine moved, with some impeding of motion when it turned. Report Appendix E.4 states that the unit was not tested with a full bin.

**D5.** The electronics case keeps out sand but "is not sealed" (Report Section 3.2).

**D7.** Field clear-out took 5.23 minutes with two people and hand tools only.

**D8.** The respondents are two contractor workers, Operator A and Operator B, and the on-site manager. All three found the machine less physically demanding than the current workflow (Table 11). Their reasons differ:

- Operator A and the on-site manager pointed to less bending to re-collect debris dropped by the bobcat.
- Operator B pointed to driving the machine instead of hours in the sun picking up debris.

**D9.** Both operators completed 5 of 6 tasks unaided. Operator A needed help on task 4, clear a jam and resume. Operator B needed help on task 2, drive it to the working zone.

Source: Report Section 3.2, Section 4.1.2, Section 4.2, Table 7, Table 11, Appendix E.4.

## 2.3 Progression gates

The team gated each test environment on the last. Table I.1 gives the conditions for each gate.

| Gate | No. | Condition |
|---|---|---|
| Bench to field | 1 | Intake, transfer and discharge (into bin) rate all at 0.80 per class, dry and wet |
| Bench to field | 2 | Majority of the sand no longer in the half-drum |
| Bench to field | 3 | Debris loss at 0.05 or less |
| Bench to field | 4 | Noise under 60 dB(A) |
| Bench to field | 5 | Moves with the bin and a 10 kg payload |
| Bench to field | 6 | Emergency stop stops both drive and payload |
| Field to pilot | 1 | Collection rate at 0.80 or better per class |
| Field to pilot | 2 | Locomotion observed in dry and wet sand |

*Table I.1: Progression gates between environments.*

[Figure 17](figures/fig17-b40-rates.png) marks two per-class rates below 0.80 at the second bench session: wet flat intake at 50% and wet long transfer at 63%. The team proceeded to field and user testing after the noise and emergency stop checks.

Field collection rate fell short of the 0.80 threshold. [Section 6.6.1](06-test-and-evaluation.md#661-collection-rate) gives the results.

Source: Report Appendix I, Table I.1, Section 4 (introduction), Section 4.1.3, Section 4.1.4, Figure 17, Section 4.2.

## 2.4 References

The numbers match the report's reference list.

- [9] University of Alaska Fairbanks, "AMIT 145: Lesson 1, Industrial screens," Mining Mill Operator Training, 2020. [Online]. Available: <https://millops.community.uaf.edu/?p=1349> (accessed Nov. 4, 2026).
- [10] E. Foekema, S. Kühn, K. Elschot, and M. van Puijenbroek, "Inventory of aspects related to cleaning up microplastics after maritime incidents," Wageningen Marine Research, Den Helder, The Netherlands, Rep. C095/21B, Dec. 2021. [Online]. Available: <https://noordzeeloket.nl/publish/pages/231182/inventory-of-aspects-related-to-cleaning-up-microplastics-after-maritime-incidents-wur-2021-.pdf> (accessed Nov. 4, 2026).
- [11] M. Smalley, "Best practices: Screening," Pit & Quarry, Jul. 17, 2015. [Online]. Available: <https://www.pitandquarry.com/best-practices-screening/> (accessed Nov. 4, 2026).
- [12] Environmental Protection and Management (Boundary Noise Limits for Factory Premises) Regulations, Rg 1, 2008 Rev. Ed., Singapore. [Online]. Available: <https://sso.agc.gov.sg/SL/EPMA1999-RG1> (accessed Nov. 4, 2026).
- [13] K. S. Pearsons, R. L. Bennett, and S. Fidell, "Speech levels in various noise environments," U.S. Environmental Protection Agency, Washington, DC, USA, Rep. EPA-600/1-77-025, May 1977. [Online]. Available: <https://www.nonoise.org/epa/Roll2/roll2doc16.pdf> (accessed Nov. 4, 2026).
- [14] Safety of machinery - Emergency stop function - Principles for design, ISO 13850:2015.
- [15] Safety of machinery - Electrical equipment of machines - Part 1: General requirements, IEC 60204-1:2016.

Source: Report References.

[Previous: Section 1, Introduction](01-introduction.md) · [Contents](../README.md) · [Next: Section 3, System design](03-system-design.md)

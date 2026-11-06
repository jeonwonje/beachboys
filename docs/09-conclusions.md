# 9. Conclusions, Future Work and Open Items

*ASI-301 Engineering Report · Section 9*

[Previous: Section 8](08-carrier-repair.md) · [Contents](../README.md) · [Next: Section 10](10-references.md)

## 9.1 Conclusions

The BeachBoy has one purpose. It automates the part of beach cleaning that is still done entirely by hand: the removal of debris from the wet band.

The results at the bench and on the beach are different:

- **Bench.** Rocking the load through the half-drum separated wet sand with no debris lost. Noise stayed below 60 dB(A) at 1 m. All motion stopped on emergency stop. Wet flat intake (50%) and wet long transfer (63%) stayed below 80% at B4.0.
- **Beach.** Collection rate did not reach the threshold. The best overall rates were 37.5% on dry sand and 6.3% on wet sand, against 80% per class.
- **Cause on the wet band.** Collected debris slid back off the conveyor before it reached the half-drum. The cross-slope of the wet band was steeper than the team anticipated.
- **Change to requirements.** This was a gap in the original requirements. The team revised D1 retrospectively to cover collection on wet sand at this cross-slope.

Contractor workers operated the machine with little assistance. All three people asked found it less physically demanding than the current workflow.

The BeachBoy answers the workflow problem. It does not yet reach the required collection rate.

Source: Report Section 5, Section 4.2, Section 4.3, Figures 17 and 18, Tables 10 and 11.

## 9.2 Future work

The next iteration should do these tasks:

1. Reduce transfer loss at the wet band, where the cross-slope tips collected debris back off the conveyor.
2. Redesign the intake mechanism to improve the field collection rate and to reduce intake jams.
3. Reduce locomotion impediment. The two causes are:
   - The pivoting conveyor jams and stalls the robot.
   - The wheels dig in and slip in wet sand after the conveyor jams, and when the robot climbs the cross-slope.
4. Design for material resilience with salt and wet sand resistance.
5. Improve the separation mechanism, so that the majority of sand settles on the collection tray.

The team should do these tests on the beach, because the sandpit was unable to provide the slope.

Source: Report Section 4.4, Section 5.

## 9.3 Open items

The source documents disagree on the items below. These documents do not resolve them. Each row states how these documents treat the item.

| No. | Item | Disagreement | Treatment here |
|---|---|---|---|
| 1 | Module pack capacity | Report Section 3.2 gives 300 Wh. Figure 15 prints 21 Ah. The runtime in the report follows from neither. | No capacity or runtime stated in the text. |
| 2 | Limit switch 2 pin | The firmware uses D7. Figure 15 and the older pinout drawing show D3. | The firmware is the reference. Refer to [Section 4.7](04-electrical.md#47-open-items). |
| 3 | Second bench session | The report states that the session passed all gates. Figure 17 shows two per-class rates below the 0.80 gate. | Results stated. The team proceeded to field and user testing. |
| 4 | Rim size | Table 4 gives 34 cm and "wider than the belt", and the belt is 35 cm. Figure 12 gives 18-inch. Table D.1 gives a mesh radius of 196.5 mm. | No rim size in the iteration tables. Table D.1 values kept as calculation inputs. |
| 5 | Conveyor speed check | The pulley diameter, belt speed, speed bound and field speed in Appendix H do not agree. | Torque and release bounds given. The speed check stays open. Refer to [Section 7](07-calculations.md). |
| 6 | Worker benefit | The report states that all three people named the same benefit. Table 11 records different answers. | Table 11 answers stated. |
| 7 | Mobility check | Table 7 uses "full load". Appendix E.4 states that the unit was not tested with a full bin. | Stated as "with a 10 kg payload". |
| 8 | Emergency stop circuit | Table 10 records the stop result. Figure 15 shows no emergency stop circuit. | Refer to [Section 4.7](04-electrical.md#47-open-items). |
| 9 | Debris loss | Table 12 gives 0% and does not identify the test session. | Attributed to Table 12. |
| 10 | Motor ratings | Appendix D uses 100 rpm. Appendix H uses 120 rpm. The report does not state whether these are different motors. | Each value kept in its own appendix. |

Source: Report Sections 3.1, 3.2, 4.1.3, 4.3, Tables 4, 7, 10, 11, 12, D.1, Figures 12, 15, 17, Appendices E and H, firmware source file.

[Previous: Section 8](08-carrier-repair.md) · [Contents](../README.md) · [Next: Section 10](10-references.md)

# 5. Development

*ASI-301 Engineering Report · Section 5*

[Previous: 4. Electrical System](04-electrical.md) · [Contents](../README.md) · [Next: 6. Test and Evaluation](06-test-and-evaluation.md)

## 5.1 Subsystem development

Over the summer, the team replaced the onboard computer of the carrier and modified its control board (Report Appendices F and G). The team then developed each subsystem. The build and test log (report reference [18]) records every build, problem and test session in full.

Each iteration table below gives one row for each build. A row shows what changed, what the change fixed and the new problems that it raised.

These codes apply in the tables:

- **Build IDs**, such as B3.0, identify each build. The test sections write the same build as ASI-B3.0.
- **P- codes** are problems in the build and test log. [Section 5.2](#52-problem-codes) gives the meanings that the report states.
- **D- codes** are the requirements in Report Section 1.3 ([Section 2](02-requirements.md)).
- **Links in the tables** open the test video that the report links at that point.

Source: Report Section 3.1, Appendix F.

### 5.1.1 Conveyor subsystem

Table 3 shows each conveyor build up to the first bench test.

| Build | Built / changed | Fixed | New problems |
|---|---|---|---|
| **B1.0** first build | Free-pivoting skids, 7 cm tall.<br>Motor drives the belt directly, 1:1.<br>35 cm mesh belt with printed spokes.<br>Conveyor angle trialled, set at 40°. | Long items collected [D1, partly](https://www.youtube.com/shorts/wSfeeXAeOcA). | Skids pivot and block forward motion [P-03](https://youtube.com/shorts/mkiJaTSyaQo).<br>Spokes cannot reach digging depth. Small, medium and flat items missed [P-04](https://youtube.com/shorts/wSfeeXAeOcA).<br>Motor stalls: too fast, too little torque [P-06](https://youtube.com/shorts/ne3DPbplYf0).<br>Debris not handed into the drum [P-07](https://youtube.com/shorts/0ZMXIrph8wY). |
| **B2.0** trials | Bucket-scoop spokes tried, rejected.<br>Fixed brush at the handoff tried, rejected.<br>Skids locked against pivoting. | Skids no longer block. Drives over the sandpit. P-03, D6, partly. | Scoops add digging load and stall the motor [P-08](https://youtube.com/shorts/w20crV7bGKU).<br>Brush leaves a gap. Small and flexible items escape [P-09](https://youtube.com/shorts/wSfeeXAeOcA). |
| **B3.0** bench test 1 | Skids cut from 7 to 5 cm.<br>Belt drive raised from 1:1 to 3:1.<br>Conveyor lengthened for a higher drop into the half-drum. | No stalls through bench test 1 [P-06](https://youtu.be/JEZX-O-lJ6w).<br>Transfer reached 87.5% dry and 78.6% wet [P-07](https://youtu.be/JEZX-O-lJ6w).<br>Long items pass intake, dry and wet [D1, partly](https://youtu.be/JEZX-O-lJ6w). | Small rigid items slip between the spokes [P-10](https://youtu.be/JEZX-O-lJ6w).<br>Large rigid items ride the spoke tips [P-11](https://youtu.be/JEZX-O-lJ6w).<br>Flat items pushed ahead, worse in damp sand [P-12](https://youtu.be/JEZX-O-lJ6w). |

*Table 3: Conveyor iterations to the first bench test.*

Report Appendix H gives the calculations behind the conveyor changes ([Section 7](07-calculations.md)). Report Appendix H.6 lists five changes that set no dimension. The video record is the justification for those five changes.

Source: Report Section 3.1.1, Table 3, Appendices H.4 and H.6.

### 5.1.2 Half-drum subsystem

This section writes "half-drum" for the trommel half-drum. The team removed the top half of the drum at B3.0. The tables therefore write "drum" before B3.0 and "half-drum" from B3.0.

Table 4 shows each half-drum build up to the first bench test, in the same format as Table 3.

| Build | Built / changed | Fixed | New problems |
|---|---|---|---|
| **B0.0** first build | 3D-printed 28 cm rim with a rubber strip.<br>Off-the-shelf castors.<br>Friction drive through the support wheels. | Nothing yet. | Drum drifts out of line. P-01.<br>Drum too small for the 35 cm belt. P-02. |
| **B1.0** 16 Sep | Bicycle rim.<br>Custom printed castors.<br>Frame and mounts rebuilt. | Rim now wider than the belt. P-02. | Castors loose in the rim channel. Rim shifts [P-05](https://youtu.be/yAEa0tZkHo4). |
| **B2.0** 24 Sep | Inline skate wheels sized to the rim channel.<br>Fixed brush at the handoff tried, rejected. | Rim holds its line. P-01, P-05. | Brush does not guide debris into the drum [P-09](https://youtu.be/wSfeeXAeOcA). |
| **B3.0** bench test 1 | Top half removed: rocking half-drum takes the conveyor drop.<br>Capstan drive with limit switches.<br>[GT2 belt drive tried, rejected](https://www.youtube.com/shorts/GvZB0iGH3Iw). | Debris lands on the mesh. P-07, P-09.<br>No debris lost through the mesh. D2, partly. | Sand accumulates over the half-drum motor. P-13.<br>Capstan string loses tension. P-15. |

*Table 4: Trommel half-drum iterations to the first bench test.*

Source: Report Section 3.1.2, Table 4.

### 5.1.3 Collection tray and bin subsystem

Table 5 shows the collection tray and bin builds. The team reworked the bin mount at B4.0, after the locomotion check.

| Build | Built / changed | Fixed | New problems |
|---|---|---|---|
| **B3.0** first build | V plate funnels sand onto an aluminium tray.<br>Tray and bin built as one unit.<br>Quick-release pins at the front. | Nothing yet. | Bin bends back under the 10 kg payload [P-19](https://youtu.be/zNM9AM_rsPk). |
| **B4.0** rework | Pins moved to the rear of the tray.<br>Pushers added so the plate cannot pivot up. | Bin holds on its mount. No tray sag. P-19, D4, partly.<br>Tray and bin detach by hand. D7, partly. | None recorded. |

*Table 5: Collection subsystem iterations.*

Source: Report Section 3.1.3, Table 5.

## 5.2 Problem codes

P- codes are problems in the build and test log. The table below gives only the meanings that the report states. The report does not mention P-14, P-16, P-17 or P-18.

An empty Video cell means that the report links no video to that code. Report Table H.7 gives the link for P-20.

| Code | Meaning | Subsystem | Raised at | Response | Video |
|---|---|---|---|---|---|
| P-01 | Drum drifts out of line. | Half-drum | B0.0 | Rim holds its line at B2.0. | |
| P-02 | Drum too small for the 35 cm belt. | Half-drum | B0.0 | Rim wider than the belt at B1.0. | |
| P-03 | Skids pivot and block forward motion. | Conveyor | B1.0 | Skids locked against pivoting at B2.0. | [Video](https://youtube.com/shorts/mkiJaTSyaQo) |
| P-04 | Spokes cannot reach digging depth. Small, medium and flat items missed. | Conveyor | B1.0 | Skid height reduced, 70 to 50 mm (Appendix H.1). | [Video](https://youtube.com/shorts/wSfeeXAeOcA) |
| P-05 | Castors loose in the rim channel. Rim shifts. | Half-drum | B1.0 | Rim holds its line at B2.0. | [Video](https://youtu.be/yAEa0tZkHo4) |
| P-06 | Motor stalls: too fast, too little torque. | Conveyor | B1.0 | Drive ratio 3:1 at B3.0. No stalls through bench test 1. | [Video](https://youtube.com/shorts/ne3DPbplYf0), [bench test 1](https://youtu.be/JEZX-O-lJ6w) |
| P-07 | Debris not handed into the drum. | Conveyor | B1.0 | Conveyor lengthened at B3.0. Debris lands on the mesh. | [Video](https://youtube.com/shorts/0ZMXIrph8wY), [bench test 1](https://youtu.be/JEZX-O-lJ6w) |
| P-08 | Scoops add digging load and stall the motor. | Conveyor | B2.0 | Bucket-scoop spokes rejected at B2.0. | [Video](https://youtube.com/shorts/w20crV7bGKU) |
| P-09 | Brush leaves a gap, and small and flexible items escape. Brush does not guide debris into the drum. | Conveyor, half-drum | B2.0 | Brush rejected at B2.0. Debris lands on the mesh at B3.0. | [Video](https://youtu.be/wSfeeXAeOcA) |
| P-10 | Small rigid items slip between the spokes. | Conveyor | B3.0 | Mesh strip across the spokes (Table 6, Appendix H.5). | [Video](https://youtu.be/JEZX-O-lJ6w) |
| P-11 | Large rigid items ride the spoke tips. | Conveyor | B3.0 | Front paddle with ratchet at B4.0 (Table H.7). | [Video](https://youtu.be/JEZX-O-lJ6w) |
| P-12 | Flat items pushed ahead, worse in damp sand. | Conveyor | B3.0 | Front paddle with ratchet at B4.0 (Table H.7). | [Video](https://youtu.be/JEZX-O-lJ6w) |
| P-13 | Sand accumulates over the half-drum motor. | Half-drum | B3.0 | Polycarbonate sheet over the half-drum front face (Table 6). | |
| P-15 | Capstan string loses tension. | Half-drum | B3.0 | Belt drive trialled and rejected. Friction drive on springs fitted (Table 6). | |
| P-19 | Bin bends back under the 10 kg payload. | Collection | B3.0 | Pins moved to the rear, with front pushers, at B4.0. | [Video](https://youtu.be/zNM9AM_rsPk) |
| P-20 | Front paddle jams debris at the intake. | Conveyor | B4.0 session | Flaps replaced with rubber sheets at B5.0 (Table H.7). | [Video](https://youtu.be/uszukNu2L7s) |

Report Appendix E.2 states that P-19 came from how the unit pivoted on its mount, not from the strength of the mount.

[Section 6](06-test-and-evaluation.md) gives the test results and the iterations after the first bench test.

Source: Report Tables 3, 4, 5, 6 and H.7, Appendices E.2, H.1, H.3, H.4 and H.5.

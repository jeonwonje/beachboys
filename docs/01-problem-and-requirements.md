# 1. Problem and Requirements
[Contents](../README.md) · [Next](02-design.md)

## 1.1 Problem

About 97% of the plastic litter on Singapore's beaches arrives from offshore [1], so it must be cleared daily. A beach cleaning contractor ("the contractor") cleans three beaches on Sentosa with about 20 workers. Tractor-towed sieves clear the dry sand, and workers clear the wet intertidal band (wet band) by hand.

The Semester 2 target is a module, the payload parts of BeachBoy, that collects and separates debris from dry and wet-band sand. It must do this with less lifting than manual clearing, alongside the contractor's tractors and crew.

## 1.2 Pain points

1. Bending in heat, with mandatory rest breaks
2. Hydraulic pipe bursts and sieve wear
3. Sieve fails on wet sand and larger debris (primary target)
4. Tractor noise limits operation to low-crowd periods
5. Loose sand at Palawan, the most difficult terrain
6. Small scattered debris is hard to spot

*Table A.1: Pain points, in the contractor's priority order. Report 1.1 scope: all except the second.*

Source: Report 1.1, Table A.1.

## 1.3 Design gaps

**Gap 1: maintainability (SUTD SAND-E, D7).** Only the front rake and the trash storage detach. The rest of the machine is integrated. The report judges this design hard to clean or maintain on the beach.

**Gap 2: wet sand (BeBot, D1, D2).** The contractor trialled and rejected the BeBot for these reasons:

- Tipped when loaded.
- Held too little.
- Cost about twice a tractor's price.

The team also expects the BeBot to fail on wet sand. Wet sand clumps and blinds the mesh.

Source: Report 1.2, App. C.2.

## 1.4 Debris classes

| Class | Description |
|---|---|
| Small | Small rigid, smallest dimension under 3 cm |
| Medium | Medium rigid, smallest dimension 3 cm or more, top of the 1 to 30 cm size range |
| Long | Long, pliable or stiff |
| Flat | Low profile flat |

*Tables 1 and B.1: Targeted classes. Heavy bulky objects stay manual.*

## 1.5 Requirements and results

| ID | Requirement | Threshold | Result |
|---|---|---|---|
| D1 | Updated: collect debris in wet band (wet sand and cross-slope) | Collection rate ≥0.80 per class [9], [10] | Fail on field (37.5% at best on dry sand, 6.3% at best on wet sand). On the bench, wet flat intake (50%) and wet long transfer (63%) stayed below 80%. [Fig. 17](04-development-and-tests.md#43-bench-results), [Fig. 18-19](04-development-and-tests.md#46-field-results) |
| D2 | Separate wet sand from debris | Majority of sand settles on the tray. Debris loss ≤0.05 [9], [11] | Fail on settling. The majority is still split between the V plate and tray. Debris loss passes at 0% (Table 12). [Fig. 25](figures/fig25-settling.jpg) |
| D3 | Operate below noise threshold | Under 60 dB(A) at 1 m [12], [13] | Pass. [M8](04-development-and-tests.md#45-locomotion-noise-and-emergency-stop) |
| D4 | Mass within carrier capacity | Moves with the bin at a 10 kg payload | Pass, with a 10 kg payload. The unit was not tested with a full bin (App. E.4). [M9](04-development-and-tests.md#45-locomotion-noise-and-emergency-stop) |
| D5 | Resist salt and wet sand | No corrosion initiation or binding | Not tested. The electronics case "is not sealed". |
| D6 | Traverse the wet band | Observed to traverse in both sand conditions | Pass, with limits. Jams impede motion and wheels slip in wet sand. [M10](04-development-and-tests.md#46-field-results) |
| D7 | Shift-end clearing, hand tools only | Two people, hand tools only | Pass on bench and field tests. [M13](04-development-and-tests.md#46-field-results) |
| D8 | Reduce strain of clearing | Physical demand below the current manual workflow | Pass, qualitative. [M12](04-development-and-tests.md#47-user-tests) |
| D9 | Operable by contractor worker unaided | 5 of 6 tasks unaided | Pass. [M11](04-development-and-tests.md#47-user-tests) |
| D10 | Operate safely near the public | All motion ceases upon emergency stop [14], [15] | Pass. [M14](04-development-and-tests.md#45-locomotion-noise-and-emergency-stop) |

*Tables 2 and 12, merged.*

Collection rate is the primary field metric. It excludes discharge into the bin.

$$\text{collection rate} = \text{intake} \times \text{transfer}$$

Source: Report 1.3, 3.2, 4.3, App. E.4.

## 1.6 Progression gates

| Gate | Conditions |
|---|---|
| Bench to field | Intake, transfer and discharge (into bin) rate all at 0.80 per class, dry and wet. Majority of the sand no longer in the half-drum. Debris loss at 0.05 or less. Noise under 60 dB(A). Moves with the bin and a 10 kg payload. Emergency stop stops both drive and payload. |
| Field to pilot | Collection rate at 0.80 or better per class. Locomotion observed in dry and wet sand. |

*Table I.1: Progression gates.*

[Figure 17](figures/fig17-b40-rates.png) marks two per-class rates below 0.80 at the second bench session. The team proceeded to field and user testing. Field collection rate fell short of the threshold.

Source: Report App. I, 4.1.3, 4.1.4, 4.2.

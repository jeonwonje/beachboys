# 6. Conclusions
[Contents](../README.md) · [Previous](05-calculations.md)

## 6.1 Conclusions

The BeachBoy answers the workflow problem, but it does not yet reach the required collection rate. The best overall field rates were 37.5% on dry sand and 6.3% on wet sand, against 80% per class. On the wet band, collected debris slid back off the conveyor on a cross-slope steeper than the team anticipated, so the team revised D1 retrospectively. This was a gap in the original requirements.

On the bench, rocking the load through the half-drum separated wet sand. Noise stayed below 60 dB(A) at 1 m, and all motion stopped on emergency stop. Wet flat intake (50%) and wet long transfer (63%) stayed below 80% at B4.0.

Contractor workers operated the machine with little assistance, and all three people asked found it less physically demanding than the current workflow.

Source: Report 4.2, 4.3, 5, Fig. 17, 18, Tables 10, 11.

## 6.2 Future work

The next iteration should do these tasks:

1. Reduce transfer loss at the wet band, where the cross-slope tips collected debris back off the conveyor.
2. Redesign the intake mechanism to improve the field collection rate and to reduce intake jams.
3. Reduce locomotion impediment. The pivoting conveyor jams and stalls the robot. The wheels dig in and slip in wet sand after the conveyor jams, and when the robot climbs the cross-slope.
4. Design for material resilience with salt and wet sand resistance.
5. Improve the separation mechanism, so that the majority of sand settles on the collection tray.

The team should do these tests on the beach, because the sandpit was unable to provide the slope.

Source: Report 4.4, 5.

## 6.3 Open items

The source documents disagree on these items, and these documents do not resolve them.

| Item | Disagreement | Treatment |
|---|---|---|
| Module pack capacity | Report 3.2 and Fig. 15 give values that do not agree. | No capacity or runtime stated. |
| Limit switch 2 pin | Firmware: D7. Fig. 15 and older pinout drawing: D3. | Firmware is the reference. See [Electrical](03-electrical.md#34-open-items). |
| Second bench session | Report: all gates passed. Fig. 17: two per-class rates below 0.80. | Results stated. The team proceeded to field and user testing. |
| Rim size | Table 4, Fig. 12 (18-inch) and Table D.1 (mesh radius 196.5 mm) disagree. | Iteration tables say bicycle rim. Table D.1 values kept as calculation inputs. |
| Conveyor speed check | Pulley diameter, belt speed, speed bound and field speed in Appendix H disagree. | Check stays open. See [Calculations](05-calculations.md#53-conveyor). |
| Worker benefit | Report: all three named the same benefit. Table 11: different answers. | Table 11 answers stated. |
| Mobility check | Table 7 and E.4 disagree on the load. E.4: not tested with a full bin. | Stated as "with a 10 kg payload". |
| Emergency stop circuit | Table 10 records the stop result. Fig. 15 shows no such circuit. | See [Electrical](03-electrical.md#34-open-items). |
| Debris loss | Table 12 gives 0% and does not identify the session. | Attributed to Table 12. |
| Motor ratings | Appendix D: 100 rpm. Appendix H: 120 rpm. Report does not state whether these are different motors. | Each value kept with its appendix. |

Source: Report 3.1, 3.2, 4.1.3, 4.3, Appendices E, H, firmware source file.

## 6.4 References

Numbers match the report. This list includes only the references that these documents use.

[1] Z. Lim, "97% of plastic trash on Singapore's beaches originate from offshore sources: NEA study," *The Straits Times*, Jan. 15, 2025. [Online](https://www.straitstimes.com/singapore/environment/97-of-plastic-trash-on-singapores-beaches-originate-from-offshore-sources-nea-study) (accessed Nov. 4, 2026).

[9] University of Alaska Fairbanks, "AMIT 145: Lesson 1, Industrial screens," Mining Mill Operator Training, 2020. [Online](https://millops.community.uaf.edu/?p=1349) (accessed Nov. 4, 2026).

[10] E. Foekema, S. Kühn, K. Elschot, and M. van Puijenbroek, "Inventory of aspects related to cleaning up microplastics after maritime incidents," Wageningen Marine Research, Den Helder, The Netherlands, Rep. C095/21B, Dec. 2021. [Online](https://noordzeeloket.nl/publish/pages/231182/inventory-of-aspects-related-to-cleaning-up-microplastics-after-maritime-incidents-wur-2021-.pdf) (accessed Nov. 4, 2026).

[11] M. Smalley, "Best practices: Screening," *Pit & Quarry*, Jul. 17, 2015. [Online](https://www.pitandquarry.com/best-practices-screening/) (accessed Nov. 4, 2026).

[12] Environmental Protection and Management (Boundary Noise Limits for Factory Premises) Regulations, Rg 1, 2008 Rev. Ed., Singapore. [Online](https://sso.agc.gov.sg/SL/EPMA1999-RG1) (accessed Nov. 4, 2026).

[13] K. S. Pearsons, R. L. Bennett, and S. Fidell, "Speech levels in various noise environments," U.S. Environmental Protection Agency, Washington, DC, USA, Rep. EPA-600/1-77-025, May 1977. [Online](https://www.nonoise.org/epa/Roll2/roll2doc16.pdf) (accessed Nov. 4, 2026).

[14] *Safety of machinery — Emergency stop function — Principles for design*, ISO 13850:2015.

[15] *Safety of machinery — Electrical equipment of machines — Part 1: General requirements*, IEC 60204-1:2016.

[18] G. Chen, W. Jeon, M. Y. Kow, R. Ng, and Y. Wang, "ASI-301 build and test log: test programme specification, metrics, problem register and session logs," CDE3301 project document, National University of Singapore, Nov. 2026.

[20] J. M. Hernández and M. H. Fernandes, "Lesson 2. Basic characteristics of soils and rocks," in *Fundamentals of Geotechnical Engineering*, OpenCourseWare, Univ. of the Basque Country (UPV/EHU), 2020, Table D.27. [Online](https://ocw.ehu.eus/pluginfile.php/39477/mod_resource/content/7/OCW%20Lesson2%20Theory%20v2.pdf) (accessed Nov. 5, 2026).

[21] A. R. Reece, "The fundamental equation of earth-moving mechanics," *Proc. Inst. Mech. Eng., Conf. Proc.*, vol. 179, no. 6, pp. 16–22, 1964, doi: [10.1243/PIME_CONF_1964_179_134_02](https://doi.org/10.1243/PIME_CONF_1964_179_134_02).

[22] E. McKyes, *Soil Cutting and Tillage* (Developments in Agricultural Engineering, vol. 7). Amsterdam, The Netherlands: Elsevier, 1985.

Source: Report References.

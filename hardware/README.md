# Engineering Files

[Contents](../README.md)

Path | What it is | Opens with
---|---|---
[electrical/ASI-301_Wiring_v2.png](electrical/ASI-301_Wiring_v2.png) | System wiring diagram (Report Figure 15) | Image viewer
[electrical/XY160D_Mega2560_wiring.png](electrical/XY160D_Mega2560_wiring.png) | Wiring of the Mega 2560, XY160D driver and 2 KW11 limit switches | Image viewer
[electrical/XY160D_Motor_Controller_Guide.pdf](electrical/XY160D_Motor_Controller_Guide.pdf) | 2-page XY160D usage guide | PDF reader
[electrical/ASI-301_BOM.csv](electrical/ASI-301_BOM.csv) | Bill of materials (BOM) for the electronics case build, with approximate prices | Spreadsheet
[firmware/XY160D_LimitSwitch_Mega/XY160D_LimitSwitch_Mega.ino](firmware/XY160D_LimitSwitch_Mega/XY160D_LimitSwitch_Mega.ino) | Mega 2560 sketch for the XY160D and 2 limit switches | Arduino IDE
[electronics-case/case_v3_laser.py](electronics-case/case_v3_laser.py) | Case generator script | Python
[electronics-case/ASI301_case_acrylic_3mm_revB.pdf](electronics-case/ASI301_case_acrylic_3mm_revB.pdf) | 8-page Rev B drawing | PDF reader
[electronics-case/ASI301_case_acrylic_3mm_nest_revB.dxf](electronics-case/ASI301_case_acrylic_3mm_nest_revB.dxf), [electronics-case/ASI301_fit_coupon_3mm.dxf](electronics-case/ASI301_fit_coupon_3mm.dxf) | Rev B laser nest, and fit coupon. Cut lines of the nest include the kerf offset | Laser-cutter software, CAD tool
[electronics-case/ASI-301 Electronics Case v3.step](electronics-case/ASI-301%20Electronics%20Case%20v3.step) | STEP export of the case assembly | CAD tool
[electronics-case/](electronics-case/) `.SLDASM` and `.SLDPRT` files | Case assembly, panels, pads and M3 brass standoff. These files were not opened | SolidWorks
[Electronics_Case_v2/case_v2_graph.py](Electronics_Case_v2/case_v2_graph.py) | Case v2 feature graphs. `case_v3_laser.py` imports this file | Python
[carrier/botsync_copernicus_STEP.zip](carrier/botsync_copernicus_STEP.zip) | Botsync Copernicus models in STEP and COLLADA | Archive tool, then CAD tool
[module/ASI-301_integrated_assembly.step](module/ASI-301_integrated_assembly.step) | Full machine CAD assembly in STEP. In this file, one standoff (`M3 brass standoff Mega post`) sits outside the case | Any CAD tool

## Generate the case files

Python dependencies: `matplotlib` and `numpy`. The script writes the 2 DXF files and the PDF drawing next to itself.

CAUTION: THE SCRIPT OVERWRITES THE DXF AND PDF FILES IN `electronics-case/`. USE A COPY OF `hardware/` IF YOU MUST KEEP THE CURRENT FILES.

1. Install the packages: `python3 -m pip install matplotlib numpy`.
2. Go to `hardware/electronics-case`.
3. Run `python3 case_v3_laser.py`.

## Notes

- Both wiring diagrams show limit switch 2 on D3. The firmware uses D7. The firmware is the reference.
- BOM conflict: the BOM lists 11 brass standoffs and 14 heat-set inserts. The Rev B drawing gives 12 standoffs.
- The carrier files are under a [BSD-3-Clause notice](carrier/LICENSE-botsync-copernicus.txt): "Copyright (c) 2021, Botsync Pte. Ltd. All rights reserved." The ZIP file does not contain a licence file, so keep the two files together.

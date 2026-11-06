# Engineering Files

*ASI-301 Engineering Report · Engineering file index*

[Contents](../README.md) · [Section 4: Electrical System](../docs/04-electrical.md) · [Section 8: Carrier Repair](../docs/08-carrier-repair.md)

This index lists every file in `hardware/`. Each description comes from the contents of that file, with one exception. The SolidWorks files (`.SLDASM` and `.SLDPRT`) were not opened. Their descriptions come from the file names, the product names in the STEP file and the Rev B drawing.

## Electrical

| Path | What it is | Format | Opens with |
|---|---|---|---|
| [electrical/ASI-301_Wiring_v2.png](electrical/ASI-301_Wiring_v2.png) | System wiring diagram with the carrier and module power domains. It is the drawing that the report gives as Figure 15 | PNG | Image viewer |
| [electrical/XY160D_Mega2560_wiring.png](electrical/XY160D_Mega2560_wiring.png) | Wiring diagram of the Arduino Mega 2560, the XY160D driver and 2 KW11 limit switches, with notes | PNG | Image viewer |
| [electrical/XY160D_Motor_Controller_Guide.pdf](electrical/XY160D_Motor_Controller_Guide.pdf) | 2-page usage guide for the XY160D: specifications, wiring, control logic, speed control and tips | PDF | PDF reader |
| [electrical/ASI-301_BOM.csv](electrical/ASI-301_BOM.csv) | Bill of materials for the electronics case build. Refer to [Bill of materials](#bill-of-materials) | CSV | Spreadsheet or text editor |

Both wiring diagrams show limit switch 2 on D3. The firmware uses D7. The firmware is the reference, and this is an open item in [Section 4.7](../docs/04-electrical.md#47-open-items).

The guide gives speed control by PWM on an input pin. The firmware uses PWM on ENA and ENB.

### Bill of materials

The BOM lists parts for the electronics case build. It has 20 numbered items and a total row. Its columns are item number, item, quantity, specification, Taobao search term and price. The prices that it gives are approximate. This index does not repeat them.

| Item numbers | Parts |
|---|---|
| 1–3 | DC-DC supply, isolated RS485 adapter, relay module |
| 4–5 | DIN rail and end stops |
| 6–7 | Main fuse F1 and DDR fuse F2, with inline holders |
| 8–14 | USB cables, RS485 cable, motor and logic wire, Raspberry Pi 5 power leads, ferrules, lever connectors |
| 15–19 | Heat-set inserts, brass standoffs, screws, case mounting parts, cable grommets and gland |
| 20 | Raspberry Pi 5 active cooler, "only if not owned" |

The BOM does not list the Raspberry Pi 5, the Mega, the XY160D, the batteries, the motors, the limit switches or the acrylic sheet.

The BOM and the Rev B drawing do not agree on fasteners, and this is an open item. The BOM lists 11 brass standoffs and 14 heat-set inserts. The hardware list of the drawing gives 12 standoffs, with 12 M3 nuts and washers under the floor. The same list notes that case v2 had 11 standoffs, and the v2 script puts the standoffs on heat-set inserts. The BOM does not name a case version.

## Firmware

| Path | What it is | Format | Opens with |
|---|---|---|---|
| [firmware/XY160D_LimitSwitch_Mega/XY160D_LimitSwitch_Mega.ino](firmware/XY160D_LimitSwitch_Mega/XY160D_LimitSwitch_Mega.ino) | Arduino Mega 2560 sketch for the XY160D driver and 2 limit switches. [Section 4.6](../docs/04-electrical.md#46-firmware-from-the-source-file) describes it | Arduino sketch (C++) | Arduino IDE |

The file header names `XY160D_RPi4B_wiring.png`. That file is not in this repository.

## Electronics case v3

The case is a laser-cut acrylic box. The walls press into slots in the floor and the lid. The script gives a cavity of 232 x 270 x 79 mm. The panels are 1 floor, 1 lid, 4 walls and 8 pads. Rev B uses a sheet thickness of 2.90 mm and a kerf of 0.20 mm.

| Path | What it is | Format | Opens with |
|---|---|---|---|
| [electronics-case/case_v3_laser.py](electronics-case/case_v3_laser.py) | Script that generates the 2 DXF files and the PDF drawing below | Python 3 | Python, text editor |
| [electronics-case/ASI301_case_acrylic_3mm_revB.pdf](electronics-case/ASI301_case_acrylic_3mm_revB.pdf) | 8-page Rev B drawing: exploded view, sheet layout, assembly notes, hardware list, panel sheets and fit coupon | PDF | PDF reader |
| [electronics-case/ASI301_case_acrylic_3mm_nest_revB.dxf](electronics-case/ASI301_case_acrylic_3mm_nest_revB.dxf) | Rev B laser nest of all panels, with layers CUT and ENGRAVE. Cut lines already include the kerf offset | DXF R12 | Laser-cutter software, CAD tool |
| [electronics-case/ASI301_fit_coupon_3mm.dxf](electronics-case/ASI301_fit_coupon_3mm.dxf) | Fit coupon with 2 test tabs, to grade the slot width and length. Layers CUT and ENGRAVE | DXF R12 | Laser-cutter software, CAD tool |
| [electronics-case/ASI-301 Electronics Case v3.step](electronics-case/ASI-301%20Electronics%20Case%20v3.step) | STEP export of the case assembly, with its panels, boards, DIN rail and standoffs. The header names SolidWorks 2026 | STEP AP203 | CAD tool with STEP import |
| [electronics-case/ASI-301 Electronics Case v3.SLDASM](electronics-case/ASI-301%20Electronics%20Case%20v3.SLDASM) | Case assembly | SolidWorks assembly | SolidWorks |
| [electronics-case/Case_v3_Floor.SLDPRT](electronics-case/Case_v3_Floor.SLDPRT) | Floor panel | SolidWorks part | SolidWorks |
| [electronics-case/Case_v3_Lid.SLDPRT](electronics-case/Case_v3_Lid.SLDPRT) | Lid panel | SolidWorks part | SolidWorks |
| [electronics-case/Case_v3_Wall_Front.SLDPRT](electronics-case/Case_v3_Wall_Front.SLDPRT) | Front wall panel | SolidWorks part | SolidWorks |
| [electronics-case/Case_v3_Wall_Rear.SLDPRT](electronics-case/Case_v3_Wall_Rear.SLDPRT) | Rear wall panel | SolidWorks part | SolidWorks |
| [electronics-case/Case_v3_Wall_Left.SLDPRT](electronics-case/Case_v3_Wall_Left.SLDPRT) | Left wall panel | SolidWorks part | SolidWorks |
| [electronics-case/Case_v3_Wall_Right.SLDPRT](electronics-case/Case_v3_Wall_Right.SLDPRT) | Right wall panel | SolidWorks part | SolidWorks |
| [electronics-case/Case_v3_Pads.SLDPRT](electronics-case/Case_v3_Pads.SLDPRT) | Pads | SolidWorks part | SolidWorks |
| [electronics-case/M3 brass standoff Mega post.SLDPRT](electronics-case/M3%20brass%20standoff%20Mega%20post.SLDPRT) | M3 brass standoff. The drawing calls the twelfth standoff the Mega support post | SolidWorks part | SolidWorks |

The STEP file contains these products that have no SolidWorks part file in `hardware/`:

- Raspberry Pi 5 (block), Arduino Mega 2560 and XY160D motor driver.
- DDR-30G-5, Waveshare USB TO 2CH RS485 and Relay module 5V 30A DIN.
- DIN rail 35x7.5 170mm and M3 brass standoffs x11.

## Electronics case v2 script

| Path | What it is | Format | Opens with |
|---|---|---|---|
| [Electronics_Case_v2/case_v2_graph.py](Electronics_Case_v2/case_v2_graph.py) | Feature graphs for case v2. Arguments `base` and `lid` give JSON, and `check` gives expected volumes and key heights. `case_v3_laser.py` imports its dimensions and positions | Python 3 | Python, text editor |

## Generate the case files

The script `electronics-case/case_v3_laser.py` writes the 2 DXF files and the PDF drawing next to itself. It imports `../Electronics_Case_v2/case_v2_graph.py`. That file is present in this repository, and it uses only the Python standard library.

The script has these Python dependencies:

| Package | Use |
|---|---|
| `matplotlib` | PDF drawing and 3D view |
| `numpy` | 3D view |

CAUTION: THE SCRIPT OVERWRITES THE DXF AND PDF FILES IN `electronics-case/`. USE A COPY OF `hardware/` IF YOU MUST KEEP THE CURRENT FILES.

1. Make sure that Python 3 is installed.
2. Install the packages: `python3 -m pip install matplotlib numpy`.
3. Make sure that `hardware/Electronics_Case_v2/case_v2_graph.py` is present.
4. Go to the directory `hardware/electronics-case`.
5. Run this command: `python3 case_v3_laser.py`.
6. Make sure that the script prints this line: `sheet layout 566 x 467 mm, cut length 10.21 m, kerf 0.2, sheet 2.9`.

The script sets its import path from its own location, so it also runs from another directory.

The command ran on a copy of `hardware/`, with Python 3.14.4, matplotlib 3.11.2 and numpy 2.5.4. The result was:

| Output | Result against the file in this repository |
|---|---|
| `ASI301_case_acrylic_3mm_nest_revB.dxf` | Byte-identical |
| `ASI301_fit_coupon_3mm.dxf` | Byte-identical |
| `ASI301_case_acrylic_3mm_revB.pdf` | Same extracted text. The binary file is different |

These options change the output:

| Option | Default | Meaning |
|---|---|---|
| `--sheet` | 2.90 | Sheet thickness in mm |
| `--kerf` | 0.20 | Full kerf width in mm |
| `--press-w` | 0.0 | Floor slot width clearance, from coupon row W |
| `--press-l` | −0.025 | Floor slot length clearance, from coupon row L |

## Carrier

| Path | What it is | Format | Opens with |
|---|---|---|---|
| [carrier/botsync_copernicus_STEP.zip](carrier/botsync_copernicus_STEP.zip) | Botsync Copernicus models: `copernicus_body_mm.step`, `copernicus_wheel_mm.step`, `src/copernicus.dae` and `src/wheel.dae` | ZIP of STEP and COLLADA | Archive tool, then CAD tool with STEP import |
| [carrier/LICENSE-botsync-copernicus.txt](carrier/LICENSE-botsync-copernicus.txt) | Licence notice for the Botsync Copernicus files | Text | Text editor |

The carrier files are under a BSD-3-Clause notice: "Copyright (c) 2021, Botsync Pte. Ltd. All rights reserved." The full text is in [LICENSE-botsync-copernicus.txt](carrier/LICENSE-botsync-copernicus.txt). The ZIP file does not contain a licence file, so keep the two files together.

## Module

| Path | What it is | Format | Opens with |
|---|---|---|---|
| [module/beachboy.glb](module/beachboy.glb) | 3D model of the machine, with 37 meshes and part names that have a subsystem prefix | glTF 2.0 binary | glTF viewer, Blender |

The file has these part names, by prefix. This table omits the suffix `__mat_n` of each mesh name.

| Prefix | Meshes | Part names |
|---|---|---|
| `c_` | 16 | `c_belt`, `c_skid`, `c_mount`, `c_paddle`, `c_frame`, `c_drive` |
| `d_` | 11 | `d_drive`, `d_wheels`, `d_frame`, `d_drum` |
| `b_` | 5 | `b_vplate`, `b_pins`, `b_tray`, `b_frame`, `b_bin` |
| `k_` | 5 | `k_wheels`, `k_body`, `k_spine` |

[Contents](../README.md) · [Section 4: Electrical System](../docs/04-electrical.md) · [Section 8: Carrier Repair](../docs/08-carrier-repair.md)

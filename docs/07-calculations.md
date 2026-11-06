# 7. Design Calculations

*ASI-301 Engineering Report · Section 7*

[Previous: Section 6](06-test-and-evaluation.md) · [Contents](../README.md) · [Next: Section 8](08-carrier-repair.md)

This section gives the calculations for three parts of the module:

- The half-drum drive (Report Appendix D).
- The collection unit (Report Appendix E).
- The conveyor (Report Appendix H).

The labels D.1, E.1 and H.1 are the report's own subsection numbers. Each number below is the report's number. Many inputs are assumed or estimated, and the tables state the basis of each input.

P- codes are problems in the build and test log. D- codes are the requirements. B- codes are the builds of the module.

## 7.1 Half-drum speed and torque (Appendix D)

The module uses a trommel half-drum. A motor drives the half-drum through friction at the rim, and the half-drum rocks between two limit switches.

Source: Report Appendix D, Tables D.1 to D.4, and Report Section 3.2 for the limit switches.

### 7.1.1 Inputs (D.1)

| Quantity | Symbol | Value | Source |
|---|---|---|---|
| Drive wheel diameter | $d$ | 64 mm ($r_w$ = 32 mm) | Wheel listing |
| Motor output speed | $n$ | 100 rpm | GPG listing |
| Motor input power, voltage | $P_{in}$, $V$ | 40 W, 24 V | GPG listing |
| Mesh radius | $R$ | 196.5 mm | Measured |
| Radius over rim flanges | – | 209.5 mm | Measured |
| Drive contact radius | $r_c$ | 196.5 mm | Lower bound of 196.5 to 209.5 mm. Gives the highest torque demand. |
| Loaded half-drum mass (half-drum, sand, debris) | $m$ | 2 kg | Team estimate |
| Rocking period | $T$ | 0.943 s | Timed from bench video |
| Reversal time | $t_r$ | 0.10 s worst, 0.15 s nominal | Assumed. Nominal equals the 150 ms coast. |
| Gearmotor efficiency | $\eta$ | 0.5 | Assumed. Not published on the listing. |

*Table D.1: Inputs to the speed and torque check, with the source of each value.*

### 7.1.2 Speed (D.2)

| Quantity | Equation | Value |
|---|---|---|
| Rim surface speed | $v = \pi d n / 60$ | 0.335 m/s |
| Half-drum angular speed | $\omega = v / r_c$ | 1.71 rad/s (97.7°/s, 16.3 rpm. 15.3 rpm if $r_c$ = 209.5 mm.) |
| Critical speed | $\omega_c = \sqrt{g / R}$ | 7.07 rad/s (67.5 rpm) |
| Fraction of critical speed | $\omega / \omega_c$ | 0.24 |
| Ratio of centripetal to gravitational acceleration | $\omega^2 R / g$ | 0.058 |
| Stroke angle | $\approx \omega T / 2$ | 46° (upper bound, ignores the coast) |

*Table D.2: Half-drum speed against critical speed.*

At critical speed, the mesh would hold the load and carry it around. At 0.24 of critical speed, centripetal acceleration is 6% of gravity. The mesh never holds the load, and the load falls back at every reversal. The 0.943 s period is one full out-and-back cycle.

### 7.1.3 Torque at the half-drum axis (D.3)

| Quantity | Equation | Worst case | Nominal |
|---|---|---|---|
| Moment of inertia | $I = mR^2$ | 0.0772 kg·m² (all mass at the mesh, an upper bound) | 0.0772 kg·m² (all mass at the mesh, an upper bound) |
| Gravity torque | $T_g = mgR \sin\theta$ | 3.86 N·m ($\theta$ = 90°) | 1.51 N·m ($\theta$ = 23°, half the stroke) |
| Reversal torque, $-\omega$ to $+\omega$ | $T_i = I \times 2\omega / t_r$ | 2.63 N·m ($t_r$ = 0.10 s) | 1.76 N·m ($t_r$ = 0.15 s) |
| Total at the half-drum | $T_{drum} = T_g + T_i$ | 6.49 N·m | 3.27 N·m |
| At the motor shaft | $T_m = T_{drum} \times r_w / r_c$ | 1.06 N·m | 0.53 N·m |

*Table D.3: Torque demand. The check leaves out bearing and rolling resistance. They are small next to these terms, and the bounding choices of $R$ and $\theta$ cover them.*

### 7.1.4 Motor capability and margin (D.4)

Available output torque is $T_{avail} = \eta P_{in} / \omega_{out}$, with $\omega_{out}$ = 100 rpm = 10.47 rad/s.

| Efficiency $\eta$ | $T_{avail}$ (N·m) | Margin, worst case | Margin, nominal |
|---|---|---|---|
| 1.0 (absolute ceiling) | 3.82 | 3.6 | 7.2 |
| 0.5 (assumed) | 1.91 | 1.8 | 3.6 |
| 0.3 (pessimistic) | 1.15 | 1.1 | 2.2 |

*Table D.4: Motor torque margin. The motor meets the worst case even at 30% efficiency.*

The worst-case torque margin is 1.8 at an assumed 50% efficiency. This margin applies to motor torque only. Grip at the drive contact was not measured (D.5).

### 7.1.5 Grip at the drive contact (D.5)

The drive wheel must pass a tangential force to the rim:

$$F_t = \frac{T_{drum}}{r_c}$$

This force is 33 N in the worst case and 16.6 N in the nominal case. A friction drive transmits this force only if $\mu N \ge F_t$. $N$ is the contact force from the springs and the half-drum weight.

The worst case therefore needs $N \ge 33 / \mu$. For example, $\mu$ = 0.5 needs 66 N. The team did not measure the spring force or $\mu$. The next step is a spring-balance reading of the contact force.

The press fit between the wheel and its printed mount must also hold the worst-case motor torque of 1.06 N·m without slip.

### 7.1.6 Electrical check (D.6)

Input current is $I = P_{in} / V$ = 40 / 24 = 1.67 A. This value matches the 1.7 A in Report Section 3.2. It is within the driver's channel rating of about 7 A.

### 7.1.7 Semester 1 rotating-drum prototype (D.7)

Report Appendix D.7 shows a photograph and a video link for the Semester 1 rotating-drum prototype. This document does not reproduce them.

### 7.1.8 Limitations

The report gives these limitations for the half-drum check:

- The mass is estimated.
- The efficiency is assumed.
- The contact radius is a bound.
- The friction coefficient and the spring force are not measured.

The report states that every assumption was chosen to raise the demand, so the margins above are conservative.

## 7.2 Collection unit checks (Appendix E)

These checks cover the PETG mount, the V plate and the collection tray.

Source: Report Appendix E, Tables E.1 to E.3.

### 7.2.1 Inputs (E.1)

| Quantity | Value | Source |
|---|---|---|
| Quick-release pins | 2 × 10 mm diameter, stainless steel, each through two PETG parts | Supplier |
| Design payload | 10 kg | D4 |
| PETG mount parts | 38 × 38 mm section, 22 mm thick along the pin, 2 wall loops (0.45 mm), 25% infill | Measured. Print settings. |
| Collection tray | 335 × 338 × 25.4 mm, 1 mm aluminium | Measured |
| V plate | 2 mm acrylic, about 10° | Measured |

*Table E.1: Inputs to the collection unit checks.*

### 7.2.2 PETG mount strength (E.2)

| Quantity | Equation | Value |
|---|---|---|
| Load per contact, shared | $F = mg / 4$ | 24.5 N |
| Hole crushing (bearing), lowest | $F = \sigma \times d \times t \times \varphi$, with $\varphi$ = 0.35 | 2.29 kN |
| Pin tear-out to the edge, two planes | $F = \tau \times 2 \times 4.85\ \text{mm} \times t$ | 3.69 kN |
| Shear across the part section | $F = \tau \times 467\ \text{mm}^2$ | 8.09 kN |
| Margin, load shared | 2.29 kN / 24.5 N | 93 |
| Margin if one part takes all 98.1 N | 2.29 kN / 98.1 N | 23 |

*Table E.2: Failure loads of one printed PETG mount part against the 10 kg design payload.*

Each pin goes through two 3D-printed PETG parts. Four pin-to-part contacts therefore share the 10 kg load. Only the two wall loops are solid, and the remainder is 25% infill. The check counts the walls in full and the infill at a quarter of its area. It ignores the top and bottom layers.

The check takes printed PETG at 30 MPa tensile strength and 17.3 MPa shear strength. These values are assumed, and they are below typical datasheet values of 45–50 MPa.

Crushing of the hole by the pin sets the lowest failure load. If one part carried the whole 98.1 N, it would still hold 23 times the design load. The report therefore attributes P-19 to how the unit pivoted on its mount, not to the strength of the mount. The team moved the pins to the rear and added front pushers, and this change solved P-19.

### 7.2.3 V plate sliding (E.3)

Sand on an incline slides only when $\tan\theta > \mu$. Here, $\mu$ is the friction coefficient between sand and acrylic. The team did not measure this coefficient.

| Plate angle $\theta$ | Sand slides only if $\mu$ is below |
|---|---|
| 10° (current) | 0.18 |
| 20° | 0.36 |
| 30° | 0.58 |

*Table E.3: Friction coefficient below which sand slides, by plate angle.*

Wet sand also clings through capillary bridges between grains [6], and this adds to friction. This fits the bench observations at B3.0 and B4.0. Dry sand slid down more often, while damp sand clumped and stayed. A steeper plate raises the friction that it can overcome.

### 7.2.4 Tray volume (E.4)

$$V = 0.335 \times 0.338 \times 0.0254 = 2.88 \times 10^{-3}\ \text{m}^3$$

This volume is about 2.9 L at the brim.

### 7.2.5 Limitations

The report gives these limitations for the collection unit checks:

- The PETG strength is assumed, not tested.
- The friction coefficient $\mu$ for sand on acrylic was not measured.
- The unit was not tested with a full bin (T2).
- The mass of the empty unit is unknown, so the team did no lift check against a manual-handling limit.

## 7.3 Conveyor calculations (Appendix H)

This section gives the reason for each conveyor change between B1.0 and B5.0. A calculation supports each change that sets a dimension or trades one property against another (H.1 to H.5). H.6 records, with their evidence, the changes that removed a failure seen directly on the bench.

Source: Report Appendix H, Tables H.1 to H.7. The report shows the equations of H.1 to H.4 as images on PDF pages 59 to 62, and this section transcribes them.

### 7.3.1 Rating basis and inputs

All torque figures in Appendix H use one rating basis. This basis is the motor's 33 kgf·cm (3.236 N·m) continuous output torque at 120 rpm. This corresponds to 40.7 W of mechanical output, consistent with the motor's nominal 40 W rating.

| Quantity | Symbol | Value | Basis |
|---|---|---|---|
| Belt width | $w$ | 350 mm | Build dimension |
| Belt mesh aperture | – | 10 mm | Build dimension |
| Conveyor length, B1.0 / B3.0 onward | $L$ | 900 / 1020 mm | Build dimension |
| Conveyor incline | $\alpha$ | 40° | Measured on the assembly |
| Drive pulley diameter | $D$ | 105 mm ($r$ = 52.5 mm) | Build dimension |
| Spoke pitch / thickness | $p$, $t$ | 30 / 8 mm | Build dimension |
| Spoke-tip reach below skid datum | – | 60 mm | CAD |
| Skid height, B1.0 / B3.0 onward | $h$ | 70 / 50 mm | Build dimension |
| Motor speed / continuous torque | $n$, $T$ | 120 rpm / 3.236 N·m | Motor specification |
| Drive efficiency (timing belt) | $\eta$ | 0.90 | Assumed. Timing belt about 0.98, reduced for plain-shaft friction (no bearings). |
| Damp sand bulk density | $\rho$ | 1900 kg/m³ | Assumed. Damp sand typically 1800–2000 kg/m³ [20]. |
| Damp sand apparent cohesion | $c$ | 1 kPa nominal, 2 kPa upper | Assumed bracketing values. Capillary cohesion of moist sand, not measured (H.7). |
| Carried sand and debris lift | $F_0$ | 5 N | Assumed allowance. $\eta$ includes belt and shaft friction. |

*Table H.1: Inputs to the conveyor calculations.*

### 7.3.2 Reduction of skid height, 70 to 50 mm, P-04 (H.1)

The report states that the 50 mm skid is the tallest that puts the spoke tips into the sand. It also states that any lower skid roughly doubles the digging force and the sand lifted for every extra 10 mm.

At B1.0, the spokes could not reach digging depth, and the conveyor missed small, medium and flat items (P-04). Nominal penetration is the tip reach minus the skid height:

$$d = 60\ \text{mm} - h$$

With the 70 mm skid, $d$ = −10 mm. The tips ran 10 mm above the sand, and this matches P-04. A 50 mm skid gives $d$ = 10 mm.

The skid height sets the depth, and the depth sets the load. The fundamental earthmoving equation [21], [22] gives an estimate of the digging force on a shallow blade of width $w$:

$$F_{dig} = w\left(\rho g d^2 N_\gamma + c\, d\, N_c\right)$$

The report takes the factors as $N_\gamma$ = 2 to 5 and $N_c$ = 4 to 8, to bracket the unknown spoke rake angle. The sand volume lifted per metre of travel is $w \times d$.

| Skid height (mm) | Depth $d$ (mm) | $F_{dig}$, $c$ = 1 kPa (N) | $F_{dig} + F_0$ (N) | Damp sand lifted per metre (L / kg) |
|---|---|---|---|---|
| 70 | −10 | 0 | 5 | 0 |
| 50 (chosen) | 10 | 15.3 to 31.3 | 20.3 to 36.3 | 3.5 / 6.7 |
| 40 | 20 | 33.2 to 69.1 | 38.2 to 74.1 | 7.0 / 13.3 |

*Table H.2: Digging force and sand lifted against skid height.*

The target debris is on or just below the surface, so 10 mm is enough to put a spoke under it. A 40 mm skid would double the sand that the belt and the half-drum must handle. At 1:1, its upper load of 74 N would exceed the continuous capacity of the motor (H.3).

### 7.3.3 Scoop spokes rejected, P-08 (H.2)

With full scoops of about 150 cm³, the scoop load alone takes 106% of the continuous capacity of the 1:1 drive before any digging. The report states that this explains the stall at B2.0.

The team tried bucket-scoop spokes at B2.0 to hold small items, and the motor stalled (P-08). Each scoop holds about 150 cm³ when full. Each scoop on the rising run carries sand up the 40° incline. On the 900 mm B2.0 conveyor at 30 mm pitch, about $L/p$ = 30 scoops are on the rising run at one time:

$$F_{scoop} = \frac{L}{p} V \rho g \sin\alpha$$

| Scoop volume $V$ (cm³) | $F_{scoop}$, full, damp (N) | $F_{scoop} + F_0$ (N) | Share of 1:1 capacity, 55.5 N |
|---|---|---|---|
| 150 | 53.9 | 58.9 | 106% |

*Table H.3: Scoop load against the 1:1 drive capacity.*

With $V$ = 150 cm³, the scoop load is 53.9 N, or 58.9 N with $F_0$. This is already 106% of the 55.5 N available at 1:1, before any digging. The nominal digging force from H.1 (31.3 N) raises the total to 90.2 N, which is 163% of capacity. The stall is therefore expected.

The team removed the scoops and did not change the drive for them, because sand held on the belt also defeats the 10 mm mesh. The mesh exists to let sand fall through during the rise.

### 7.3.4 Drive ratio, 1:1 to 3:1, P-06 (H.3)

The report states that the 3:1 reduction is the smallest ratio whose continuous belt force covers the worst-case digging load. It also states that this reduction slows the belt enough that items drop into the half-drum and are not flung.

The B1.0 motor drove the belt directly and stalled (P-06, "too fast, too little torque"). At B1.0, the team was still trying different conveyor angles. The 10 mm tip clearance in H.1 holds only at the final 40° incline. At shallower angles, these events occurred:

1. The nose sat lower.
2. The spoke tips dug into the sand.
3. The 1:1 drive, with only 55.5 N of continuous belt force, stalled.

The 50 mm skid (H.1) makes this digging load continuous at every angle, so the team sized the drive for it.

For a reduction $i$, belt speed and continuous belt force are:

$$v = \frac{\pi D n}{60\, i}, \qquad F_{cap} = \frac{T\, i\, \eta}{r}$$

The report compares two loads against capacity:

- **Nominal:** 10 mm depth, $c$ = 1 kPa, upper factors: 36.3 N (Table H.2).
- **Worst case:** depth doubled to 20 mm by sinkage or uneven ground, $c$ = 2 kPa, upper factors: $F_{dig}$ = 125.0 N, so 130.0 N with $F_0$.

| Ratio | Belt speed (m/s) | Horizontal belt speed at 40° (m/s) | $F_{cap}$ (N) | Margin, nominal 36 N | Margin, worst 130 N | Head Froude number |
|---|---|---|---|---|---|---|
| 1:1 | 0.660 | 0.506 | 55.5 | 1.5 | 0.43 | 0.85 |
| 3:1 (chosen) | 0.220 | 0.168 | 166.4 | 4.6 | 1.28 | 0.094 |

*Table H.4: Belt speed, force capacity and margins by drive ratio.*

**Lower bound on the ratio (torque).** Each ratio $i$ gives a continuous belt force $F_{cap} = i \times T \times \eta / r = i \times 55.5$ N. The worst case already doubles both the depth and the cohesion, so the report applies a safety factor of 1.25 to it. This gives a design load of 1.25 × 130.0 = 162.5 N. The ratio must therefore be at least $i_{min}$ = 162.5 / 55.5 = 2.93.

**Lower bound on the ratio (release at the head).** The head-pulley Froude number compares the outward pull on an item with gravity:

$$Fr = \frac{v^2}{g\, r}$$

Belt speed is inversely proportional to $i$, so $Fr(i) = 0.85 / i^2$. To keep $Fr$ at or below 0.1, so that gravity clearly dominates, the ratio must meet this condition:

$$i \ge \sqrt{0.85 / 0.1} = 2.92$$

At 1:1, $Fr$ = 0.85 is close to 1. Items leave the belt early and are thrown, and this matches the "too fast" observation. At 3:1, $Fr$ = 0.094. Items fall from near the head under gravity, where the half-drum can be below them (H.5).

**Result.** 3:1 is the smallest whole-number ratio above both lower bounds (2.93 for torque, 2.92 for release). With 3:1 installed, the conveyor did not stall in either bench session (B3.0, B4.0).

**Speed check: open item.** A higher ratio adds torque but slows the belt. For a spoke to sweep back under an item as the carrier moves forward, the horizontal belt speed must be more than the carrier speed. This document does not state that the 3:1 ratio meets this condition, because the report values for this check do not agree:

- **Pulley diameter:** Table H.1 gives 105 mm. The speed text in H.3 gives about 109 mm.
- **Horizontal belt speed:** Table H.4 gives 0.506 m/s at 1:1 and 0.168 m/s at 3:1. The speed text in H.3 gives 0.23 / $i$ m/s "after the 3:1 reduction", and the condition $i < 0.23 / v_c$, where $v_c$ is the carrier speed.
- **Carrier speed limit:** The result text in H.3 gives about 0.15 m/s.
- **Carrier speed:** The speed text in H.3 gives 0.21 m/s during the field pass. H.7 states that the carrier speed was not recorded.

### 7.3.5 Conveyor lengthened, 900 to 1020 mm, P-07 (H.4)

The 120 mm extension moves the head 92 mm rearward and 77 mm up. At the 3:1 belt speed, items fall within about 40 mm of the release point. The head itself must therefore be over the half-drum.

At B1.0, the conveyor did not hand debris into the drum (P-07). After the 3:1 reduction (H.3), the belt is too slow to throw items across a gap. For a tangent release at 40° and 0.220 m/s, the horizontal travel $x$ after a fall $y$ is:

$$x = v \cos\alpha\, t, \qquad y = -v \sin\alpha\, t + \frac{1}{2} g t^2$$

| Fall below release (mm) | Time (s) | Horizontal travel (mm) |
|---|---|---|
| 150 (B1.0 drop) | 0.190 | 32 |
| 255 (B3.0 drop) | 0.243 | 41 |

*Table H.5: Horizontal travel of a released item by drop height.*

The added 120 mm along the 40° incline gives:

- 120 cos 40° = 92 mm rearward, which moves the release point over the half-drum mesh.
- 120 sin 40° = 77 mm up, less 20 mm from the lower skid (H.1), so a net 57 mm.

The remaining 48 mm of the 105 mm increase came from the B3.0 half-drum. The removal of its top half let the conveyor head reach further over the half-drum, so items land lower on the curved mesh. The larger drop adds 9 mm of travel (Table H.5) and gives the debris more clearance over the lip.

Transfer reached 87.5% dry and 78.6% wet at B3.0, and 95.5% dry and 89.5% wet at B4.0.

### 7.3.6 Mesh strip across the spokes, P-10 (H.5)

Every compact small item fits through the 22 mm clear gap between spokes, and a 10 mm aperture retains most of them. For that reason, the team added the strip and did not change the spoke pitch.

At B3.0, small rigid items went between the spokes (P-10). The clear gap is the pitch less the spoke thickness, 30 − 8 = 22 mm. A halved pitch would close the gap, but it would double the spoke count and the digging load from H.1. A 10 mm mesh strip across the spoke row closes the gap and adds no blade area.

| Small item | Typical size (mm) | Smallest dimension (mm) | Passes 22 mm gap? | Passes 10 mm strip? |
|---|---|---|---|---|
| Bottle cap | 30 dia × 15 | 15 | Yes, edge-on | No |
| Cigarette butt | 8 dia × 25 | 8 | Yes | Only end-on |
| Plastic spoon | Head 35 wide, handle 10 × 3 | 3 | Handle only. Head is held. | Handle only. Head is held. |
| Zip tie | 4 × 1 × 150 | 1 | Only if aligned with the gap | Only if aligned. Length bridges openings. |
| 20 cm twig | 6 dia × 200 | 6 | Only if aligned with the gap | Only if aligned. Length bridges openings. |

*Table H.6: Small items against the 22 mm spoke gap and the 10 mm mesh strip.*

Between B3.0 and B4.0, these small-item rates rose:

| Small-item rate | Sand | B3.0 | B4.0 |
|---|---|---|---|
| Intake | Dry | 60.0% | 86.7% |
| Intake | Wet | 80.0% | 86.7% |
| Transfer | Dry | 66.7% | 92.3% |
| Transfer | Wet | 75.0% | 92.3% |

### 7.3.7 Changes made on direct observation (H.6)

Five changes removed a failure that was visible on the bench and set no dimension. The video record is their justification.

| Build | Change | Problem observed | Evidence |
|---|---|---|---|
| B2.0 | Skids locked against pivoting | Free skids pivoted and blocked forward motion (P-03) | Video |
| B2.0 | Fixed brush at the handoff tried, rejected | Brush left a gap. Small and flexible items escaped (P-09). | Video |
| B4.0 | Front paddle with ratchet | Large rigid items rode the spoke tips, and flat items were pushed ahead (P-11, P-12) | Video |
| B4.0 | Skid contact area widened | Skid dug in during reverse and turns, and sand piled on it (locomotion check) | Video |
| B5.0 | Front paddle flaps replaced with rubber sheets | Front paddle jammed debris at the intake (P-20) | Video |

*Table H.7: Conveyor changes made on direct observation.*

### 7.3.8 Limitations (H.7)

The calculations rely on the 60 mm tip reach, the 40° incline and assumed sand properties. The tip reach and the incline should be checked against CAD. The report gives these further limitations:

- The digging factors and the cohesion are bracketing assumptions, not measured beach values. The loads are therefore design scenarios, not measured belt forces.
- All margins are against continuous torque. Stall torque and driver current limits were not measured.
- The speed condition in H.3 needs the carrier speed, which was not recorded. See the open item in Section 7.3.4.
- These checks support the changes between bench sessions. Report Section 4.2 gives the field performance at B5.0.

## 7.4 References

These are the report's reference numbers for the citations in this section.

- [6] N. Mitarai and F. Nori, "Wet granular materials," *Advances in Physics*, vol. 55, no. 1–2, pp. 1–45, 2006, doi: 10.1080/00018730600626065.
- [20] J. M. Hernández and M. H. Fernandes, "Lesson 2. Basic characteristics of soils and rocks," in *Fundamentals of Geotechnical Engineering*, OpenCourseWare, Univ. of the Basque Country (UPV/EHU), 2020, Table D.27. [Online]. Available: <https://ocw.ehu.eus/pluginfile.php/39477/mod_resource/content/7/OCW%20Lesson2%20Theory%20v2.pdf> (accessed Nov. 5, 2026).
- [21] A. R. Reece, "The fundamental equation of earth-moving mechanics," *Proc. Inst. Mech. Eng., Conf. Proc.*, vol. 179, no. 6, pp. 16–22, 1964, doi: 10.1243/PIME_CONF_1964_179_134_02.
- [22] E. McKyes, *Soil Cutting and Tillage* (Developments in Agricultural Engineering, vol. 7). Amsterdam, The Netherlands: Elsevier, 1985.

Source: Report References.

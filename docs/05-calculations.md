# 5. Calculations
[Contents](../README.md) · [Previous](04-development-and-tests.md) · [Next](06-conclusions.md)

## 5.1 Half-drum drive

|Input|Value|Basis|
|---|---|---|
|Drive wheel diameter $d$|64 mm ($r_w$=32 mm)|Listing|
|Motor $n$, $P_{in}$, $V$|100 rpm, 40 W, 24 V|Listing|
|Mesh radius $R$|196.5 mm|Measured|
|Contact radius $r_c$|196.5 mm|Lower bound of 196.5 to 209.5 mm|
|Loaded mass $m$|2 kg|Team estimate|
|Rocking period $T$|0.943 s|Bench video|
|Reversal time $t_r$|0.10 s worst, 0.15 s nominal|Assumed|
|Gearmotor efficiency $\eta$|0.5|Assumed|

*Table D.1: Inputs.*

|Equation|Value|
|---|---|
|$v=\pi dn/60$|0.335 m/s|
|$\omega=v/r_c$|1.71 rad/s (16.3 rpm)|
|$\omega_c=\sqrt{g/R}$|7.07 rad/s (67.5 rpm)|
|$\omega/\omega_c$|0.24|
|Stroke $\approx\omega T/2$|46° (upper bound, ignores the coast)|

*Table D.2: Speed.*

|Equation|Worst|Nominal|
|---|---|---|
|$I=mR^2$, upper bound (kg·m²)|0.0772|0.0772|
|$T_g=mgR\sin\theta$ (N·m)|3.86 (90°)|1.51 (23°)|
|$T_i=2I\omega/t_r$ (N·m)|2.63|1.76|
|$T_{drum}=T_g+T_i$ (N·m)|6.49|3.27|
|$T_m=T_{drum}r_w/r_c$ (N·m)|1.06|0.53|
|$F_t=T_{drum}/r_c$ (N)|33|16.6|

*Table D.3: Demand, without bearing and rolling resistance.*

|$\eta$|$T_{avail}=\eta P_{in}/\omega_{out}$ (N·m)|Worst margin|Nominal margin|
|---|---|---|---|
|1.0 (ceiling)|3.82|3.6|7.2|
|0.5 (assumed)|1.91|1.8|3.6|
|0.3 (pessimistic)|1.15|1.1|2.2|

*Table D.4: Motor margin, with $\omega_{out}$=10.47 rad/s.*

The worst-case margin is 1.8 at an assumed 50% efficiency. It applies to motor torque only. The friction drive also needs $\mu N\ge F_t$, so $\mu$=0.5, as an example, needs 66 N in the worst case. Input current is 1.67 A, within the driver channel rating of about 7 A.

Limitations:

- The mass is estimated, and the efficiency is assumed.
- The contact radius is a bound.
- The team did not measure grip at the contact, $\mu$ or the spring force.

Source: Report D.1 to D.6.

## 5.2 Collection unit

|Input|Value|Basis|
|---|---|---|
|Pins|2 × 10 mm stainless steel, each through two PETG parts|Supplier|
|Design payload|10 kg|D4|
|PETG part|38 × 38 mm, 22 mm along pin, 2 wall loops, 25% infill|Measured, print settings|
|PETG strength|30 MPa tensile, 17.3 MPa shear|Assumed, below typical datasheet 45–50 MPa|
|Tray|335 × 338 × 25.4 mm, 1 mm aluminium|Measured|
|V plate|2 mm acrylic, about 10°|Measured|

*Table E.1: Inputs.*

|Quantity|Value|
|---|---|
|Load per contact, $F=mg/4$|24.5 N|
|Hole crushing, lowest, $F=\sigma dt\varphi$, $\varphi$=0.35|2.29 kN|
|Pin tear-out|3.69 kN|
|Section shear|8.09 kN|
|Margin, load shared|93|
|Margin, one part takes 98.1 N|23|

*Table E.2: PETG mount failure loads.*

The report attributes the bin bending back at B3.0 to how the unit pivoted on its mount, not to mount strength.

Sand slides only when $\tan\theta>\mu$. The team did not measure $\mu$.

|Plate angle|10° (current)|20°|30°|
|---|---|---|---|
|Slides if $\mu$ is below|0.18|0.36|0.58|

*Table E.3: V plate sliding.*

Tray volume is $2.88\times10^{-3}$ m³, about 2.9 L at the brim.

Limitations:

- The PETG strength is assumed, not tested.
- The team did not test the unit with a full bin (T2).
- The empty unit mass is unknown, so the team did no lift check against a manual-handling limit.

Source: Report E.1 to E.4.

## 5.3 Conveyor

|Input|Value|Basis|
|---|---|---|
|Belt width $w$, mesh aperture|350 mm, 10 mm|Build|
|Length $L$, B1.0 / B3.0 onward|900 / 1020 mm|Build|
|Incline $\alpha$|40°|Measured|
|Pulley diameter $D$|105 mm ($r$=52.5 mm)|Build|
|Spoke pitch $p$, thickness|30 mm, 8 mm|Build|
|Spoke-tip reach|60 mm|CAD|
|Skid height $h$, B1.0 / B3.0 onward|70 / 50 mm|Build|
|Motor $n$, continuous $T$|120 rpm, 3.236 N·m|Specification|
|Drive efficiency $\eta$|0.90|Assumed|
|Damp sand density $\rho$|1900 kg/m³|Assumed [20]|
|Damp sand cohesion $c$|1 kPa nominal, 2 kPa upper|Assumed, not measured|
|Carried lift $F_0$|5 N|Assumed|

*Table H.1: Inputs.*

**Skid height.** $d=60\text{ mm}-h$ and $F_{dig}=w(\rho gd^2N_\gamma+cdN_c)$ [21], [22], with assumed $N_\gamma$=2 to 5 and $N_c$=4 to 8.

|$h$ (mm)|$d$ (mm)|$F_{dig}$, $c$=1 kPa (N)|$F_{dig}+F_0$ (N)|Sand per metre (L / kg)|
|---|---|---|---|---|
|70|−10|0|5|0|
|50 (chosen)|10|15.3 to 31.3|20.3 to 36.3|3.5 / 6.7|
|40|20|33.2 to 69.1|38.2 to 74.1|7.0 / 13.3|

*Table H.2: Digging force.*

**Scoop spokes (Table H.3).** $F_{scoop}=(L/p)V\rho g\sin\alpha$. At $V$=150 cm³, $F_{scoop}$ is 53.9 N. With $F_0$, the load is 58.9 N, or 106% of the 55.5 N capacity at 1:1. With the 31.3 N digging force, the load is 90.2 N (163%).

**Drive ratio.** $v=\pi Dn/(60i)$, $F_{cap}=Ti\eta/r$, $Fr=v^2/(gr)$. The nominal load is 36.3 N. The worst load is 130.0 N, with $d$=20 mm, $c$=2 kPa and upper factors.

|Ratio|$v$ (m/s)|Horizontal (m/s)|$F_{cap}$ (N)|Nominal margin|Worst margin|$Fr$|
|---|---|---|---|---|---|---|
|1:1|0.660|0.506|55.5|1.5|0.43|0.85|
|3:1 (chosen)|0.220|0.168|166.4|4.6|1.28|0.094|

*Table H.4: Drive ratio.*

- Torque bound: $i\ge1.25\times130.0/55.5=2.93$.
- Release bound, $Fr\le0.1$: $i\ge\sqrt{0.85/0.1}=2.92$.
- Choice: 3:1. The conveyor did not stall in the B3.0 or B4.0 bench session.

**Open item: speed check.** The horizontal belt speed must exceed the carrier speed. This document does not state that 3:1 meets this condition, because the report values do not agree:

- Pulley diameter: 105 mm (Table H.1), about 109 mm (H.3 text).
- Horizontal belt speed: 0.168 m/s at 3:1 (Table H.4), 0.23 / $i$ m/s (H.3 text).
- Carrier speed limit: about 0.15 m/s (H.3 text).
- Carrier speed: 0.21 m/s (H.3 text), not recorded (H.7).

**Length.** The 120 mm extension moves the head 92 mm rearward and 77 mm up. At 0.220 m/s, an item travels 32 mm horizontally in a 150 mm fall and 41 mm in a 255 mm fall (Table H.5).

**Mesh strip.** The clear spoke gap is 30 − 8 = 22 mm. The strip aperture is 10 mm.

Limitations:

- The tip reach and the incline should be checked against CAD.
- The digging factors and cohesion are bracketing assumptions, so the loads are design scenarios, not measured belt forces.
- All margins are against continuous torque. The team did not measure stall torque or driver current limits.

Source: Report H.1 to H.7. Citations: [Section 6.4](06-conclusions.md#64-references).

"""
Feature graphs for the ASI-301 electronics case v2 (SolidWorks, submit_feature_graph).

    python case_v2_graph.py base   -> base JSON
    python case_v2_graph.py lid    -> lid JSON
    python case_v2_graph.py check  -> expected volumes (mm^3) + key heights

Holds: Raspberry Pi 5, Arduino Mega 2560, XY160D (M3 brass standoffs on heat-set inserts)
and a 35 mm DIN rail carrying the MEAN WELL DDR-30G-5, Waveshare USB TO 2CH RS485 and the
relay module. The lid has a lip that press-fits down inside the walls (no screws).

Top view (sketch frame on the Top plane: sketch x = model X, sketch y = model -Z = REAR):

    rear wall:  battery in (behind DDR) . RS485 out (behind Waveshare)
    +-------------------------------------------------------------+
    |  [DDR-30G-5][Waveshare 2CH][relay]  .......  DIN rail       |  right wall:
    |                                                             |
    |   cable bay: USB cables Pi->Mega, Pi->Waveshare loop up     |
    |  [Pi 5     ] [Mega 2560   ]     [XY160D]->terminals ------  |   motor A, motor B,
    |   USB->rear   USB-B->rear        header faces Mega          |   limit sw, spare
    +-------------------------------------------------------------+
    front wall: finger notch for lifting the lid

All sizes in mm here; the graph is written in metres.
"""
import json
import math
import sys

# ---- parameters you are likely to change --------------------------------
STANDOFF = 10.0     # brass standoff body length
INSERT_D = 4.0      # heat-set insert hole (M3 x 5.7 x 4.6 OD inserts)
INSERT_DEPTH = 7.0
BOSS_D, BOSS_H = 8.0, 6.0          # PCB floor bosses
DIN_BOSS_D, DIN_BOSS_H = 10.0, 5.0  # DIN rail floor bosses (rail screwed on with M3 x 8 + washer)
FIT = 0.15          # lid lip clearance per side: 0.10 = tight press fit, 0.20 = easy
LIP_T, LIP_H = 2.0, 8.0

# ---- fixed geometry -------------------------------------------------------
T, FLOOR, PCB = 3.0, 3.0, 1.6
IX, IZ = 232.0, 270.0               # inner cavity
OX, OZ = IX + 2 * T, IZ + 2 * T     # 238 x 276
H = 82.0                            # base height incl. floor
XL, XR = -IX / 2, IX / 2            # inner wall faces (sketch x)
YF, YR = -IZ / 2, IZ / 2            # inner front / rear wall faces (sketch y)
PCB_BOTTOM = FLOOR + BOSS_H + STANDOFF

# Raspberry Pi 5: 85 x 56, rotated so the USB/Ethernet end faces the rear (cable bay),
# GPIO header along the left wall. Holes 3.5 in from the edges, 58 x 49 pattern.
PI_X0, PI_Y0 = XL + 5, YF + 6                      # front-left corner of the board
PI = [(PI_X0 + dx, PI_Y0 + dy) for dx in (3.5, 52.5) for dy in (3.5, 61.5)]

# Arduino Mega 2560: rotated so the USB-B end faces the rear. Board frame (bx along the
# 101.6 length from the USB edge, by across the 53.3 width) -> sketch (x0 + by, ytop - bx).
MEGA_X0 = PI_X0 + 56 + 10
MEGA_YTOP = YF + 6 + 101.6
mega = lambda bx, by: (MEGA_X0 + by, MEGA_YTOP - bx)
MEGA_SCREW = [mega(15.24, 50.8), mega(90.17, 50.8), mega(96.52, 2.54)]
MEGA_POST = mega(14.6, 2.54)                        # disputed hole: plain support post

# XY160D: 55 x 55, holes 48.6 apart. Terminals face the right wall, logic header faces the Mega.
XY_C = (MEGA_X0 + 53.3 + 22 + 27.5, YF + 40)
XY = [(XY_C[0] + sx * 24.3, XY_C[1] + sy * 24.3) for sx in (1, -1) for sy in (1, -1)]

# DIN rail along X near the rear. Modules stand 90 mm across the rail.
RAIL_Y = YR - 22 - 45                               # rear module ends leave 22 mm for wiring
RAIL_X0, RAIL_X1 = XL + 6, 60.0                     # 170 mm rail; right-rear corner kept for the E-stop
DIN_BOSS_X = [-100.0, -25.0, 50.0]                  # 75 mm apart = 3 x the 25 mm slot pitch
RIB_W, RIB_GAP = 2.0, 35.6                          # guide ribs either side of the rail
RIB_H = DIN_BOSS_H + 2.0
DDR_X, WS_X = XL + 8 + 17.5, XL + 8 + 35 + 8 + 27  # module centres (for the wall holes)

# wall openings (height = model Y from the base bottom)
HOLE_Y = 45.0
REAR = [(DDR_X, 12.0), (WS_X, 8.0)]                 # battery in, RS485 out
RIGHT = [(XY_C[1] - 18, 10.0), (XY_C[1] + 2, 10.0), (XY_C[1] + 22, 8.0), (XY_C[1] + 42, 8.0)]
# motor A, motor B, limit sw, spare  (E-stop hole removed 2 Nov 2026: box is not reachable)
VENT_W, VENT_H, VENT_Y0 = 3.0, 25.0, 30.0
LEFT_VENTS = [PI_Y0 + 12 + 9 * i for i in range(7)]
NOTCH_W, NOTCH_D = 24.0, 3.0
TAB_L, TAB_W, TAB_T, TAB_HOLE = 16.0, 22.0, 5.0, 5.5   # M5 mounting tabs
TAB_Y = [-95.0, 95.0]


def m(v):
    return round(v / 1000, 6)


def rect(x0, y0, x1, y1):
    p = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    return [{"kind": "line", "x1": m(p[i][0]), "y1": m(p[i][1]),
             "x2": m(p[(i + 1) % 4][0]), "y2": m(p[(i + 1) % 4][1])} for i in range(4)]


def circ(d, x, y):
    return {"kind": "circle", "diameter": m(d), "cx": m(x), "cy": m(y)}


def base():
    pcb = PI + MEGA_SCREW + XY
    rib_y = [RAIL_Y + s * (RIB_GAP / 2 + RIB_W / 2) for s in (1, -1)]
    tabs = []
    for sx in (1, -1):
        x0 = sx * OX / 2
        for ty in TAB_Y:
            tabs += rect(min(x0, x0 + sx * TAB_L), ty - TAB_W / 2, max(x0, x0 + sx * TAB_L), ty + TAB_W / 2)
            tabs.append(circ(TAB_HOLE, x0 + sx * TAB_L / 2, ty))
    n = [
        {"id": "outer", "type": "sketch", "ref": {"datum": "top"},
         "profile": [{"kind": "rectangle", "width": m(OX), "height": m(OZ)}]},
        {"id": "body", "type": "extrude", "sketch": "outer", "operation": "boss", "depth": m(H)},
        {"id": "cav_s", "type": "sketch", "ref": {"datum": "top", "offset": m(H)},
         "profile": [{"kind": "rectangle", "width": m(IX), "height": m(IZ)}]},
        {"id": "cavity", "type": "extrude", "sketch": "cav_s", "operation": "cut",
         "depth": m(H - FLOOR), "reversed": True},
        {"id": "round", "type": "fillet", "radius": m(3),
         "edges": [{"near": [m(sx * OX / 2), m(H / 2), m(sz * OZ / 2)]} for sx in (1, -1) for sz in (1, -1)]},
        # PCB bosses + inserts
        {"id": "boss_s", "type": "sketch", "ref": {"datum": "top", "offset": m(FLOOR)},
         "profile": [circ(BOSS_D, x, y) for x, y in pcb]},
        {"id": "boss", "type": "extrude", "sketch": "boss_s", "operation": "boss", "depth": m(BOSS_H)},
        {"id": "ins_s", "type": "sketch", "ref": {"datum": "top", "offset": m(FLOOR + BOSS_H)},
         "profile": [circ(INSERT_D, x, y) for x, y in pcb]},
        {"id": "ins", "type": "extrude", "sketch": "ins_s", "operation": "cut",
         "depth": m(INSERT_DEPTH), "reversed": True},
        {"id": "sup_s", "type": "sketch", "ref": {"datum": "top", "offset": m(FLOOR)},
         "profile": [circ(5, *MEGA_POST)]},
        {"id": "sup", "type": "extrude", "sketch": "sup_s", "operation": "boss",
         "depth": m(PCB_BOTTOM - FLOOR)},
        # DIN rail area: bosses with inserts + two guide ribs
        {"id": "din_s", "type": "sketch", "ref": {"datum": "top", "offset": m(FLOOR)},
         "profile": [circ(DIN_BOSS_D, x, RAIL_Y) for x in DIN_BOSS_X]},
        {"id": "din", "type": "extrude", "sketch": "din_s", "operation": "boss", "depth": m(DIN_BOSS_H)},
        {"id": "dini_s", "type": "sketch", "ref": {"datum": "top", "offset": m(FLOOR + DIN_BOSS_H)},
         "profile": [circ(INSERT_D, x, RAIL_Y) for x in DIN_BOSS_X]},
        {"id": "dini", "type": "extrude", "sketch": "dini_s", "operation": "cut",
         "depth": m(INSERT_DEPTH), "reversed": True},
        {"id": "rib_s", "type": "sketch", "ref": {"datum": "top", "offset": m(FLOOR)},
         "profile": sum([rect(RAIL_X0, y - RIB_W / 2, RAIL_X1, y + RIB_W / 2) for y in rib_y], [])},
        {"id": "rib", "type": "extrude", "sketch": "rib_s", "operation": "boss", "depth": m(RIB_H)},
        # rear wall: battery in, RS485 out  (front-plane sketch: x = model X, y = height)
        {"id": "rear_s", "type": "sketch", "ref": {"datum": "front", "offset": m(-(YR - 3))},
         "profile": [circ(d, x, HOLE_Y) for x, d in REAR]},
        {"id": "rear_cut", "type": "extrude", "sketch": "rear_s", "operation": "cut",
         "depth": m(10), "reversed": True},
        # right wall: motors, limit switches, spare, E-stop  (right-plane sketch x = top-sketch y)
        {"id": "right_s", "type": "sketch", "ref": {"datum": "right", "offset": m(XR - 3)},
         "profile": [circ(d, y, HOLE_Y) for y, d in RIGHT]},
        {"id": "right_cut", "type": "extrude", "sketch": "right_s", "operation": "cut", "depth": m(10)},
        # left wall vents beside the Pi
        {"id": "lv_s", "type": "sketch", "ref": {"datum": "right", "offset": m(XL + 3)},
         "profile": sum([rect(y, VENT_Y0, y + VENT_W, VENT_Y0 + VENT_H) for y in LEFT_VENTS], [])},
        {"id": "lv_cut", "type": "extrude", "sketch": "lv_s", "operation": "cut",
         "depth": m(10), "reversed": True},
        # front wall finger notch for lifting the lid
        {"id": "notch_s", "type": "sketch", "ref": {"datum": "front", "offset": m(-YF - 3)},
         "profile": rect(-NOTCH_W / 2, H - NOTCH_D, NOTCH_W / 2, H + 1)},
        {"id": "notch", "type": "extrude", "sketch": "notch_s", "operation": "cut", "depth": m(10)},
        # M5 mounting tabs on the left and right walls
        {"id": "tab_s", "type": "sketch", "ref": {"datum": "top"}, "profile": tabs},
        {"id": "tabs", "type": "extrude", "sketch": "tab_s", "operation": "boss", "depth": m(TAB_T)},
    ]
    return {"schema_version": "0.7.2-draft", "units": "meters", "nodes": n, "material": {"name": "ABS"}}


LID_T = 3.0
LV_PI = [PI_X0 + 7 + 7 * i for i in range(7)]       # lid slots over the Pi 5 cooler
LV_DIN = [XL + 10 + 7 * i for i in range(12)]       # lid slots over the DDR + Waveshare


def lid():
    lx, lz = IX - 2 * FIT, IZ - 2 * FIT
    slots = [rect(x, PI_Y0 + 15, x + 3, PI_Y0 + 70) for x in LV_PI]
    slots += [rect(x, RAIL_Y - 30, x + 3, RAIL_Y + 30) for x in LV_DIN]
    n = [
        {"id": "plate_s", "type": "sketch", "ref": {"datum": "top"},
         "profile": [{"kind": "rectangle", "width": m(OX), "height": m(OZ)}]},
        {"id": "plate", "type": "extrude", "sketch": "plate_s", "operation": "boss", "depth": m(LID_T)},
        {"id": "lround", "type": "fillet", "radius": m(3),
         "edges": [{"near": [m(sx * OX / 2), m(LID_T / 2), m(sz * OZ / 2)]} for sx in (1, -1) for sz in (1, -1)]},
        {"id": "lip_s", "type": "sketch", "ref": {"datum": "top"},
         "profile": [{"kind": "rectangle", "width": m(lx), "height": m(lz)},
                     {"kind": "rectangle", "width": m(lx - 2 * LIP_T), "height": m(lz - 2 * LIP_T)}]},
        {"id": "lip", "type": "extrude", "sketch": "lip_s", "operation": "boss",
         "depth": m(LIP_H), "reversed": True},
        {"id": "slot_s", "type": "sketch", "ref": {"datum": "top", "offset": m(LID_T)},
         "profile": sum(slots, [])},
        {"id": "slots", "type": "extrude", "sketch": "slot_s", "operation": "cut",
         "depth": m(LID_T + 1), "reversed": True},
    ]
    return {"schema_version": "0.7.2-draft", "units": "meters", "nodes": n, "material": {"name": "ABS"}}


def expected():
    a = lambda d: math.pi * d * d / 4
    fil = 9 - math.pi * 9 / 4                       # r3 corner fillet removed area
    v = OX * OZ * H - IX * IZ * (H - FLOOR) - 4 * fil * H
    pcb = len(PI) + len(MEGA_SCREW) + len(XY)
    v += pcb * (a(BOSS_D) * BOSS_H - a(INSERT_D) * INSERT_DEPTH)
    v += a(5) * (PCB_BOTTOM - FLOOR)
    v += 3 * (a(DIN_BOSS_D) * DIN_BOSS_H - a(INSERT_D) * INSERT_DEPTH)
    v += 2 * RIB_W * (RAIL_X1 - RAIL_X0) * RIB_H
    v -= sum(a(d) for _, d in REAR) * T + sum(a(d) for _, d in RIGHT) * T
    v -= len(LEFT_VENTS) * VENT_W * VENT_H * T + NOTCH_W * NOTCH_D * T
    v += 4 * (TAB_L * TAB_W - a(TAB_HOLE)) * TAB_T
    lx, lz = IX - 2 * FIT, IZ - 2 * FIT
    lv = OX * OZ * LID_T - 4 * fil * LID_T
    lv += (lx * lz - (lx - 2 * LIP_T) * (lz - 2 * LIP_T)) * LIP_H
    lv -= (len(LV_PI) * 3 * 55 + len(LV_DIN) * 3 * 60) * LID_T
    return {"outer": [OX, OZ, H], "pcb_bottom": PCB_BOTTOM, "rail_y": RAIL_Y,
            "ddr_top": FLOOR + DIN_BOSS_H + 7.5 + 54.5, "pi": PI, "mega": MEGA_SCREW, "xy": XY,
            "base_mm3": round(v), "lid_mm3": round(lv)}


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "check"
    out = {"base": base, "lid": lid}.get(what)
    print(json.dumps(out() if out else expected(), indent=None if out else 1))

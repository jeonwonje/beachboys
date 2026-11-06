"""
ASI-301 electronics case v3: laser-cut acrylic box, walls press into slots in the floor and lid.

    python case_v3_laser.py                 -> DXFs + PDF drawing, next to this script
    python case_v3_laser.py --sheet 2.92    -> other sheet thickness
    python case_v3_laser.py --kerf 0.18     -> measured kerf
    python case_v3_laser.py --press-w 0.05 --press-l -0.05  -> best slots from the fit coupon

Same cavity (232 x 270 x 79) and same board, gland and vent positions as case v2; those come
from ../Electronics_Case_v2/case_v2_graph.py so the two cannot drift apart.

Frame: x = right, y = rear, z = up, origin at the floor underside, centre of the cavity.
Panels are drawn as seen from the face that is up on the laser bed:
    floor  from above (inside face up), lid from above (outside face up)
    walls  from outside: front u=+x, rear u=-x, right u=+y, left u=-y; v = z

All geometry here is the FINISHED size. Every cut line in the DXF is offset by kerf/2, so the
laser must cut on the line with no further compensation. The PDF shows finished sizes.

Rev B, 6 Nov 2026, from the fit coupon cut at the Innovation & Design Hub (coupon cut at T = 3.00):
    best row L: between L-0.05 and L+0.00, so slot length = tab length - 0.025
    best row W: W-0.10, so the slot that fits is 2.90: sheet taken as 2.90, slot = sheet + 0
    (kerf: L near 0 means real kerf is about 0.21, so 0.20 stays)
"""
import argparse
import math
import os
import sys

sys.dont_write_bytecode = True      # no __pycache__ in the v2 folder
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "Electronics_Case_v2"))
import case_v2_graph as v2  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--sheet", type=float, default=2.90, help="sheet thickness, mm (Rev B: 2.90 from coupon W-0.10)")
ap.add_argument("--kerf", type=float, default=0.20, help="full kerf width, mm")
ap.add_argument("--press-w", type=float, default=0.0, help="floor slot width clearance, from coupon row W")
ap.add_argument("--press-l", type=float, default=-0.025, help="floor slot length clearance, from coupon row L")
ARGS = ap.parse_args() if __name__ == "__main__" else ap.parse_args([])

T = ARGS.sheet
KERF = ARGS.kerf
PRESS_W, PRESS_L = ARGS.press_w, ARGS.press_l
LID_FIT = 0.10          # lid slots, width and length, on top of the press fit: lifts off by hand
COUPON_T = 3.0          # the coupon file stays as cut, so its labels match the piece in hand
CORNER_FIT = 0.05       # finger joint clearance up the corner
WEB = 5.0               # floor/lid material outside the wall slots
TAB_L = 30.0
TAB_CHAMFER = 0.5
RELIEF = 0.35           # slot corner relief radius (drawn)

IX, IZ = v2.IX, v2.IZ
AX, AY = IX / 2, IZ / 2                 # inner wall faces
CAV_H = v2.H - v2.FLOOR                 # 79
VB, VT = T, T + CAV_H                   # floor top, lid underside
V1 = VT + T                             # lid top = overall box height
OVER_X, OVER_Y = AX + T + WEB, AY + T + WEB     # floor and lid half size
EAR_X = v2.OX / 2 + v2.TAB_L            # 135, same M5 pattern as v2
EAR_HX = v2.OX / 2 + v2.TAB_L / 2       # 127
PAD_X0 = AX + T + 1.0                   # pad inner edge, clear of the wall tabs

# Tab centres in model coordinates along each wall. Deliberately asymmetric: a panel put in
# the wrong place or inside-out does not go in (the front wall has no holes, so it may reverse).
# Bottom = 3 tabs, top = 2, so walls cannot flip. The floor and lid only fit one way round too.
TABS_BOTTOM = {"FRONT": [-80, 0, 80], "REAR": [-70, 0, 85], "RIGHT": [-100, 0, 85], "LEFT": [-75, 0, 95]}
TABS_TOP = {"FRONT": [-80, 80], "REAR": [-70, 85], "RIGHT": [-100, 85], "LEFT": [-75, 95]}
USIGN = {"FRONT": 1, "REAR": -1, "RIGHT": 1, "LEFT": -1}

GAP = 6.0               # nest spacing


# ---- geometry -------------------------------------------------------------
class Panel:
    def __init__(self, name, title, qty, outer, face):
        self.name, self.title, self.qty, self.outer, self.face = name, title, qty, outer, face
        self.holes = []     # circle / poly / slot dicts
        self.lines = []     # engrave lines
        self.texts = []     # (x, y, h, text)

    def circle(self, d, x, y, tag, note):
        self.holes.append({"k": "c", "d": d, "x": x, "y": y, "tag": tag, "note": note})

    def rect(self, x0, y0, x1, y1, r, tag, note):
        self.holes.append({"k": "p", "v": [(x0, y0, r), (x1, y0, r), (x1, y1, r), (x0, y1, r)],
                           "tag": tag, "note": note, "b": (x0, y0, x1, y1)})

    def slot(self, cx, cy, w, h, tag, note):
        self.holes.append({"k": "s", "x": cx, "y": cy, "w": w, "h": h, "tag": tag, "note": note})

    def box(self, x0, y0, x1, y1):
        self.lines += [(x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)]

    def text(self, x, y, h, s):
        self.texts.append((x, y, h, s))


def offset_poly(v, d):
    """CCW polygon of (x, y, r), edges moved outward by d, mitred; radii follow the offset."""
    out, n = [], len(v)
    for i in range(n):
        x0, y0, _ = v[i - 1]
        x1, y1, r = v[i]
        x2, y2, _ = v[(i + 1) % n]
        a, b = _unit(x1 - x0, y1 - y0), _unit(x2 - x1, y2 - y1)
        n1, n2 = (a[1], -a[0]), (b[1], -b[0])
        s = 1 + n1[0] * n2[0] + n1[1] * n2[1]
        convex = a[0] * b[1] - a[1] * b[0] > 0
        rr = 0.0 if r == 0 else max(r + d if convex else r - d, 0.0)
        out.append((x1 + d * (n1[0] + n2[0]) / s, y1 + d * (n1[1] + n2[1]) / s, rr))
    return out


def _unit(x, y):
    m = math.hypot(x, y)
    return x / m, y / m


def _ang(x, y):
    return math.degrees(math.atan2(y, x)) % 360


def poly_segs(v):
    """Vertices with radii -> LINE and ARC entities."""
    n, pts = len(v), []
    for i in range(n):
        x0, y0, _ = v[i - 1]
        x1, y1, r = v[i]
        x2, y2, _ = v[(i + 1) % n]
        a, b = _unit(x1 - x0, y1 - y0), _unit(x2 - x1, y2 - y1)
        if r <= 0:
            pts.append(((x1, y1), (x1, y1), None))
            continue
        cr = a[0] * b[1] - a[1] * b[0]
        th = math.atan2(cr, a[0] * b[0] + a[1] * b[1])
        t = r * math.tan(abs(th) / 2)
        p1 = (x1 - a[0] * t, y1 - a[1] * t)
        p2 = (x1 + b[0] * t, y1 + b[1] * t)
        s = 1 if cr > 0 else -1
        c = (p1[0] - s * a[1] * r, p1[1] + s * a[0] * r)
        s1, s2 = _ang(p1[0] - c[0], p1[1] - c[1]), _ang(p2[0] - c[0], p2[1] - c[1])
        arc = ("A", c[0], c[1], r, s1, s2) if cr > 0 else ("A", c[0], c[1], r, s2, s1)
        pts.append((p1, p2, arc))
    segs = []
    for i in range(n):
        p1, p2, arc = pts[i]
        if arc:
            segs.append(arc)
        q = pts[(i + 1) % n][0]
        if math.hypot(q[0] - p2[0], q[1] - p2[1]) > 1e-6:
            segs.append(("L", p2[0], p2[1], q[0], q[1]))
    return segs


def slot_segs(h, k):
    """Rectangular slot with round relief at each corner, so a square tab seats fully."""
    x0, x1 = h["x"] - h["w"] / 2 + k / 2, h["x"] + h["w"] / 2 - k / 2
    y0, y1 = h["y"] - h["h"] / 2 + k / 2, h["y"] + h["h"] / 2 - k / 2
    c, r, segs = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], RELIEF, []
    for i in range(4):
        p, q = c[i], c[(i + 1) % 4]
        e = _unit(q[0] - p[0], q[1] - p[1])
        a = (p[0] + e[0] * r, p[1] + e[1] * r)
        b = (q[0] - e[0] * r, q[1] - e[1] * r)
        segs.append(("L", a[0], a[1], b[0], b[1]))
        f = _unit(c[(i + 2) % 4][0] - q[0], c[(i + 2) % 4][1] - q[1])
        segs.append(("A", q[0], q[1], r, _ang(b[0] - q[0], b[1] - q[1]), _ang(f[0], f[1])))
    return segs


def panel_segs(p, k):
    """Entities for a panel. k = kerf to compensate (0 = finished size for the PDF)."""
    segs = poly_segs(offset_poly(p.outer, k / 2))
    for h in p.holes:
        if h["k"] == "c":
            segs.append(("C", h["x"], h["y"], (h["d"] - k) / 2))
        elif h["k"] == "p":
            segs += poly_segs(offset_poly(h["v"], -k / 2))
        else:
            segs += slot_segs(h, k)
    return segs


def bbox(p):
    xs, ys = [v[0] for v in p.outer], [v[1] for v in p.outer]
    return min(xs), min(ys), max(xs), max(ys)


def seg_length(segs):
    total = 0.0
    for s in segs:
        if s[0] == "L":
            total += math.hypot(s[3] - s[1], s[4] - s[2])
        elif s[0] == "A":
            total += s[3] * math.radians((s[5] - s[4]) % 360)
        else:
            total += 2 * math.pi * s[3]
    return total


# ---- panels ---------------------------------------------------------------
def rrect(x0, y0, x1, y1, r):
    return [(x0, y0, r), (x1, y0, r), (x1, y1, r), (x0, y1, r)]


def add_wall_slots(p, tabs, fit_w, fit_l, tag):
    for wall, pos in tabs.items():
        for c in pos:
            if wall in ("FRONT", "REAR"):
                y = (AY + T / 2) * (1 if wall == "REAR" else -1)
                p.slot(c, y, TAB_L + fit_l, T + fit_w, tag, wall)
            else:
                x = (AX + T / 2) * (1 if wall == "RIGHT" else -1)
                p.slot(x, c, T + fit_w, TAB_L + fit_l, tag, wall)


def floor():
    r3, r2, ox, oy = 3.0, 2.0, OVER_X, OVER_Y
    e0, e1 = v2.TAB_Y[1] - v2.TAB_W / 2, v2.TAB_Y[1] + v2.TAB_W / 2
    out = [(-ox, -oy, r3), (ox, -oy, r3),
           (ox, -e1, r2), (EAR_X, -e1, r2), (EAR_X, -e0, r2), (ox, -e0, r2),
           (ox, e0, r2), (EAR_X, e0, r2), (EAR_X, e1, r2), (ox, e1, r2),
           (ox, oy, r3), (-ox, oy, r3),
           (-ox, e1, r2), (-EAR_X, e1, r2), (-EAR_X, e0, r2), (-ox, e0, r2),
           (-ox, -e0, r2), (-EAR_X, -e0, r2), (-EAR_X, -e1, r2), (-ox, -e1, r2)]
    p = Panel("FLOOR", "floor (inside face up)", 1, out, "INSIDE FACE UP")
    for x, y in v2.PI:
        p.circle(3.2, x, y, "A", "PI 5 STANDOFF")
    for x, y in v2.MEGA_SCREW:
        p.circle(3.2, x, y, "B", "MEGA STANDOFF")
    p.circle(3.2, *v2.MEGA_POST, "B", "MEGA SUPPORT STANDOFF")
    for x, y in v2.XY:
        p.circle(3.2, x, y, "C", "XY160D STANDOFF")
    for x in v2.DIN_BOSS_X:
        p.circle(3.2, x, v2.RAIL_Y, "D", "DIN RAIL M3")
    for sx in (-1, 1):
        for y in v2.TAB_Y:
            p.circle(v2.TAB_HOLE, sx * EAR_HX, y, "E", "M5 MOUNT")
    add_wall_slots(p, TABS_BOTTOM, PRESS_W, PRESS_L, "S")
    # footprints: the laser can trace them on the floor as a placement guide
    p.box(v2.PI_X0, v2.PI_Y0, v2.PI_X0 + 56, v2.PI_Y0 + 85)
    p.text(v2.PI_X0 + 18, v2.PI_Y0 + 40, 3.5, "PI 5")
    p.box(v2.MEGA_X0, v2.MEGA_YTOP - 101.6, v2.MEGA_X0 + 53.3, v2.MEGA_YTOP)
    p.text(v2.MEGA_X0 + 12, v2.MEGA_YTOP - 62, 3.5, "MEGA 2560")
    p.box(v2.XY_C[0] - 27.5, v2.XY_C[1] - 27.5, v2.XY_C[0] + 27.5, v2.XY_C[1] + 27.5)
    p.text(v2.XY_C[0] - 11, v2.XY_C[1] - 2, 3.5, "XY160D")
    p.box(v2.RAIL_X0, v2.RAIL_Y - 17.5, v2.RAIL_X1, v2.RAIL_Y + 17.5)
    p.text(v2.RAIL_X0 + 3, v2.RAIL_Y + 19, 3.5, "DIN RAIL 35 x 170")
    p.text(-40, 6, 3.5, "FLOOR  INSIDE FACE UP  FRONT EDGE DOWN")
    return p


def lid():
    ox, oy = OVER_X, OVER_Y
    p = Panel("LID", "lid (outside face up)", 1, rrect(-ox, -oy, ox, oy, 3.0), "OUTSIDE FACE UP")
    add_wall_slots(p, TABS_TOP, PRESS_W + LID_FIT, PRESS_L + LID_FIT, "S")
    for x in v2.LV_PI:
        p.rect(x, v2.PI_Y0 + 15, x + 3, v2.PI_Y0 + 70, 0.5, "V", "VENT, PI 5 COOLER")
    for x in v2.LV_DIN:
        p.rect(x, v2.RAIL_Y - 30, x + 3, v2.RAIL_Y + 30, 0.5, "W", "VENT, DDR + WAVESHARE")
    p.text(-52, -oy + 8.5, 3.5, "LID  OUTSIDE FACE UP  FRONT THIS EDGE")
    return p


def wall(name, half, own, notch=False):
    """Outline from outside. own = which of the 5 corner zones carry a finger on this panel."""
    s = USIGN[name]
    bottom = sorted(s * c for c in TABS_BOTTOM[name])
    top = sorted((s * c for c in TABS_TOP[name]), reverse=True)
    pitch = CAV_H / 5
    edge = [VB + pitch * i for i in range(6)]
    c, L = TAB_CHAMFER, TAB_L
    xo = [half + T if i in own else half for i in range(5)]

    pts = [(-xo[0], VB)]
    for u in bottom:
        pts += [(u - L / 2, VB), (u - L / 2, c), (u - L / 2 + c, 0), (u + L / 2 - c, 0),
                (u + L / 2, c), (u + L / 2, VB)]
    pts.append((xo[0], VB))
    for i in range(4):                                      # right end, going up
        z = edge[i + 1] + (CORNER_FIT / 2 if i + 1 in own else -CORNER_FIT / 2)
        pts += [(xo[i], z), (xo[i + 1], z)]
    pts.append((xo[4], VT))
    top_items = [("t", u) for u in top] + ([("n", 0.0)] if notch else [])
    for kind, u in sorted(top_items, key=lambda it: -it[1]):
        if kind == "t":
            pts += [(u + L / 2, VT), (u + L / 2, V1 - c), (u + L / 2 - c, V1), (u - L / 2 + c, V1),
                    (u - L / 2, V1 - c), (u - L / 2, VT)]
        else:
            n = v2.NOTCH_W / 2
            pts += [(n, VT), (n, VT - v2.NOTCH_D), (-n, VT - v2.NOTCH_D), (-n, VT)]
    pts.append((-xo[4], VT))
    for i in range(3, -1, -1):                              # left end, going down
        z = edge[i + 1] + (CORNER_FIT / 2 if i + 1 in own else -CORNER_FIT / 2)
        pts += [(-xo[i + 1], z), (-xo[i], z)]
    return Panel(name, name.lower() + " wall (outside face up)", 1, [(x, y, 0.0) for x, y in pts],
                 "OUTSIDE FACE UP")


def label_hole(p, u, v, d, name):
    p.text(u - 0.31 * 3 * len(name), v + d / 2 + 1.5, 3.0, name)


def walls():
    f = wall("FRONT", AX, (0, 2, 4), notch=True)
    f.text(-40, VB + 8, 3.5, "FRONT  OUTSIDE FACE UP")

    r = wall("REAR", AX, (0, 2, 4))
    for (x, d), nm in zip(v2.REAR, ("BATTERY IN", "RS485 OUT")):
        r.circle(d, -x, v2.HOLE_Y, "G", nm)
        label_hole(r, -x, v2.HOLE_Y, d, nm)
    r.text(-40, VB + 8, 3.5, "REAR  OUTSIDE FACE UP")

    rt = wall("RIGHT", AY, (1, 3))
    for (y, d), nm in zip(v2.RIGHT, ("MOTOR A", "MOTOR B", "LIMIT SW", "SPARE")):
        rt.circle(d, y, v2.HOLE_Y, "G", nm)
        label_hole(rt, y, v2.HOLE_Y, d, nm)
    rt.text(0, VB + 8, 3.5, "RIGHT  OUTSIDE FACE UP")

    lf = wall("LEFT", AY, (1, 3))
    for y in v2.LEFT_VENTS:
        lf.rect(-y - v2.VENT_W, v2.VENT_Y0, -y, v2.VENT_Y0 + v2.VENT_H, 0.5, "V", "VENT, PI 5")
    lf.text(-40, VB + 8, 3.5, "LEFT  OUTSIDE FACE UP")
    return [f, r, lf, rt]


def pad(i):
    w, l = v2.TAB_W, EAR_X - PAD_X0
    p = Panel(f"PAD{i}", "M5 ear pad", 1, rrect(0, 0, l, w, 2.0), "ANY")
    p.circle(v2.TAB_HOLE, EAR_HX - PAD_X0, w / 2, "E", "M5 MOUNT")
    return p


def build():
    return [floor(), lid()] + walls() + [pad(i) for i in range(8)]


def coupon():
    """Row W grades slot width, row L grades slot length. Same relief as the real slots."""
    deltas = [-0.10, -0.05, 0.0, 0.05, 0.10]
    p = Panel("COUPON", "fit coupon", 1, rrect(0, 0, 160, 54, 2.0), "ANY")
    for i, dl in enumerate(deltas):
        x = 21 + 30 * i
        p.slot(x, 36, 20 + 0.30, COUPON_T + dl, "W", f"WIDTH {dl:+.2f}")
        p.slot(x, 14, 20 + dl, COUPON_T + 0.30, "L", f"LENGTH {dl:+.2f}")
        p.text(x - 7, 40, 3.0, f"W{dl:+.2f}")
        p.text(x - 7, 18, 3.0, f"L{dl:+.2f}")
    c = TAB_CHAMFER
    tabs = []
    for n in range(2):
        tabs.append(Panel(f"TAB{n}", "test tab", 1,
                          [(0, c, 0), (c, 0, 0), (20 - c, 0, 0), (20, c, 0), (20, 6, 0), (30, 6, 0),
                           (30, 20, 0), (-10, 20, 0), (-10, 6, 0), (0, 6, 0)], "ANY"))
    return p, tabs


# ---- DXF (R12, LINE/ARC/CIRCLE/TEXT, layers CUT and ENGRAVE: same as the Oct 2026 job) ----
def dxf(path, placed):
    o = ["0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1009", "9", "$INSUNITS", "70", "4", "0", "ENDSEC",
         "0", "SECTION", "2", "TABLES", "0", "TABLE", "2", "LTYPE", "70", "1", "0", "LTYPE", "2", "CONTINUOUS",
         "70", "0", "3", "Solid", "72", "65", "73", "0", "40", "0.0", "0", "ENDTAB",
         "0", "TABLE", "2", "LAYER", "70", "2",
         "0", "LAYER", "2", "CUT", "70", "0", "62", "1", "6", "CONTINUOUS",
         "0", "LAYER", "2", "ENGRAVE", "70", "0", "62", "5", "6", "CONTINUOUS",
         "0", "ENDTAB", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"]
    f = lambda v: f"{v:.4f}"
    total = 0.0
    for p, dx, dy in placed:
        segs = panel_segs(p, KERF)
        total += seg_length(segs)
        for s in segs:
            if s[0] == "L":
                o += ["0", "LINE", "8", "CUT", "10", f(s[1] + dx), "20", f(s[2] + dy), "30", "0.0",
                      "11", f(s[3] + dx), "21", f(s[4] + dy), "31", "0.0"]
            elif s[0] == "A":
                o += ["0", "ARC", "8", "CUT", "10", f(s[1] + dx), "20", f(s[2] + dy), "30", "0.0",
                      "40", f(s[3]), "50", f(s[4]), "51", f(s[5])]
            else:
                o += ["0", "CIRCLE", "8", "CUT", "10", f(s[1] + dx), "20", f(s[2] + dy), "30", "0.0", "40", f(s[3])]
        for x0, y0, x1, y1 in p.lines:
            o += ["0", "LINE", "8", "ENGRAVE", "10", f(x0 + dx), "20", f(y0 + dy), "30", "0.0",
                  "11", f(x1 + dx), "21", f(y1 + dy), "31", "0.0"]
        for x, y, h, t in p.texts:
            o += ["0", "TEXT", "8", "ENGRAVE", "10", f(x + dx), "20", f(y + dy), "30", "0.0", "40", f(h), "1", t]
    o += ["0", "ENDSEC", "0", "EOF", ""]
    with open(path, "w", newline="\r\n") as fh:
        fh.write("\n".join(o))
    return total


def nest(panels):
    """All panels on one sheet, offsets so each panel's bbox sits where it should."""
    d = {p.name: p for p in panels}
    placed, sizes = [], {}

    def put(name, x, y):
        p = d[name]
        b = bbox(p)
        # kerf grows the outline by k/2; GAP is far larger, so bbox of finished size is fine
        placed.append((p, x - b[0], y - b[1]))
        sizes[name] = (x, y, b[2] - b[0], b[3] - b[1])
        return x + b[2] - b[0] + GAP

    x = put("FLOOR", 0, 0)
    x = put("LID", x, 0)
    row1 = max(bbox(d["FLOOR"])[3] - bbox(d["FLOOR"])[1], bbox(d["LID"])[3] - bbox(d["LID"])[1]) + GAP
    x = put("LEFT", 0, row1)
    x2 = put("FRONT", x, row1)
    h = V1 + GAP
    x = put("RIGHT", 0, row1 + h)
    x2 = max(x2, put("REAR", x, row1 + h))
    col = max(x2, bbox(d["FLOOR"])[2] - bbox(d["FLOOR"])[0] + GAP + bbox(d["LID"])[2] - bbox(d["LID"])[0] + GAP)
    pad_l, pad_w = EAR_X - PAD_X0, v2.TAB_W
    for i in range(8):
        put(f"PAD{i}", col + (i % 2) * (pad_l + GAP), (i // 2) * (pad_w + GAP))
    w = max(s[0] + s[2] for s in sizes.values())
    hh = max(s[1] + s[3] for s in sizes.values())
    return placed, w, hh


# ---- PDF drawing ----------------------------------------------------------
RED, BLUE, INK = "#d62020", "#1f4fd6", "#111111"


def plot_panel(ax, p, dx=0.0, dy=0.0, lw=0.8):
    from matplotlib.patches import Arc, Circle
    for s in panel_segs(p, 0.0):
        if s[0] == "L":
            ax.plot([s[1] + dx, s[3] + dx], [s[2] + dy, s[4] + dy], color=RED, lw=lw, solid_capstyle="round")
        elif s[0] == "A":
            ax.add_patch(Arc((s[1] + dx, s[2] + dy), 2 * s[3], 2 * s[3], theta1=s[4], theta2=s[5], color=RED, lw=lw))
        else:
            ax.add_patch(Circle((s[1] + dx, s[2] + dy), s[3], fill=False, color=RED, lw=lw))
    for x0, y0, x1, y1 in p.lines:
        ax.plot([x0 + dx, x1 + dx], [y0 + dy, y1 + dy], color=BLUE, lw=0.5, ls=(0, (4, 2)))
    for x, y, h, t in p.texts:
        ax.text(x + dx, y + dy, t, color=BLUE, fontsize=h * 1.45, va="bottom", ha="left")


def dim(ax, x0, y0, x1, y1, off, text):
    """Linear dimension from (x0,y0) to (x1,y1), offset along the normal by off."""
    horiz = abs(y1 - y0) < 1e-9
    if horiz:
        y = y0 + off
        ax.plot([x0, x0], [y0, y], color=INK, lw=0.4)
        ax.plot([x1, x1], [y1, y], color=INK, lw=0.4)
        ax.annotate("", (x0, y), (x1, y), arrowprops=dict(arrowstyle="<->", lw=0.5, color=INK, shrinkA=0, shrinkB=0))
        ax.text((x0 + x1) / 2, y - 1.5 if off < 0 else y + 1.5, text, ha="center",
                va="top" if off < 0 else "bottom", fontsize=9)
    else:
        x = x0 + off
        ax.plot([x0, x], [y0, y0], color=INK, lw=0.4)
        ax.plot([x1, x], [y1, y1], color=INK, lw=0.4)
        ax.annotate("", (x, y0), (x, y1), arrowprops=dict(arrowstyle="<->", lw=0.5, color=INK, shrinkA=0, shrinkB=0))
        ax.text(x + (1.5 if off > 0 else -1.5), (y0 + y1) / 2, text, rotation=90, ha="left" if off > 0 else "right",
                va="center", fontsize=9)


def title_block(fig, rows):
    x0, y0, w, h = 0.69, 0.035, 0.285, 0.13
    fig.patches.append(__import__("matplotlib").patches.Rectangle((x0, y0), w, h, transform=fig.transFigure,
                                                                   fill=False, lw=0.8, color=INK))
    for i, (a, b) in enumerate(rows):
        y = y0 + h - 0.016 - i * (h - 0.012) / max(len(rows), 1)
        fig.text(x0 + 0.008, y, a, fontsize=7.5, va="center")
        fig.text(x0 + 0.075, y, b, fontsize=7.5, va="center")


def frame(fig):
    import matplotlib.patches as mp
    fig.patches.append(mp.Rectangle((0.02, 0.025), 0.96, 0.95, transform=fig.transFigure, fill=False, lw=0.7, color="#555555"))


def table_rows(p, b):
    rows = []
    for h in p.holes:
        if h["k"] == "c":
            rows.append((h["tag"], h["x"] - b[0], h["y"] - b[1], f"D{h['d']:.1f} THRU", h["note"]))
        elif h["k"] == "s":
            rows.append((h["tag"], h["x"] - b[0], h["y"] - b[1], f"{h['w']:.3f} x {h['h']:.3f}", "SLOT " + h["note"]))
        else:
            x0, y0, x1, y1 = h["b"]
            rows.append((h["tag"], (x0 + x1) / 2 - b[0], (y0 + y1) / 2 - b[1], f"{x1 - x0:.1f} x {y1 - y0:.1f} R0.5", h["note"]))
    return rows


def tab_rows(name, b):
    s, rows = USIGN[name], []
    for c in TABS_BOTTOM[name]:
        rows.append(("T", s * c - b[0], T / 2 - b[1], f"{TAB_L:.1f} x {T:.2f}", "BOTTOM TAB"))
    for c in TABS_TOP[name]:
        rows.append(("U", s * c - b[0], VT + T / 2 - b[1], f"{TAB_L:.1f} x {T:.2f}", "TOP TAB"))
    return rows


def draw_table(fig, rows, top=0.945):
    """Grouped hole table, monospace, down the right side."""
    x0 = 0.695
    fig.text(x0, top, f"{'TAG':<4}{'X':>8}{'Y':>9}  {'SIZE':<16}FEATURE", family="monospace", fontsize=6.6, weight="bold")
    dy = min(0.0118, (top - 0.20) / max(len(rows), 1))
    fs = min(6.6, dy * 560)
    for i, (t, x, y, sz, note) in enumerate(rows):
        fig.text(x0, top - (i + 1) * dy, f"{t:<4}{x:>8.3f}{y:>9.3f}  {sz:<16}{note}", family="monospace", fontsize=fs)


NOTES_COMMON = [
    f"1. MATERIAL: CLEAR ACRYLIC (PMMA), 3 mm NOMINAL, {T:.2f} AS TESTED. CUT ALL PANELS FROM THE COUPON'S SHEET. FILM ON.",
    f"2. DXF LAYER CUT (RED) = CUT THROUGH. LAYER ENGRAVE (BLUE) = LIGHT SURFACE ENGRAVE, OPTIONAL.",
    f"3. DXF ALREADY OFFSET FOR {KERF:.2f} mm KERF: CUT ON THE LINE, NO TOOL OFFSET. THIS DRAWING SHOWS FINISHED SIZES.",
    "4. ALL DIMENSIONS IN mm. X/Y = FEATURE CENTRE FROM DATUM 0,0 AT THE BOTTOM-LEFT CORNER. DXF GOVERNS, DO NOT SCALE.",
]


def panel_page(pdf, p, code, extra_notes, dims=None, fname=""):
    import matplotlib.pyplot as plt
    fig = plt.figure(figsize=(16.54, 11.69))
    frame(fig)
    ax = fig.add_axes([0.05, 0.19, 0.62, 0.72])
    b = bbox(p)
    plot_panel(ax, p)
    w, h = b[2] - b[0], b[3] - b[1]
    dim(ax, b[0], b[1], b[2], b[1], -0.07 * max(w, h), f"{w:.1f}")
    dim(ax, b[2], b[1], b[2], b[3], 0.06 * max(w, h), f"{h:.1f}")
    for fn in (dims or []):
        fn(ax, b)
    seen = {}
    for hl in p.holes:
        t = hl["tag"]
        if hl["k"] == "c":
            x, y, r = hl["x"], hl["y"], hl["d"] / 2
        elif hl["k"] == "s":
            if hl["h"] > hl["w"]:
                ax.text(hl["x"] + (-4.5 if hl["x"] > 0 else 2.5), hl["y"] - 3, t, fontsize=7.5, weight="bold", color=INK)
            else:
                ax.text(hl["x"] - 1.5, hl["y"] + (-6.5 if hl["y"] > 0 else 2.5), t, fontsize=7.5, weight="bold", color=INK)
            continue
        else:
            x0, y0, x1, y1 = hl["b"]
            x, y, r = (x0 + x1) / 2, y1, 0
        seen[t] = seen.get(t, 0) + 1
        if t in ("V", "W") and seen[t] > 1:
            continue
        ax.text(x + r + 0.8, y + r + 0.5, t, fontsize=7.5, weight="bold", color=INK)
    ax.plot(b[0], b[1], marker="+", color=INK, ms=7, mew=0.6)
    ax.text(b[0] - 1, b[1] - 1, "0,0", ha="right", va="top", fontsize=8)
    ax.set_aspect("equal")
    ax.axis("off")
    m = 0.11 * max(w, h)
    ax.set_xlim(b[0] - m, b[2] + m)
    ax.set_ylim(b[1] - m, b[3] + m * 0.55)
    fig.text(0.05, 0.94, f"{p.title.upper()}  -  NTS  -  DATUM 0,0 BOTTOM-LEFT", fontsize=12, weight="bold")
    rows = table_rows(p, b)
    if p.name in USIGN:
        rows = tab_rows(p.name, b) + rows
    draw_table(fig, rows)
    y = 0.155
    for n in NOTES_COMMON + extra_notes:
        fig.text(0.04, y, n, fontsize=7.8)
        y -= 0.0145
    title_block(fig, [("TITLE", "ASI-301 ELECTRONICS CASE V3 (LASER-CUT ACRYLIC)"), ("PART", p.title.upper()),
                      ("MATERIAL", f"CLEAR ACRYLIC 3 mm NOM. ({T:.2f} TESTED)"), ("QTY", str(p.qty)),
                      ("FINISH", "AS CUT, FILM ON"), ("DRAWN", "JEON WONJE  2026-11-06  REV B"), ("FILE", fname)])
    pdf.savefig(fig)
    plt.close(fig)


def outline_xy(v):
    return [(x, y) for x, y, _ in v]


def to3d(p):
    """Maps panel (u, v, depth) to model xyz."""
    n = p.name
    if n == "FLOOR":
        return lambda u, v, d: (u, v, d * T)
    if n == "LID":
        return lambda u, v, d: (u, v, VT + d * T)
    if n == "FRONT":
        return lambda u, v, d: (u, -AY - T + d * T, v)
    if n == "REAR":
        return lambda u, v, d: (-u, AY + d * T, v)
    if n == "RIGHT":
        return lambda u, v, d: (AX + d * T, u, v)
    if n == "LEFT":
        return lambda u, v, d: (-AX - T + d * T, -u, v)
    raise ValueError(n)


def overview_page(pdf, panels, placed, nest_w, nest_h, cut_m):
    import numpy as np
    import matplotlib.pyplot as plt
    from mpl_toolkits.mplot3d.art3d import Poly3DCollection
    fig = plt.figure(figsize=(16.54, 11.69))
    frame(fig)
    fig.text(0.05, 0.94, "ASI-301 ELECTRONICS CASE V3  -  EXPLODED VIEW AND SHEET LAYOUT", fontsize=12, weight="bold")

    ax = fig.add_axes([0.0, 0.33, 0.60, 0.62], projection="3d")
    shift = {"FLOOR": (0, 0, -190), "LID": (0, 0, 130), "FRONT": (0, -120, 0), "REAR": (0, 120, 0),
             "LEFT": (-120, 0, 0), "RIGHT": (120, 0, 0)}
    d = {p.name: p for p in panels}
    for nm, sh in shift.items():
        p = d[nm]
        m = to3d(p)
        outer = [(a, b) for a, b, _ in p.outer]
        for depth in (0, 1):
            pts = [tuple(np.add(m(a, b, depth), sh)) for a, b in outer]
            ax.add_collection3d(Poly3DCollection([pts], facecolor="#bfd9ee", edgecolor="#28506e", linewidth=0.45, alpha=0.30))
        for h in p.holes:
            if h["k"] == "c":
                loop = [(h["x"] + h["d"] / 2 * math.cos(t), h["y"] + h["d"] / 2 * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 24)]
            elif h["k"] == "s":
                x0, x1, y0, y1 = h["x"] - h["w"] / 2, h["x"] + h["w"] / 2, h["y"] - h["h"] / 2, h["y"] + h["h"] / 2
                loop = [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]
            else:
                x0, y0, x1, y1 = h["b"]
                loop = [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]
            pts = np.array([np.add(m(a, b, 1), sh) for a, b in loop])
            ax.plot(pts[:, 0], pts[:, 1], pts[:, 2], color="#28506e", lw=0.4)
    for nm, sh in shift.items():
        c = {"FLOOR": (0, 0, 0), "LID": (0, 0, V1), "FRONT": (0, -AY - T, V1 / 2), "REAR": (0, AY + T, V1 / 2),
             "LEFT": (-AX - T, 0, V1 / 2), "RIGHT": (AX + T, 0, V1 / 2)}[nm]
        ax.text(c[0] + sh[0], c[1] + sh[1], c[2] + sh[2] + (8 if nm != "FLOOR" else -14), nm, fontsize=9, weight="bold", ha="center")
    r = 280
    ax.set_xlim(-r, r); ax.set_ylim(-r, r); ax.set_zlim(-r * 0.85, r * 0.85)
    ax.set_box_aspect((1, 1, 0.85), zoom=1.45)
    ax.view_init(elev=30, azim=-62)
    ax.set_axis_off()

    an = fig.add_axes([0.60, 0.42, 0.38, 0.50])
    for p, dx, dy in placed:
        plot_panel(an, p, dx, dy, lw=0.5)
    an.text(nest_w / 2, nest_h + 9, f"SHEET LAYOUT  {nest_w:.0f} x {nest_h:.0f} mm (MIN. SHEET 600 x 500)", ha="center", fontsize=9, weight="bold")
    an.set_aspect("equal"); an.axis("off")
    an.set_xlim(-10, nest_w + 10); an.set_ylim(-10, nest_h + 30)

    left = [
        "ASSEMBLY",
        "1. FIT COUPON DONE, RESULT APPLIED (LAST PAGE). CUT THE PANELS FROM THE SAME SHEET.",
        "2. KEEP FILM ON UNTIL ASSEMBLY. DRY-FIT EVERYTHING BEFORE ANY CEMENT.",
        "3. JOIN THE FOUR WALLS INTO A RING AT THE CORNER FINGERS. TAB PATTERN ONLY ALLOWS ONE ORIENTATION.",
        "4. PRESS THE RING INTO THE FLOOR SLOTS. PRESS NEAR EACH TAB, EVENLY, ON A FLAT TABLE.",
        "5. WICK THIN SOLVENT ACRYLIC CEMENT INTO THE CORNERS AND SLOTS. PRESS FIT ALONE IS NOT FOR VIBRATION.",
        "6. CEMENT TWO PADS STACKED UNDER EACH M5 EAR, HOLES ALIGNED (M5 SCREW AS A GUIDE).",
        "7. LID PRESSES ON AND LIFTS OFF. NO CEMENT.",
    ]
    right = [
        "HARDWARE",
        "12 x M3 MALE-FEMALE BRASS STANDOFF 10 + 6 mm (V2 HAD 11. 12TH = MEGA SUPPORT POST)",
        "12 x M3 NUT + WASHER, UNDER THE FLOOR (STUD THROUGH THE FLOOR)",
        "3 x M3 x 8 + WASHER + NUT, DIN RAIL. HEAD IN THE RAIL, NUT UNDER THE FLOOR",
        f"4 x M5 SCREW + WIDE WASHER, EARS. GRIP = {3 * T:.1f} mm OF ACRYLIC. DO NOT OVERTIGHTEN",
        "",
        "DO NOT USE ON ACRYLIC: THREADLOCKER, SUPERGLUE, ALCOHOL OR ACETONE. THEY CRACK LASER-CUT EDGES.",
        f"CUT LENGTH {cut_m:.1f} m. BOX {2 * (AX + T):.1f} x {2 * (AY + T):.1f} x {V1:.1f} (WALLS), {2 * OVER_X:.1f} x {2 * OVER_Y:.1f} (FLOOR AND LID), {2 * EAR_X:.0f} OVER EARS.",
    ]
    y = 0.33
    for i, s in enumerate(left):
        fig.text(0.04, y - i * 0.0165, s, fontsize=8, weight="bold" if i == 0 else "normal")
    for i, s in enumerate(right):
        fig.text(0.50, y - i * 0.0165, s, fontsize=8, weight="bold" if i == 0 else "normal")
    title_block(fig, [("TITLE", "ASI-301 ELECTRONICS CASE V3 (LASER-CUT ACRYLIC)"), ("PART", "OVERVIEW (REPLACES REV A, DO NOT CUT REV A)"),
                      ("MATERIAL", f"CLEAR ACRYLIC 3 mm NOM. ({T:.2f} TESTED)"), ("QTY", "6 PANELS + 8 PADS"),
                      ("FINISH", "AS CUT, FILM ON"), ("DRAWN", "JEON WONJE  2026-11-06  REV B"),
                      ("FILE", "ASI301_case_acrylic_3mm_nest_revB.dxf")])
    pdf.savefig(fig)
    plt.close(fig)


def small_page(pdf, cp, tabs, sample_pad):
    import matplotlib.pyplot as plt
    fig = plt.figure(figsize=(16.54, 11.69))
    frame(fig)
    fig.text(0.05, 0.94, "FIT COUPON AND M5 PAD  -  NTS", fontsize=12, weight="bold")
    ax = fig.add_axes([0.05, 0.40, 0.62, 0.50])
    plot_panel(ax, cp)
    dim(ax, 0, 0, 160, 0, -7, "160.0")
    dim(ax, 160, 0, 160, 54, 7, "54.0")
    x = 0.0
    for t in tabs:
        plot_panel(ax, t, x + 12, 66)
        x += 50
    ax.text(0, 92, "TEST TABS, QTY 2: 20.0 x 3.0 TAB", fontsize=9)
    plot_panel(ax, sample_pad, 125, 66)
    b = bbox(sample_pad)
    dim(ax, 125, 66, 125 + b[2], 66, -5, f"{b[2]:.1f}")
    dim(ax, 125 + b[2], 66, 125 + b[2], 66 + b[3], 5, f"{b[3]:.1f}")
    h = sample_pad.holes[0]
    ax.text(125, 92, f"PAD QTY 8: D{h['d']:.1f}, {h['x']:.1f} FROM INNER END", fontsize=9)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_xlim(-12, 185); ax.set_ylim(-16, 100)
    fig.text(0.695, 0.94, "COUPON RESULT, 6 NOV 2026", fontsize=9, weight="bold")
    how = [
        "Best slots: L-0.05 to L+0.00, and W-0.10.",
        "",
        "Applied in Rev B:",
        f"    sheet {T:.2f}, kerf {KERF:.2f}",
        f"    floor slots {T + PRESS_W:.2f} x {TAB_L + PRESS_L:.3f}",
        f"    lid slots {T + PRESS_W + LID_FIT:.2f} x {TAB_L + PRESS_L + LID_FIT:.3f}",
        "",
        "Coupon drawn below as cut, at 3.00 nominal.",
        "Re-test on a new sheet: re-run the script with",
        "--sheet <t> --press-w <W> --press-l <L>",
        "",
        "Acrylic does not give. A fit tighter than a firm",
        "hand press cracks during assembly or later.",
    ]
    for i, s in enumerate(how):
        fig.text(0.695, 0.915 - i * 0.0185, s, fontsize=9)
    y = 0.155
    for n in NOTES_COMMON:
        fig.text(0.04, y, n, fontsize=7.8)
        y -= 0.0145
    title_block(fig, [("TITLE", "ASI-301 ELECTRONICS CASE V3 (LASER-CUT ACRYLIC)"), ("PART", "FIT COUPON, TEST TAB, PAD"),
                      ("MATERIAL", f"CLEAR ACRYLIC 3 mm NOM. ({T:.2f} TESTED)"), ("QTY", "COUPON 1, TAB 2, PAD 8"),
                      ("FINISH", "AS CUT, FILM ON"), ("DRAWN", "JEON WONJE  2026-11-06  REV B"),
                      ("FILE", "ASI301_fit_coupon_3mm.dxf")])
    pdf.savefig(fig)
    plt.close(fig)


def main():
    panels = build()
    placed, w, h = nest(panels)
    nest_path = os.path.join(HERE, "ASI301_case_acrylic_3mm_nest_revB.dxf")
    cut_mm = dxf(nest_path, placed)

    cp, tabs = coupon()
    cplace = [(cp, 0, 0), (tabs[0], 10, 60), (tabs[1], 70, 60)]
    dxf(os.path.join(HERE, "ASI301_fit_coupon_3mm.dxf"), cplace)

    import matplotlib
    matplotlib.use("Agg")
    from matplotlib.backends.backend_pdf import PdfPages
    with PdfPages(os.path.join(HERE, "ASI301_case_acrylic_3mm_revB.pdf")) as pdf:
        overview_page(pdf, panels, placed, w, h, cut_mm / 1000)
        by = {p.name: p for p in panels}
        fname = "ASI301_case_acrylic_3mm_nest_revB.dxf"
        panel_page(pdf, by["FLOOR"], "A", [
            "5. SLOTS S ARE THE WALL PRESS-FIT, SIZED FROM THE FIT COUPON: FINISHED SIZE AS TABLED, CORNER RELIEF R0.35 (DRAWN).",
            "6. ENGRAVE IS ON THE INSIDE FACE: BOARD AND DIN RAIL FOOTPRINTS. OUTSIDE CORNERS R3, EAR CORNERS R2."], fname=fname)
        panel_page(pdf, by["LID"], "B", [
            f"5. SLOTS S ARE {LID_FIT:.2f} LARGER THAN THE FLOOR SLOTS: LID LIFTS OFF BY HAND. OUTSIDE CORNERS R3."], fname=fname)
        for nm in ("FRONT", "REAR", "LEFT", "RIGHT"):
            def corner(ax, b, name=nm):
                dim(ax, b[0], VB, b[0], VT, -0.03 * (b[2] - b[0]), f"{CAV_H:.1f}")
            panel_page(pdf, by[nm], nm[0], [
                f"5. TABS T PRESS INTO THE FLOOR, TABS U INTO THE LID. TAB TIP CHAMFER {TAB_CHAMFER:.1f}.",
                f"6. CORNERS: 5 ZONES OF {CAV_H / 5:.1f}, FINGER DEPTH {T:.2f}, {CORNER_FIT:.2f} CLEARANCE UP THE CORNER. DXF GOVERNS."],
                dims=[corner], fname=fname)
        small_page(pdf, cp, tabs, by["PAD0"])
    print(f"sheet layout {w:.0f} x {h:.0f} mm, cut length {cut_mm / 1000:.2f} m, kerf {KERF}, sheet {T}")


if __name__ == "__main__":
    main()

"""Sorts the team's STEP assembly into the parts that the site animates.

    python step-to-parts.py <assembly.step> <parts.glb>

Needs cascadio, numpy and trimesh. The output keeps only names made by the rules
below, in the form <part>__<paint>. CAD part names do not reach the site.

The CAD frame has Z up and Y across the machine. The site has Y up, so a point
(x, y, z) in CAD becomes (x, z, -y) here.
"""
import json
import re
import struct
import sys
import tempfile
from collections import defaultdict
from pathlib import Path

import cascadio
import numpy as np
import trimesh

# Axles in site coordinates (x, y). Spinning parts are baked around these.
SPIN = {
    "c_spr_head": (0.256, 0.447),
    "c_spr_mid": (0.483, 0.184),
    "c_spr_tail": (0.764, -0.143),
    "c_paddle_spin": (0.940, -0.132),
    "k_wheel_fl": (0.225, -0.068),
    "k_wheel_fr": (0.225, -0.068),
    "k_wheel_rl": (-0.225, -0.068),
    "k_wheel_rr": (-0.225, -0.068),
}
# Belt frame: u runs downhill along the belt, n is the outward normal.
BELT_U = np.array([0.6519, -0.7583])
BELT_U /= np.linalg.norm(BELT_U)
BELT_N = np.array([-BELT_U[1], BELT_U[0]])
BELT_NC = 0.49

CAD_TO_SITE = np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, -1, 0, 0], [0, 0, 0, 1]], dtype=float)


def read_glb(path):
    data = Path(path).read_bytes()
    json_len = struct.unpack("<I", data[12:16])[0]
    doc = json.loads(data[20:20 + json_len])
    binary = data[20 + json_len + 8:]
    kinds = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
    sizes = {"SCALAR": 1, "VEC3": 3}

    def accessor(i):
        a = doc["accessors"][i]
        view = doc["bufferViews"][a["bufferView"]]
        start = view.get("byteOffset", 0) + a.get("byteOffset", 0)
        return np.frombuffer(binary, kinds[a["componentType"]], a["count"] * sizes[a["type"]], start).reshape(-1, sizes[a["type"]])

    return doc, accessor


def node_matrix(n):
    if "matrix" in n:
        return np.array(n["matrix"], dtype=float).reshape(4, 4).T
    return np.eye(4)


def spin_of(centre):
    """Which sprocket axle is this part on?"""
    best, dist = None, 1e9
    for key in ("c_spr_head", "c_spr_mid", "c_spr_tail"):
        d = np.hypot(centre[0] - SPIN[key][0], centre[1] - SPIN[key][1])
        if d < dist:
            best, dist = key, d
    return best


def classify(path, name, centre, mat):
    """Returns (part, paint), or None for a spoke row, which is handled apart."""
    p = " / ".join(path)
    if "Sodium-ion battery" in p:
        return "e_battery", "battery"
    if "Electronics Case" in p:
        if re.search(r"Case_v3_(Floor|Lid|Wall)", name):
            return "e_case", "acrylic"
        if "Case_v3_Pads" in name:
            return "e_boards", "black"
        if "standoff" in name:
            # One standoff sits far outside the case in the CAD. Leave it out.
            return ("e_boards", "brass") if abs(centre[2]) < 0.25 else ("skip", "")
        if "Raspberry Pi" in name or "Arduino" in name or "Waveshare" in name or "XY160D" in name or "Relay" in name:
            return "e_boards", "pcb"
        if "DIN rail" in name:
            return "e_boards", "alu"
        return "e_boards", "graphite"
    if "Coppernicus-battery" in p:
        return "k_body", "graphite"
    if "wheel group" in p:
        key = f"k_wheel_{'f' if centre[0] > 0 else 'r'}{'r' if centre[2] > 0 else 'l'}"
        if re.match(r"wheel v", name):
            return key, "rubber"
        return key, "hub"
    if "sheet metal cover" in name:
        return "k_body", "orange"
    if "compartment" in name:
        return "k_body", "graphite"
    if "Profile-4040" in name:
        return "k_spine", "black"
    if "bin assembly" in p:
        if "collection bin mesh" in name:
            return "b_bin", "binmesh"
        if "sand collection plate" in name:
            return "b_tray", "steel"
        if "back pin mount" in name:
            return "b_pins", "blue"
        return "b_frame", "alu"
    if "u-plate assembly" in p:
        if "rim mesh" in name:
            return "d_drum", "screen"
        if "trommel drum" in p:
            return "d_drum", "rim"
        if re.search(r"v plate v12", name):
            return "b_vplate", "acrylic"
        if "plate mount" in name or "v plate clamp" in name:
            return "b_vplate", "blue"
        if "motor mounted" in p:
            if "Inline Skate" in p:
                return "d_drive", "white" if mat == 9 else "steel"
            if "GPG24V" in name:
                return "d_drive", "graphite"
            if "motor mount" in name:
                return "d_drive", "blue"
            return "d_drive", "alu"
        if "castor" in p:
            if "bearing mount" in name:
                return "d_wheels", "blue"
            return "d_wheels", "white" if mat == 9 else "steel"
        if "40_to_30" in name:
            return "d_frame", "blue"
        return "d_frame", "alu"
    if "Conveyor assembly" in p:
        if "Spokes:" in p:
            return None
        if re.match(r"Mesh", name):
            return "c_belt", "belt"
        if "square panel" in name:
            return "c_guard", "acrylic"
        if "Skids" in p:
            return "c_skid", "blue" if "mount" in name else "steel"
        if "rubber sheet" in name:
            return "c_paddle_spin", "teal"
        if "rotating 4 side" in name:
            return "c_paddle_spin", "black"
        if "unit axle" in name and centre[0] > 0.8:
            return "c_paddle_spin", "steel"
        if "hood arm" in name:
            return "c_paddle", "alu"
        if "ratchet" in p:
            return "c_paddle", "black"
        if "sproket" in name:
            return spin_of(centre), "blue"
        if "axle" in name:
            return spin_of(centre), "steel"
        if "GPG24V" in name:
            return "c_drive", "graphite"
        if "P30S5M" in p:
            return "c_drive", "black"
        if re.search(r"Drive shaft mount|Motor mount v3|Bearing retainer|GFM|Drive pulley", name):
            return "c_drive", "black"
        if "middle support" in name:
            return "c_frame", "black"
        if re.search(r"3030 Hinge|2020 Hinge|Conveyer-chassis lock", p):
            return "c_mount", "yellow"
        if "3030" in name:
            return "c_mount", "alu"
        return "c_frame", "alu"
    return "k_body", "graphite"


def main(step, out):
    with tempfile.TemporaryDirectory() as tmp:
        raw = f"{tmp}/raw.glb"
        cascadio.step_to_glb(step, raw, tol_linear=0.5, tol_angular=0.6)
        doc, accessor = read_glb(raw)

        buckets = defaultdict(lambda: ([], []))
        rows = defaultdict(list)
        unknown = 0

        def add(key, v, f):
            verts, faces = buckets[key]
            base = sum(len(x) for x in verts)
            verts.append(v)
            faces.append(f + base)

        def walk(i, parent, path):
            nonlocal unknown
            n = doc["nodes"][i]
            world = parent @ node_matrix(n)
            name = n.get("name", "")
            here = path + [name]
            if "mesh" in n:
                for prim in doc["meshes"][n["mesh"]]["primitives"]:
                    pos = accessor(prim["attributes"]["POSITION"]).astype(float)
                    idx = accessor(prim["indices"]).astype(np.int64).reshape(-1, 3)
                    v = (np.c_[pos, np.ones(len(pos))] @ world.T)[:, :3]
                    mat = prim.get("material", 0)
                    centre = (v.min(0) + v.max(0)) / 2
                    got = classify(path, name, centre, mat)
                    if got is None:
                        row = next(x for x in here if x.startswith("spokes"))
                        rows[row].append((name, mat, v, idx))
                        continue
                    part, paint = got
                    if part == "skip":
                        continue
                    if part in SPIN:
                        v = v - np.array([SPIN[part][0], SPIN[part][1], 0])
                    add(f"{part}__{paint}", v, idx)
            for c in n.get("children", []):
                walk(c, world, here)

        for r in doc["scenes"][0]["nodes"]:
            walk(r, CAD_TO_SITE, [])

        # One spoke row becomes the template. Choose the row nearest the middle
        # of the top run, and store it in belt coordinates.
        def row_un(items):
            v = np.vstack([x[2] for x in items])
            c = (v.min(0) + v.max(0)) / 2
            return c[:2] @ BELT_U, c[:2] @ BELT_N

        top = {k: row_un(x) for k, x in rows.items()}
        print("spoke rows (u, n):", {k[-2:]: (round(a, 3), round(b, 3)) for k, (a, b) in top.items()})
        chosen = min((k for k, (u, n) in top.items() if n > BELT_NC), key=lambda k: abs(top[k][0] - 0.215))
        u0 = top[chosen][0]
        for name, mat, v, idx in rows[chosen]:
            local = np.c_[v[:, :2] @ BELT_U - u0, v[:, :2] @ BELT_N - BELT_NC, v[:, 2]]
            # The holder spans the belt. The tines are the short parts.
            add(f"c_spoke__{'yellow' if np.ptp(local[:, 2]) > 0.2 else 'black'}", local, idx)

        scene = trimesh.Scene()
        for key, (verts, faces) in sorted(buckets.items()):
            mesh = trimesh.Trimesh(np.vstack(verts), np.vstack(faces), process=False)
            scene.add_geometry(mesh, node_name=key, geom_name=key)
            print(f"{key:24s} {len(mesh.faces):7d} min {np.round(mesh.bounds[0], 3)} max {np.round(mesh.bounds[1], 3)}")
        print("total tris", sum(len(np.vstack(f)) for _, f in buckets.values()), "| ground", min(m.bounds[0][1] for k, m in scene.geometry.items() if k.startswith("k_wheel") is False))
        scene.export(out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

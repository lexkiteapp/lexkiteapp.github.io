#!/usr/bin/env python3
"""Chọn đích iOS Simulator từ output `xcodebuild -showdestinations` (stdin) → in 'platform=iOS Simulator,id=…'.
Ưu tiên iPhone 17 > 16 > 15 (khung 390 pt cho snapshot), cùng tên thì runtime iOS cao nhất. Không có → in rỗng.
Dùng bởi .github/workflows/native-ios.yml; test: scripts/test/native-pick-sim.mjs."""
import re, sys

PREF = ["iPhone 17", "iPhone 16", "iPhone 15"]

def pick(text):
    best = None
    for m in re.finditer(r"\{\s*platform:iOS Simulator,[^}]*?id:([0-9A-F-]{36}),\s*OS:([\d.]+),\s*name:([^}]+?)\s*\}", text):
        dev, os_, name = m.group(1), tuple(int(x) for x in m.group(2).split(".")), m.group(3).strip()
        if name not in PREF:
            continue
        key = (-PREF.index(name), os_)
        if best is None or key > best[0]:
            best = (key, dev)
    return f"platform=iOS Simulator,id={best[1]}" if best else ""

if __name__ == "__main__":
    print(pick(sys.stdin.read()))

#!/usr/bin/env python3
"""PACHI ATLAS catalog consistency tests. No external requests."""
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse
ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / "machines.json").read_text(encoding="utf-8"))
html = (ROOT / "index.html").read_text(encoding="utf-8")
ui = (ROOT / "ui.js").read_text(encoding="utf-8")
engine = (ROOT / "engine.js").read_text(encoding="utf-8")
n=0
def check(condition, message):
    global n
    n+=1
    if not condition:
        raise AssertionError(message)
machines=data["machines"]
check(len(machines)>=10, "too few machines")
check(data["schemaVersion"]==1,"schemaVersion changed without migration")
check(isinstance(data.get("updates"),list),"global changelog missing")
check(len(set(m["id"] for m in machines))==len(machines),"duplicate machine ID")
check(len(set(re.sub(r"\s+","",m["name"]) for m in machines))==len(machines),"duplicate machine name")
check(all(m["id"] and re.fullmatch(r"[a-z0-9-]+",m["id"]) for m in machines),"bad id")
check(all(m["type"] in ("slot","pachinko") for m in machines),"unknown type")
check(all(m["releaseStatus"] in ("released","upcoming") for m in machines),"unknown releaseStatus")
check(all(m["specStatus"] in ("pending","verified_basic","verified_with_approximate_distribution") for m in machines),"unknown specStatus")
check(all(m["name"] and m["manufacturer"] for m in machines),"missing machine name/manufacturer")
check(all(m.get("lastVerified") for m in machines),"missing verified date")
check(all(isinstance(m.get("sources"),list) and m["sources"] for m in machines),"machine without source")
check(all(all(urlparse(u).scheme=="https" and urlparse(u).netloc for u in m["sources"]) for m in machines),"insecure source")
check(all(m["introduction"] is None or date.fromisoformat(m["introduction"]) for m in machines),"invalid introduction")
check(all(m.get("simulator") in ("garo12","machine") for m in machines),"each machine needs a simulator")
check(all(isinstance(m.get("simProfile"),dict) for m in machines),"missing machine simulation profile")
check(all(m["simProfile"].get("confidence")!="demo_only" or m["simProfile"].get("normalOdds") is None for m in machines),"demo odds marked as known")
check(all(isinstance(m.get("updates"),list) and m["updates"] for m in machines),"missing machine history")
check(sum(m["type"]=="slot" for m in machines)>0 and sum(m["type"]=="pachinko" for m in machines)>0,"missing category")
check("GARO12" in engine and "slotCeiling" in engine and "ltEntryPct" in engine,"probability engine missing")
check("id=\"slot-config\"" in html and "id=\"custom-config\"" in html and "id=\"machine-selected\"" in html,"config panels missing")
check("src=\"./engine.js\"" in html and "src=\"./ui.js\"" in html and "src=\"./machine-engine.js\"" in html,"scripts not imported")
check("<meta name=\"description\"" in html and "<meta name=\"viewport\"" in html,"site meta missing")
references = set(re.findall(r'\$\("([a-z0-9-]+)"\)',ui))
elements = set(re.findall(r'\bid="([a-z0-9-]+)"',html))
check(not (references-elements), "JS references missing elements: "+repr(references-elements))
for path in ("../index.html","../simulator.html","../privacy.html"):
    check((ROOT/path).exists(),"broken cross-site link: "+path)
g=next(m for m in machines if m["id"]=="e-garo12")["spec"]
check(abs(1/g["normalSymbolOdds"]+1/g["normalChargeOdds"]-1/349.99)<0.000001,"GARO combination inconsistent")
check(abs(g["rush7500Probability"]+g["rush1500ContinueProbability"]+g["rush1500EndProbability"]-1)<1e-9,"GARO LT allocation != 100%")
god=next(m for m in machines if m["id"]=="l-million-god-trajectory")["spec"]
check(len(god["firstHitOdds"])==len(god["payoutRate"])==6,"GOD settings length mismatch")
check(len([m for m in machines if m.get("introduction")=="2026-11-02"])==20,"Nov 2 has 20 machine entries")
check(len([m for m in machines if m.get("introduction")=="2026-11-02" and (m["simProfile"].get("normalOdds") or m["simProfile"].get("roleOdds"))])==20,"Nov 2 odds/role odds missing")
check((ROOT / "machine-detail.js").exists(), "shared detail JS missing")
check((ROOT / "machine-detail.css").exists(), "shared detail CSS missing")
check((ROOT / "generate-machine-pages.js").exists(), "static page generator missing")
check(all((ROOT / "m" / (m["id"]+".html")).exists() for m in machines),"missing standalone machine pages")
check("href=\"./m/" in ui, "machine entries not linked to standalone pages")
check('id="detail"' not in html, "obsolete inline detail still on homepage")
print(f"PASS: {n} catalog and link checks on {len(machines)} machine records")

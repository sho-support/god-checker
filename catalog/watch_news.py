#!/usr/bin/env python3
"""Scheduled RSS research lead collector. Never changes machine specs."""
import json,hashlib,re,sys
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import quote
from urllib.request import Request,urlopen
from xml.etree import ElementTree
p=Path(__file__).with_name("discovered.json")
existing=json.loads(p.read_text(encoding="utf-8")) if p.exists() else {"items":[]}
seen={x["id"]:x for x in existing.get("items",[]) if x.get("id")}
new=0
for q in ["スマスロ 新機種 発表","パチンコ 新台 メーカー 発表","パチスロ 導入 新台"]:
    url="https://news.google.com/rss/search?q="+quote(q)+"&hl=ja&gl=JP&ceid=JP%3Aja"
    try:
        req=Request(url,headers={"User-Agent":"PachiAtlasNewsResearch/1.0"})
        with urlopen(req,timeout=12) as r:
            if r.status!=200:raise ValueError("HTTP status "+str(r.status))
            raw=r.read(1000000)
        for item in ElementTree.fromstring(raw).findall(".//channel/item"):
            title=(item.findtext("title") or "").strip()
            link=(item.findtext("link") or "").strip()
            if not re.search("スマスロ|パチンコ|パチスロ|新台|新機種",title) or not link.startswith("https://"):continue
            key=hashlib.sha256(link.encode()).hexdigest()[:20]
            if key not in seen:
                seen[key]={"id":key,"title":title[:180],"url":link,"published":(item.findtext("pubDate") or "")[:50],"status":"review_required"}
                new+=1
    except Exception as e:
        print("RSS unavailable:",q,str(e),file=sys.stderr)
if new:
    result={"lastChecked":datetime.now(timezone.utc).isoformat(),"note":"機種の追加候補。機種名・確率・導入日は一次情報を検証するまで公開しない。","items":list(seen.values())[-180:]}
    p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("New discovery candidates:",new)

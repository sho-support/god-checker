#!/usr/bin/env node
"use strict";
/* Generate one navigable, indexable HTML file per registered machine.
 * usage: node catalog/generate-machine-pages.js [--check]
 * Update machines.json, regenerate, then commit the changed files.
 */
const fs=require("node:fs"),path=require("node:path");
const esc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const fmt=n=>Number(n).toLocaleString("ja-JP");
const root=__dirname;
const machineDB=JSON.parse(fs.readFileSync(path.join(root,"machines.json"),"utf8"));
const pageDir=path.join(root,"m");
const sections=[
 ["basic","基本情報・スペック"],
 ["system","ゲーム性・RUSH／AT"],
 ["ceiling","天井・朝一・やめどき"],
 ["settings","設定差・設定判別"],
 ["sim","確率シミュレーター"],
 ["updates","機種別の更新履歴"],
 ["sources","出典・注意事項"]
];
function kv(label,value){return '<div class="spec-row"><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>'}
function box(message){return '<p class="info-muted">'+esc(message)+'</p>'}
function specs(m){
 const p=m.simProfile||{},s=m.spec||{};let rows=[];
 if(m.id==="e-garo12"){
  rows=[["図柄揃い確率","1/"+s.normalSymbolOdds],["ガロチャージ確率","1/"+s.normalChargeOdds],["初当たり払出し",s.normalSymbolPayout+"個"],["チャージ払出し",s.normalChargePayout+"個"],["7500バトル突入率",(s.challengeEntryProbability*100)+"%"],["7500バトル突破率",(s.challengeWinProbability*100)+"%"]];
 }else if(p.kind==="hane"){
  rows=[["役物内V入賞率","約1/"+p.roleOdds],["抽選の単位",p.roleBasis||"羽根に拾われた後の役物試行"]];
  if(p.payouts)rows.push(["役物入賞後の払出し",p.payouts.map(x=>Math.round(x.p*1000)/10+"%："+fmt(x.payout)+"個").join(" / ")]);
 }else{
  if(p.normalOdds)rows.push([m.type==="slot"?(p.hitKind||"初当たり")+"確率（設定1）":"通常時の図柄揃い確率","1/"+p.normalOdds]);
  if(p.entryPct!=null)rows.push(["RUSH・ST突入率（公表値を簡略化）","約"+p.entryPct+"%"]);
  if(p.firstPayout!=null)rows.push(["初当たり代表払出し",fmt(p.firstPayout)+"個"]);
  if(p.stGames)rows.push(["ST回数",p.stGames+"回"+(p.reserveGames?"＋残保留"+p.reserveGames+"個":"")]);
  if(p.rightOdds)rows.push(["右打ちの当選確率","約1/"+p.rightOdds]);
  if(p.rushContinuationPct)rows.push(["RUSH公表継続率","約"+p.rushContinuationPct+"%（抽選は近似）"]);
  if(s.firstHitOdds&&m.id==="l-million-god-trajectory")rows.push(["設定1のGG初当たり","1/"+s.firstHitOdds[0]]);
 }
 let notice=p.confidence==="demo_only"?"機種固有の初当たり確率は未検証です。シミュレーターは仮の分母で開始します。":(p.notes||"詳細な抽選仕様の一部は未確認です。");
 return (rows.length?'<dl class="spec-table">'+rows.map(r=>kv(...r)).join("")+'</dl>':box("公表確率を照合中です。確認できた項目から掲載します。"))+
  '<p class="info-muted">'+esc(notice)+'</p>';
}
function system(m){
 const p=m.simProfile||{},a=[];
 if(p.kind==="hane")a.push("羽根物：役物に拾われた後のV入賞率で抽選する構造です。盤面の拾い率は実機や釘調整で変わります。");
 if(p.kind==="st")a.push("ST・RUSHタイプ。"+(p.stGames?"継続抽選はST"+p.stGames+"回"+(p.reserveGames?"＋残保留"+p.reserveGames+"個":"")+"。":""));
 if(p.kind==="slot")a.push("パチスロ。登録している値は"+(p.hitKind||"初当たり")+"の確率です。CZ・AT中の抽選構造とは別です。");
 if(p.kind==="garo12")a.push("図柄揃い、ガロチャージ、7500バトル、魔戒CHANCE LTを区別するスペックです。");
 if(p.rushPayoutDistribution)a.push("右打ちの払出し振り分け："+p.rushPayoutDistribution.map(x=>x.p+"%："+fmt(x.payout)+"個").join("、"));
 if(p.notes)a.push(p.notes);
 if(!a.length)a.push("ゲーム性・モード移行の詳細は確認中です。未確認の当選振り分けは掲載しません。");
 return '<div class="paragraph-stack">'+a.map(x=>"<p>"+esc(x)+"</p>").join("")+"</div>";
}
function ceiling(m){
 const a=m.analysis||{},s=m.spec||{};
 const rows=[];
 if(a.ceiling)rows.push(["天井",a.ceiling]);
 else if(m.id==="l-million-god-trajectory"&&s.ceiling)rows.push(["天井（要最新照合）",s.ceiling]);
 if(a.reset)rows.push(["設定変更・リセット",a.reset]);
 if(a.notes)rows.push(["補足",a.notes]);
 if(!rows.length)return box("天井・朝一・やめどきに関する確定情報は現在確認中です。未検証の狙い目や勝率は掲載しません。");
 return '<dl class="spec-table">'+rows.map(x=>kv(...x)).join("")+'</dl>'+box("やめどき・天井の条件は状態で変わる場合があります。最新の公式・解析資料を確認してください。");
}
function settings(m){
 const p=m.simProfile||{},s=m.spec||{},odds=p.settingOdds||s.firstHitOdds;
 if(!Array.isArray(odds)||odds.length!==6)return box("設定別初当たり確率・設定示唆演出は現在確認中です。確定前の解析値を推測で掲載しません。");
 return '<dl class="spec-table">'+odds.map((v,i)=>kv("設定"+(i+1)+" "+(p.hitKind||"初当たり"),"1/"+v+(s.payoutRate?" ／ 出玉率"+s.payoutRate[i]+"%":""))).join("")+'</dl>'+
 box("上記は掲載元で確認できた数値です。確率だけで設定を確定することはできません。");
}
function simulator(m){
 const p=m.simProfile||{},verified=p.kind==="garo12"||p.kind==="hane"||p.normalOdds>0;
 return '<p class="info-muted">ゲームの内部プログラムではなく、登録済みの数値による疑似抽選です。'+(verified?"特殊な振り分け・状態移行は未再現の箇所があります。":"初当たり確率は未確認のため、仮の分母で開始します。")+'</p>'+
 '<div id="machine-sim-app" class="sim-app" data-simulator="'+esc(m.simulator||"machine")+'">'+
 '<div class="sim-app-top"><span class="sim-phase" id="sim-phase">通常</span><span id="sim-remain" class="sim-remain"></span></div>'+
 '<div class="sim-options"><label id="sim-odds-wrap"><span>初当たり分母（1/）</span><input id="sim-odds" type="number" min="1" max="10000000" step="any"></label><label id="sim-setting-wrap" hidden><span>設定</span><select id="sim-setting">'+Array.from({length:6},(_,i)=>'<option value="'+i+'">設定'+(i+1)+'</option>').join("")+'</select></label></div>'+
 '<div class="sim-stat-grid">'+
 ['総試行','通常試行','現在のハマり','最大ハマり','当たり','払出し（玉・枚）'].map((label,i)=>'<div class="sim-stat"><span id="sim-lab-'+i+'">'+label+'</span><strong id="sim-num-'+i+'">0</strong></div>').join("")+'</div>'+
 '<div class="sim-actions">'+[['spin-one','1回'],['spin-100','100回'],['spin-1000','1,000回'],['spin-10000','10,000回'],['spin-auto','オート開始'],['spin-reset','リセット']].map(x=>'<button type="button" id="'+x[0]+'">'+x[1]+'</button>').join("")+'</div>'+
 '<div id="sim-error" class="sim-error" role="alert" aria-live="polite"></div>'+
 '<h4>抽選履歴</h4><div id="sim-log" class="sim-log" aria-live="polite">まだ抽選していません。</div>'+
 '</div>';
}
function updates(m){return '<div class="machine-timeline">'+(m.updates||[]).map(x=>'<article><time datetime="'+esc(x.date)+'">'+esc(x.date.replaceAll("-","/"))+'</time><p>'+esc(x.message)+'</p></article>').join("")+'</div>'}
function sources(m){
 const all=[...(m.sources||[]),m.simProfile?.source,m.analysis?.source].filter(x=>typeof x==="string"&&/^https:\/\//i.test(x));
 const unique=[...new Set(all)];
 return '<ul class="source-list">'+unique.map(x=>'<li><a href="'+esc(x)+'" rel="noopener noreferrer" target="_blank">'+esc(x)+'</a></li>').join("")+'</ul>'+
 '<p class="info-muted">情報確認：'+esc(m.lastVerified||"未確認")+'。出典に記載された情報と、実機のすべての挙動が一致することを保証するものではありません。未確認の数値は仮設定として扱います。</p>';
}
const bodies={basic:specs,system,ceiling,settings,sim:simulator,updates,sources};
function render(m){
 if(!/^[a-z0-9-]+$/.test(m.id))throw Error("Invalid machine id: "+m.id);
 const p=m.simProfile||{};
 const kind=m.type==="slot"?"パチスロ":"パチンコ",title=m.name+"｜スペック・解析情報｜PACHI ATLAS";
 const summary=m.name+"の基本スペック、導入日、設定差、天井、RUSH・AT情報、更新履歴と疑似抽選シミュレーター。";
 const home="../";
 const dataStatus=p.confidence==="demo_only"?"機種固有の確率は確認中":p.kind==="garo12"?"専用抽選モデル対応":"基本確率掲載・特殊抽選は簡略化";
 const toc=sections.map(([id,label],i)=>'<a href="#section-'+id+'" data-target="section-'+id+'"><span class="toc-num">'+(i+1)+'</span>'+esc(label)+'</a>').join("");
 const accordions=sections.map(([id,label])=>'<details id="section-'+id+'" class="machine-accordion"><summary><span>'+esc(label)+'</span><span class="acc-state" aria-hidden="true"></span></summary><div class="accordion-content">'+bodies[id](m)+'<div class="close-row"><button type="button" class="close-section" data-close="'+id+'">この項目を閉じる <span aria-hidden="true">×</span></button></div></div></details>').join("");
 const intro=m.introduction?esc(m.introduction.replaceAll("-","/")):"確認中";
 return '<!doctype html>\n<html lang="ja">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
 '<meta name="description" content="'+esc(summary)+'"><meta name="theme-color" content="#13283b">'+
 '<link rel="canonical" href="https://sho-support.github.io/god-checker/catalog/m/'+esc(m.id)+'.html"><title>'+esc(title)+'</title>'+
 '<link rel="stylesheet" href="../site.css"><link rel="stylesheet" href="../machine-detail.css"></head>\n'+
 '<body id="top" data-machine-id="'+esc(m.id)+'"><header class="site-header"><div class="wrap machine-header"><a href="../" class="brand"><span class="brand-mark">P</span><span class="brand-stack"><strong>PACHI ATLAS</strong><small>パチンコ・パチスロ機種情報</small></span></a><a class="return-link" href="../">機種一覧に戻る</a></div></header>'+
 '<main class="wrap machine-main"><nav class="breadcrumbs" aria-label="パンくず"><a href="../">機種一覧</a><span aria-hidden="true"> › </span>'+esc(m.name)+'</nav>'+
 '<div class="machine-title-panel"><div class="machine-meta"><span class="machine-type">'+kind+'</span><span class="machine-verification">'+esc(dataStatus)+'</span></div><h1>'+esc(m.name)+'</h1><div class="machine-subline"><span>メーカー：'+esc(m.manufacturer)+'</span><span>導入日：'+intro+'</span></div></div>'+
 '<nav class="machine-toc" aria-label="この機種の目次"><h2>目次</h2><div class="toc-links">'+toc+'</div><p>項目を押すと内容が開き、その位置に移動します。</p></nav>'+
 '<div class="machine-accordions">'+accordions+'</div>'+
 '<div class="machine-bottom-nav"><a href="../">機種一覧に戻る</a><a href="#top" id="page-top">ページの先頭へ戻る</a></div>'+
 '</main><footer><div class="wrap">PACHI ATLAS｜非公式の機種情報・解析サイト。掲載数値を利用した疑似抽選は遊技結果を保証しません。 <a href="../../privacy.html">プライバシーポリシー</a></div></footer>'+
 '<script defer src="../engine.js"></script><script defer src="../machine-engine.js"></script><script defer src="../machine-detail.js"></script>'+
 '</body></html>\n';
}
if(typeof module!=="undefined")module.exports={render,sections};
if(typeof require!=="undefined"&&require.main===module){
 const check=process.argv.includes("--check");
 if(!check)fs.mkdirSync(pageDir,{recursive:true});
 let fails=0;
 for(const m of machineDB.machines){
   const dest=path.join(pageDir,m.id+".html"),expected=render(m);
   if(check){
     if(!fs.existsSync(dest)||fs.readFileSync(dest,"utf8")!==expected){console.error("Outdated page:",m.id);fails++}
   }else fs.writeFileSync(dest,expected,"utf8");
 }
 if(check&&fails)process.exitCode=1;
 else console.log((check?"Verified ":"Generated ")+machineDB.machines.length+" machine pages.");
}

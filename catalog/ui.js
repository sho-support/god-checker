/* PACHI ATLAS UI — no frameworks, no remote dependencies */
(function(){"use strict";
const $=id=>document.getElementById(id),esc=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const fmt=x=>Number(x).toLocaleString("ja-JP"),norm=x=>String(x??"").normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s/g,"");
const url=x=>typeof x==="string"&&/^https:\/\//i.test(x)?x:null;
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
let catalog=null,selected=null,kind="all",timer=null;
let engine=window.PachiEngine.create({mode:"free",config:{odds:399}});
function machine(){return catalog?.machines.find(m=>m.id===selected)||null}
function dateStatus(m){if(m.releaseStatus!=="upcoming")return "導入済み（掲載時点）";return m.introduction&&m.introduction<today()?"導入予定日経過・設置未確認":"導入予定"}
function safeSources(m){return (m.sources||[]).filter(url).map((s,i)=>'<a href="'+esc(s)+'" target="_blank" rel="noopener noreferrer">'+esc(new URL(s).hostname)+' ↗</a>').join("")}
function select(id,updateHistory=true){if(!catalog?.machines.some(m=>m.id===id))return;selected=id;if(updateHistory){const u=new URL(location.href);u.searchParams.set("machine",id);history.replaceState(null,"",u.pathname+u.search+u.hash)}renderList();renderDetail();if($("sim-model")?.value==="machine")setModel("machine")}
function renderList(){
 if(!catalog)return;
 const query=norm($("query").value),release=$("release").value;
 const items=catalog.machines.filter(m=>(kind==="all"||m.type===kind)&&(release==="all"||(release==="nov02"?m.introduction==="2026-11-02":release==="upcoming"?m.releaseStatus==="upcoming"&&m.introduction>=today():m.releaseStatus==="released"))&&norm(m.name+" "+m.manufacturer+" "+(m.searchAliases||[]).join(" ")).includes(query));
 items.sort((a,b)=>{const aUp=a.releaseStatus==="upcoming"&&a.introduction>=today(),bUp=b.releaseStatus==="upcoming"&&b.introduction>=today();if(aUp!==bUp)return aUp?-1:1;return (aUp?a.introduction.localeCompare(b.introduction):(b.introduction||"").localeCompare(a.introduction||""))||a.name.localeCompare(b.name,"ja")});
 $("count").textContent="（"+fmt(items.length)+"件 / 全"+fmt(catalog.machines.length)+"件）";
 $("list").innerHTML=items.length?items.map(m=>'<button type="button" class="machine" data-id="'+esc(m.id)+'" aria-current="'+(m.id===selected)+'"><span class="machine-name">'+esc(m.name)+'</span><span class="meta"><span class="tag">'+(m.type==="slot"?"スロット":"パチンコ")+'</span><span class="tag '+(m.simProfile?.confidence==="demo_only"?"pending":"verified")+'">'+(m.simProfile?.confidence==="demo_only"?"詳細スペック確認中":m.simProfile?.normalOdds||m.simProfile?.roleOdds?"基本確率掲載":"基本情報あり")+'</span><span class="small">'+esc(m.manufacturer)+' · '+esc(m.introduction||"導入日未確認")+' · '+esc(dateStatus(m))+'</span></span></button>').join(""):'<p class="muted">該当する機種はありません。キーワードや絞り込みを変えてください。</p>';
 $("list").querySelectorAll("[data-id]").forEach(b=>b.addEventListener("click",()=>select(b.dataset.id)));
}
function detailSpec(m){
 if(m.id==="e-garo12"&&m.spec){
  const s=m.spec;return [["通常・図柄揃い","1/"+s.normalSymbolOdds],["ガロチャージ","1/"+s.normalChargeOdds],["バトル突入率",s.challengeEntryProbability*100+"%"],["バトル突破率",s.challengeWinProbability*100+"%"]].map(v=>'<div class="kv"><span>'+esc(v[0])+'</span><strong>'+esc(v[1])+'</strong></div>').join("")+'<p class="small">LT継続：約76%。公表値の概数を使用。</p>';
 }
 const p=m.simProfile||{},rows=[];
 if(m.id==="l-million-god-trajectory"&&m.spec?.firstHitOdds){
  m.spec.firstHitOdds.forEach((n,i)=>rows.push(["設定"+(i+1)+" GG初当たり","1/"+n+"・出玉率"+m.spec.payoutRate[i]+"%"]));
 }else if(p.kind==="hane"){
  rows.push(["役物V入賞",p.roleOdds?"約1/"+p.roleOdds:"未確認"]);
  if(p.payouts)rows.push(["V入賞振り分け",p.payouts.map(v=>Math.round(v.p*1000)/10+"% "+v.payout+"個").join(" / ")]);
 }else{
  rows.push([m.type==="slot"?(p.hitKind||"初当たり")+"（設定1）":"図柄揃い確率（設定1）",p.normalOdds?"1/"+p.normalOdds:"未確認"]);
  if(p.settingOdds)rows.push(["設定別確率",p.settingOdds.map((n,i)=>(i+1)+":1/"+n).join(" / ")]);
  if(p.entryPct!=null)rows.push(["ST/RUSH突入率","約"+p.entryPct+"%"]);
  if(p.stGames!=null)rows.push(["ST回数",p.stGames+"回"+(p.reserveGames?"＋残保留"+p.reserveGames:"")]);
  if(p.rightOdds!=null)rows.push(["右打ち当選率","約1/"+p.rightOdds]);
  if(p.rushContinuationPct!=null)rows.push(["公表RUSH継続率","約"+p.rushContinuationPct+"% ※代替抽選"]);
 }
 const info=rows.map(v=>'<div class="kv"><span>'+esc(v[0])+'</span><strong>'+esc(v[1])+'</strong></div>').join("");
 return info+'<p class="small">'+esc(p.notes||"機種固有の未公表抽選は確認中。")+'</p>'+
 (p.confidence==="demo_only"?'<p class="small" style="color:#ffdaa4">初当たり確率は未確認。仮設定で遊べます。</p>':'');
}
function renderDetail(){
 const m=machine();if(!m){$("detail").innerHTML='<p>機種を選択してください。</p>';return}
 const a=m.analysis||null;
 const analysisHTML=a?'<h3>天井・解析情報</h3>'+
   [['天井',a.ceiling],['設定変更時',a.reset],['補足',a.notes]].filter(row=>row[1]).map(row=>'<div class="kv"><span>'+esc(row[0])+'</span><strong>'+esc(row[1])+'</strong></div>').join("")+
   '<p class="small">確認元：<a href="'+esc(a.source)+'" target="_blank" rel="noopener noreferrer">参考資料を確認</a> ／ 確認日：'+esc(a.checkedAt)+'</p>':''; 
 const logs=(m.updates||[]).map(v=>'<p><time>'+esc(v.date)+'</time>　'+esc(v.message)+'</p>').join("");
 $("detail").innerHTML='<span class="tag">'+(m.type==="slot"?"スロット":"パチンコ")+'</span> <span class="tag">'+esc(dateStatus(m))+'</span>'+
 '<h3 class="detail-name">'+esc(m.name)+'</h3><div class="detail-text">メーカー：'+esc(m.manufacturer)+'<br>導入日：'+esc(m.introduction||"未確認")+'<br>情報確認：'+esc(m.lastVerified||"未確認")+'</div>'+
 '<h3>基本スペック</h3>'+detailSpec(m)+analysisHTML+(m.summary?'<p class="small">'+esc(m.summary)+'</p>':'')+
 '<h3>参考情報・出典</h3><div class="links">'+(safeSources(m)||'<span class="muted">確認中</span>')+'</div>'+
 '<h3>この機種の更新履歴</h3><div class="timeline">'+(logs||'<p>更新記録なし</p>')+'</div>';
 const b=document.createElement("button");b.type="button";b.className="action primary";b.style.marginTop="14px";
 b.textContent=m.simProfile?.kind==="hane"?"この機種の役物抽選を試す":m.simProfile?.confidence==="demo_only"?"仮設定でシミュレーション":"この機種でシミュレーション";
 b.addEventListener("click",()=>{setModel(m.id==="e-garo12"?"garo12":"machine");$("sim-head").scrollIntoView({behavior:"smooth",block:"start"})});$("detail").appendChild(b);
 if(m.id==="l-million-god-trajectory"){const a=document.createElement("a");a.href="../simulator.html";a.className="action";a.textContent="GOD従来版の詳細シミュレーター";a.style.cssText="display:inline-block;text-decoration:none;margin:12px 0 0 8px";$("detail").appendChild(a)}
}
function modelConfig(){
 if($("sim-model").value==="machine")return {};
 if($("sim-model").value==="free")return {odds:Number($("free-odds").value)};
 if($("sim-model").value==="slot"){const cfg={};document.querySelectorAll("[data-slot]").forEach(x=>cfg[x.dataset.slot]=Number(x.value));return cfg;}
 const cfg={};document.querySelectorAll("[data-config]").forEach(x=>cfg[x.dataset.config]=Number(x.value));return cfg;
}
function validate(){
 const model=$("sim-model").value;
 if(model==="machine"){if(!machine()?.simProfile)return "機種を選択してください";const n=Number($("machine-odds").value);return machine().simProfile.kind==="hane"||(Number.isFinite(n)&&n>=1&&n<=1e7)?"":"初当たり分母が不正です";}
 if(model==="free"){const n=Number($("free-odds").value);return Number.isFinite(n)&&n>=1&&n<=1e7?"":"確率分母は1～10,000,000の範囲で入力してください"}
 if(model==="slot"){
  for(const el of document.querySelectorAll("[data-slot]")){
   const n=Number(el.value),min=Number(el.min),max=Number(el.max);
   if(!el.value.trim()||!Number.isFinite(n)||n<min||n>max)return "スロット自由設定の入力値を確認してください（"+el.dataset.slot+"）";
  }
 }
 if(model==="custom"){
  for(const el of document.querySelectorAll("[data-config]")){
   const n=Number(el.value),min=Number(el.min),max=Number(el.max);
   if(!el.value.trim()||!Number.isFinite(n)||n<min||n>max)return "カスタム設定の入力値を確認してください（"+el.dataset.config+"）";
  }
  const c=modelConfig();if(1/c.odds+(c.chargeOdds>0?1/c.chargeOdds:0)>1+1e-10)return "図柄揃いとチャージの確率の合計が100%を超えています";
 }
 return "";
}
function stop(){if(timer!==null){clearInterval(timer);timer=null}$("auto").textContent="オート開始";$("auto").setAttribute("aria-pressed","false")}
function setModel(model){
 stop();const m=machine();
 if(model==="machine"&&m?.simProfile?.kind==="garo12")model="garo12";
 $("sim-model").value=model;
 if(model==="machine"){
  if(!m?.simProfile){$("validation").textContent="機種を選択してください";return false}
  const p=m.simProfile;
  $("machine-setting").value="0";
  $("machine-odds").value=p.settingOdds?.[0]||p.normalOdds||(m.type==="slot"?350:399);
  engine=window.PachiMachineEngine.create(p);
 }else{
  const error=validate();if(error){$("validation").textContent=error;return false}
  engine=window.PachiEngine.create({mode:model,config:modelConfig()});
 }
 $("validation").textContent="";if($("sim-section"))$("sim-section").open=true;renderSim();return true;
}
function run(n){stop();const error=validate();if(error){$("validation").textContent=error;return}$("validation").textContent="";if(engine.snapshot().mode!==$("sim-model").value){setModel($("sim-model").value)}try{engine.stepMany(n);renderSim()}catch(e){$("validation").textContent=String(e.message)}}
function renderSim(){
 const s=engine.snapshot(),model=$("sim-model").value,m=machine(),p=model==="machine"?(m?.simProfile||{}):{};
 $("free-odds-box").hidden=model!=="free";$("custom-config").hidden=model!=="custom";$("slot-config").hidden=model!=="slot";
 $("machine-odds-box").hidden=model!=="machine"||p.kind==="hane";$("machine-setting-box").hidden=model!=="machine"||!p.settingOdds;
 $("machine-selected").hidden=model!=="machine";
 if(model==="machine")$("machine-selected").innerHTML='<span class="machine-mode-label">'+esc(m?.name||"未選択")+'</span>'+
  (p.kind==="hane"?'<span class="warn">羽根に拾われた玉の役物内V入賞を抽選。通常回転数ではありません。</span>':
  p.confidence==="demo_only"?'<span class="warn">機種固有の確率は未確認。仮設定 1/'+engine.getOdds()+' で試遊します。</span>':
  (p.normalOdds===Number($("machine-odds").value)||(p.settingOdds||[]).includes(Number($("machine-odds").value))?'<span>公表の初当たり確率を使っています。特殊抽選は未再現です。</span>':'<span class="warn">手動変更した仮の初当たり確率です。実機の公表値ではありません。</span>'));
 $("spin-label").textContent=p.kind==="hane"?"役物試行回数":m?.type==="slot"?"総ゲーム数":"総抽選回数";
 $("normal-label").textContent=p.kind==="hane"?"役物内試行数":m?.type==="slot"?"通常ゲーム数":"通常回転数";
 $("hama-label").textContent=p.kind==="hane"?"V非当選の連続試行":m?.type==="slot"?"通常ハマりG数":"現在のハマり";
 $("phase").textContent=({normal:"通常",role:"役物内試行",st:"ST中",challenge:"7500チャレンジ",rush:model==="garo12"?"魔戒CHANCE LT":"LT/RUSH中",lt:"LT中",at:"AT中",upper:"上位AT中"})[s.phase]||s.phase;
 $("phase-help").textContent=s.remaining>0?"残り"+s.remaining+"回":"";
 for(const [id,v] of [["spins",s.spins],["normal-spins",s.normalSpins],["hama",s.hama],["max-hama",s.maxHama],["wins",s.hits],["payout",s.payout],["charges",s.charges],["rush-entries",s.rushEntries],["lt-entries",s.ltEntries]])if($(id))$(id).textContent=fmt(v);
 $("sim-history").innerHTML=s.history.length?s.history.map(v=>'<p><span class="small">#'+fmt(v.spin)+'</span>　'+esc(v.message)+'</p>').join(""):"まだ抽選していません。";
 $("sim-notice").textContent=model==="machine"?(p.notes||"機種固有の内部抽選は一部未確認。")+(p.confidence==="demo_only"?" 数値は仮設定で実機仕様ではありません。":"")+" 実機の全内部挙動を再現したものではありません。":
 model==="garo12"?"牙狼12：公表値による概数を使用。実機と完全には一致しません。":
 model==="custom"?"自由設定のST・LT抽選。実機の振り分けではありません。":
 model==="slot"?"自由設定のAT・天井・上位AT抽選。実機と同じではありません。":
 "フリー確率：独立抽選のみ。ST・チャージ・出玉は反映しません。";
}

function readableDate(value){
 if(!value)return "導入日確認中";
 return Number(value.slice(5,7))+"月"+Number(value.slice(8,10))+"日";
}
function launchOdds(m){
 const p=m.simProfile||{};
 if(p.kind==="hane"&&p.roleOdds)return "役物内V 約1/"+p.roleOdds;
 if(p.normalOdds)return (m.type==="slot"?(p.hitKind||"初当たり"):"図柄揃い")+" 1/"+p.normalOdds;
 return "基本スペック確認中";
}
function renderLaunch(){
 if(!catalog)return;
 const dated=catalog.machines.filter(m=>m.introduction&&m.releaseStatus==="upcoming"&&m.introduction>=today()).sort((a,b)=>a.introduction.localeCompare(b.introduction));
 const fallback=catalog.machines.filter(m=>m.introduction).sort((a,b)=>b.introduction.localeCompare(a.introduction));
 const date=(dated[0]||fallback[0])?.introduction;
 if(!date){$("launch-heading").textContent="新台・導入予定";return}
 const featured=catalog.machines.filter(m=>m.introduction===date);
 $("launch-heading").textContent=readableDate(date)+(date>=today()?"導入予定の新台":"導入済みの新台");
 for(const type of ["slot","pachinko"]){
  const items=featured.filter(m=>m.type===type),container=$("launch-"+type);
  $("launch-"+type+"-count").textContent=items.length+"機種";
  container.innerHTML=items.length?items.map(m=>
   '<button type="button" class="launch-item" data-launch-id="'+esc(m.id)+'"><strong>'+esc(m.name)+'</strong><span class="meta-line">'+esc(m.manufacturer)+' ／ <span class="odds">'+esc(launchOdds(m))+'</span></span></button>'
  ).join(""):'<p class="muted">この日の導入機種はありません。</p>';
  container.querySelectorAll("[data-launch-id]").forEach(btn=>btn.addEventListener("click",()=>{
   $("release").value="all";$("query").value="";kind="all";
   document.querySelectorAll("[data-type]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.type==="all")));
   select(btn.dataset.launchId);
   $("machine-detail").scrollIntoView({behavior:"smooth",block:"start"});
  }));
 }
 $("launch-all").onclick=()=>{
  $("release").value=date==="2026-11-02"?"nov02":"upcoming";
  $("query").value="";kind="all";
  document.querySelectorAll("[data-type]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.type==="all")));
  renderList();$("machines").scrollIntoView({behavior:"smooth",block:"start"});
 };
}
function renderRecentUpdates(){
 if(!catalog)return;
 const global=catalog.updates.slice(0,3).map(x=>({date:x.date,text:x.text,global:true}));
 const machines=catalog.machines.filter(m=>m.updates?.length && m.introduction==="2026-11-02")
  .sort((a,b)=>(b.analysis?1:0)-(a.analysis?1:0)||b.updates[0].date.localeCompare(a.updates[0].date))
  .slice(0,6).map(m=>({date:m.updates[0].date,text:"基本スペック・機種情報を追加",name:m.name,id:m.id}));
 const rows=[...global,...machines].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
 $("recent-updates").innerHTML=rows.map(x=>'<article class="news-entry"><time datetime="'+esc(x.date)+'">'+esc(x.date.replaceAll("-","/"))+'</time>'+
  (x.global?'<span class="update-label">'+esc(x.text)+'</span>':'<a href="?machine='+encodeURIComponent(x.id)+'#machine-detail">'+esc(x.name)+'</a><p>'+esc(x.text)+'</p>')+'</article>').join("");
}

function showUpdates(){if(!catalog)return;$("updates").innerHTML=catalog.updates.map(x=>'<p><time>'+esc(x.date)+'</time>　'+esc(x.text)+'</p>').join("")}
function init(){
 const params=new URL(location.href).searchParams;
 $("sim-model").insertAdjacentHTML("beforeend",'<option value="machine">選択中の機種で抽選</option><option value="custom">自由設定 ST / LT（試作）</option><option value="slot">自由設定 スロット AT（試作）</option>');
 $("sim-model").addEventListener("change",()=>setModel($("sim-model").value));
 $("free-odds").addEventListener("change",()=>setModel("free"));
 $("machine-setting").addEventListener("change",()=>{
  if($("sim-model").value!=="machine")return;
  const p=machine()?.simProfile,n=p?.settingOdds?.[Number($("machine-setting").value)];
  if(n){$("machine-odds").value=n;engine.setOdds(n);renderSim()}
 });
 $("machine-odds").addEventListener("change",()=>{
  if($("sim-model").value!=="machine")return;
  const error=validate();if(error){$("validation").textContent=error;return}
  engine.setOdds(Number($("machine-odds").value));$("validation").textContent="";renderSim();
 });
 $("custom-apply").addEventListener("click",()=>setModel("custom"));
 $("slot-apply").addEventListener("click",()=>setModel("slot"));
 $("one").addEventListener("click",()=>run(1));$("hundred").addEventListener("click",()=>run(100));$("thousand").addEventListener("click",()=>run(1000));$("ten-thousand").addEventListener("click",()=>run(10000));
 $("reset").addEventListener("click",()=>{stop();engine.reset();renderSim()});
 $("auto").addEventListener("click",()=>{if(timer!==null){stop();return}const error=validate();if(error){$("validation").textContent=error;return}if(engine.snapshot().mode!==$("sim-model").value)engine.update($("sim-model").value,modelConfig());timer=setInterval(()=>{try{engine.step();renderSim()}catch(e){stop();$("validation").textContent=String(e.message)}},80);$("auto").textContent="オート停止";$("auto").setAttribute("aria-pressed","true")});
 $("query").addEventListener("input",renderList);$("release").addEventListener("change",renderList);
 document.querySelectorAll("[data-type]").forEach(b=>b.addEventListener("click",()=>{kind=b.dataset.type;document.querySelectorAll("[data-type]").forEach(c=>c.setAttribute("aria-pressed",String(c===b)));renderList()}));
 window.addEventListener("pagehide",stop);renderSim();
 fetch("./machines.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(json=>{
  if(!Array.isArray(json.machines)||!Array.isArray(json.updates))throw Error("データ形式が不正です");
  catalog=json;selected=json.machines.some(m=>m.id===params.get("machine"))?params.get("machine"):json.machines.find(m=>m.introduction==="2026-11-02")?.id||json.machines[0]?.id;
  $("load-status").textContent="データ更新："+json.updated+" ／ 詳細未確認の機種は確認中と表示";renderList();renderDetail();showUpdates();renderLaunch();renderRecentUpdates()
 }).catch(e=>{$("list").textContent="機種データの読み込みに失敗しました。";$("load-status").textContent="読み込みエラー："+e.message});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

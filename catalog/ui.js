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
function select(id,updateHistory=true){if(!catalog?.machines.some(m=>m.id===id))return;selected=id;if(updateHistory){const u=new URL(location.href);u.searchParams.set("machine",id);history.replaceState(null,"",u.pathname+u.search+u.hash)}renderList();renderDetail()}
function renderList(){
 if(!catalog)return;
 const query=norm($("query").value),release=$("release").value;
 const items=catalog.machines.filter(m=>(kind==="all"||m.type===kind)&&(release==="all"||(release==="upcoming"?m.releaseStatus==="upcoming"&&m.introduction>=today():m.releaseStatus==="released"))&&norm(m.name+" "+m.manufacturer).includes(query));
 items.sort((a,b)=>{const aUp=a.releaseStatus==="upcoming"&&a.introduction>=today(),bUp=b.releaseStatus==="upcoming"&&b.introduction>=today();if(aUp!==bUp)return aUp?-1:1;return (b.introduction||"").localeCompare(a.introduction||"")||a.name.localeCompare(b.name,"ja")});
 $("count").textContent="（"+fmt(items.length)+"件 / 全"+fmt(catalog.machines.length)+"件）";
 $("list").innerHTML=items.length?items.map(m=>'<button type="button" class="machine" data-id="'+esc(m.id)+'" aria-current="'+(m.id===selected)+'"><span class="machine-name">'+esc(m.name)+'</span><span class="meta"><span class="tag">'+(m.type==="slot"?"スロット":"パチンコ")+'</span><span class="tag '+(m.specStatus==="pending"?"pending":"verified")+'">'+(m.specStatus==="pending"?"詳細仕様確認中":"仕様照合済み")+'</span><span class="small">'+esc(m.manufacturer)+' · '+esc(m.introduction||"導入日未確認")+' · '+esc(dateStatus(m))+'</span></span></button>').join(""):'<p class="muted">該当する機種はありません。キーワードや絞り込みを変えてください。</p>';
 $("list").querySelectorAll("[data-id]").forEach(b=>b.addEventListener("click",()=>select(b.dataset.id)));
}
function detailSpec(m){
 if(!m.spec)return '<p class="muted">抽選仕様はまだ検証できていません。数値を推測で埋めず、出典を確認した項目から追加します。</p>';
 if(m.spec.type==="slot_god"){
  const s=m.spec;return '<p class="small">タイプ：AT / 6号機スマスロ</p>'+s.firstHitOdds.map((v,i)=>'<div class="kv"><span>設定'+(i+1)+' / GG初当たり</span><strong>1/'+esc(v)+' ／ 出玉率'+esc(s.payoutRate[i])+'%</strong></div>').join("")+'<p class="small">天井：'+esc(s.ceiling)+'</p><p class="small">※設定値・割合は参照元の解析数値です。メーカー保証の数値と区別してください。</p>';
 }
 const s=m.spec,rows=[["通常・図柄揃い確率","1/"+s.normalSymbolOdds],["ガロチャージ確率","1/"+s.normalChargeOdds],["初当たり出玉",fmt(s.normalSymbolPayout)+"個"],["チャージ出玉",fmt(s.normalChargePayout)+"個"],["7500バトル突入率",(s.challengeEntryProbability*100)+"%"],["7500バトル突破率",(s.challengeWinProbability*100)+"%"],["LT継続率","約76%"],["LT中7500個","約25%"],["LT中1500個継続","約51%"],["LT中1500個終了","約24%"]];
 return rows.map(a=>'<div class="kv"><span>'+esc(a[0])+'</span><strong>'+esc(a[1])+'</strong></div>').join("");
}
function renderDetail(){
 const m=machine();if(!m){$("detail").innerHTML='<p class="muted">機種を選択してください。</p>';return}
 const logs=(m.updates||[]).map(x=>'<p><time>'+esc(x.date)+'</time>　'+esc(x.message)+'</p>').join("");
 $("detail").innerHTML='<span class="tag">'+(m.type==="slot"?"スロット":"パチンコ")+'</span> <span class="tag">'+esc(dateStatus(m))+'</span><h3 class="detail-name">'+esc(m.name)+'</h3><div class="detail-text">メーカー：'+esc(m.manufacturer)+'<br>導入予定・導入日：'+esc(m.introduction||"未確認")+'<br>情報確認：'+esc(m.lastVerified||"未確認")+'</div><h3>基本スペック</h3>'+detailSpec(m)+(m.summary?'<p class="small">'+esc(m.summary)+'</p>':'')+
 '<h3>参考情報・出典</h3><div class="links">'+(safeSources(m)||'<span class="muted">参照情報確認中</span>')+'</div><h3>この機種の更新履歴</h3><div class="timeline">'+(logs||'<p>更新履歴はありません。</p>')+'</div>';
 if(m.simulator==="garo12"){const b=document.createElement("button");b.type="button";b.className="action primary";b.style.marginTop="13px";b.textContent="牙狼12の抽選を試す";b.addEventListener("click",()=>{setModel("garo12");$("sim-head").scrollIntoView({behavior:"smooth",block:"start"})});$("detail").appendChild(b)}
 else if(m.type==="pachinko"){const b=document.createElement("button");b.type="button";b.className="action";b.style.marginTop="13px";b.textContent="自由設定で疑似遊技を試す";b.addEventListener("click",()=>{setModel("custom");$("sim-head").scrollIntoView({behavior:"smooth",block:"start"})});$("detail").appendChild(b)}
 else if(m.id==="l-million-god-trajectory"){const a=document.createElement("a");a.href="../simulator.html";a.textContent="従来のGODシミュレーターを開く";a.className="action primary";a.style.cssText="display:inline-block;margin-top:13px;text-decoration:none";$("detail").appendChild(a)}
}
function modelConfig(){
 if($("sim-model").value==="free")return {odds:Number($("free-odds").value)};
 const cfg={};document.querySelectorAll("[data-config]").forEach(x=>cfg[x.dataset.config]=Number(x.value));return cfg;
}
function validate(){
 const model=$("sim-model").value;
 if(model==="free"){const n=Number($("free-odds").value);return Number.isFinite(n)&&n>=1&&n<=1e7?"":"確率分母は1～10,000,000の範囲で入力してください"}
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
function setModel(model){stop();$("sim-model").value=model;const error=validate();if(error){$("validation").textContent=error;return false}$("validation").textContent="";engine.update(model,modelConfig());renderSim();return true}
function run(n){stop();const error=validate();if(error){$("validation").textContent=error;return}$("validation").textContent="";if(engine.snapshot().mode!==$("sim-model").value){engine.update($("sim-model").value,modelConfig())}try{engine.stepMany(n);renderSim()}catch(e){$("validation").textContent=String(e.message)}}
function renderSim(){
 const s=engine.snapshot(),model=$("sim-model").value;
 $("free-odds-box").hidden=model!=="free";
 $("custom-config").hidden=model!=="custom";
 $("phase").textContent=({normal:"通常",challenge:"極限7500バトル",rush:model==="garo12"?"魔戒CHANCE LT":"ST中",lt:"LT中"})[s.phase]||s.phase;
 $("phase-help").textContent=s.phase==="rush"||s.phase==="lt"?(s.remaining>0?"残り"+s.remaining+"回":model==="garo12"?"次回当選まで":""):"";
 for(const [id,v] of [["spins",s.spins],["normal-spins",s.normalSpins],["hama",s.hama],["max-hama",s.maxHama],["wins",s.hits],["payout",s.payout],["charges",s.charges],["rush-entries",s.rushEntries],["lt-entries",s.ltEntries]])if($(id))$(id).textContent=fmt(v);
 $("sim-history").innerHTML=s.history.length?s.history.map(h=>'<p><span class="small">#'+fmt(h.spin)+'</span>　'+esc(h.message)+'</p>').join(""):"まだ抽選していません。";
 $("sim-notice").textContent=model==="garo12"?"牙狼12：出典照合済みの通常図柄揃い/チャージ確率と約25・51・24%のLT振り分けを使用。簡易モデルで実機の内部挙動、演出、保留、実際の払い出しとは一致しない場合があります。":model==="custom"?"カスタム疑似遊技：自分で入力した数値から状態を抽選。ST中の当たりで残回数をリセットし、指定した割合でLTへ移行します。実機スペックを自動反映する機能ではありません。":"フリー確率：1/分母の独立抽選のみ。出玉・チャージ・確変・ST/LTを再現しません。";
}
function showUpdates(){if(!catalog)return;$("updates").innerHTML=catalog.updates.map(x=>'<p><time>'+esc(x.date)+'</time>　'+esc(x.text)+'</p>').join("")}
function init(){
 const params=new URL(location.href).searchParams;
 $("sim-model").insertAdjacentHTML("beforeend",'<option value="custom">自由設定 ST / LT（試作）</option>');
 $("sim-model").addEventListener("change",()=>setModel($("sim-model").value));
 $("free-odds").addEventListener("change",()=>setModel("free"));
 $("custom-apply").addEventListener("click",()=>setModel("custom"));
 $("one").addEventListener("click",()=>run(1));$("hundred").addEventListener("click",()=>run(100));$("thousand").addEventListener("click",()=>run(1000));$("ten-thousand").addEventListener("click",()=>run(10000));
 $("reset").addEventListener("click",()=>{stop();engine.reset();renderSim()});
 $("auto").addEventListener("click",()=>{if(timer!==null){stop();return}const error=validate();if(error){$("validation").textContent=error;return}if(engine.snapshot().mode!==$("sim-model").value)engine.update($("sim-model").value,modelConfig());timer=setInterval(()=>{try{engine.step();renderSim()}catch(e){stop();$("validation").textContent=String(e.message)}},80);$("auto").textContent="オート停止";$("auto").setAttribute("aria-pressed","true")});
 $("query").addEventListener("input",renderList);$("release").addEventListener("change",renderList);
 document.querySelectorAll("[data-type]").forEach(b=>b.addEventListener("click",()=>{kind=b.dataset.type;document.querySelectorAll("[data-type]").forEach(c=>c.setAttribute("aria-pressed",String(c===b)));renderList()}));
 window.addEventListener("pagehide",stop);renderSim();
 fetch("./machines.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(json=>{
  if(!Array.isArray(json.machines)||!Array.isArray(json.updates))throw Error("データ形式が不正です");
  catalog=json;selected=json.machines.some(m=>m.id===params.get("machine"))?params.get("machine"):json.machines[0]?.id;
  $("load-status").textContent="データ更新："+json.updated+" ／ 詳細未確認の機種は確認中と表示";renderList();renderDetail();showUpdates()
 }).catch(e=>{$("list").textContent="機種データの読み込みに失敗しました。";$("load-status").textContent="読み込みエラー："+e.message});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();

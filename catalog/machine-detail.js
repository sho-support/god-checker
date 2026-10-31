/* Dedicated machine page interaction: TOC / accordion / in-page simulator. */
(function(){"use strict";
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=n=>Number(n).toLocaleString("ja-JP");
let machine=null,engine=null,timer=null,manual=false;
const sections=[...document.querySelectorAll(".machine-accordion")];
function scrollToSummary(details){
 const summary=details.querySelector("summary");
 if(!summary)return;
 summary.focus({preventScroll:true});
 summary.scrollIntoView({behavior:"smooth",block:"start"});
}
function openSection(id,hash=true){
 const details=$(id);
 if(!details||!details.matches(".machine-accordion"))return;
 details.open=true;
 if(hash)history.replaceState(null,"",location.pathname+location.search+"#"+id);
 requestAnimationFrame(()=>details.scrollIntoView({behavior:"smooth",block:"start"}));
}
document.querySelectorAll(".machine-toc a[data-target]").forEach(a=>{
 a.addEventListener("click",e=>{e.preventDefault();openSection(a.dataset.target)});
});
document.querySelectorAll(".close-section[data-close]").forEach(btn=>{
 btn.addEventListener("click",()=>{
  const panel=btn.closest("details");
  if(!panel)return;
  if(panel.id==="section-sim")stopAuto();
  panel.open=false;
  scrollToSummary(panel);
 });
});
for(const detail of sections)detail.addEventListener("toggle",()=>{if(!detail.open&&detail.id==="section-sim")stopAuto()});
function openHash(){
 const id=decodeURIComponent(location.hash.slice(1));
 if(id&&$(id)?.matches(".machine-accordion"))openSection(id,false);
}
window.addEventListener("hashchange",openHash);
window.addEventListener("pagehide",stopAuto);
window.addEventListener("beforeunload",stopAuto);
if(location.hash)requestAnimationFrame(openHash);
function isGaro(){return machine?.simProfile?.kind==="garo12"}
function isHane(){return machine?.simProfile?.kind==="hane"}
function configuredOdds(){return machine?.simProfile?.settingOdds?.[0]||machine?.simProfile?.normalOdds||(machine?.type==="slot"?350:399)}
function initializeEngine(){
 stopAuto();
 engine=isGaro()?window.PachiEngine.create({mode:"garo12"}):window.PachiMachineEngine.create(machine.simProfile);
 const st=machine.simProfile;
 $("sim-odds").value=configuredOdds();
 $("sim-setting").value="0";
 $("sim-odds-wrap").hidden=isGaro()||isHane();
 $("sim-setting-wrap").hidden=!Array.isArray(st.settingOdds);
 $("sim-lab-0").textContent=isHane()?"役物試行数":machine.type==="slot"?"総ゲーム数":"総抽選回数";
 $("sim-lab-1").textContent=isHane()?"役物試行数":machine.type==="slot"?"通常ゲーム数":"通常回転数";
 $("sim-lab-2").textContent=isHane()?"V非当選の連続試行":"現在のハマり";
 $("sim-lab-3").textContent=isHane()?"最長連続非当選":"最大ハマり";
 $("sim-error").textContent="";
 manual=false;render();
}
function getState(){return engine.snapshot()}
function render(){
 if(!engine)return;
 const s=getState(),p=machine.simProfile;
 $("sim-phase").textContent=({normal:"通常",role:"役物内試行",st:"ST中",challenge:"極限7500バトル",rush:"魔戒CHANCE LT",at:"AT中",upper:"上位AT中",lt:"LT中"})[s.phase]||s.phase;
 $("sim-remain").textContent=s.remaining>0?"残り"+fmt(s.remaining)+"回":"";
 for(const [i,v] of [s.spins,s.normalSpins,s.hama,s.maxHama,s.hits,s.payout].entries())$("sim-num-"+i).textContent=fmt(v);
 $("sim-log").innerHTML=s.history.length?s.history.map(h=>'<p><span class="small">#'+fmt(h.spin)+'</span>　'+esc(h.message)+'</p>').join(""):"まだ抽選していません。";
 if(manual)$("sim-error").textContent="確率を変更しています。現在の抽選は実機公表値ではなく、手動設定です。";
}
function validateOdds(){
 const raw=$("sim-odds").value.trim(),value=Number(raw);
 if(!raw||!Number.isFinite(value)||value<1||value>1e7){$("sim-error").textContent="初当たり分母は1〜10,000,000で指定してください。";return null}
 return value;
}
function applyOdds(value){
 if(!engine||isGaro()||isHane())return;
 stopAuto();engine.setOdds(value);
 const ref=machine.simProfile,values=[ref.normalOdds,...(ref.settingOdds||[])];
 manual=!values.some(x=>x===value);
 $("sim-error").textContent="";render();
}
function stepMany(count){
 if(!engine)return;
 stopAuto();
 try{engine.stepMany(count);$("sim-error").textContent="";render()}catch(err){$("sim-error").textContent=String(err.message)}
}
function stopAuto(){
 if(timer!==null){clearInterval(timer);timer=null}
 const button=$("spin-auto");
 if(button){button.textContent="オート開始";button.dataset.running="false"}
}
function toggleAuto(){
 if(!engine)return;
 if(timer!==null){stopAuto();return}
 const button=$("spin-auto");button.dataset.running="true";button.textContent="オート停止";
 timer=setInterval(()=>{
  if(!$("section-sim").open){stopAuto();return}
  try{engine.step();render()}catch(err){stopAuto();$("sim-error").textContent=String(err.message)}
 },85);
}
$("sim-setting")?.addEventListener("change",()=>{
 const v=machine?.simProfile?.settingOdds?.[Number($("sim-setting").value)];
 if(!Number.isFinite(v))return;
 $("sim-odds").value=v;applyOdds(v);
});
$("sim-odds")?.addEventListener("change",()=>{const n=validateOdds();if(n!==null)applyOdds(n)});
for(const [id,count] of [["spin-one",1],["spin-100",100],["spin-1000",1000],["spin-10000",10000]])$(id)?.addEventListener("click",()=>stepMany(count));
$("spin-reset")?.addEventListener("click",()=>{if(!engine)return;stopAuto();engine.reset();render()});
$("spin-auto")?.addEventListener("click",toggleAuto);
async function load(){
 const id=document.body.dataset.machineId;
 if(!id){$("sim-error").textContent="機種を特定できません。";return}
 try{
 const response=await fetch("../machines.json",{cache:"no-store"});
 if(!response.ok)throw Error("HTTP "+response.status);
 const d=await response.json();machine=d.machines.find(x=>x.id===id);
 if(!machine?.simProfile)throw Error("機種の抽選データがありません");
 initializeEngine();
 }catch(err){$("sim-error").textContent="シミュレーターデータを読み込めませんでした。機種の情報本文は表示されています。"}
}
load();
})();

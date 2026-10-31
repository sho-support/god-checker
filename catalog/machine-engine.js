/* Machine simulation: source-confirmed starting odds and explicitly approximate states. */
(function(root){"use strict";
function create(source,options={}){
const p=JSON.parse(JSON.stringify(source||{})),rng=options.random||Math.random;
let oddsOverride=options.oddsOverride||null,state;
function roll(){const v=rng();if(!Number.isFinite(v)||v<0||v>=1)throw Error("Invalid RNG");return v}
function draw(dist){
 if(!Array.isArray(dist)||!dist.length)return null;
 const total=dist.reduce((a,x)=>a+Number(x.p||0),0),scale=Math.abs(total-1)<.001?1:100;
 if(Math.abs(total-scale)>.51)throw Error("Distribution must sum to 100%");
 let r=roll()*scale;for(const x of dist){r-=Number(x.p);if(r<0)return x}
 return dist[dist.length-1];
}
function reset(){state={mode:"machine",phase:p.kind==="hane"?"role":"normal",spins:0,normalSpins:0,specialSpins:0,hama:0,maxHama:0,hits:0,charges:0,payout:0,rushEntries:0,ltEntries:0,remaining:0,history:[],lastEvent:"開始"}}
function event(msg,kind="info"){state.lastEvent=msg;state.history.unshift({spin:state.spins,message:msg,kind,phase:state.phase});if(state.history.length>50)state.history.length=50}
function getOdds(){const n=oddsOverride||p.normalOdds;return Number.isFinite(n)&&n>=1?n:(p.kind==="slot"?350:399)}
function step(){
 const s=state;
 if(p.kind==="garo12")throw Error("Use the dedicated Garo simulator");
 if(p.kind==="hane"){
  s.spins++;s.normalSpins++;s.hama++;s.maxHama=Math.max(s.maxHama,s.hama);
  if(roll()>=1/Number(p.roleOdds))return "miss";
  const prize=draw(p.payouts)||{payout:0};s.hits++;s.payout+=Number(prize.payout)||0;s.hama=0;
  event("役物V入賞："+prize.payout+"個（羽根拾い率は未再現）","win");return "role_win";
 }
 if(p.kind==="st"&&s.phase==="st"){
  s.spins++;s.specialSpins++;s.remaining--;
  const games=Number(p.stGames||100)+Number(p.reserveGames||0);
  let right=Number(p.rightOdds);
  if(!(right>=1)&&p.rushContinuationPct>0&&p.rushContinuationPct<100)right=1/(1-Math.pow(1-p.rushContinuationPct/100,1/games));
  if(!(right>=1))throw Error("Missing right odds");
  if(roll()<1/right){
   const reward=draw(p.rushPayoutDistribution)||{payout:Number(p.rushPayout)||Number(p.firstPayout)||0};
   const value=Number(reward.payout)||0;
   if(value>0){s.hits++;s.payout+=value}
   s.remaining=games;event(value?"ST当選："+value+"個／残"+games+"回":"出玉なし ST回数リセット","win");return "st_win";
  }
  if(s.remaining<=0){s.phase="normal";s.remaining=0;event("ST終了 → 通常","end");return "st_end"}
  return "miss";
 }
 s.spins++;s.normalSpins++;s.hama++;s.maxHama=Math.max(s.maxHama,s.hama);
 if(roll()>=1/getOdds())return "miss";
 s.hits++;s.hama=0;
 if(p.kind==="slot"){event((p.hitKind||"初当たり")+"！ （CZ・AT中抽選は未再現）","win");return "slot_hit"}
 const prize=Number(p.firstPayout)||0;s.payout+=prize;
 if(p.kind==="st"&&p.entryPct>0&&roll()<p.entryPct/100){
  s.phase="st";s.rushEntries++;s.remaining=Number(p.stGames||100)+Number(p.reserveGames||0);
  event("初当たり"+(prize?" "+prize+"個":"")+" → ST突入・残"+s.remaining+"回","win");return "st_enter";
 }
 event("図柄揃い"+(prize?"："+prize+"個":"（払出し未確認）"),"win");return "normal_hit";
}
function stepMany(n){if(!Number.isSafeInteger(n)||n<1||n>1e6)throw Error("Invalid count");let wins=0;for(let i=0;i<n;i++){const r=step();if(["role_win","st_win","st_enter","normal_hit","slot_hit"].includes(r))wins++}return {performed:n,wins}}
function snapshot(){return JSON.parse(JSON.stringify(state))}
function setOdds(v){const n=Number(v);if(!Number.isFinite(n)||n<1||n>1e7)throw Error("分母は1〜10,000,000");oddsOverride=n;reset()}
reset();return {step,stepMany,snapshot,reset,setOdds,getOdds,getProfile:()=>JSON.parse(JSON.stringify(p))}
}
root.PachiMachineEngine={create};
})(typeof window!=="undefined"?window:globalThis);

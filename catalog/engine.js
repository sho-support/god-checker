/* PACHI ATLAS: simulation for entertainment, NOT actual machine firmware. */
(function(root){"use strict";
 const GARO12={symbolOdds:437.49,chargeOdds:1749.97,firstPayout:1500,chargePayout:300,challengeEntry:.5,challengeWin:.5,challengeSuccessPayout:7500,challengeFailPayout:1500,rushOutcomes:[{rate:.25,payout:7500,next:"rush",label:"7500個・継続"},{rate:.51,payout:1500,next:"rush",label:"1500個・継続"},{rate:.24,payout:1500,next:"normal",label:"1500個・終了"}]};
 const num=(v,d)=>Number.isFinite(Number(v))?Number(v):d;
 const clamp=(v,min,max,d)=>Math.min(max,Math.max(min,num(v,d)));
 function normalizeCustom(x={}){return {odds:clamp(x.odds,1,1e7,399),chargeOdds:clamp(x.chargeOdds,0,1e7,0),firstPayout:clamp(x.firstPayout,0,1e5,1500),chargePayout:clamp(x.chargePayout,0,1e5,300),entryPct:clamp(x.entryPct,0,100,55),stGames:Math.round(clamp(x.stGames,1,1e4,100)),stOdds:clamp(x.stOdds,1,1e7,99.9),stPayout:clamp(x.stPayout,0,1e5,1500),ltEntryPct:clamp(x.ltEntryPct,0,100,0),ltGames:Math.round(clamp(x.ltGames,1,1e4,150)),ltOdds:clamp(x.ltOdds,1,1e7,90),ltPayout:clamp(x.ltPayout,0,1e5,1500)}}
 function create(options={}){
  const random=typeof options.random==="function"?options.random:Math.random;
  let mode=["free","custom","garo12"].includes(options.mode)?options.mode:"free",config=normalizeCustom(options.config),state;
  function reset(){state={mode,phase:"normal",spins:0,normalSpins:0,specialSpins:0,hama:0,maxHama:0,hits:0,charges:0,payout:0,rushEntries:0,ltEntries:0,remaining:0,lastEvent:"開始",history:[]}}
  function roll(){const r=random();if(!Number.isFinite(r)||r<0||r>=1)throw Error("乱数が0以上1未満ではありません");return r}
  function event(message,kind="info"){state.lastEvent=message;state.history.unshift({spin:state.spins,message,kind,phase:state.phase});if(state.history.length>50)state.history.length=50}
  function reward(amount){state.payout+=amount;state.hits++}
  function enter(phase,remaining=0){state.phase=phase;state.remaining=remaining;if(phase==="rush")state.rushEntries++;if(phase==="lt")state.ltEntries++}
  function normal(odds,charge){state.spins++;state.normalSpins++;state.hama++;state.maxHama=Math.max(state.maxHama,state.hama);const p=1/odds,q=charge>0?1/charge:0;if(p+q>1+1e-10)throw Error("確率の合計が100%を超えています");const r=roll();if(r<p){state.hama=0;return "symbol"}if(r<p+q)return "charge";return "miss"}
  function step(){
   if(mode==="free"){const r=normal(config.odds,0);if(r==="symbol"){state.hits++;event("当選！ 1/"+config.odds,"win")}return r}
   if(mode==="garo12"){
    const g=GARO12;
    if(state.phase==="normal"){const r=normal(g.symbolOdds,g.chargeOdds);if(r==="symbol"){reward(g.firstPayout);if(roll()<g.challengeEntry){enter("challenge");event("図柄揃い：1500個 → 極限7500バトル","win")}else event("図柄揃い：1500個 → 通常","win")}else if(r==="charge"){state.charges++;state.payout+=g.chargePayout;event("ガロチャージ：300個","charge")}return r}
    state.spins++;state.specialSpins++;
    if(state.phase==="challenge"){if(roll()<g.challengeWin){reward(g.challengeSuccessPayout);enter("rush");event("チャレンジ成功：7500個 → 魔戒CHANCE LT","win");return "challenge_success"}reward(g.challengeFailPayout);enter("normal");event("チャレンジ失敗：1500個 → 通常","loss");return "challenge_fail"}
    if(state.phase==="rush"){const r=roll();let total=0;for(const o of g.rushOutcomes){total+=o.rate;if(r<total+1e-12){reward(o.payout);enter(o.next);event("魔戒CHANCE LT："+o.label,o.next==="normal"?"loss":"win");return o.next==="normal"?"rush_end":"rush_continue"}}throw Error("LTの振り分けが不正です")}
    throw Error("未定義の状態："+state.phase);
   }
   if(mode==="custom"){
    const c=config;
    if(state.phase==="normal"){const r=normal(c.odds,c.chargeOdds);if(r==="symbol"){reward(c.firstPayout);if(roll()<c.entryPct/100){enter("rush",c.stGames);event("図柄揃い："+c.firstPayout+"個 → ST "+c.stGames+"回","win")}else event("図柄揃い："+c.firstPayout+"個 → 通常","win")}else if(r==="charge"){state.charges++;state.payout+=c.chargePayout;event("チャージ："+c.chargePayout+"個","charge")}return r}
    if(state.phase!=="rush"&&state.phase!=="lt")throw Error("未定義の状態："+state.phase);
    state.spins++;state.specialSpins++;state.remaining--;
    const lt=state.phase==="lt",odds=lt?c.ltOdds:c.stOdds;
    if(roll()<1/odds){const prize=lt?c.ltPayout:c.stPayout;reward(prize);if(!lt&&c.ltEntryPct>0&&roll()<c.ltEntryPct/100){enter("lt",c.ltGames);event("ST中当たり："+prize+"個 → LT昇格（"+c.ltGames+"回）","win")}else{state.remaining=lt?c.ltGames:c.stGames;event((lt?"LT":"ST")+"中当たり："+prize+"個、残り"+state.remaining+"回へ復帰","win")}return "rush_hit"}
    if(state.remaining<=0){const old=lt?"LT":"ST";enter("normal");event(old+"終了 → 通常","loss");return "rush_end"}return "miss";
   }
   throw Error("未対応のモード");
  }
  function stepMany(n){if(!Number.isSafeInteger(n)||n<1||n>1000000)throw Error("抽選は1〜100万回まで");let wins=0,charges=0;for(let i=0;i<n;i++){const r=step();if(r==="symbol"||r==="rush_hit"||r==="challenge_success"||r==="challenge_fail"||r==="rush_continue"||r==="rush_end")wins++;if(r==="charge")charges++}return {performed:n,wins,charges}}
  function snapshot(){return JSON.parse(JSON.stringify(state))}
  function update(nextMode,nextConfig){if(nextMode&&!["free","custom","garo12"].includes(nextMode))throw Error("未対応モード");mode=nextMode||mode;config=normalizeCustom(nextConfig||config);reset()}
  reset();return {step,stepMany,snapshot,reset,update,getConfig:()=>({...config}),getGaroSpec:()=>({...GARO12})}
 }
 root.PachiEngine={create,normalizeCustom,GARO12};
})(typeof window!=="undefined"?window:globalThis);

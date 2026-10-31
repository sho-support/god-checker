"use strict";
require("./machine-engine.js");
const {PachiMachineEngine}=globalThis;
let n=0;function ok(x,name){if(!x)throw Error("FAILED "+name);n++;console.log("PASS",name)}
function rng(xs){let i=0;return ()=>xs[i++]??.999}
let e=PachiMachineEngine.create({kind:"st",normalOdds:1,entryPct:100,stGames:3,rightOdds:2,firstPayout:1500,rushPayoutDistribution:[{p:50,payout:300},{p:50,payout:1000}]},{random:rng([0,0,0,.2,.99,.99,.99])});
ok(e.step()==="st_enter","ST entry");ok(e.snapshot().payout===1500,"initial payout");
ok(e.step()==="st_win"&&e.snapshot().payout===1800,"ST reward");
ok(e.step()==="miss"&&e.snapshot().remaining===2,"ST 2 remaining");
ok(e.step()==="miss"&&e.snapshot().remaining===1,"ST 1 remaining");
ok(e.step()==="st_end"&&e.snapshot().phase==="normal","ST end");
e=PachiMachineEngine.create({kind:"hane",roleOdds:16,payouts:[{p:.75,payout:1134},{p:.125,payout:504},{p:.125,payout:252}]},{random:rng([0,.8])});
ok(e.step()==="role_win"&&e.snapshot().payout===504,"role lottery payout");
e=PachiMachineEngine.create({kind:"slot",normalOdds:326.4,hitKind:"AT初当たり"},{random:rng([0])});
ok(e.step()==="slot_hit"&&e.snapshot().hits===1,"slot first hit");
e=PachiMachineEngine.create({kind:"pachinko",normalOdds:null},{random:rng([0])});
ok(e.getOdds()===399&&e.step()==="normal_hit","demo default");
e.setOdds(199);ok(e.getOdds()===199&&e.snapshot().spins===0,"manual odds override");
e=PachiMachineEngine.create({kind:"pachinko",normalOdds:1000000},{random:()=>.9});
ok(e.stepMany(10000).performed===10000&&e.snapshot().maxHama===10000,"10k games");
let seed=1;const seeded=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646};
e=PachiMachineEngine.create({kind:"pachinko",normalOdds:99.9},{random:seeded});e.stepMany(100000);
ok(e.snapshot().hits>850&&e.snapshot().hits<1150,"100k Monte Carlo sanity");
console.log("SUCCESS",n);

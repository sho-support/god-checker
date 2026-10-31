/* Per-machine page structure and user interaction regression. */
"use strict";
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path"),assert=require("node:assert/strict");
const root=__dirname,db=JSON.parse(fs.readFileSync(path.join(root,"machines.json"),"utf8"));
const sections=["basic","system","ceiling","settings","sim","updates","sources"];
let passed=0;const yes=(v,label)=>{assert.ok(v,label);passed++};
const esc=v=>String(v??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
for(const m of db.machines){
 const f=path.join(root,"m",m.id+".html");yes(fs.existsSync(f),"page exists "+m.id);
 const h=fs.readFileSync(f,"utf8");
 yes(h.includes('<h1>'+esc(m.name)+'</h1>'),"page has own H1 "+m.id);
 yes(h.includes('<link rel="canonical" href="https://sho-support.github.io/god-checker/catalog/m/'+m.id+'.html">'),"unique canonical "+m.id);
 yes(h.includes('data-machine-id="'+m.id+'"'),"page binds machine "+m.id);
 yes(h.includes('href="../"'),"back to catalog "+m.id);
 yes(h.includes('id="top"'),"top anchor "+m.id);
 const ids=[...h.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 yes(ids.length===new Set(ids).size,"unique element IDs "+m.id);
 for(const name of sections){
  yes(h.includes('href="#section-'+name+'" data-target="section-'+name+'"'),"toc link "+m.id+"/"+name);
  yes(h.includes('<details id="section-'+name+'" class="machine-accordion">'),"accordion "+m.id+"/"+name);
  yes(h.includes('data-close="'+name+'"'),"bottom close "+m.id+"/"+name);
 }
 yes(h.includes('src="../machine-detail.js"'),"shared UI script "+m.id);
}
function boot(machineId,hash=""){
 const els=new Map(),toc=[],closes=[],panels=[];
 const location={hash,pathname:"/god-checker/catalog/m/"+machineId+".html",search:"",href:"https://sho-support.github.io/god-checker/catalog/m/"+machineId+".html"+hash};
 const history={replaceState(_state,_title,url){location.hash=url.includes("#")?"#"+url.split("#").at(-1):""}};
 function element(id){
  if(!els.has(id))els.set(id,{id,value:"",hidden:false,textContent:"",innerHTML:"",dataset:{},style:{},events:{},
   addEventListener(n,fn){this.events[n]=fn},click(){this.events.click?.()},change(){this.events.change?.()},focus(){this.focused=true},scrollIntoView(){this.scrolled=true}});
  return els.get(id)
 }
 for(const name of sections){
  const id="section-"+name;
  const panel={id,open:false,events:{},scrolled:false,matches(q){return q===".machine-accordion"},
   addEventListener(e,fn){this.events[e]=fn},scrollIntoView(){this.scrolled=true},
   querySelector(q){return q==="summary"?element("summary-"+name):null}};
  panels.push(panel);els.set(id,panel);
  const a={dataset:{target:id},events:{},addEventListener(n,fn){this.events[n]=fn},
   click(){this.events.click?.({preventDefault(){this.prevented=true}})}};
  toc.push(a);
  closes.push({dataset:{close:name},events:{},closest(q){return q==="details"?panel:null},
   addEventListener(n,fn){this.events[n]=fn},click(){this.events.click?.()}})
 }
 const handlers={};
 const document={body:{dataset:{machineId}},getElementById:element,
  querySelectorAll(q){return q===".machine-accordion"?panels:q===".machine-toc a[data-target]"?toc:q===".close-section[data-close]"?closes:[]}};
 const window={location,addEventListener(n,fn){handlers[n]=fn}};
 const ctx={window,location,history,document,fetch:async()=>({ok:true,json:async()=>db}),
  requestAnimationFrame:fn=>fn(),setInterval:fn=>{handlers.timer=fn;return 1},
  clearInterval:()=>{handlers.timer=null},console,Number,Math,JSON,Intl,URL};
 vm.createContext(ctx);
 for(const file of ["engine.js","machine-engine.js","machine-detail.js"])vm.runInContext(fs.readFileSync(path.join(root,file),"utf8"),ctx,{filename:file});
 return {panels,toc,closes,location,history,handlers,element,async ready(){for(let i=0;i<15;i++)await Promise.resolve()}};
}
(async()=>{
 const u=boot("new-p-02");await u.ready();
 yes(u.element("sim-phase").textContent==="通常","simulator initializes from correct machine");
 const sec=u.panels[2];u.toc[2].click();
 yes(sec.open&&sec.scrolled,"toc opens target and scrolls");
 yes(u.location.hash==="#section-ceiling","toc writes section hash");
 const other=u.panels[0];u.toc[0].click();yes(other.open&&sec.open,"sections can be opened independently");
 u.closes[2].click();
 yes(!sec.open,"bottom close collapses section");
 yes(u.element("summary-ceiling").focused,"bottom close focuses summary");
 yes(u.element("summary-ceiling").scrolled,"bottom close scrolls to heading");
 u.closes[0].click();yes(u.location.hash==="","closing linked section clears hash");
 u.element("spin-one").click();yes(u.element("sim-num-0").textContent==="1","single draw works inside machine page");
 u.element("spin-100").click();yes(u.element("sim-num-0").textContent==="101","hundred draws works inside machine page");
 u.element("spin-reset").click();yes(u.element("sim-num-0").textContent==="0","reset works inside machine page");
 const d=boot("new-s-01","#section-settings");await d.ready();
 yes(d.panels[3].open,"direct hash opens accordion");
 yes(!d.element("sim-setting-wrap").hidden,"setting selector available where data exists");
 d.element("sim-setting").value="5";d.element("sim-setting").change();
 yes(d.element("sim-odds").value===153.9,"setting six applies verified odds");
 const hane=boot("new-p-05");await hane.ready();
 yes(hane.element("sim-odds-wrap").hidden,"hane uses conditional role trials without regular odds input");
 hane.element("spin-one").click();yes(hane.element("sim-num-0").textContent==="1","hane role trial works");
 const garo=boot("e-garo12");await garo.ready();
 yes(garo.element("sim-odds-wrap").hidden,"special garo uses dedicated engine");
 garo.element("spin-100").click();yes(garo.element("sim-num-0").textContent==="100","garo 100 draws work");
 const demo=boot("featured-14");await demo.ready();
 yes(demo.element("sim-odds").value===350,"unknown slot starts in adjustable demo mode");
 demo.element("sim-odds").value="200";demo.element("sim-odds").change();
 yes(demo.element("sim-error").textContent.includes("手動設定"),"manual override is clearly labeled");
 console.log("SUCCESS:",passed,"static-page and accordion/simulator checks across",db.machines.length,"machines");
})().catch(err=>{console.error(err);process.exitCode=1});

/* Homepage regression: navigation goes to real machine pages, not a lower inline panel. */
"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const db=JSON.parse(fs.readFileSync(__dirname+"/machines.json","utf8"));
const html=fs.readFileSync(__dirname+"/index.html","utf8");
let passed=0;const yes=(value,label)=>{assert.ok(value,label);passed++};
const elements=new Map();
function node(id){
 if(!elements.has(id)){
  const el={id,value:id==="sim-model"?"free":id==="free-odds"?"399":id==="release"?"all":"",
   textContent:"",innerHTML:"",style:{},hidden:false,dataset:{},children:[],events:{},
   addEventListener(name,fn){this.events[name]=fn},click(){this.events.click?.()},change(){this.events.change?.()},
   setAttribute(){},insertAdjacentHTML(){},scrollIntoView(){},appendChild(child){this.children.push(child)},
   querySelectorAll(){return []}};
  elements.set(id,el);
 }
 return elements.get(id);
}
const types=["all","slot","pachinko"].map(type=>({dataset:{type},events:{},addEventListener(name,fn){this.events[name]=fn},click(){this.events.click?.()},setAttribute(){}}));
const document={readyState:"complete",getElementById:node,
 querySelectorAll(selector){return selector==="[data-type]"?types:[]},addEventListener(){},
 createElement(tag){return {tagName:tag,style:{},events:{},addEventListener(n,fn){this.events[n]=fn}}}};
const where={href:"https://sho-support.github.io/god-checker/catalog/"};
const win={location:where,addEventListener(){}};
const ctx={window:win,document,location:where,history:{replaceState(){}},URL,fetch:async()=>({ok:true,json:async()=>db}),
 setInterval:()=>1,clearInterval:()=>{},console,Intl,Math};
vm.createContext(ctx);
for(const file of ["engine.js","machine-engine.js","ui.js"])vm.runInContext(fs.readFileSync(__dirname+"/"+file,"utf8"),ctx,{filename:file});
(async()=>{
 for(let i=0;i<12;i++)await Promise.resolve();
 yes(node("count").textContent.includes(db.machines.length+"件"),"all machines loaded");
 yes(!html.includes('id="detail"'),"no inline detail page on homepage");
 yes(html.includes('id="list"'),"machine directory exists");
 yes(html.includes('id="sim-section"'),"optional free simulator still available");
 const list=node("list").innerHTML;
 yes((list.match(/<a class="machine"/g)||[]).length===db.machines.length,"all machines are real links");
 for(const machine of db.machines)
  yes(list.includes('href="./m/'+machine.id+'.html"'),"linked machine "+machine.id);
 yes(!list.includes('class="machine" data-id'),"machine markup includes href");
 node("release").value="nov02";node("release").change();
 yes(node("count").textContent.includes("20件"),"November 2 filter still works");
 yes((node("list").innerHTML.match(/<a class="machine"/g)||[]).length===20,"Nov 2 exact count");
 node("release").value="all";node("release").change();
 const upcoming=db.machines.filter(m=>m.introduction&&m.releaseStatus==="upcoming").sort((a,b)=>a.introduction.localeCompare(b.introduction));
 const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const upcomingDate=upcoming.find(m=>m.introduction>=today)?.introduction;
 const lastDate=db.machines.filter(m=>m.introduction).map(m=>m.introduction).sort().at(-1);
 const day=upcomingDate||lastDate;
 const matching=db.machines.filter(m=>m.introduction===day);
 const newCards=node("launch-slot").innerHTML+node("launch-pachinko").innerHTML;
 yes((newCards.match(/<a class="launch-item"/g)||[]).length===matching.length,"launch cards link directly");
 for(const machine of matching)
  yes(newCards.includes('href="./m/'+machine.id+'.html"'),"new-machine link "+machine.id);
 yes(!newCards.includes('scrollIntoView'),"new-machine entry doesn't use scroll helper");
 yes(node("recent-updates").innerHTML.includes('./m/'),"update feed links to details");
 node("one").click();
 yes(node("spins").textContent==="1","free mode still draws");
 console.log("SUCCESS:",passed,"homepage navigation checks");
})().catch(err=>{console.error(err);process.exitCode=1});

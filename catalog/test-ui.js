/* Lightweight UI interaction regression (Node built-ins only). */
"use strict";
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const db=JSON.parse(fs.readFileSync(__dirname+"/machines.json","utf8"));
const nodes=new Map();
function node(id){
 if(!nodes.has(id)){
  const e={id,value:id==="sim-model"?"free":id==="free-odds"?"399":id==="release"?"all":"",textContent:"",hidden:false,dataset:{},style:{},children:[],events:{},_html:"",
   addEventListener(name,fn){this.events[name]=fn},
   click(){this.events.click?.()},
   change(){this.events.change?.()},
   setAttribute(){},scrollIntoView(){},insertAdjacentHTML(){},
   appendChild(x){this.children.push(x)},
   querySelectorAll(q){return id==="list"&&q==="[data-id]"?[...this.innerHTML.matchAll(/data-id="([^"]+)"/g)].map(m=>{const el=node("list-"+m[1]);el.dataset.id=m[1];return el}):[]}
  };
  Object.defineProperty(e,"innerHTML",{get(){return this._html},set(v){this._html=v;this.children=[]}});
  nodes.set(id,e);
 }
 return nodes.get(id);
}
const document={readyState:"complete",getElementById:node,querySelectorAll:()=>[],addEventListener(){},
 createElement(tag){return {tag,style:{},events:{},addEventListener(n,fn){this.events[n]=fn},click(){this.events.click?.()}}}};
const window={addEventListener(){},location:{href:"https://sho-support.github.io/god-checker/catalog/"}};
let passed=0;const yes=(x,label)=>{assert.ok(x,label);passed++};
const context={window,document,history:{replaceState(){}},location:window.location,URL,Intl,Math,Number,Array,JSON,String,Date,Error,console,
 setInterval:()=>1,clearInterval:()=>{},fetch:async()=>({ok:true,json:async()=>db})};
vm.createContext(context);
for(const name of ["engine.js","machine-engine.js","ui.js"])vm.runInContext(fs.readFileSync(__dirname+"/"+name,"utf8"),context,{filename:name});
(async()=>{
 for(let i=0;i<12;i++)await Promise.resolve();
 yes(node("count").textContent.includes(String(db.machines.length)),"catalog loaded");
 node("release").value="nov02";node("release").change();
 yes(node("count").textContent.includes("20件"),"20 Nov 2 machines");
 for(const machine of db.machines.filter(m=>m.introduction==="2026-11-02")){
  const link=node("list").querySelectorAll("[data-id]").find(el=>el.dataset.id===machine.id);
  yes(!!link,"listed "+machine.id);link.click();
  yes(node("detail").innerHTML.includes(machine.name.slice(0,5)),"detail "+machine.id);
  const button=node("detail").children.find(x=>x.tag==="button");
  yes(!!button,"button "+machine.id);button.click();
  yes(node("sim-model").value==="machine","mode "+machine.id);
  node("one").click();yes(node("spins").textContent==="1","1 draw "+machine.id);
  node("hundred").click();yes(node("spins").textContent==="101","101 draws "+machine.id);
 }
 node("release").value="all";node("release").change();
 for(const machine of db.machines){
  const link=node("list").querySelectorAll("[data-id]").find(el=>el.dataset.id===machine.id);
  yes(!!link,"all listed "+machine.id);link.click();
  const button=node("detail").children.find(x=>x.tag==="button");
  yes(!!button,"all button "+machine.id);button.click();
  yes(node("sim-model").value===(machine.id==="e-garo12"?"garo12":"machine"),"all chosen "+machine.id);
  node("one").click();yes(node("spins").textContent==="1","all 1 draw "+machine.id);
 }
 const missing=node("list").querySelectorAll("[data-id]").find(x=>x.dataset.id==="featured-14");missing.click();
 node("detail").children.find(x=>x.tag==="button").click();
 yes(node("machine-selected").innerHTML.includes("仮設定"),"unknown spec clearly disclosed");
 node("machine-odds").value="199";node("machine-odds").change();
 yes(node("spins").textContent==="0","odds edits reset drawing state");
 console.log("SUCCESS:",passed,"UI interactions across",db.machines.length,"machines");
})().catch(e=>{console.error(e);process.exitCode=1});

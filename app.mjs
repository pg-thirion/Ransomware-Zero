import {createGame,scenarios,edges,costs,check,act,advance,stats,upcoming,segment,edgeKey,command,estimatedCost,recommend,awards,dailySeed,saveGame,loadGame,report} from "./engine.mjs";
const $=id=>document.getElementById(id);
let TICK=5000;
const SAVE="rz-session-v2",PROFILE="rz-profile-v2";
function read(key){try{return localStorage.getItem(key)}catch{return null}}
function write(key,value){try{localStorage.setItem(key,value);return true}catch{return false}}
function readProfile(){try{const p=JSON.parse(read(PROFILE));if(!p||!Array.isArray(p.results))throw Error();return {results:p.results.filter(r=>r&&Object.hasOwn(scenarios,r.mode)&&["won","lost"].includes(r.phase)&&Number.isInteger(r.score)&&r.score>=0&&r.score<=1000&&typeof r.key==="string").slice(0,50)}}catch{return {results:[]}}}
let profile=readProfile(),view="map",assetFilter="all",assetQuery="",logFilter="all",logQuery="",showHints=true;
let campaign=read('rz-campaign-v2')==='true';
function persist(){write('rz-campaign-v2',String(campaign));if(!write(SAVE,saveGame(game)))$("save-state").textContent="Storage unavailable";else $("save-state").textContent="Progress saved locally";}
function recordResult(){const key=game.mode+":"+game.initialSeed+":"+JSON.stringify(game.journal);if(profile.results.some(r=>r.key===key))return;profile.results.unshift({key,mode:game.mode,phase:game.phase,score:stats(game).score,awards:awards(game).filter(a=>a.earned).map(a=>a.id)});profile.results=profile.results.slice(0,50);write(PROFILE,JSON.stringify(profile));}
function launch(mode,seed){game=createGame(mode,seed);selected=game.nodes.find(n=>n.state==="infected").id;assetFilter="all";assetQuery="";$("asset-filter").value="all";$("asset-search").value="";$("feedback").textContent="";setRunning(false);render();}

const actionInfo={
scan:["Investigate asset","Record the simulated asset state and indicators."],
preserve:["Preserve evidence","Record a forensic snapshot before recovery."],
monitor:["Deploy monitoring","Delay encryption by one cycle."],
rotate:["Rotate credentials","Block a scheduled intrusion against this healthy asset."],
isolate:["Isolate machine","Disconnect from all simulated network links."],
seal:["Seal backup vault","Take verified backups offline to protect them."],
snapshot:["Verify fresh backup","Create a new verified recovery snapshot after restoring all services."],
harden:["Harden machine","Protect a healthy machine from future compromise."],
restore:["Restore from backup","Recover an isolated machine using sealed backups."],
rebuild:["Rebuild from scratch","Recover without relying on backups."],
reconnect:["Reconnect service","Bring a clean isolated machine online."]
};
let game=createGame(), selected="ws1", running=false, timer=null;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const point=n=>({x:17+n.x*33,y:13+n.y*24.5});
function setRunning(value){running=value&&game.phase==="playing";clearInterval(timer);timer=running?setInterval(step,TICK):null;renderControls();}
function renderControls(){$("pause").textContent=running?"Pause clock":"Start clock";$("pause").disabled=game.phase!=="playing";$("next").disabled=game.phase!=="playing";$("status").textContent=game.phase==="playing"?(running?"LIVE INCIDENT":"CLOCK PAUSED"):game.phase==="won"?"INCIDENT RESOLVED":"DEADLINE MISSED";}
function renderMap(){
 const svg=$("links");svg.replaceChildren();for(const [a,b] of edges){const n=game.nodes.find(n=>n.id===a),m=game.nodes.find(n=>n.id===b),p=point(n),q=point(m);const line=document.createElementNS("http://www.w3.org/2000/svg","line");for(const [k,v] of Object.entries({x1:p.x*9,y1:p.y*4.2,x2:q.x*9,y2:q.y*4.2}))line.setAttribute(k,v);line.setAttribute("class",n.isolated||m.isolated||game.segments.includes(edgeKey(a,b))?"cut":n.state==="infected"||m.state==="infected"?"hot":"");svg.append(line);}
 for(const n of game.nodes){let b=$("node-"+n.id);if(!b){b=el("button","node");b.id="node-"+n.id;b.type="button";b.append(el("strong"),el("small"),el("span","state"));b.addEventListener("click",()=>{selected=n.id;$("feedback").textContent="";render();});$("nodes").append(b);}
 const p=point(n);b.style.left=p.x+"%";b.style.top=p.y+"%";b.className=["node",n.state,n.isolated?"isolated":"",selected===n.id?"selected":""].join(" ");b.children[0].textContent=n.name;b.children[1].textContent=n.type+(n.hardened?" / Hardened":"");b.children[2].textContent=n.state+(n.isolated?" / Isolated":"");b.setAttribute("aria-pressed",String(selected===n.id));b.setAttribute("aria-controls","asset");b.hidden=!matchesAsset(n);b.setAttribute("aria-label",n.name+", "+b.children[2].textContent+(n.hardened?", hardened":""));}
}
function renderInspector(){const n=game.nodes.find(n=>n.id===selected);const a=el("div","asset-card");a.append(el("p","eyebrow",n.type+" / "+n.id.toUpperCase()),el("h4","",n.name),el("p","asset-state "+n.state,n.state.toUpperCase()+(n.isolated?" / ISOLATED":"")),el("p","",n.id==="vault"?"Backup integrity: "+game.backup+"%":"Service priority: "+n.weight+"/5"),el("p","",[n.hardened?"Hardened":"Not hardened",n.monitored?"Monitored":"",n.rotated?"Credentials rotated":"",n.preserved?"Evidence preserved":""].filter(Boolean).join(" · ")));$("asset").replaceChildren(a);
const wanted=n.id==="vault"?["seal","harden","rebuild","snapshot","scan","preserve","monitor"]:["isolate","harden","restore","rebuild","reconnect","scan","preserve","monitor","rotate"];
const container=$("actions");const focus=document.activeElement?.dataset?.action;container.replaceChildren();
for(const action of wanted){const reason=check(game,n.id,action);const b=el("button","action");b.type="button";b.dataset.action=action;b.disabled=Boolean(reason);b.append(el("b","",actionInfo[action][0]),el("span","",costs[action]+" RP"),el("small","",reason||actionInfo[action][1]));b.addEventListener("click",()=>{const result=act(game,selected,action);$("feedback").textContent=result.ok?actionInfo[action][0]+" completed.":result.reason;render();});container.append(b);if(focus===action&&!b.disabled)b.focus();}
}
function render(){const s=stats(game),c=scenarios[game.mode];$("incident").textContent=game.mode.toUpperCase();$("scenario-title").textContent=c.name;$("brief").textContent=c.description;const seconds=Math.max(0,(c.limit-game.turn)*TICK/1000);$("clock").textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");$("turn").textContent="Cycle "+game.turn+" / "+c.limit;
$("online").textContent=s.online+"%";$("online-bar").style.width=s.online+"%";$("infected").textContent=s.infected+s.encrypted;$("encrypted").textContent=s.infected+" active / "+s.encrypted+" encrypted";$("backup").textContent=game.backup+"%";$("vault").textContent=game.sealed?"Vault sealed offline":"Vault exposed";$("ap").textContent=game.ap+" / "+c.ap;$("score").textContent=s.score;
renderMap();renderInspector();renderControls();
$("logs").replaceChildren(...game.logs.filter(l=>(logFilter==="all"||l.level===logFilter)&&l.message.toLowerCase().includes(logQuery)).map(l=>{const row=el("div","log "+l.level);row.append(el("time","","C"+String(l.turn).padStart(2,"0")),el("span","",l.message));return row;}));$("event-count").textContent=game.logs.length+" EVENTS";
const waves=upcoming(game);const objectives=[[s.infected+s.encrypted===0,"Eliminate all compromised machines"],[game.sealed,"Seal the backup vault"],[game.backup===100&&game.sealed,"Maintain verified recovery backups"],[s.online===100,"Restore 100% service availability"],[waves.length===0,"Survive all intrusion waves"],[game.quiet>=2,"Maintain two clean cycles ("+Math.min(2,game.quiet)+"/2)"]];$("objectives").replaceChildren(...objectives.map(([done,label])=>{const row=el("div","objective"+(done?" done":""));row.append(el("i","",done?"✓":"·"),el("span","",label));return row;}));$("intel").textContent=waves.length?"Next possible compromise: "+waves[0].name+" at cycle "+waves[0].turn+". Harden or isolate the asset in advance.":"No further intrusion waves forecast.";
renderExpansion();persist();
}
function end(){setRunning(false);recordResult();renderExpansion();const s=stats(game);$("result-title").textContent=game.phase==="won"?"Incident contained":"Recovery deadline missed";$("result-text").textContent=game.phase==="won"?"All services and verified backups restored. Review your incident performance.":"Some recovery objectives remain incomplete. Review your incident and try again.";let best=s.score;try{const key="rz-best-"+game.mode;best=Math.max(Number(localStorage.getItem(key))||0,s.score);if(game.phase==="won")localStorage.setItem(key,String(best));else best=Number(localStorage.getItem(key))||0;}catch{}const values=[["Score",s.score],["Availability",s.online+"%"],["Backup integrity",game.backup+"%"],["Best successful score",best||"None"],["Downtime points",game.impact],["Response actions",game.actions],["Peak compromise",game.peak],["Recovered systems",game.restored],["Blocked waves",game.blocked],["Disruption estimate","R"+estimatedCost(game).toLocaleString("en-ZA")]];$("result-metrics").replaceChildren(...values.map(([label,value])=>{const d=el("div");d.append(el("small","",label),el("strong","",value));return d;}));$("continue-campaign").hidden=!(campaign&&game.phase==="won"&&Object.keys(scenarios).indexOf(game.mode)<Object.keys(scenarios).length-1);$("result").showModal();}
function step(){if(game.phase!=="playing")return;advance(game);$("feedback").textContent="";render();if(game.phase!=="playing")end();}
function openSetup(){setRunning(false);$("difficulty").value=game.mode;updateDescription();$("setup").returnValue="";$("seed").value="";$("campaign-mode").checked=campaign;$("setup").showModal();}
function updateDescription(){$("description").textContent=scenarios[$("difficulty").value].description;}
$("pause").addEventListener("click",()=>setRunning(!running));$("next").addEventListener("click",()=>{if(running)setRunning(false);step();});$("new").addEventListener("click",openSetup);$("help").addEventListener("click",()=>{setRunning(false);$("manual").showModal();});$("difficulty").addEventListener("change",updateDescription);
$("setup").addEventListener("close",()=>{if($("setup").returnValue!=="start")return;const mode=$("difficulty").value,raw=$("seed").value.trim();campaign=$("campaign-mode").checked;launch(mode,raw!==""?Number(raw):Math.floor(Math.random()*4294967296));});
$("result").addEventListener("close",()=>{if($("result").returnValue==="retry")openSetup();else if($("result").returnValue==="continue"){const modes=Object.keys(scenarios),next=modes[modes.indexOf(game.mode)+1];if(next)launch(next,game.initialSeed);}});document.addEventListener("visibilitychange",()=>{if(document.hidden&&running)setRunning(false);});window.addEventListener("pagehide",()=>setRunning(false));
setupExpansion();const restored=loadGame(read(SAVE));if(restored){game=restored;selected=game.nodes.find(n=>n.state==="infected")?.id||"ws1";if(game.phase!=="playing")recordResult();}render();
function matchesAsset(n){return (assetFilter==="all"||assetFilter==="compromised"&&n.state!=="clean"||assetFilter==="isolated"&&n.isolated||assetFilter==="healthy"&&n.state==="clean"||assetFilter==="critical"&&n.weight>=4)&&n.name.toLowerCase().includes(assetQuery);}
function renderExpansion(){
 $("save-state").textContent="Progress saved locally";
 $("seed-display").textContent="Seed "+game.initialSeed;
 $("hint-text").textContent=showHints?recommend(game):"Hints disabled";
 $("reserve").disabled=game.reserveUsed||game.phase!=="playing";
 $("briefing").disabled=game.ap<1||game.lastBriefing===game.turn||game.phase!=="playing";
 $("cost-estimate").textContent="R"+estimatedCost(game).toLocaleString("en-ZA");
 $("peak-count").textContent=game.peak;
 $("blocked-count").textContent=game.blocked;
 $("restored-count").textContent=game.restored;
 $("briefing-count").textContent=game.briefings;
 $("evidence-count").textContent=game.evidence.length;
 $("map").hidden=view!=="map";$("inventory").hidden=view!=="list";
 $("map-view").setAttribute("aria-pressed",String(view==="map"));$("list-view").setAttribute("aria-pressed",String(view==="list"));
 $("inventory").replaceChildren(...game.nodes.filter(matchesAsset).map(n=>{const b=el("button","inventory-item"+(selected===n.id?" active":""),n.name+" · "+n.state+(n.isolated?" · isolated":"")+" · priority "+n.weight);b.addEventListener("click",()=>{selected=n.id;render();});return b;}));
 $("segments").replaceChildren(...edges.filter(e=>e.includes(selected)).map(([a,b])=>{const other=game.nodes.find(n=>n.id===(a===selected?b:a));const cut=game.segments.includes(edgeKey(a,b));const button=el("button","link-action",(cut?"Reopen ":"Segment ")+other.name+" · 1 RP");button.disabled=game.ap<1||game.phase!=="playing";button.addEventListener("click",()=>{const r=segment(game,a,b);$("feedback").textContent=r.ok?"Network link updated.":r.reason;render();});return button;}));
 $("evidence").replaceChildren(...(game.evidence.length?game.evidence.slice().reverse().map(e=>el("p","evidence-item","C"+e.turn+" · "+game.nodes.find(n=>n.id===e.id).name+" · "+e.kind+" ("+e.state+")")):[el("p","muted","Investigate and preserve asset evidence to populate the case file.")]));
 $("achievements").replaceChildren(...awards(game).map(a=>el("span","award"+(a.earned?" earned":""),(a.earned?"✓ ":"○ ")+a.name)));
 const won=new Set(profile.results.filter(r=>r.phase==="won").map(r=>r.mode));
 $("campaign-progress").textContent=won.size+" / "+Object.keys(scenarios).length+" missions completed";
 $("mission-progress").replaceChildren(...Object.entries(scenarios).map(([key,c])=>el("span","award"+(won.has(key)?" earned":""),(won.has(key)?"✓ ":"○ ")+c.name)));
 $("recent-results").replaceChildren(...(profile.results.length?profile.results.slice(0,6).map(r=>el("p","evidence-item",scenarios[r.mode].name+" · "+(r.phase==="won"?"Won":"Lost")+" · "+r.score+" points")):[el("p","muted","Complete an incident to record your performance.")]));
 const chart=$("history");chart.replaceChildren();
 for(const h of game.history){const b=el("div","history-bar");b.style.height=Math.max(3,h.online)+"%";b.title="Cycle "+h.turn+": "+h.online+"% availability, "+h.compromised+" compromised";chart.append(b);}
 $("history-summary").textContent="Cycle "+game.turn+" · "+stats(game).online+"% availability · "+(game.history.length)+" samples";
}
function setupExpansion(){
 $("asset-filter").addEventListener("change",()=>{assetFilter=$("asset-filter").value;render();});
 $("asset-search").addEventListener("input",()=>{assetQuery=$("asset-search").value.toLowerCase().trim();render();});
 $("map-view").addEventListener("click",()=>{view="map";render();});
 $("list-view").addEventListener("click",()=>{view="list";render();});
 $("log-filter").addEventListener("change",()=>{logFilter=$("log-filter").value;render();});
 $("log-search").addEventListener("input",()=>{logQuery=$("log-search").value.toLowerCase().trim();render();});
 $("hints").addEventListener("change",()=>{showHints=$("hints").checked;render();});
 $("speed").addEventListener("change",()=>{TICK=Number($("speed").value);setRunning(running);render();});
 for(const [id,name] of [["reserve","reserve"],["briefing","brief"]])$(id).addEventListener("click",()=>{const r=command(game,name);$("feedback").textContent=r.ok?"Command completed.":r.reason;render();});
 $("daily").addEventListener("click",()=>{openSetup();$("difficulty").value="standard";$("seed").value=String(dailySeed());$("campaign-mode").checked=false;updateDescription();});
 $("export-report").addEventListener("click",()=>{setRunning(false);$("report-text").value=report(game);$("report-dialog").showModal();});
 $("copy-report").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("report-text").value);$("copy-status").textContent="Report copied."}catch{$("report-text").focus();$("report-text").select();$("copy-status").textContent="Select and copy the report manually."}});
 $("clear-profile").addEventListener("click",()=>{if(!window.confirm("Clear recorded mission results and achievements?"))return;profile={results:[]};write(PROFILE,JSON.stringify(profile));render();});
 document.addEventListener("keydown",e=>{if(e.repeat||e.ctrlKey||e.altKey||e.metaKey||["INPUT","TEXTAREA","SELECT","BUTTON"].includes(e.target.tagName)||document.querySelector("dialog[open]"))return;if(e.key.toLowerCase()==="n"&&game.phase==="playing"){e.preventDefault();setRunning(false);step();}if(e.key.toLowerCase()==="p"&&game.phase==="playing"){e.preventDefault();setRunning(!running);}});
}

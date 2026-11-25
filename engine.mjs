// Pure fictional incident-response simulation. No real network activity.

export const topology = [
  [
    "ws1",
    "Finance laptop",
    "Endpoint",
    1,
    0,
    1
  ],
  [
    "ws2",
    "HR laptop",
    "Endpoint",
    1,
    0,
    2
  ],
  [
    "ws3",
    "Operations PC",
    "Endpoint",
    1,
    0,
    3
  ],
  [
    "ws4",
    "Remote access",
    "Gateway",
    2,
    1,
    0
  ],
  [
    "id",
    "Identity service",
    "Server",
    4,
    1,
    1
  ],
  [
    "file",
    "File server",
    "Server",
    3,
    1,
    2
  ],
  [
    "app",
    "ERP application",
    "Server",
    4,
    1,
    3
  ],
  [
    "db",
    "Database",
    "Database",
    5,
    2,
    1
  ],
  [
    "web",
    "Customer portal",
    "Server",
    3,
    2,
    2
  ],
  [
    "vault",
    "Backup vault",
    "Backup",
    0,
    2,
    3
  ]
];

export const edges = [
  [
    "ws1",
    "id"
  ],
  [
    "ws1",
    "file"
  ],
  [
    "ws2",
    "id"
  ],
  [
    "ws2",
    "file"
  ],
  [
    "ws3",
    "file"
  ],
  [
    "ws3",
    "app"
  ],
  [
    "ws4",
    "id"
  ],
  [
    "ws4",
    "web"
  ],
  [
    "id",
    "db"
  ],
  [
    "id",
    "app"
  ],
  [
    "file",
    "vault"
  ],
  [
    "file",
    "db"
  ],
  [
    "app",
    "db"
  ],
  [
    "app",
    "web"
  ],
  [
    "db",
    "vault"
  ]
];

export const scenarios = {
  "rookie": {
    "name": "First response",
    "description": "A finance workstation is compromised. Contain the outbreak and prepare for a second wave.",
    "limit": 24,
    "ap": 4,
    "spread": 1,
    "initial": [
      "ws1"
    ],
    "events": [
      [
        5,
        "ws3"
      ],
      [
        10,
        "ws4"
      ]
    ]
  },
  "standard": {
    "name": "Business under siege",
    "description": "Two endpoints are compromised and further intrusion alerts are expected.",
    "limit": 25,
    "ap": 4,
    "spread": 2,
    "initial": [
      "ws1",
      "ws4"
    ],
    "events": [
      [
        5,
        "ws2"
      ],
      [
        10,
        "ws3"
      ],
      [
        15,
        "web"
      ]
    ]
  },
  "expert": {
    "name": "Critical infrastructure",
    "description": "A server is already compromised. Protect the vault and recover priority services.",
    "limit": 26,
    "ap": 3,
    "spread": 3,
    "initial": [
      "file",
      "ws4"
    ],
    "events": [
      [
        4,
        "ws2"
      ],
      [
        8,
        "ws3"
      ],
      [
        12,
        "web"
      ],
      [
        17,
        "id"
      ]
    ]
  }
};

Object.assign(scenarios,{
hospital:{name:"Hospital lockdown",description:"Protect clinical scheduling and patient records during a fictional hospital outage.",limit:28,ap:4,spread:2,initial:["id","ws2"],events:[[4,"db"],[9,"ws3"],[14,"web"],[19,"file"]]},
supply:{name:"Supply chain crisis",description:"Contain a compromised remote gateway and ERP system before fulfilment stops.",limit:30,ap:4,spread:3,initial:["ws4","app"],events:[[4,"ws1"],[8,"file"],[13,"db"],[18,"web"],[22,"id"]]},
blackout:{name:"Zero hour",description:"Three compromised machines, tighter resources and five incoming waves.",limit:32,ap:3,spread:3,initial:["ws1","file","ws4"],events:[[5,"ws2"],[10,"ws3"],[15,"db"],[20,"web"],[25,"id"]]}
});
export const costs = {
  "isolate": 1,
  "harden": 1,
  "restore": 2,
  "rebuild": 3,
  "reconnect": 1,
  "seal": 1,
  "snapshot": 2,
  "scan": 1,
  "preserve": 1,
  "monitor": 1,
  "rotate": 1
};

export function log(s,message,level="info"){s.logs.unshift({turn:s.turn,message,level});s.logs=s.logs.slice(0,100);}

export function createGame(mode="standard",seed=42){const c=scenarios[mode];if(!Object.hasOwn(scenarios,mode))throw Error("Unknown scenario");const s={mode,seed:seed>>>0,initialSeed:seed>>>0,turn:0,ap:c.ap,phase:"playing",nodes:topology.map(([id,name,type,weight,x,y])=>({id,name,type,weight,x,y,state:c.initial.includes(id)?"infected":"clean",isolated:false,hardened:false,age:0,scanned:false,preserved:false,monitored:false,rotated:false})),backup:100,sealed:false,impact:0,peak:c.initial.length,backupLoss:0,actions:0,quiet:0,logs:[],journal:[],segments:[],reserveUsed:false,briefings:0,lastBriefing:-1,blocked:0,restored:0,history:[],evidence:[]};log(s,"Incident declared: "+c.initial.length+" confirmed compromise(s).","danger");recordHistory(s);return s;}

export function rand(s){s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}

export function available(s){return s.nodes.filter(n=>n.weight&&n.state==="clean"&&!n.isolated).reduce((a,n)=>a+n.weight,0);}

export function stats(s){const total=s.nodes.reduce((a,n)=>a+n.weight,0);return {online:Math.round(available(s)/total*100),infected:s.nodes.filter(n=>n.state==="infected").length,encrypted:s.nodes.filter(n=>n.state==="encrypted").length,isolated:s.nodes.filter(n=>n.isolated).length,score:Math.max(0,Math.round(1000-s.impact*2-s.turn*8-s.actions*3-s.backupLoss*2))};}

export function check(s,id,action){const n=s.nodes.find(n=>n.id===id);if(s.phase!=="playing")return "Incident ended";if(!n||!Object.hasOwn(costs,action))return "Invalid action";if(s.ap<costs[action])return "Not enough response points";switch(action){case "scan":return n.scanned?"Already investigated":"";case "preserve":return !n.scanned?"Investigate first":n.preserved?"Evidence already preserved":n.state==="clean"?"No active incident evidence":"";case "monitor":return n.monitored?"Monitoring already active":"";case "rotate":return n.state!=="clean"?"Recover machine first":n.rotated?"Credentials already rotated":"";case "isolate":return n.isolated?"Already isolated":n.id==="vault"?"Use seal vault":"";case "seal":return n.id!=="vault"?"Select backup vault":s.sealed?"Vault already sealed":n.state!=="clean"?"Recover vault first":"";case "harden":return n.state!=="clean"?"Recover machine first":n.hardened?"Already hardened":"";case "restore":return n.id==="vault"?"Rebuild compromised vault":!n.isolated?"Isolate first":n.state==="clean"?"Already clean":!s.sealed||s.backup<50?"Verified sealed backup required":"";case "rebuild":return n.state==="clean"?"Already clean":!n.isolated&&n.id!=="vault"?"Isolate first":"";case "snapshot":return n.id!=="vault"?"Select backup vault":!s.sealed||n.state!=="clean"?"Seal a clean vault first":s.backup===100?"Backups already verified":s.nodes.some(x=>x.state!=="clean"||(x.weight&&x.isolated))?"Restore all services first":"";case "reconnect":return n.id==="vault"?"Keep vault sealed":!n.isolated?"Already connected":n.state!=="clean"?"Recover first":"";}return "Invalid action";}

export function act(s,id,action){const reason=check(s,id,action);if(reason)return {ok:false,reason};const n=s.nodes.find(n=>n.id===id);s.ap-=costs[action];s.actions++;s.journal.push(["act",id,action]);switch(action){case "scan":n.scanned=true;s.evidence.push({id,turn:s.turn,state:n.state,kind:n.state==="clean"?"Baseline checked":"Compromise indicators recorded"});break;case "preserve":n.preserved=true;s.evidence.push({id,turn:s.turn,state:n.state,kind:"Forensic snapshot preserved"});break;case "monitor":n.monitored=true;break;case "rotate":n.rotated=true;break;case "isolate":n.isolated=true;break;case "seal":s.sealed=true;n.isolated=true;break;case "harden":n.hardened=true;break;case "restore":case "rebuild":s.restored++;n.state="clean";n.age=0;n.hardened=true;if(n.id==="vault"){s.backupLoss+=s.backup;s.backup=0;n.isolated=true;s.sealed=true;}break;case "snapshot":s.backup=100;break;case "reconnect":n.isolated=false;break;}log(s,n.name+": "+action+" completed.","success");return {ok:true};}

export function advance(s){if(s.phase!=="playing")return s;s.journal.push(["advance"]);const c=scenarios[s.mode];s.turn++;s.ap=c.ap;for(const [at,id] of c.events){if(at===s.turn){const n=s.nodes.find(n=>n.id===id);if(n.hardened||n.isolated||n.rotated){s.blocked++;log(s,"New intrusion attempt blocked at "+n.name+".","success");}else if(n.state==="clean"){n.state="infected";n.age=0;log(s,"New compromise detected: "+n.name+".","danger");}}}
const active=s.nodes.filter(n=>n.state==="infected");const candidates=[];for(const n of active){if(!n.isolated){for(const edge of edges){if(!edge.includes(n.id)||s.segments.includes(edgeKey(...edge)))continue;const other=s.nodes.find(x=>x.id===edge.find(x=>x!==n.id));if(other.state==="clean"&&!other.isolated&&!other.hardened&&!candidates.includes(other))candidates.push(other);}}}
for(let i=0;i<c.spread&&candidates.length;i++){const n=candidates.splice(Math.floor(rand(s)*candidates.length),1)[0];n.state="infected";n.age=0;log(s,"Lateral spread detected: "+n.name+".","danger");}
for(const n of active){n.age++;if(n.age>=(n.monitored?3:2)){n.state="encrypted";log(s,n.name+" encrypted. Recovery required.","danger");}}
const vault=s.nodes.find(n=>n.id==="vault");if(vault.state!=="clean"&&!s.sealed){const before=s.backup;s.backup=Math.max(0,s.backup-35);s.backupLoss+=before-s.backup;log(s,"Backup integrity degraded to "+s.backup+"%.","danger");}
const st=stats(s);s.impact+=100-st.online;s.peak=Math.max(s.peak,st.infected+st.encrypted);s.quiet=st.infected+st.encrypted===0&&st.online===100?s.quiet+1:0;recordHistory(s);
if(s.turn>=c.events.at(-1)[0]&&s.quiet>=2&&st.online===100&&s.sealed&&s.backup===100){s.phase="won";log(s,"Incident resolved. All business services and verified backups restored.","success");}else if(s.turn>=c.limit){s.phase="lost";log(s,"Recovery deadline missed.","danger");}return s;}

export function upcoming(s){return scenarios[s.mode].events.filter(([t])=>t>s.turn).map(([turn,id])=>({turn,name:s.nodes.find(n=>n.id===id).name}));}
export function edgeKey(a,b){return [a,b].sort().join(":");}
export function segment(s,a,b){
 if(s.phase!=="playing"||s.ap<1||!edges.some(e=>edgeKey(...e)===edgeKey(a,b)))return {ok:false,reason:"Link unavailable or insufficient response points"};
 const key=edgeKey(a,b),i=s.segments.indexOf(key);s.ap--;s.actions++;s.journal.push(["segment",a,b]);
 if(i<0)s.segments.push(key);else s.segments.splice(i,1);
 log(s,"Network link "+key+(i<0?" segmented.":" reopened."),"success");return {ok:true};
}
export function command(s,name){
 if(s.phase!=="playing")return {ok:false,reason:"Incident ended"};
 if(name==="reserve"){
 if(s.reserveUsed)return {ok:false,reason:"Emergency reserve already used"};
 s.reserveUsed=true;s.ap+=2;log(s,"Emergency response reserve deployed (+2 RP).","success");
 }else if(name==="brief"){
 if(s.ap<1||s.lastBriefing===s.turn)return {ok:false,reason:"Briefing unavailable this cycle"};
 s.ap--;s.briefings++;s.lastBriefing=s.turn;log(s,"Stakeholder situation report delivered.","success");
 }else return {ok:false,reason:"Unknown command"};
 s.actions++;s.journal.push(["command",name]);return {ok:true};
}
export function recordHistory(s){const st=stats(s);s.history.push({turn:s.turn,online:st.online,compromised:st.infected+st.encrypted,backup:s.backup});}
export function estimatedCost(s){return s.impact*125;}
export function recommend(s){
 const bad=s.nodes.filter(n=>n.state!=="clean").sort((a,b)=>b.weight-a.weight);
 if(!s.sealed&&s.nodes.find(n=>n.id==="vault").state==="clean")return "Seal the backup vault before further spread.";
 const active=bad.find(n=>n.state==="infected"&&!n.isolated&&n.id!=="vault");
 if(active)return "Isolate "+active.name+" to contain lateral spread.";
 if(bad.length)return "Recover "+bad[0].name+" using a backup or clean rebuild.";
 const offline=s.nodes.filter(n=>n.weight&&n.isolated).sort((a,b)=>b.weight-a.weight)[0];
 if(offline)return "Reconnect "+offline.name+" to restore service availability.";
 if(s.backup<100)return "Verify a fresh backup in the sealed vault.";
 const wave=upcoming(s).find(w=>{const n=s.nodes.find(n=>n.name===w.name);return !n.hardened&&!n.rotated&&!n.isolated;});
 return wave?"Harden "+wave.name+" before cycle "+wave.turn+".":"Maintain clean services and advance the cycle.";
}
export function awards(s){
 const st=stats(s);
 return [
 ["containment","Incident commander",s.phase==="won"],
 ["vault","Vault guardian",s.phase==="won"&&s.backupLoss===0],
 ["forensics","Evidence custodian",s.nodes.some(n=>n.preserved)],
 ["resilience","Resilience engineer",s.nodes.filter(n=>n.hardened).length>=5],
 ["communications","Stakeholder liaison",s.briefings>=2],
 ["segmentation","Network defender",s.segments.length>=2],
 ["precision","Precision response",s.phase==="won"&&st.score>=800]
 ].map(([id,name,earned])=>({id,name,earned}));
}
export function dailySeed(day=new Date().toISOString().slice(0,10)){let h=2166136261;for(const c of day){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;}
export function saveGame(s){return JSON.stringify({version:2,mode:s.mode,seed:s.initialSeed,journal:s.journal});}
export function loadGame(raw){
 try{if(typeof raw!=="string"||raw.length>100000)return null;const data=JSON.parse(raw);
 if(data.version!==2||!Object.hasOwn(scenarios,data.mode)||!Number.isInteger(data.seed)||data.seed<0||data.seed>4294967295||!Array.isArray(data.journal)||data.journal.length>500)return null;
 const s=createGame(data.mode,data.seed);
 for(const j of data.journal){if(!Array.isArray(j)||s.phase!=="playing")return null;
 let result;if(j[0]==="advance"&&j.length===1){advance(s);continue;}
 if(j[0]==="act"&&j.length===3)result=act(s,j[1],j[2]);
 else if(j[0]==="segment"&&j.length===3&&j.slice(1).every(x=>typeof x==="string"))result=segment(s,j[1],j[2]);
 else if(j[0]==="command"&&j.length===2)result=command(s,j[1]);
 else return null;if(!result.ok)return null;
 }return s;}catch{return null;}
}
export function report(s){
 const st=stats(s);
 return ["RANSOMWARE ZERO — AFTER-ACTION REPORT","Scenario: "+scenarios[s.mode].name,"Seed: "+s.initialSeed,"Outcome: "+s.phase,"Cycle: "+s.turn,"Score: "+st.score,"Availability: "+st.online+"%","Backup integrity: "+s.backup+"%","Estimated simulated disruption: R"+estimatedCost(s),"Peak compromise: "+s.peak,"Recovered systems: "+s.restored,"Blocked waves: "+s.blocked,"Stakeholder briefings: "+s.briefings,"Evidence items: "+s.evidence.length,"Achievements: "+awards(s).filter(a=>a.earned).map(a=>a.name).join(", "),"","ASSETS",...s.nodes.map(n=>n.name+": "+n.state+(n.isolated?" / isolated":"")),"","TIMELINE",...s.logs.slice().reverse().map(l=>"Cycle "+l.turn+": "+l.message)].join("\n");
}

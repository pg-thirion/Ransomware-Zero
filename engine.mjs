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

export const costs = {
  "isolate": 1,
  "harden": 1,
  "restore": 2,
  "rebuild": 3,
  "reconnect": 1,
  "seal": 1,
  "snapshot": 2
};

export function log(s,message,level="info"){s.logs.unshift({turn:s.turn,message,level});s.logs=s.logs.slice(0,100);}

export function createGame(mode="standard",seed=42){const c=scenarios[mode];if(!Object.hasOwn(scenarios,mode))throw Error("Unknown scenario");const s={mode,seed:seed>>>0,turn:0,ap:c.ap,phase:"playing",nodes:topology.map(([id,name,type,weight,x,y])=>({id,name,type,weight,x,y,state:c.initial.includes(id)?"infected":"clean",isolated:false,hardened:false,age:0})),backup:100,sealed:false,impact:0,peak:c.initial.length,backupLoss:0,actions:0,quiet:0,logs:[]};log(s,"Incident declared: "+c.initial.length+" confirmed compromise(s).","danger");return s;}

export function rand(s){s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}

export function available(s){return s.nodes.filter(n=>n.weight&&n.state==="clean"&&!n.isolated).reduce((a,n)=>a+n.weight,0);}

export function stats(s){const total=s.nodes.reduce((a,n)=>a+n.weight,0);return {online:Math.round(available(s)/total*100),infected:s.nodes.filter(n=>n.state==="infected").length,encrypted:s.nodes.filter(n=>n.state==="encrypted").length,isolated:s.nodes.filter(n=>n.isolated).length,score:Math.max(0,Math.round(1000-s.impact*2-s.turn*8-s.actions*3-s.backupLoss*2))};}

export function check(s,id,action){const n=s.nodes.find(n=>n.id===id);if(s.phase!=="playing")return "Incident ended";if(!n||!Object.hasOwn(costs,action))return "Invalid action";if(s.ap<costs[action])return "Not enough response points";switch(action){case "isolate":return n.isolated?"Already isolated":n.id==="vault"?"Use seal vault":"";case "seal":return n.id!=="vault"?"Select backup vault":s.sealed?"Vault already sealed":n.state!=="clean"?"Recover vault first":"";case "harden":return n.state!=="clean"?"Recover machine first":n.hardened?"Already hardened":"";case "restore":return n.id==="vault"?"Rebuild compromised vault":!n.isolated?"Isolate first":n.state==="clean"?"Already clean":!s.sealed||s.backup<50?"Verified sealed backup required":"";case "rebuild":return n.state==="clean"?"Already clean":!n.isolated&&n.id!=="vault"?"Isolate first":"";case "snapshot":return n.id!=="vault"?"Select backup vault":!s.sealed||n.state!=="clean"?"Seal a clean vault first":s.backup===100?"Backups already verified":s.nodes.some(x=>x.state!=="clean"||(x.weight&&x.isolated))?"Restore all services first":"";case "reconnect":return n.id==="vault"?"Keep vault sealed":!n.isolated?"Already connected":n.state!=="clean"?"Recover first":"";}return "Invalid action";}

export function act(s,id,action){const reason=check(s,id,action);if(reason)return {ok:false,reason};const n=s.nodes.find(n=>n.id===id);s.ap-=costs[action];s.actions++;switch(action){case "isolate":n.isolated=true;break;case "seal":s.sealed=true;n.isolated=true;break;case "harden":n.hardened=true;break;case "restore":case "rebuild":n.state="clean";n.age=0;n.hardened=true;if(n.id==="vault"){s.backup=0;n.isolated=true;s.sealed=true;}break;case "snapshot":s.backup=100;break;case "reconnect":n.isolated=false;break;}log(s,n.name+": "+action+" completed.","success");return {ok:true};}

export function advance(s){if(s.phase!=="playing")return s;const c=scenarios[s.mode];s.turn++;s.ap=c.ap;for(const [at,id] of c.events){if(at===s.turn){const n=s.nodes.find(n=>n.id===id);if(n.hardened||n.isolated){log(s,"New intrusion attempt blocked at "+n.name+".","success");}else if(n.state==="clean"){n.state="infected";n.age=0;log(s,"New compromise detected: "+n.name+".","danger");}}}
const active=s.nodes.filter(n=>n.state==="infected");const candidates=[];for(const n of active){if(!n.isolated){for(const edge of edges){if(!edge.includes(n.id))continue;const other=s.nodes.find(x=>x.id===edge.find(x=>x!==n.id));if(other.state==="clean"&&!other.isolated&&!other.hardened&&!candidates.includes(other))candidates.push(other);}}}
for(let i=0;i<c.spread&&candidates.length;i++){const n=candidates.splice(Math.floor(rand(s)*candidates.length),1)[0];n.state="infected";n.age=0;log(s,"Lateral spread detected: "+n.name+".","danger");}
for(const n of active){n.age++;if(n.age>=2){n.state="encrypted";log(s,n.name+" encrypted. Recovery required.","danger");}}
const vault=s.nodes.find(n=>n.id==="vault");if(vault.state!=="clean"&&!s.sealed){const before=s.backup;s.backup=Math.max(0,s.backup-35);s.backupLoss+=before-s.backup;log(s,"Backup integrity degraded to "+s.backup+"%.","danger");}
const st=stats(s);s.impact+=100-st.online;s.peak=Math.max(s.peak,st.infected+st.encrypted);s.quiet=st.infected+st.encrypted===0&&st.online===100?s.quiet+1:0;
if(s.turn>=c.events.at(-1)[0]&&s.quiet>=2&&st.online===100&&s.sealed&&s.backup===100){s.phase="won";log(s,"Incident resolved. All business services and verified backups restored.","success");}else if(s.turn>=c.limit){s.phase="lost";log(s,"Recovery deadline missed.","danger");}return s;}

export function upcoming(s){return scenarios[s.mode].events.filter(([t])=>t>s.turn).map(([turn,id])=>({turn,name:s.nodes.find(n=>n.id===id).name}));}
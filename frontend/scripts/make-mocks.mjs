// Generates src/mocks/*.json from the real seed values (db/seed.sql) so mocks match the demo.
import { writeFileSync } from "node:fs";
const W = { urgency: .35, population: .25, vulnerability: .15, waiting: .15, accessibility: .10 };
const U = { low: .25, medium: .5, high: .75, critical: 1 };
const A = { easy: 0, medium: .5, hard: 1 };
const now = Date.now();
const R = [
 ["req_01","Dadu",26.7319,67.7750,4200,"critical",true,"hard",18,{water:500,food:400,medicine:100,shelter:100}],
 ["req_02","Larkana",27.5590,68.2120,3500,"high",true,"medium",10,{water:450,food:350,medicine:60,shelter:120}],
 ["req_03","Jacobabad",28.2769,68.4514,5200,"critical",true,"hard",30,{water:600,food:600,medicine:120,shelter:150}],
 ["req_04","Thatta",24.7475,67.9239,1500,"high",false,"medium",4,{water:400,food:150,medicine:60}],
 ["req_05","Badin",24.6560,68.8370,2800,"high",false,"hard",14,{water:350,food:250,shelter:150}],
 ["req_06","Mirpurkhas",25.5276,69.0159,1800,"medium",false,"easy",6,{water:250,food:200,shelter:60}],
 ["req_07","Sehwan",26.4167,67.8667,2200,"critical",true,"hard",22,{water:350,food:250,medicine:70,shelter:90}],
 ["req_08","Matiari",25.5971,68.4467,900,"low",false,"easy",2,{water:120,food:100}],
 ["req_09","Nawabshah",26.2483,68.4100,2600,"medium",true,"medium",12,{water:300,food:250,medicine:50,shelter:100}],
 ["req_10","Khairpur",27.5295,68.7592,1600,"medium",false,"easy",8,{water:200,food:180,shelter:80}],
 ["req_11","Tando Allahyar",25.4600,68.7167,1100,"low",false,"easy",3,{water:150,food:120,shelter:40}],
 ["req_12","Sanghar",26.0462,68.9480,2000,"high",false,"medium",9,{water:280,food:220,medicine:40,shelter:100}],
];
const maxPop = Math.max(...R.map(r => r[4]));
const requests = R.map(([id,area,lat,lng,population,urgency,vulnerable,accessibility,h,items]) => {
  const parts = {
    urgency: U[urgency]*100*W.urgency,
    population: population/maxPop*100*W.population,
    vulnerability: (vulnerable?1:0)*100*W.vulnerability,
    waiting: Math.min(h/36,1)*100*W.waiting,
    accessibility: A[accessibility]*100*W.accessibility,
  };
  const total = Math.round(Object.values(parts).reduce((a,b)=>a+b,0));
  for (const k in parts) parts[k] = Math.round(parts[k]);
  return { id, area, lat, lng, population, urgency, vulnerable, accessibility,
    status: "pending", hoursWaiting: h, createdAt: new Date(now - h*3600e3).toISOString(),
    items: Object.entries(items).map(([item,qtyNeeded]) => ({ item, qtyNeeded, qtyAllocated: 0 })),
    fulfilmentPct: 0, score: { total, parts } };
}).sort((a,b) => b.score.total - a.score.total);

const D = [
 ["dep_01","Hyderabad Depot",25.3960,68.3578,2000,{water:[1200,300],food:[900,250],medicine:[100,40],shelter:[250,60]},[["veh_01","Truck 1",400],["veh_02","Truck 2",300]]],
 ["dep_02","Sukkur Depot",27.7052,68.8574,1600,{water:[900,300],food:[700,250],medicine:[80,90],shelter:[180,60]},[["veh_03","Truck 3",350],["veh_04","Truck 4",250]]],
 ["dep_03","Karachi Depot",24.8607,67.0011,2200,{water:[1000,300],food:[1100,250],medicine:[120,40],shelter:[300,60]},[["veh_05","Truck 5",500],["veh_06","Truck 6",400]]],
];
const depots = D.map(([id,name,lat,lng,dailyCapacity,st,vs]) => ({ id,name,lat,lng,dailyCapacity,
  stock: Object.entries(st).map(([item,[qty,lowThreshold]]) => ({ item,qty,lowThreshold,isLow: qty<lowThreshold })),
  vehicles: vs.map(([vid,vn,capacity]) => ({ id:vid, name:vn, capacity, status:"available", lat, lng })) }));

const tot = {}; depots.forEach(d => d.stock.forEach(s => tot[s.item] = (tot[s.item]||0)+s.qty));
const need = {}; requests.forEach(r => r.items.forEach(i => need[i.item] = (need[i.item]||0)+i.qtyNeeded));
const dashboard = { activeRequests: requests.length, peopleAwaiting: requests.reduce((a,r)=>a+r.population,0),
  deliveriesInProgress: 0, completedDeliveries: 0,
  criticalShortages: Object.keys(need).map(item => ({ item, needed: need[item], available: tot[item], gap: need[item]-tot[item] })).filter(s => s.gap>0),
  inventoryTotals: Object.entries(tot).map(([item,qty]) => ({ item, qty })),
  lowStockAlerts: depots.flatMap(d => d.stock.filter(s=>s.isLow).map(s => ({ depotId:d.id, depotName:d.name, item:s.item, qty:s.qty, lowThreshold:s.lowThreshold }))) };
const weights = W;
for (const [n,v] of Object.entries({ requests, depots, dashboard, weights })) writeFileSync(`src/mocks/${n}.json`, JSON.stringify(v, null, 2));
console.log("mocks written", requests.map(r=>`${r.area}:${r.score.total}`).join(" "));

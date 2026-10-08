const {buildSync}=require('esbuild');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'farm-layout-'));
function load(file){const outfile=path.join(tmp,path.basename(file)+'.cjs');buildSync({entryPoints:[file],outfile,bundle:true,platform:'node',format:'cjs',logLevel:'silent'});return require(outfile);}
try {
 const {getLayout,slotLocation,normalizeLayout}=load('src/utils/farmLayout.ts');
 const {defaultAppData,normalizeAppData}=load('src/storage/legacy.ts');
 const config={...defaultAppData().config,totalTrays:36,farmLayout:{rackCount:3,shelvesPerRack:3,traysPerShelf:4}};
 assert.deepEqual(slotLocation(1,config),{rack:0,shelf:0,position:1});
 assert.deepEqual(slotLocation(12,config),{rack:0,shelf:2,position:4});
 assert.deepEqual(slotLocation(13,config),{rack:1,shelf:0,position:1});
 assert.deepEqual(slotLocation(36,config),{rack:2,shelf:2,position:4});
 const vertical={...config,farmLayout:{rackCount:6,shelvesPerRack:6,traysPerShelf:1}};
 assert.deepEqual(slotLocation(6,vertical),{rack:0,shelf:5,position:1});
 assert.deepEqual(slotLocation(7,vertical),{rack:1,shelf:0,position:1});
 assert.equal(slotLocation(37,config),null);assert.equal(slotLocation(undefined,config),null);
 assert.deepEqual(getLayout({...config,totalTrays:10,farmLayout:undefined}),{rackCount:2,shelvesPerRack:6,traysPerShelf:1});
 for(const value of [null,{}, {rackCount:0,shelvesPerRack:3,traysPerShelf:4},{rackCount:1.5,shelvesPerRack:3,traysPerShelf:4},{rackCount:100,shelvesPerRack:100,traysPerShelf:4}])assert.equal(normalizeLayout(value),undefined);
 assert.deepEqual(normalizeAppData({config}).config.farmLayout,config.farmLayout);
 assert.equal(normalizeAppData({config:{...config,totalTrays:10}}).config.farmLayout,undefined);
 const old=normalizeAppData({config:{totalTrays:15},batches:[{id:'old',trayId:'T007',trayNumber:7,stage:'growth',cropType:'Radish',createdAt:'2026-01-01'}]});
 assert.equal(old.batches[0].trays[0].code,'T007');assert.equal(old.batches[0].trays[0].slot,7);assert.equal(old.config.totalTrays,15);
 assert.deepEqual(normalizeAppData(JSON.parse(JSON.stringify(old))),old);
 console.log('PASS: rack boundaries, partial legacy shelf, invalid layout, capacity mismatch and lossless legacy migration / round trip.');
}finally{fs.rmSync(tmp,{recursive:true,force:true})}

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, 'ride.html'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'SVG and HTML IDs must be unique');
for (const match of html.matchAll(/(?:href="#|url\(#)([\w-]+)/g)) assert.ok(ids.includes(match[1]), `Missing SVG reference: ${match[1]}`);
function element() {
  const attrs = {}, listeners = {}, classes = new Set();
  return {attrs,listeners,style:{},dataset:{},textContent:'',setAttribute(key,value){attrs[key]=String(value)},addEventListener(type,fn){listeners[type]=fn},classList:{toggle(key,force){const on=force===undefined?!classes.has(key):force;on?classes.add(key):classes.delete(key);return on},contains(key){return classes.has(key)}}};
}
const nodes = Object.fromEntries(ids.map(id=>[id,element()]));
const speeds = [.6,1,1.6].map(speed=>Object.assign(element(),{dataset:{speed}}));
const frameQueue = new Map();
let nextFrame=0;
const test = {};
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
// Expose the actual production drawing function only inside this isolated test VM.
vm.runInNewContext(script.replace('draw(0.35);','__test.draw = draw; draw(0.35);'), {
  __test:test,document:{hidden:false,getElementById:id=>{assert.ok(nodes[id],id);return nodes[id]},querySelectorAll:()=>speeds,addEventListener(){}},
  window:{matchMedia:()=>({matches:false,addEventListener(){}})},
  requestAnimationFrame:fn=>{frameQueue.set(++nextFrame,fn);return nextFrame},cancelAnimationFrame:id=>frameQueue.delete(id)
});
function pawAt(id,time) {
  test.draw(time);
  const [x,y]=nodes[id].attrs.transform.match(/translate\(([^)]+)\)/)[1].split(' ').map(Number);
  const bob=Number(nodes.dog.attrs.transform.match(/translate\(0 ([^)]+)\)/)[1]);
  return {x,y:y+bob};
}
const period=2*Math.PI/6.3;
for(const [id,phase] of [['dogBackPaw',0],['dogFrontPaw',Math.PI]]) {
  const timeAt=progress=>((progress-phase/(2*Math.PI)+1)%1)*period;
  const plantedA=pawAt(id,timeAt(.12)),plantedB=pawAt(id,timeAt(.30));
  assert.ok(plantedB.x<plantedA.x,`${id}: planted foot pushes backward`);
  assert.ok(Math.abs(plantedA.y-697)<1e-7 && Math.abs(plantedB.y-697)<1e-7,`${id}: planted paw stays on the ground despite body bounce`);
  assert.ok(Math.abs((plantedA.x-plantedB.x)/(.18*period)-110)<1e-7,`${id}: planted paw matches road speed`);
  const liftedA=pawAt(id,timeAt(.65)),liftedB=pawAt(id,timeAt(.85));
  assert.ok(liftedB.x>liftedA.x,`${id}: lifted foot travels forward`);
  assert.ok(liftedA.y<693 && liftedB.y<693,`${id}: recovery phase clears the ground`);
  const end=pawAt(id,timeAt(.999999)),start=pawAt(id,timeAt(0));
  assert.ok(Math.hypot(end.x-start.x,end.y-start.y)<.001,`${id}: no cycle wrap jump`);
}
const fabric=['skirtBody','skirtHem','legRevealPath','skirtFolds','skirtShade','skirtHighlight'];
test.draw(.1); const before=fabric.map(id=>nodes[id].attrs.d);
test.draw(.9); fabric.forEach((id,i)=>assert.notEqual(nodes[id].attrs.d,before[i],`${id} follows pedaling`));
for(let t=0;t<20;t+=1/60) {
  test.draw(t);
  assert.ok(nodes.skirtBody.attrs.d.startsWith('M760 478Q792 493 828 481'),'Waistband stays attached to seated hips');
  Object.values(nodes).forEach(node=>Object.values(node.attrs).forEach(value=>assert.ok(!/NaN|Infinity/.test(value),'All animated coordinates are finite')));
}
nodes.playButton.listeners.click();assert.equal(frameQueue.size,0,'Pause stops all procedural animation');
nodes.playButton.listeners.click();assert.equal(frameQueue.size,1,'Resume starts exactly one frame loop');
speeds[2].listeners.click();assert.equal(speeds[2].attrs['aria-pressed'],'true');
nodes.themeButton.listeners.click();assert.ok(nodes.sceneCard.classList.contains('day'));
nodes.themeButton.listeners.click();assert.ok(!nodes.sceneCard.classList.contains('day'));
console.log('PASS: forward dog gait, ground contact and road speed, continuous stride, dynamic skirt and fixed waistband, 1,200 animation frames, SVG references, pause/speed/day-night controls.');

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

const handlerStart = app.indexOf("document.addEventListener('keydown',e=>{");
if (handlerStart < 0) throw new Error('Missing global keyboard handler.');

const handlerEnd = app.indexOf('\n});', handlerStart);
if (handlerEnd < 0) throw new Error('Could not read global keyboard handler.');

const handler = app.slice(handlerStart, handlerEnd);

const gateMarker = "if(isCoachFirstMode()&&currentMode==='browse'&&(e.code==='Space'||e.code==='ArrowDown'||e.code==='ArrowUp')){";
if (!handler.includes(gateMarker)) {
  throw new Error('Coach-first mode must gate browse-list keyboard shortcuts before they can speak sentence-list items.');
}
if (!handler.includes('goToTodayPlan();')) {
  throw new Error('Coach-first keyboard gate must return learners to the guided plan.');
}

const gateIndex = handler.indexOf(gateMarker);
const spaceIndex = handler.indexOf("if(e.code==='Space'){", gateIndex + 1);
const arrowDownIndex = handler.indexOf("if(e.code==='ArrowDown'){");
const arrowUpIndex = handler.indexOf("if(e.code==='ArrowUp'){");

if (spaceIndex < 0 || arrowDownIndex < 0 || arrowUpIndex < 0) {
  throw new Error('Keyboard handler must still include browse Space and Arrow shortcuts after coach-first mode.');
}
if (gateIndex > spaceIndex || gateIndex > arrowDownIndex || gateIndex > arrowUpIndex) {
  throw new Error('Coach-first keyboard gate must run before browse Space or Arrow shortcuts.');
}

console.log('Coach-first keyboard browse gate validation passed.');

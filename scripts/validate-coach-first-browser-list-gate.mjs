import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

function mustInclude(source, marker, message) {
  if (!source.includes(marker)) throw new Error(message || `Missing marker: ${marker}`);
}

const render = extractFunction('render');
mustInclude(render, 'if(isCoachFirstMode()&&currentMode===\'browse\'){', 'Coach-first browse mode must gate the full sentence list.');
mustInclude(render, 'Finish one guided lesson to unlock sentence browsing on this device.', 'Coach-first browse gate must explain when browsing unlocks.');
mustInclude(render, 'updateProgress();', 'Coach-first browse gate must still refresh progress and the Today plan.');

const gateIndex = render.indexOf("if(isCoachFirstMode()&&currentMode==='browse'){");
const categoriesIndex = render.indexOf('cats.forEach');
if (gateIndex < 0 || categoriesIndex < 0 || gateIndex > categoriesIndex) {
  throw new Error('Coach-first browse gate must run before category rendering exposes the sentence list.');
}

console.log('Coach-first browser list gate validation passed.');

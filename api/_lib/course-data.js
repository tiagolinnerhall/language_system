const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DATA_DIR = path.join(__dirname, '..', '_data', 'russian');
let cachedRussian = null;

function loadRussianCourse() {
  if (cachedRussian) return cachedRussian;
  const rows = [];
  for (let i = 1; i <= 5; i++) {
    const variable = `SENTENCES${i}`;
    const filePath = path.join(DATA_DIR, `data${i}.js`);
    const code = `${fs.readFileSync(filePath, 'utf8')}\n;globalThis.__DATA__=${variable};`;
    const context = {};
    vm.createContext(context);
    vm.runInContext(code, context, { filename: `data${i}.js` });
    rows.push(...context.__DATA__);
  }
  cachedRussian = rows;
  return rows;
}

module.exports = { loadRussianCourse };

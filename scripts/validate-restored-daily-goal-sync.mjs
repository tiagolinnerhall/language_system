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

const syncDailyGoalFromStats = extractFunction('syncDailyGoalFromStats');
mustInclude(syncDailyGoalFromStats, 'if(userStats.dailyGoal)dailyNewGoal=userStats.dailyGoal;', 'Daily-goal sync must copy restored stats into the current study session goal.');

const normalizeStoredProgress = extractFunction('normalizeStoredProgress');
mustInclude(normalizeStoredProgress, 'syncDailyGoalFromStats();', 'Startup progress normalization must refresh the active daily goal after stats are sanitized.');

const importProgressBackup = extractFunction('importProgressBackup');
const statsAssignIndex = importProgressBackup.indexOf('userStats=statsResult.value;');
const syncIndex = importProgressBackup.indexOf('syncDailyGoalFromStats();');
const renderIndex = importProgressBackup.indexOf('updateProgress();');
if (statsAssignIndex < 0 || syncIndex < 0 || renderIndex < 0 || !(statsAssignIndex < syncIndex && syncIndex < renderIndex)) {
  throw new Error('Progress restore must refresh the active daily goal after sanitized stats are assigned and before the UI re-renders.');
}

const initBlock = app.slice(app.indexOf('(function(){'));
if (initBlock.includes('if(userStats.dailyGoal)dailyNewGoal=userStats.dailyGoal;')) {
  throw new Error('Daily-goal startup sync should use the shared syncDailyGoalFromStats helper.');
}

console.log('Restored daily-goal sync validation passed.');

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

const getTodayPlanSummary = extractFunction('getTodayPlanSummary');

mustInclude(
  getTodayPlanSummary,
  'const remainingNew=Math.max(0,(userStats.dailyGoal||dailyNewGoal)-(stats.todayNew||0));',
  'Today plan must calculate the remaining daily new-card budget.'
);
mustInclude(
  getTodayPlanSummary,
  'const newPlanned=getNewSentences(remainingNew).length;',
  'Today plan must show actual available new cards, not just the remaining daily goal.'
);

if (getTodayPlanSummary.includes("const newPlanned=Math.max(0,(userStats.dailyGoal||dailyNewGoal)-(stats.todayNew||0));")) {
  throw new Error('Today plan must not advertise unavailable new cards from the raw daily goal.');
}

const remainingIndex = getTodayPlanSummary.indexOf('const remainingNew=');
const newPlannedIndex = getTodayPlanSummary.indexOf('const newPlanned=getNewSentences(remainingNew).length;');
const weakIndex = getTodayPlanSummary.indexOf('const weakCount=Object.keys(reviewBin).length;');

if (remainingIndex < 0 || newPlannedIndex < 0 || weakIndex < 0) {
  throw new Error('Today plan available-new validation could not inspect summary order.');
}

if (!(remainingIndex < newPlannedIndex && newPlannedIndex < weakIndex)) {
  throw new Error('Today plan must resolve available new cards before choosing the next action.');
}

console.log('Today plan available-new count validation passed.');

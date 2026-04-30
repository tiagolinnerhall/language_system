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

const planSummary = extractFunction('getTodayPlanSummary');
const dueBranch = planSummary.indexOf('dueCount>0');
const weakBranch = planSummary.indexOf('weakCount>0');
const newCompleteBranch = planSummary.indexOf('newPlanned===0');
if (dueBranch < 0 || weakBranch < 0) {
  throw new Error('Today plan must handle both due reviews and weak repair.');
}
if (dueBranch > weakBranch) {
  throw new Error('Today plan must prioritize due reviews before weak repair.');
}
if (newCompleteBranch < 0 || weakBranch < newCompleteBranch) {
  throw new Error('Today plan must keep guided new sentences before weak repair.');
}

const studyStart = extractFunction('showStudyStart');
mustInclude(studyStart, 'const weakCount=Object.keys(reviewBin).length;', 'Study start must count weak sentences.');
mustInclude(studyStart, "Weak Sentences", 'Study start must show weak sentence count.');
mustInclude(studyStart, "Review weak sentences", 'Study start must offer weak repair when guided reviews and new cards are done.');
mustInclude(studyStart, "You still have weak sentences waiting.", 'Study start must not say the day is done while weak repair remains.');

const autopilotNext = extractFunction('getAutopilotNextStep');
const dueNextBranch = autopilotNext.indexOf('dueCount>0');
const weakNextBranch = autopilotNext.indexOf('weakCount>0');
if (dueNextBranch < 0 || weakNextBranch < 0) {
  throw new Error('Session summary must handle both remaining due reviews and weak repair.');
}
if (dueNextBranch > weakNextBranch) {
  throw new Error('Session summary must keep remaining due reviews before weak repair.');
}

const practicePicker = extractFunction('pickPracticeIndex');
const duePracticeBranch = practicePicker.indexOf('const due=getDueReviews();');
const weakPracticeBranch = practicePicker.indexOf('const weak=Object.keys(reviewBin)');
if (duePracticeBranch < 0 || weakPracticeBranch < 0) {
  throw new Error('Standalone practice must consider both due reviews and weak repair.');
}
if (duePracticeBranch > weakPracticeBranch) {
  throw new Error('Standalone cloze and dictation must keep due reviews before weak repair.');
}

console.log('Guided study flow validation passed.');

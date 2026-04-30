import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

const bannedTone = [
  { marker: "You've mastered the entire course!", reason: 'overclaims mastery from local completion' },
  { marker: 'More than halfway to full mastery!', reason: 'frames progress as mastery instead of practice' },
  { marker: 'You can handle most daily conversations!', reason: 'overclaims conversation ability' },
  { marker: "You're on a roll!", reason: 'uses hype instead of practical study guidance' },
  { marker: 'Triple digits - amazing progress!', reason: 'uses hype instead of neutral coaching' },
  { marker: "You're picking up speed!", reason: 'uses hype instead of practical study guidance' },
  { marker: 'Great start, keep it up!', reason: 'uses hype instead of practical study guidance' },
  { marker: "You're on your way!", reason: 'uses hype instead of practical study guidance' },
  { marker: 'Review bin is empty! Great job!', reason: 'uses hype instead of neutral completion guidance' },
  { marker: 'Session Complete!', reason: 'uses completion hype instead of study-loop status' },
];

for (const item of bannedTone) {
  if (app.includes(item.marker)) {
    throw new Error(`Neutral coach tone guard failed: "${item.marker}" ${item.reason}.`);
  }
}

const requiredCopy = [
  'Course path completed. Keep reviewing so the sentences stay available.',
  'Halfway through the course path. Keep the review habit steady.',
  'You have a broad daily-life base. Keep using reviews before new work.',
  '250 sentences saved. Keep reviews due-first before adding more.',
  'Triple digits. Keep the review loop steady.',
  '50 sentences saved. Keep the habit small and regular.',
  '25 sentences saved. Continue with short guided sessions.',
  'First milestone saved. Keep using the guided path.',
  'Review bin is empty. Return to the guided plan when you are ready.',
  "Today's Guided Lesson Saved",
];

for (const marker of requiredCopy) {
  if (!app.includes(marker)) {
    throw new Error(`Neutral coach tone guard missing copy: ${marker}`);
  }
}

console.log('Neutral coach tone validation passed.');

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const appHtml = await readFile(join(root, 'app.html'), 'utf8');

const required = [
  'teacherLiveControlsHTML',
  'teacherStudyModeControlsHTML',
  'teacherAutopilotEnabled',
  "teacherSetMode('self')",
  "teacherSetMode('autopilot')",
  'Self-guided',
  'AI Teacher Autopilot',
  'Start Live Teacher',
  'Hear AI voice guide',
  'Pause Listening',
  'teacherStartLiveListening',
  'teacherListenToggle()'
];

for (const marker of required) {
  if (!appHtml.includes(marker)) {
    throw new Error(`Missing teacher discoverability marker: ${marker}`);
  }
}

console.log('Teacher discoverability validation passed.');

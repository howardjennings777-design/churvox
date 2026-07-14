#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const sourcePath = path.join(__dirname, '..', 'src', 'churvox-office-lab', 'OfficeTeamWorkerRoute.jsx');
const source = fs.readFileSync(sourcePath, 'utf8');

function count(needle) {
  return source.split(needle).length - 1;
}

const checks = [
  {
    ok: count('checkWorkerProofCoach(jobId') === 1,
    message: `expected one Worker Proof Coach completion check, found ${count('checkWorkerProofCoach(jobId')}`,
  },
  {
    ok: count('className="cvWorkerProofCoach"') === 1,
    message: `expected one Worker Proof Coach panel, found ${count('className="cvWorkerProofCoach"')}`,
  },
  {
    ok: source.includes('aria-label="Worker job note"'),
    message: 'worker job note section is missing',
  },
  {
    ok: source.includes('placeholder="What changed on this job?"'),
    message: 'worker proof/completion note input is missing',
  },
  {
    ok: source.includes('const [sentProofNames, setSentProofNames] = useState([]);'),
    message: 'sent photo proof is not preserved after the file picker clears',
  },
  {
    ok: source.includes('const proofNames = [...new Set([...sentProofNames, ...selectedProofNames])];'),
    message: 'completion does not combine sent and newly selected proof photos',
  },
  {
    ok: source.includes('setSentProofNames((currentNames) => [...new Set([...currentNames, ...selectedProofNames])]);'),
    message: 'successful proof sends are not recorded for the later Complete check',
  },
];

const failures = checks.filter((check) => !check.ok).map((check) => check.message);
if (failures.length) {
  console.error(`Worker proof contract failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Worker proof contract passed: one proof panel, one completion check, one job note, and sent photo proof persists through Complete.');

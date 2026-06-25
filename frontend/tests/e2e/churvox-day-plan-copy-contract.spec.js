const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readFreshSource(filename) {
  const roots = [process.cwd(), path.join(process.cwd(), 'frontend'), path.join(process.cwd(), '..'), path.join(process.cwd(), '..', 'frontend')];

  for (const root of roots) {
    const candidates = [
      path.join(root, 'src', 'churvox-fresh', filename),
      path.join(root, 'frontend', 'src', 'churvox-fresh', filename),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
    }
  }

  throw new Error(`Unable to find frontend/src/churvox-fresh/${filename} from ${process.cwd()}`);
}

test.describe('Churvox day plan copy contracts', () => {
  test('day planning is named as a reviewed plan, not a planning chore', () => {
    const shell = readFreshSource('FreshShell.jsx');
    const todaysWork = readFreshSource('FreshTodaysWork.jsx');

    expect(shell).toContain("Today's Plan");
    expect(shell).toContain("review today's plan");
    expect(todaysWork).toContain("<h1>Today's Plan</h1>");
    expect(todaysWork).toContain('Review in Command');
    expect(todaysWork).toContain('Command handles unfinished, doing, blocked and follow-up work');

    expect(shell).not.toContain('Plan My Day');
    expect(todaysWork).not.toContain('Plan My Day');
  });
});

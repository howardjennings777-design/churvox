# Churvox Full Launch Audit

- Site: https://www.churvox.com
- Commit: da1ee877cd76259e8f6f9d5f20d9a9ad75cda444
- Run: 29090616388
- Status code: 1
- Time: Fri Jul 10 11:50:18 UTC 2026

## Output
```txt
Error: Cannot find module '@playwright/test'
Require stack:
- /home/runner/work/churvox/churvox/frontend/playwright.config.js
- /home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/common/index.js
- /home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/program.js
- /home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/cli.js
    at Function.Module._resolveFilename (node:internal/modules/cjs/loader:1207:15)
    at Function.resolveFilename [as _resolveFilename] (/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/common/index.js:1185:36)
    at Function.Module._load (node:internal/modules/cjs/loader:1038:27)
    at Module.require (node:internal/modules/cjs/loader:1289:19)
    at require (node:internal/modules/helpers:182:18)
    at Object.<anonymous> (/home/runner/work/churvox/churvox/frontend/playwright.config.js:1:35)
    at Module._compile (node:internal/modules/cjs/loader:1521:14)
    at Module.newCompile2 (/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/common/index.js:921:29)
    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1623:10)
    at Object.newLoader2 [as .js] (/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/common/index.js:927:22)
    at Module.load (node:internal/modules/cjs/loader:1266:32)
    at Function.Module._load (node:internal/modules/cjs/loader:1091:12)
    at Module.require (node:internal/modules/cjs/loader:1289:19)
    at require (node:internal/modules/helpers:182:18)
    at requireOrImport (/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/common/index.js:1149:18)
    at loadUserConfig (/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/common/index.js:1334:52)
    at loadConfig (/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/common/index.js:1341:28)
    at Object.loadConfigFromFile (/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/common/index.js:1553:10)
    at runTests (/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/cli/testActions.js:46:18)
    at _Command.<anonymous> (/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/program.js:53:7) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [
    '/home/runner/work/churvox/churvox/frontend/playwright.config.js',
    '/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/common/index.js',
    '/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/lib/program.js',
    '/home/runner/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/cli.js'
  ]
}
```

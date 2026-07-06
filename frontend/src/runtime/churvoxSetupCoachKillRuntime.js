import './churvoxWorkerMapPinRuntime';

function killSetupCoach(){
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-churvox-setup-coach], .cvxSetupCoach').forEach((node) => node.remove());
}

killSetupCoach();
[0, 150, 400, 900, 1800, 3500].forEach((delay) => setTimeout(killSetupCoach, delay));
window.addEventListener('hashchange', killSetupCoach);
window.addEventListener('popstate', killSetupCoach);
window.addEventListener('churvox-owner-app-ready', killSetupCoach);
window.addEventListener('churvox:data-refresh', killSetupCoach);

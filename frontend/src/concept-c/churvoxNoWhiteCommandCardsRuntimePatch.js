// CHURVOX_NO_WHITE_COMMAND_CARDS_RUNTIME_PATCH_20260601
// Safe visual-only style injection. No DOM mutation, no observers, no backend/data/form changes.

function injectNoWhiteCommandCards() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('churvox-no-white-command-cards')) return;

  const style = document.createElement('style');
  style.id = 'churvox-no-white-command-cards';
  style.textContent = `
    main.fixed.inset-0 .bg-white,
    main.fixed.inset-0 .bg-slate-50,
    main.fixed.inset-0 .bg-slate-100,
    main.fixed.inset-0 .bg-blue-50,
    main.fixed.inset-0 .bg-amber-50,
    main.fixed.inset-0 .bg-orange-50,
    main.fixed.inset-0 .bg-red-50,
    main.fixed.inset-0 .bg-emerald-50 {
      background: linear-gradient(135deg, rgba(22,39,68,.96), rgba(30,58,100,.68)) !important;
      border-color: rgba(103,232,249,.24) !important;
      color: #eaf4ff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 14px 40px rgba(0,0,0,.18) !important;
    }

    main.fixed.inset-0 .text-slate-950,
    main.fixed.inset-0 .text-slate-900,
    main.fixed.inset-0 .text-slate-800 {
      color: #f8fbff !important;
    }

    main.fixed.inset-0 .text-slate-700,
    main.fixed.inset-0 .text-slate-600,
    main.fixed.inset-0 .text-slate-500,
    main.fixed.inset-0 .text-slate-400 {
      color: #b8c7da !important;
    }

    main.fixed.inset-0 .text-red-700,
    main.fixed.inset-0 .text-red-800,
    main.fixed.inset-0 .text-red-900,
    main.fixed.inset-0 .text-red-950 { color: #fecaca !important; }

    main.fixed.inset-0 .text-orange-700,
    main.fixed.inset-0 .text-orange-800,
    main.fixed.inset-0 .text-orange-900,
    main.fixed.inset-0 .text-amber-700,
    main.fixed.inset-0 .text-amber-800,
    main.fixed.inset-0 .text-amber-900,
    main.fixed.inset-0 .text-amber-950 { color: #fde68a !important; }

    main.fixed.inset-0 .text-blue-700,
    main.fixed.inset-0 .text-blue-800,
    main.fixed.inset-0 .text-blue-900,
    main.fixed.inset-0 .text-blue-950 { color: #bae6fd !important; }

    main.fixed.inset-0 .text-emerald-700,
    main.fixed.inset-0 .text-emerald-800,
    main.fixed.inset-0 .text-emerald-900,
    main.fixed.inset-0 .text-emerald-950 { color: #bbf7d0 !important; }

    main.fixed.inset-0 span.rounded-full,
    main.fixed.inset-0 .inline-flex.rounded-full {
      background: rgba(103,232,249,.14) !important;
      border-color: rgba(103,232,249,.30) !important;
      color: #67e8f9 !important;
    }

    main.fixed.inset-0 a.bg-white,
    main.fixed.inset-0 button.bg-white {
      background: rgba(255,255,255,.08) !important;
      color: #eaf4ff !important;
      border-color: rgba(103,232,249,.24) !important;
    }

    main.fixed.inset-0 aside .bg-white {
      background: #67e8f9 !important;
      color: #07111f !important;
    }

    main.fixed.inset-0 aside .bg-white span,
    main.fixed.inset-0 aside .bg-white div {
      color: #07111f !important;
    }
  `;
  document.head.appendChild(style);
}

injectNoWhiteCommandCards();
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', injectNoWhiteCommandCards);
  window.addEventListener('load', injectNoWhiteCommandCards);
}

export default null;

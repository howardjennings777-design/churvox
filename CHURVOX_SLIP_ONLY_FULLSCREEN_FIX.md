# Churvox Slip Only Fullscreen Fix

## Changed
- Review flow is slip-first.
- Open slip wording changed to Review slip.
- Invoice record / Quote record / Job record buttons are hidden from normal cards.
- Command Board slip modal forced full screen.
- Runtime cleanup removes any leftover record buttons that still render.

## Files changed
- `frontend/src/pages/IntegrationsCommandPage.jsx`
- `frontend/src/pages/AutomationCommandPage.jsx`
- `frontend/src/pages/ReportsCommandPage.jsx`
- `frontend/src/pages/AIOperatorCommandPage.jsx`
- `frontend/src/pages/InvoicesCommandPage.jsx`
- `frontend/src/pages/DispatchCommandPage.jsx`
- `frontend/src/pages/TeamCommandPage.jsx`
- `frontend/src/pages/NotificationsCommandPage.jsx`
- `frontend/src/pages/JobsCommandPage.js`
- `frontend/src/pages/CommandRestPages.jsx`
- `frontend/src/pages/QuotesCommandPage.jsx`
- `frontend/src/pages/MoneyDeskCommandPage.jsx`
- `frontend/src/pages/CommandDeskSlipHomePage.js`
- `frontend/src/pages/PayrollCommandPage.jsx`

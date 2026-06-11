# New User Guide Audit

Generated: 2026-06-11T05:29:17Z

**Score:** 100%
**Pass:** 11/11

| Check | Status | Evidence | Fix |
|---|---:|---|---|
| Backend progress endpoint exists | **PASS** | Backend returns guide progress. | Add /api/onboarding/progress. |
| Backend stores progress | **PASS** | Guide progress is stored in Mongo. | Store guide progress. |
| Backend checks real data | **PASS** | Guide checks clients/jobs/invoices. | Use real data counts. |
| Backend checks Command | **PASS** | Command progress is checked. | Check command slips. |
| Smart Hub shows guide | **PASS** | Guide appears on Smart Hub. | Add compact guide to Smart Hub. |
| Full wizard uses guide | **PASS** | First Run Wizard uses real guide. | Use real guide in wizard. |
| Guide has one next action | **PASS** | Guide focuses one next action. | Show one next action. |
| Guide can mark manual done | **PASS** | User can mark a step done. | Add manual done. |
| Guide can skip/resume | **PASS** | User can skip/resume guide. | Add skip/resume. |
| Guide sends to Command | **PASS** | Setup help can be sent to Command. | Add Command slip. |
| Guide CSS imported | **PASS** | Guide CSS imported. | Import CSS. |
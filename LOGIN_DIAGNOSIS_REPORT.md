# Churvox Live Login Diagnosis

Generated: 2026-05-17T21:16:27.320Z
Email: howardjennings77@gmail.com
Password length: 8

## 1. Direct backend login endpoint checks
- /api/auth/login: 200 ✅
  {"id":"69e1314da608989d53a336b9","email":"howardjennings77@gmail.com","name":"Random az","business_name":null,"role":"employer","plan":"enterprise","plan_status":"paid","subscription_status":"active","trial_ends_at":"2026-04-30T18:58:19.485000","stripe_subscription_id":"sub_1TOrxRQU7d36VEkJpI0U3cOD","gst_rate":15.0,"trade_type":"other","business_id":"69e1314da608989d53a336b9","onboarding_completed":false,"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWUxMzE0ZGE2MDg5ODlkNTNhMzM2YjkiLCJlbWFpbCI6Imhvd2FyZGplbm5pbmdzNzdAZ21haWwuY29tIiwiZXhwIjoxNzc5MTM4OTg4LCJ0eXBlIjoiYWNjZXNzIn0.4v_GBz6uUuqfea_-PiY4g7EflT6Tn8g2xcWWLT4vj2k"}
- /api/login: 405 ❌
  {"detail":"Method Not Allowed"}
- /api/owner/login: 405 ❌
  {"detail":"Method Not Allowed"}
- /api/admin/login: 405 ❌
  {"detail":"Method Not Allowed"}
- /auth/login: 405 ❌
  {"detail":"Method Not Allowed"}

## 2. Browser UI login check
Email input count: 1
Password input count: 1
Submitting the actual login form.

## 3. Browser result
Final URL: https://www.churvox.com/dashboard
Auth input count after login: 0
Body preview: CHURVOX Dashboard Work Clients Crew Quotes Invoices Proof & Pay Payroll Plans Settings Log out COMMAND DESK Churvox prepares the admin.You approve the next move. Work comes in, Churvox checks the admin path, then shows the owner one clean approval slip. Plan Start New inputs 0 Prepared 17 Approvals 17 17Ready for approval Owner-ready admin waiting for your decision. › 8Ready to invoice Completed work ready for invoice prep. › 0Crew active today Worker notes, proof and updates flowing in. › TODAY’S COMMAND BRIEFING Churvox found 31 business signals. Open the app and see what needs action without hunting through every page. 17 Needs approval Owner decisions waiting. 0 Jobs need crew Unassigned

LocalStorage keys:
{
  "churvox_cache_fix_version": "churvox-theme-reset-20260517065540",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWUxMzE0ZGE...len=220",
  "churvox_user": "{}",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWUxMzE0ZGE...len=220",
  "churvox_fast_live_data_cache_v1": "{\"savedAt\":1779052602373,\"state\":{\"loading\":false,\"error\":\"\"...len=25574",
  "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWUxMzE0ZGE...len=220"
}

Cookie names:
access_token@grassley-backend.onrender.com, refresh_token@grassley-backend.onrender.com

API hits:
- 200 https://grassley-backend.onrender.com/api/auth/login
- 200 https://grassley-backend.onrender.com/api/billing/status
- 200 https://grassley-backend.onrender.com/api/public-job-requests
- 200 https://grassley-backend.onrender.com/api/setup/ai-audit
- 200 https://grassley-backend.onrender.com/api/invoices
- 200 https://grassley-backend.onrender.com/api/clients
- 200 https://grassley-backend.onrender.com/api/recurring-jobs
- 200 https://grassley-backend.onrender.com/api/quotes
- 200 https://grassley-backend.onrender.com/api/reports/cashflow
- 200 https://grassley-backend.onrender.com/api/service-templates
- 200 https://grassley-backend.onrender.com/api/reports/quotes
- 200 https://grassley-backend.onrender.com/api/team/workers

Console hits:
- None.

✅ VERDICT: Login appears to stick.

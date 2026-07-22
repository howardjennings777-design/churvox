const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");
const readFrontend = (relativePath) => fs.readFileSync(path.join(FRONTEND_ROOT, relativePath), "utf8");
const readRepo = (relativePath) => fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");

test.describe("Churvox owner-approved record contract", () => {
  test("maps every quick-preparation type into fields the Command apply engine stores", async () => {
    const quickPrepare = readFrontend("src/churvox-office-os/OfficeOSQuickPrepare.jsx");
    const applyRoutes = readRepo("backend/churvox_command_apply_routes.py");

    expect(quickPrepare).toContain('compact({ name: title, phone: person, email: when, address: details, notes })');
    expect(quickPrepare).toContain('compact({ title, client: person, scope: details, price: amount');
    expect(quickPrepare).toContain('compact({ job: title, client: person, line_items: details, total: amount');
    expect(quickPrepare).toContain('compact({ subject: title, client: person, message: details, reply: notes');
    expect(quickPrepare).toContain('compact({ worker: person, job: title, hours: when, issue: details, notes })');

    expect(quickPrepare).toContain('if (areaId === "clients") return ["name"]');
    expect(quickPrepare).toContain('if (areaId === "work") return ["title", "notes"]');
    expect(quickPrepare).toContain('if (areaId === "quotes") return ["title", "scope"]');
    expect(quickPrepare).toContain('if (areaId === "invoices") return ["job", "line_items"]');
    expect(quickPrepare).toContain('if (areaId === "messages") return ["subject", "message"]');
    expect(quickPrepare).toContain('if (areaId === "staff") return ["worker", "issue"]');

    expect(quickPrepare).toContain('approval: "Approve and create client"');
    expect(quickPrepare).toContain('approval: "Approve and create job draft"');
    expect(quickPrepare).toContain('approval: "Approve and create quote draft"');
    expect(quickPrepare).toContain('approval: "Approve and create invoice draft"');
    expect(quickPrepare).toContain('approval: "Approve and create message draft"');
    expect(quickPrepare).toContain('approval: "Approve and create staff review"');

    expect(applyRoutes).toContain('return "clients", "client"');
    expect(applyRoutes).toContain('return "quotes", "quote"');
    expect(applyRoutes).toContain('return "invoices", "invoice"');
    expect(applyRoutes).toContain('return "message_drafts", "message_draft"');
    expect(applyRoutes).toContain('return "payroll_reviews", "payroll_review"');
    expect(applyRoutes).toContain('async def insert_prepared_records');
    expect(applyRoutes).toContain('@router.post("/command/slips/{slip_id}/approve")');
    expect(applyRoutes).toContain('if should_apply(action):');
    expect(applyRoutes).toContain('unresolved_requirements');
  });

  test("stores drafts and reviews only while all external side effects remain locked", async () => {
    const quickPrepare = readFrontend("src/churvox-office-os/OfficeOSQuickPrepare.jsx");
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");
    const applyRoutes = readRepo("backend/churvox_command_apply_routes.py");

    for (const lock of ["no_auto_send", "no_auto_sync", "no_auto_charge", "no_auto_record_change"]) {
      expect(quickPrepare).toContain(`${lock}: true`);
    }
    expect(quickPrepare).toContain("Prepare it here. Approve it in Command.");
    expect(quickPrepare).toContain("Review it there before the record is created.");

    expect(desk).toContain("Draft only. Nothing was sent, synced, charged or marked paid.");
    expect(desk).toContain("Draft only. No email, SMS or notification was sent.");
    expect(desk).toContain("Review only. Nobody was paid and no tax or bank file was created.");

    expect(applyRoutes).toContain('"status": "draft_approved"');
    expect(applyRoutes).toContain('"no_auto_send": True');
    expect(applyRoutes).toContain('"no_auto_sync": True');
    expect(applyRoutes).toContain('"no_auto_charge": True');
    expect(applyRoutes).toContain('"no_auto_file_tax": True');
  });
});

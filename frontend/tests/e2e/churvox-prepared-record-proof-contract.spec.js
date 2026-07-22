const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");
const readFrontend = (relativePath) => fs.readFileSync(path.join(FRONTEND_ROOT, relativePath), "utf8");
const readRepo = (relativePath) => fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");

test.describe("Churvox prepared Command record proof contract", () => {
  test("mounts live stored proof beside the complete Command approval desk", async () => {
    const wrapper = readFrontend("src/churvox-office-os/OfficeOSWorkingConnected.jsx");
    const panel = readFrontend("src/churvox-office-os/OfficeOSPreparedRecords.jsx");

    expect(wrapper).toContain('import OfficeOSPreparedRecords from "./OfficeOSPreparedRecords"');
    expect(wrapper).toContain("<OfficeOSPreparedRecords />");
    expect(panel).toContain('data-prepared-record-proof="true"');
    expect(panel).toContain('id: "message_drafts"');
    expect(panel).toContain('id: "payroll_reviews"');
    expect(panel).toContain("No email, SMS or notification was sent.");
    expect(panel).toContain("Nobody was paid and no tax or bank file was created.");
    expect(panel).toContain("BACKEND_COMMAND_EVENT");
  });

  test("uses an authenticated same-origin GET and never invents prepared records", async () => {
    const reader = readFrontend("src/churvox-office-os/preparedRecordProof.js");

    expect(reader).toContain("window.location.origin");
    expect(reader).toContain("/api/command/prepared-records/");
    expect(reader).toContain('method: "GET"');
    expect(reader).toContain('credentials: "include"');
    expect(reader).toContain('cache: "no-store"');
    expect(reader).not.toContain('method: "POST"');
    expect(reader).not.toContain("sample");
  });

  test("keeps the backend read owner-only, business-scoped and collection-limited", async () => {
    const patch = readRepo("backend/churvox_owner_cockpit_control_patch.py");

    expect(patch).toContain("PREPARED_COLLECTIONS = {");
    expect(patch).toContain('"message_drafts"');
    expect(patch).toContain('"payroll_reviews"');
    expect(patch).toContain("async def require_business_owner(request: Request):");
    expect(patch).toContain("role not in allowed and not user.get(\"is_admin\")");
    expect(patch).toContain("async def prepared_records(collection_name: str, request: Request, limit: int = 30):");
    expect(patch).toContain("db[collection].find(business_query(user))");
    expect(patch).toContain('("GET", "/api/command/prepared-records/{collection_name}", prepared_records)');
    expect(patch).toContain("No record was changed, sent, paid, filed or synced.");
  });
});

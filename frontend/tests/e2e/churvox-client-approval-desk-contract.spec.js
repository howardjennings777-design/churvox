const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");
const readFrontend = (relativePath) => fs.readFileSync(path.join(FRONTEND_ROOT, relativePath), "utf8");
const readRepo = (relativePath) => fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");

test.describe("Churvox connected owner approval desk contract", () => {
  test("wires one Command approval desk into the connected owner surface", async () => {
    const wrapper = readFrontend("src/churvox-office-os/OfficeOSWorkingConnected.jsx");
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");

    expect(wrapper).toContain('import OfficeOSApprovalDesk from "./OfficeOSApprovalDesk"');
    expect(wrapper).toContain("<OfficeOSApprovalDesk />");
    expect(desk).toContain('area !== "command"');
    expect(desk).toContain('data-owner-approved-record-desk="true"');
    expect(desk).toContain("Command approval desk");
    expect(desk).toContain("Approve prepared clients");
    expect(desk).toContain("Approve prepared jobs");
    expect(desk).toContain("Approve prepared quotes");
  });

  test("edits canonical client, job and quote fields before Command approval", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");

    for (const field of ["name", "phone", "email", "address", "title", "client", "date", "worker", "price", "notes", "scope", "follow_up"]) {
      expect(desk).toContain(`key: "${field}"`);
    }
    expect(desk).toContain('formTitle: "Owner-approved client record"');
    expect(desk).toContain('formTitle: "Owner-approved job draft"');
    expect(desk).toContain('formTitle: "Owner-approved quote draft"');
    expect(desk).toContain('actionFallback: "Approve and create client"');
    expect(desk).toContain('actionFallback: "Approve and create job draft"');
    expect(desk).toContain('actionFallback: "Approve and create quote draft"');
    expect(desk).toContain("connected_office_os_quick_prepare");
    expect(desk).toContain("recordBackendCommandDecision");
    expect(desk).toContain("response?.result?.execution?.applied");
    expect(desk).not.toContain('fetch("/api/clients');
    expect(desk).not.toContain('fetch("/api/jobs');
    expect(desk).not.toContain('fetch("/api/quotes');
    expect(desk).not.toContain('method: "POST"');
  });

  test("requires work detail before jobs or quotes can be approved", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");
    const quickPrepare = readFrontend("src/churvox-office-os/OfficeOSQuickPrepare.jsx");

    expect(desk).toContain("function requiredFieldsReady(draft, config)");
    expect(desk).toContain(".filter((field) => field.required)");
    expect(desk).toContain("if (!requiredFieldsReady(draft, config) || busyId) return");
    expect(desk).toContain("disabled={busy || Boolean(busyId) || !requiredReady}");
    expect(desk).toContain('{ key: "notes", label: "Scope and instructions", long: true, required: true }');
    expect(desk).toContain('{ key: "scope", label: "Scope", long: true, required: true }');
    expect(quickPrepare).toContain('if (areaId === "work") return ["title", "notes"]');
    expect(quickPrepare).toContain('if (areaId === "quotes") return ["title", "scope"]');
  });

  test("verifies approved records through live reads and the Command audit", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");

    expect(desk).toContain('liveArea: "clients"');
    expect(desk).toContain('liveArea: "work"');
    expect(desk).toContain('liveArea: "quotes"');
    expect(desk).toContain("loadOfficeArea(config.liveArea)");
    expect(desk).toContain("fetchBackendCommandAudit()");
    expect(desk).toContain("entry?.slipId === slipId");
    expect(desk).toContain('status.includes("approved_applied")');
    expect(desk).toContain("Command audit confirmed");
    expect(desk).toContain("cvosClientApprovalProof");
  });

  test("keeps repeat clicks, business scope and external side effects locked", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");
    const commandApi = readFrontend("src/churvox-office-lab/OfficeTeamCommandApi.js");
    const applyRoutes = readRepo("backend/churvox_command_apply_routes.py");

    expect(desk).toContain("if (!requiredFieldsReady(draft, config) || busyId) return");
    expect(desk).toContain("The backend approval route was not available. Nothing was created.");
    expect(desk).toContain("Nothing was sent, charged or synced.");

    expect(commandApi).toContain('/api/command/slips/${encodeURIComponent(slipId)}/${endpoint}');
    expect(commandApi).toContain("no_auto_send: true");
    expect(commandApi).toContain("no_auto_sync: true");
    expect(commandApi).toContain("no_auto_charge: true");
    expect(applyRoutes).toContain('if slip.get("status") == "approved_applied"');
    expect(applyRoutes).toContain('"idempotent": True');
    expect(applyRoutes).toContain('"business_id": business_id');
    expect(applyRoutes).toContain('if any(word in text for word in ["quote", "estimate"])');
  });
});

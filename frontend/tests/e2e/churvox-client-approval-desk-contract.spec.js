const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");
const readFrontend = (relativePath) => fs.readFileSync(path.join(FRONTEND_ROOT, relativePath), "utf8");
const readRepo = (relativePath) => fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");

test.describe("Churvox connected client approval desk contract", () => {
  test("wires the first owner-approved action into the connected Command surface", async () => {
    const wrapper = readFrontend("src/churvox-office-os/OfficeOSWorkingConnected.jsx");
    const desk = readFrontend("src/churvox-office-os/OfficeOSClientApprovalDesk.jsx");

    expect(wrapper).toContain('import OfficeOSClientApprovalDesk from "./OfficeOSClientApprovalDesk"');
    expect(wrapper).toContain("<OfficeOSClientApprovalDesk />");
    expect(desk).toContain('area !== "command"');
    expect(desk).toContain('data-owner-approved-client-desk="true"');
    expect(desk).toContain("Approve prepared clients");
  });

  test("edits canonical client fields and delegates creation to Command approval", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSClientApprovalDesk.jsx");

    for (const field of ["name", "phone", "email", "address", "notes"]) {
      expect(desk).toContain(`key: "${field}"`);
    }
    expect(desk).toContain("connected_office_os_quick_prepare");
    expect(desk).toContain("recordBackendCommandDecision");
    expect(desk).toContain('formTitle: "Owner-approved client record"');
    expect(desk).toContain("response?.result?.execution?.applied");
    expect(desk).not.toContain('fetch("/api/clients');
    expect(desk).not.toContain("method: \"POST\"");
  });

  test("verifies the applied record through live Clients and Command audit reads", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSClientApprovalDesk.jsx");

    expect(desk).toContain('loadOfficeArea("clients")');
    expect(desk).toContain("fetchBackendCommandAudit()");
    expect(desk).toContain("entry?.slipId === slipId");
    expect(desk).toContain('status.includes("approved_applied")');
    expect(desk).toContain("Live Clients confirmed");
    expect(desk).toContain("Command audit confirmed");
    expect(desk).toContain("cvosClientApprovalProof");
  });

  test("keeps repeat clicks and external side effects locked", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSClientApprovalDesk.jsx");
    const commandApi = readFrontend("src/churvox-office-lab/OfficeTeamCommandApi.js");
    const applyRoutes = readRepo("backend/churvox_command_apply_routes.py");

    expect(desk).toContain("if (!draft.name.trim() || busyId) return");
    expect(desk).toContain("disabled={busy || Boolean(busyId) || !draft.name.trim()}");
    expect(desk).toContain("The backend approval route was not available. Nothing was created.");
    expect(desk).toContain("Nothing was sent, charged or synced.");

    expect(commandApi).toContain('/api/command/slips/${encodeURIComponent(slipId)}/${endpoint}');
    expect(commandApi).toContain("no_auto_send: true");
    expect(commandApi).toContain("no_auto_sync: true");
    expect(commandApi).toContain("no_auto_charge: true");
    expect(applyRoutes).toContain('if slip.get("status") == "approved_applied"');
    expect(applyRoutes).toContain('"idempotent": True');
    expect(applyRoutes).toContain('"business_id": business_id');
  });
});

const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");
const readFrontend = (relativePath) => fs.readFileSync(path.join(FRONTEND_ROOT, relativePath), "utf8");
const readRepo = (relativePath) => fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");

test.describe("Churvox connected owner approval desk contract", () => {
  test("wires one complete Command approval desk into the connected owner surface", async () => {
    const wrapper = readFrontend("src/churvox-office-os/OfficeOSWorkingConnected.jsx");
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");

    expect(wrapper).toContain('import OfficeOSApprovalDesk from "./OfficeOSApprovalDesk"');
    expect(wrapper).toContain("<OfficeOSApprovalDesk />");
    expect(desk).toContain('area !== "command"');
    expect(desk).toContain('data-owner-approved-record-desk="true"');
    expect(desk).toContain("Command approval desk");
    for (const heading of [
      "Approve prepared clients",
      "Approve prepared jobs",
      "Approve prepared quotes",
      "Approve prepared invoice drafts",
      "Approve prepared message drafts",
      "Approve prepared staff reviews",
    ]) {
      expect(desk).toContain(heading);
    }
  });

  test("edits every canonical replacement record before Command approval", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");

    for (const field of [
      "name", "phone", "email", "address", "title", "client", "date", "worker", "price", "notes",
      "scope", "follow_up", "job", "total", "invoice_timing", "line_items", "subject", "send_timing",
      "message", "reply", "hours", "issue",
    ]) {
      expect(desk).toContain(`key: "${field}"`);
    }
    for (const formTitle of [
      "Owner-approved client record",
      "Owner-approved job draft",
      "Owner-approved quote draft",
      "Owner-approved invoice draft",
      "Owner-approved message draft",
      "Owner-approved staff review",
    ]) {
      expect(desk).toContain(`formTitle: "${formTitle}"`);
    }
    for (const action of [
      "Approve and create client",
      "Approve and create job draft",
      "Approve and create quote draft",
      "Approve and create invoice draft",
      "Approve and create message draft",
      "Approve and create staff review",
    ]) {
      expect(desk).toContain(`actionFallback: "${action}"`);
    }
    expect(desk).toContain("connected_office_os_quick_prepare");
    expect(desk).toContain("recordBackendCommandDecision");
    expect(desk).toContain("response?.result?.execution?.applied");
    for (const directPath of ["/api/clients", "/api/jobs", "/api/quotes", "/api/invoices", "/api/messages", "/api/workers"]) {
      expect(desk).not.toContain(`fetch("${directPath}`);
    }
    expect(desk).not.toContain('method: "POST"');
  });

  test("enforces required details again at the final approval boundary", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");
    const quickPrepare = readFrontend("src/churvox-office-os/OfficeOSQuickPrepare.jsx");

    expect(desk).toContain("function requiredFieldsReady(draft, config)");
    expect(desk).toContain(".filter((field) => field.required)");
    expect(desk).toContain("if (!requiredFieldsReady(draft, config) || busyId) return");
    expect(desk).toContain("disabled={busy || Boolean(busyId) || !requiredReady}");
    for (const requiredField of [
      '{ key: "notes", label: "Scope and instructions", long: true, required: true }',
      '{ key: "scope", label: "Scope", long: true, required: true }',
      '{ key: "line_items", label: "Line items", long: true, required: true }',
      '{ key: "message", label: "Message", long: true, required: true }',
      '{ key: "issue", label: "Issue or review", long: true, required: true }',
    ]) {
      expect(desk).toContain(requiredField);
    }
    expect(quickPrepare).toContain('if (areaId === "work") return ["title", "notes"]');
    expect(quickPrepare).toContain('if (areaId === "quotes") return ["title", "scope"]');
    expect(quickPrepare).toContain('if (areaId === "invoices") return ["job", "line_items"]');
    expect(quickPrepare).toContain('if (areaId === "messages") return ["subject", "message"]');
    expect(quickPrepare).toContain('if (areaId === "staff") return ["worker", "issue"]');
  });

  test("verifies creation through live records or the backend collection response plus Command audit", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");

    for (const liveArea of ["clients", "work", "quotes", "invoices"]) {
      expect(desk).toContain(`liveArea: "${liveArea}"`);
    }
    expect(desk).toContain('expectedCollection: "message_drafts"');
    expect(desk).toContain('expectedCollection: "payroll_reviews"');
    expect(desk).toContain("execution.collection");
    expect(desk).toContain("loadOfficeArea(config.liveArea)");
    expect(desk).toContain("fetchBackendCommandAudit()");
    expect(desk).toContain("entry?.slipId === slipId");
    expect(desk).toContain('status.includes("approved_applied")');
    expect(desk).toContain("Command audit confirmed");
    expect(desk).toContain("cvosClientApprovalProof");
  });

  test("keeps repeat clicks, business scope and every external side effect locked", async () => {
    const desk = readFrontend("src/churvox-office-os/OfficeOSApprovalDesk.jsx");
    const commandApi = readFrontend("src/churvox-office-lab/OfficeTeamCommandApi.js");
    const applyRoutes = readRepo("backend/churvox_command_apply_routes.py");

    expect(desk).toContain("if (!requiredFieldsReady(draft, config) || busyId) return");
    expect(desk).toContain("The backend approval route was not available. Nothing was created.");
    expect(desk).toContain("Nothing was sent, paid, charged, filed or synced.");
    expect(desk).toContain("No email, SMS or notification was sent.");
    expect(desk).toContain("Nobody was paid and no tax or bank file was created.");

    expect(commandApi).toContain('/api/command/slips/${encodeURIComponent(slipId)}/${endpoint}');
    expect(commandApi).toContain("no_auto_send: true");
    expect(commandApi).toContain("no_auto_sync: true");
    expect(commandApi).toContain("no_auto_charge: true");
    expect(applyRoutes).toContain('if slip.get("status") == "approved_applied"');
    expect(applyRoutes).toContain('"idempotent": True');
    expect(applyRoutes).toContain('"business_id": business_id');
    expect(applyRoutes).toContain('return "message_drafts", "message_draft"');
    expect(applyRoutes).toContain('return "payroll_reviews", "payroll_review"');
    expect(applyRoutes).toContain('return "invoices", "invoice"');
  });
});

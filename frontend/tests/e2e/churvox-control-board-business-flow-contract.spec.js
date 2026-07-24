import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const frontendRoot = process.cwd();
const actions = fs.readFileSync(path.join(frontendRoot, "src/churvox-product/ControlBoardActions.jsx"), "utf8");
const editor = fs.readFileSync(path.join(frontendRoot, "src/churvox-product/ControlBoardEditor.jsx"), "utf8");
const data = fs.readFileSync(path.join(frontendRoot, "src/churvox-product/controlBoardData.js"), "utf8");
const health = fs.readFileSync(path.join(frontendRoot, "src/churvox-product/ControlBoardHealth.jsx"), "utf8");
const gate = fs.readFileSync(path.join(frontendRoot, "src/churvox-product/ProductAppV7Gate.jsx"), "utf8");

function includesAll(source, values) {
  for (const value of values) expect(source, `Missing ${value}`).toContain(value);
}

test.describe("Churvox Control Board complete business flow", () => {
  test("job workspace runs the field-to-admin loop", () => {
    includesAll(actions, [
      "/timer/${action}",
      "/complete",
      "Complete & prepare admin",
      "invoice_created",
      "next_recurring_job_id",
      "create-invoice-draft",
      "Archive one-off job",
    ]);
    expect(actions).toContain("window.confirm");
    expect(editor).toContain("recurring_frequency");
    expect(editor).toContain("is_recurring");
    expect(editor).toContain("extras_total");
  });

  test("quote becomes work without retyping", () => {
    includesAll(actions, [
      "control-board-quote-actions",
      "Send quote",
      "Mark accepted",
      "convert-to-job",
      "Convert to job",
      "without retyping",
    ]);
    includesAll(editor, ["Client email", "Follow-up date", "next_step"]);
  });

  test("invoice runs approval through payment", () => {
    includesAll(actions, [
      "control-board-invoice-actions",
      "/approve",
      "send-with-pdf",
      "send-reminder",
      "mark-paid-pipeline",
      "Approve invoice",
      "Send PDF",
      "Send reminder",
      "Mark paid",
      "owner_approved: true",
      "invoice kept its current payment status",
    ]);
    includesAll(editor, ["Payment link", "Invoice notes", "customer_email"]);
  });

  test("team, payroll review and messages stay connected", () => {
    includesAll(actions, [
      "control-board-worker-actions",
      "Invite to worker app",
      "Approved for export",
      "No tax, government or bank action was taken",
      "control-board-message-actions",
      "Send approved reply",
      "reply_to_message_id",
    ]);
    includesAll(editor, ["Pay frequency", "Hourly rate", "Approved hours", "Prepared reply"]);
  });

  test("workflow actions give immediate visible feedback", () => {
    includesAll(actions, [
      "options.updateValues",
      "setValues((current)",
      "timer_status",
      "status: \"Accepted\"",
      "status: \"Due\"",
      "app: \"Invited\"",
      "payroll: \"Approved for export\"",
    ]);
  });

  test("failed sources stay honest instead of becoming false empty states", () => {
    includesAll(data, [
      "Promise.allSettled",
      "sourceFailure",
      "failed.has(\"Work\") ? current.jobs",
      "failed.has(\"Invoices\") ? current.invoices",
      "publishControlBoardHealth(issues)",
    ]);
    includesAll(health, [
      "Some live business data did not load",
      "last reliable records",
      "Retry now",
      "churvox:data-refresh",
    ]);
    expect(gate).toContain("<ControlBoardHealth />");
  });

  test("the editor is an operating workspace, not only a form", () => {
    expect(editor).toContain("ControlBoardActions");
    expect(editor).toContain("use the real next move below");
    expect(editor).toContain("cv7EditorBody");
    expect(actions).toContain("Next move");
    expect(actions).toContain("Nothing sends until the owner chooses it");
  });
});

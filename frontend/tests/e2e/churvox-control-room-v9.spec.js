const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const app = fs.readFileSync(path.join(root, "src/churvox-product/ProductAppV9.jsx"), "utf8");
const gate = fs.readFileSync(path.join(root, "src/churvox-product/ProductAppV9Gate.jsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/churvox-product/productAppV9.css"), "utf8");
const materializer = fs.readFileSync(path.join(root, "../scripts/churvox_layout_v9_materialize.cjs"), "utf8");

function mustContain(source, values) {
  values.forEach((value) => expect(source).toContain(value));
}

test("Control Room V9 replaces the empty top-nav shell", async () => {
  mustContain(app, [
    'className="cv9Rail"',
    'className="cv9TopBar"',
    'className="cv9Workspace"',
    "CHURVOX_CONTROL_ROOM_V9_20260725",
  ]);
  expect(app).not.toContain('className="cv7Header"');
  expect(app).not.toContain("Business under control.");
});

test("Today is a live business control room", async () => {
  mustContain(app, [
    "Owner control room",
    "Today’s run",
    "Needs you",
    "Live crew",
    "Money moving",
    "Since last visit",
    "Some live sources did not refresh",
  ]);
});

test("Work supports board, list, weekly schedule and recurring flow", async () => {
  mustContain(app, [
    "function WorkBoard",
    "function WeekSchedule",
    'setView("board")',
    'setView("list")',
    "Plan the week without losing the day",
    "Repeat work stays predictable",
  ]);
});

test("Money is one quote-to-paid flow", async () => {
  mustContain(app, [
    "function MoneyFlow",
    "Quote prepared",
    "Accepted",
    "Work complete",
    "Invoice draft",
    "Invoice sent",
    "Paid",
    "See the whole path from quote to paid",
  ]);
});

test("records open as a connected right-side workspace", async () => {
  mustContain(css, [
    ".cv9Product .cv7ModalLayer",
    "justify-content: flex-end",
    ".cv9Product .cv7Editor",
    "height: 100vh",
    "border-radius: 0",
  ]);
});

test("mobile stays intentionally smaller than desktop", async () => {
  mustContain(app, [
    "cv9MobileNav",
    "cv7MobileNav",
    "Today",
    "Work",
    "Command",
    "Messages",
    "More",
    "Log out",
  ]);
  mustContain(css, [
    "@media (max-width: 760px)",
    ".cv9Rail",
    "display: none",
    ".cv9MobileNav",
  ]);
});

test("plan gates, pricing and owner approval stay intact", async () => {
  mustContain(gate, ["createAccess", "ROUTE_AREA", "/dashboard#plans", "ControlBoardHealth"]);
  mustContain(app, [
    "PLANS.map",
    "ADDONS.map",
    "data-stripe-live-plan",
    "Nothing sends, charges, syncs, pays or changes until the owner approves it.",
  ]);
});

test("V9 is materialised after the hardened engine", async () => {
  mustContain(materializer, [
    "ProductAppV9Gate",
    "FreshApp.jsx",
    "cvOwnerNavigation",
    "cv7MobileNav",
    "data-screen={page}",
    "plan-aware subnavigation",
    "Materialised Churvox Control Room V9 entrypoint and compatibility hooks.",
  ]);
});

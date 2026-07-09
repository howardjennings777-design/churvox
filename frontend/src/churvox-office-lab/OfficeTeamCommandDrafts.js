import { fetchOfficeTeamRows } from "./officeTeamApi";

const commandAreas = [
  {
    area: "work",
    tray: "Bookings",
    roleName: "Receptionist",
    level: "Needs check",
    checked: "job / booking read-only row",
    prepared: "Work record is summarized for owner review. No booking, status or client record has been changed.",
    need: "Open the work record, send it to Command, or park it?",
    actions: ["Review work", "Park", "Ask staff"],
  },
  {
    area: "messages",
    tray: "Clients",
    roleName: "Receptionist",
    level: "Needs check",
    checked: "message / update read-only row",
    prepared: "Message context is summarized only. No reply has been sent.",
    need: "Reply, ask staff, park, or leave it?",
    actions: ["Review reply", "Ask staff", "Park"],
  },
  {
    area: "invoices",
    tray: "Money",
    roleName: "Bookkeeper",
    level: "Top priority",
    checked: "invoice read-only row",
    prepared: "Invoice record is prepared for review. No invoice has been sent or synced.",
    need: "Review invoice, check extras, or park?",
    actions: ["Review invoice", "Check extras", "Park"],
  },
  {
    area: "quotes",
    tray: "Money",
    roleName: "Bookkeeper",
    level: "Needs check",
    checked: "quote read-only row",
    prepared: "Quote record is prepared for owner review. No quote follow-up has been sent.",
    need: "Review quote, follow up, convert later, or park?",
    actions: ["Review quote", "Follow up", "Park"],
  },
  {
    area: "clients",
    tray: "Clients",
    roleName: "Client Memory",
    level: "Low risk",
    checked: "client read-only row",
    prepared: "Client record is summarized for memory review. No client details have been saved or changed.",
    need: "Save memory, edit, ignore, or park?",
    actions: ["Review memory", "Ignore", "Park"],
  },
  {
    area: "staff",
    tray: "Staff",
    roleName: "Payroll Clerk",
    level: "Needs check",
    checked: "staff / worker read-only row",
    prepared: "Worker record is summarized for owner review. No roster, payroll or worker setting has changed.",
    need: "Review staff item, ask worker, or park?",
    actions: ["Review staff", "Ask worker", "Park"],
  },
];

export async function fetchOfficeTeamCommandDrafts() {
  const groups = await Promise.all(
    commandAreas.map(async (config) => {
      const result = await fetchOfficeTeamRows(config.area);
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      return rows.slice(0, 2).map((row, index) => draftFromRow(config, row, index, result));
    })
  );

  return groups.flat().filter(Boolean).slice(0, 10);
}

function draftFromRow(config, row = [], index = 0, result = {}) {
  const label = titleCase(config.area);
  const title = row[1] || `${label} needs review`;
  const status = row[2] || "Live read-only";
  const detail = row[3] || "Live record found in the hidden lab read-only scan.";

  return {
    id: `brain-live-${config.area}-${index}`,
    tray: config.tray,
    roleName: config.roleName,
    level: config.level,
    title: `${label}: ${title}`,
    happened: `${status}. ${detail}`,
    checked: [config.checked, result?.message || "live read-only fallback", row[0] || label].filter(Boolean),
    prepared: config.prepared,
    need: config.need,
    actions: config.actions,
    raw: {
      source: "office_team_live_read_only",
      area: config.area,
      endpoint: result?.endpoint || "fallback",
      row,
      prepared_only: true,
      owner_review_only: true,
    },
  };
}

function titleCase(value = "") {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

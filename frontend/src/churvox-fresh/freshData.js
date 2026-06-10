export const freshNav = [
  { group: "Command", items: [{ key: "command", label: "Command Board", mark: "CM" }] },
  { group: "Work", items: [
    { key: "hub", label: "Smart Hub", mark: "SH" },
    { key: "jobs", label: "Jobs", mark: "JB" },
    { key: "dispatch", label: "Dispatch", mark: "DP" },
    { key: "clients", label: "Clients", mark: "CL" },
    { key: "quotes", label: "Quotes", mark: "QT" },
    { key: "invoices", label: "Invoices", mark: "IV" },
  ] },
  { group: "Business", items: [
    { key: "team", label: "Team", mark: "TM" },
    { key: "payroll", label: "Payroll", mark: "PR" },
    { key: "reports", label: "Reports", mark: "RP" },
  ] },
  { group: "System", items: [
    { key: "settings", label: "Settings", mark: "ST" },
    { key: "plans", label: "Plans", mark: "PL" },
    { key: "support", label: "Support", mark: "SP" },
  ] },
];

export const commandSlips = [
  { title: "Invoice ready to approve", area: "Money desk", found: "Completed lawn service has price, notes and GST ready.", why: "Nothing is sent until the owner approves the slip." },
  { title: "Quote needs follow-up", area: "Quotes", found: "Sent quote has had no response for 6 days.", why: "Owner can approve, edit or ignore the follow-up." },
  { title: "Client missing billing email", area: "Clients", found: "Service details exist but billing email is blank.", why: "Invoice automation should not run with missing details." },
  { title: "Worker has not acknowledged", area: "Dispatch", found: "Today job is assigned but not acknowledged.", why: "Owner should confirm before route starts." },
];

export const clients = [
  { name: "Aroha Property Care", detail: "office@arohaproperty.co.nz", status: "Ready" },
  { name: "Birchville Rentals", detail: "manager@birchvillerentals.co.nz", status: "Needs billing" },
  { name: "Lower Hutt Medical Centre", detail: "admin@lhmedical.example", status: "Ready" },
];

export const boards = {
  hub: { title: "Smart Hub", copy: "Morning view: what needs action, what is booked, and where money is waiting.", rows: ["Approve invoice", "Confirm access", "Garden tidy today"] },
  jobs: { title: "Jobs", copy: "Create, schedule, assign, price and complete work.", rows: ["Lawn service assigned", "Garden tidy in progress", "Driveway clean needs access"] },
  dispatch: { title: "Dispatch", copy: "Daily route planning: who is going where, what is late, and who has acknowledged.", rows: ["Unconfirmed", "Ready", "On site", "Complete"] },
  quotes: { title: "Quotes", copy: "Draft, send, follow up and convert accepted quotes into jobs.", rows: ["Driveway clean draft", "Garden package sent", "Lawn reset accepted"] },
  invoices: { title: "Invoices", copy: "Review drafts, approve sending, track paid and overdue money.", rows: ["Aroha draft $85", "Medical centre approved $420", "Birchville overdue $190"] },
  team: { title: "Team", copy: "People, roles, invites and access.", rows: ["Owner full access", "Worker jobs only", "Payroll user limited"] },
  payroll: { title: "Payroll", copy: "Pay period, job hours, adjustments and CSV export. No tax or bank files.", rows: ["24 hours", "3 workers", "1 adjustment"] },
  reports: { title: "Reports", copy: "Revenue, completed jobs, overdue invoices and worker activity.", rows: ["$695 this week", "8 jobs done", "1 overdue invoice"] },
  settings: { title: "Settings", copy: "Business profile, GST, branding, integrations and security.", rows: ["Business details", "GST", "Security"] },
  plans: { title: "Plans", copy: "Start, Crew, Operator, Command and growth packs.", rows: ["Start $39", "Crew $89", "Operator $149", "Command $299"] },
  support: { title: "Support", copy: "Help, setup guidance and contact options.", rows: ["Setup guide", "Common fixes", "Contact support"] },
};

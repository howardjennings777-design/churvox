export const DEFAULT_INDUSTRY = "field-service";

export const INDUSTRIES = {
  "field-service": {
    title: "Field service",
    short: "Field service",
    headline: "Run jobs, workers, customers and money in one connected flow.",
    intro: "Churvox keeps job detail, client detail, worker updates, proof, quotes, invoices and owner decisions connected for service businesses.",
    examples: ["Jobs", "Clients", "Workers", "Proof", "Quotes", "Invoices", "Command"],
    services: ["Service visit", "Repair", "Maintenance", "Quote required", "Follow-up", "Other"],
    jobWords: { job: "Job", jobs: "Jobs", worker: "Worker", workers: "Workers", client: "Client", clients: "Clients", proof: "Proof" },
    emptyJob: "Add a job with client, worker, price, date, time and recurrence.",
    flow: ["Capture the work", "Send the field update", "Owner approves the next step"],
  },
  "lawn-care": {
    title: "Lawn & garden",
    short: "Lawn & garden",
    headline: "Run recurring outdoor work without losing the details.",
    intro: "Churvox keeps regular rounds, one-off tidy ups, photos, access notes, worker updates and invoice drafts tied to the right client.",
    examples: ["Fortnightly mowing rounds", "Hedge trim extras", "Gate and access notes", "Before/after proof", "Quick invoice drafts"],
    services: ["Lawn mowing", "Hedge trim", "Garden tidy", "Weed control", "Green waste", "One-off clean up", "Other"],
    jobWords: { job: "Job", jobs: "Jobs", worker: "Worker", workers: "Workers", client: "Client", clients: "Clients", proof: "Photos" },
    emptyJob: "Add a mowing, garden tidy, hedge trim or recurring round with access notes and proof.",
    flow: ["Book the round", "Worker completes and sends proof", "Owner checks extras and invoice"],
  },
  landscaping: {
    title: "Landscaping",
    short: "Landscaping",
    headline: "Keep quotes, staged work and extras under owner control.",
    intro: "For landscaping jobs, Churvox keeps the accepted scope, materials, crew notes, progress proof and invoice decisions together.",
    examples: ["Quote-led projects", "Materials and extras", "Crew notes", "Progress photos", "Staged billing review"],
    services: ["Landscape quote", "Planting", "Mulch/bark", "Retaining/garden bed", "Staged project", "Materials extra", "Other"],
    jobWords: { job: "Job", jobs: "Jobs", worker: "Crew", workers: "Crew", client: "Client", clients: "Clients", proof: "Progress proof" },
    emptyJob: "Add a landscaping job with scope, crew, materials, proof and staged billing notes.",
    flow: ["Quote the scope", "Convert into staged jobs", "Approve extras before invoicing"],
  },
  cleaning: {
    title: "Cleaning",
    short: "Cleaning",
    headline: "Make recurring visits, access notes and proof easier to manage.",
    intro: "Cleaning teams can keep site checklists, key/access notes, cleaner updates, client replies and repeat invoices in one clean record.",
    examples: ["Recurring visits", "Site checklists", "Access/key notes", "Cleaner updates", "Client follow-up"],
    services: ["Regular clean", "Deep clean", "Move-out clean", "Commercial clean", "Checklist visit", "Extra supplies", "Other"],
    jobWords: { job: "Visit", jobs: "Visits", worker: "Cleaner", workers: "Cleaners", client: "Client", clients: "Clients", proof: "Checklist/proof" },
    emptyJob: "Add a cleaning visit with access notes, checklist, cleaner and recurring schedule.",
    flow: ["Schedule the visit", "Cleaner sends update", "Owner reviews client reply or invoice"],
  },
  "property-maintenance": {
    title: "Property maintenance",
    short: "Maintenance",
    headline: "Handle mixed jobs, tenants, keys and repeat clients without chaos.",
    intro: "Property maintenance work changes every day. Churvox keeps tenants, landlords, job notes, photos, workers and money steps connected.",
    examples: ["Mixed repair jobs", "Tenant/landlord notes", "Keys and access", "Urgent fixes", "Job history"],
    services: ["Repair", "Inspection", "Tenant issue", "Key/access job", "Urgent fix", "Quote required", "Other"],
    jobWords: { job: "Job", jobs: "Jobs", worker: "Worker", workers: "Workers", client: "Property/client", clients: "Properties/clients", proof: "Proof" },
    emptyJob: "Add a maintenance job with property, access notes, worker, proof and owner check.",
    flow: ["Record the issue", "Assign the right person", "Send proof and approve billing"],
  },
  handyman: {
    title: "Handyman & repairs",
    short: "Handyman",
    headline: "Small jobs still need clean admin.",
    intro: "Churvox helps handyman businesses keep parts, photos, client approvals, quotes, job notes and invoices from turning into messy messages.",
    examples: ["Small repairs", "Parts notes", "Photos", "Client approvals", "Quick quotes"],
    services: ["Repair", "Install", "Parts needed", "Small job", "Quote required", "Follow-up", "Other"],
    jobWords: { job: "Job", jobs: "Jobs", worker: "Worker", workers: "Workers", client: "Client", clients: "Clients", proof: "Photos/notes" },
    emptyJob: "Add a repair job with parts, proof, quote or invoice details.",
    flow: ["Create the job", "Capture parts and proof", "Owner approves the invoice"],
  },
  painting: {
    title: "Painting",
    short: "Painting",
    headline: "Keep scope, rooms, extras and final invoice review together.",
    intro: "Painting jobs need clear scope and proof. Churvox keeps rooms/areas, quote details, progress notes, extras and owner-approved billing in order.",
    examples: ["Room/area scope", "Quote details", "Progress proof", "Extras", "Final invoice check"],
    services: ["Interior painting", "Exterior painting", "Prep work", "Touch-up", "Extra room/area", "Quote required", "Other"],
    jobWords: { job: "Job", jobs: "Jobs", worker: "Painter", workers: "Painters", client: "Client", clients: "Clients", proof: "Progress proof" },
    emptyJob: "Add a painting job with room/area scope, painter, proof and extras notes.",
    flow: ["Quote the work", "Track progress and extras", "Review final invoice"],
  },
  "plumbing-electrical-hvac": {
    title: "Plumbing, electrical & HVAC",
    short: "Technical trades",
    headline: "Give urgent field work a safer admin handoff.",
    intro: "For technical service work, Churvox keeps job details, parts notes, proof, safety notes and owner-controlled customer/accounting handoff clear.",
    examples: ["Urgent callouts", "Parts notes", "Safety notes", "Proof photos", "Owner-controlled handoff"],
    services: ["Callout", "Repair", "Install", "Parts used", "Safety note", "Quote required", "Other"],
    jobWords: { job: "Callout/job", jobs: "Callouts/jobs", worker: "Technician", workers: "Technicians", client: "Client", clients: "Clients", proof: "Proof/safety note" },
    emptyJob: "Add a callout with site address, technician, parts, proof and safety notes.",
    flow: ["Capture the callout", "Worker records proof and parts", "Owner checks before sending"],
  },
  "pest-control": {
    title: "Pest control",
    short: "Pest control",
    headline: "Track visits, notes and follow-ups cleanly.",
    intro: "Pest control businesses can use Churvox for scheduled visits, treatment notes, follow-ups, proof and recurring customer reminders.",
    examples: ["Scheduled visits", "Treatment notes", "Follow-ups", "Proof", "Recurring reminders"],
    services: ["Treatment visit", "Inspection", "Follow-up", "Recurring service", "Treatment note", "Quote required", "Other"],
    jobWords: { job: "Visit", jobs: "Visits", worker: "Technician", workers: "Technicians", client: "Client", clients: "Clients", proof: "Treatment proof" },
    emptyJob: "Add a pest control visit with treatment notes, follow-up and recurring reminder.",
    flow: ["Schedule the visit", "Record treatment and notes", "Follow up or invoice"],
  },
};

export const INDUSTRY_ORDER = [
  "lawn-care",
  "landscaping",
  "cleaning",
  "property-maintenance",
  "handyman",
  "painting",
  "plumbing-electrical-hvac",
  "pest-control",
];

export function normalizeIndustry(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  if (!raw) return DEFAULT_INDUSTRY;
  if (INDUSTRIES[raw]) return raw;
  if (/lawn|garden|mow/.test(raw)) return "lawn-care";
  if (/landscap/.test(raw)) return "landscaping";
  if (/clean/.test(raw)) return "cleaning";
  if (/property|maintenance|maint/.test(raw)) return "property-maintenance";
  if (/handy|repair/.test(raw)) return "handyman";
  if (/paint/.test(raw)) return "painting";
  if (/plumb|electric|hvac|heat|cool|air/.test(raw)) return "plumbing-electrical-hvac";
  if (/pest/.test(raw)) return "pest-control";
  return DEFAULT_INDUSTRY;
}

export function getIndustry(value) {
  return INDUSTRIES[normalizeIndustry(value)] || INDUSTRIES[DEFAULT_INDUSTRY];
}

export function industryOptions(includeGeneric = true) {
  const options = INDUSTRY_ORDER.map((value) => ({ value, label: INDUSTRIES[value].title }));
  return includeGeneric ? [{ value: DEFAULT_INDUSTRY, label: INDUSTRIES[DEFAULT_INDUSTRY].title }, ...options] : options;
}

export function industryFromUser(user = {}, settings = {}) {
  return normalizeIndustry(
    settings.trade_industry_type || settings.industry_mode || user?.trade_industry_type || user?.industry_mode || user?.industry || user?.trade_type || user?.business_profile?.industry_key || user?.business_profile?.industry
  );
}

export function industryServiceOptions(value) {
  return getIndustry(value).services || INDUSTRIES[DEFAULT_INDUSTRY].services;
}

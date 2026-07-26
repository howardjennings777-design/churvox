import React from "react";

const EXACT_COPY = new Map([
  ["Work", "Jobs"], ["Dispatch", "Jobs"], ["Week", "Schedule"], ["Repeat work", "Recurring jobs"], ["Pulse", "Overview"], ["People", "Team"], ["Live field", "Team status"], ["Waiting", "Needs review"],
  ["Runway", "Today's jobs"], ["Needs you", "Needs attention"], ["Crew radar", "Team status"], ["Money moving", "Money overview"], ["Live commercial pulse", "Money overview"], ["Relationship stream", "Client history"], ["Next best move", "Quick actions"],
  ["Sales movement", "Quotes"], ["Collection movement", "Invoices"], ["Global create", "Create new"], ["Start the right record.", "What do you need to add?"], ["Every new item enters the same connected business flow.", "Choose an item and enter the details."],
  ["Signal feed", "Updates"], ["Updates show what changed. Command holds what requires judgement.", "Updates show what changed. Command shows what needs your approval."], ["Live records", "Live data"], ["Owner-controlled actions", "Owner approval"], ["Live business data", "Up to date"],
  ["Building the live business picture", "Loading your business"], ["Connecting work, people, messages and money.", "Loading jobs, clients, team and money."], ["The business is moving cleanly.", "You're all caught up."], ["The exceptions are lined up in order. Everything else keeps moving underneath.", "Start with the items that need your attention. Everything else can keep moving."],
  ["Work, people and money are connected. Nothing urgent is hiding.", "Jobs, team and money are up to date. Nothing urgent is waiting."], ["On the run", "Jobs today"], ["Field live", "Team active"], ["Outstanding", "Invoices owing"], ["Today, in order", "Today's jobs"], ["Next work, in order", "Upcoming jobs"],
  ["Clear the next move", "What needs attention"], ["No owner block", "Nothing needs approval"], ["The lane is clear", "Nothing needs attention"], ["Only genuine decisions and exceptions appear here.", "Only items that need your review appear here."], ["Open Command", "Review decisions"], ["Live outside", "Who is working"], ["Since last visit", "Since you last checked"],
  ["The week as a dispatch wall.", "This week's schedule"], ["People run across rows. Days run across columns. Conflicts are visible before they become phone calls.", "See each worker's booked jobs by day."], ["Recurring work should feel dependable, not hidden.", "Recurring jobs"], ["Each cadence has its own lane, next visit and owner-visible state.", "See weekly, fortnightly, monthly and custom jobs."],
  ["Run work from one wall.", "Manage all jobs"], ["Scan the whole operation, then open the exact job without leaving the board.", "Check status, worker, date and price in one place."], ["A customer cockpit, not a contact list.", "Clients and their work"], ["Open one relationship and see the site, work, money and conversation together.", "See contact details, jobs, quotes, invoices and messages together."],
  ["Client relationship", "Client details"], ["Everything connected to this client", "Jobs, quotes, invoices and messages"], ["Keep the conversation grounded in the same client and work record.", "Keep the message linked to the right client and job."], ["A sales river from idea to booked work.", "Track quote progress"], ["The quote stays connected as it moves, instead of disappearing into a table.", "See drafts, sent quotes, accepted work and follow-ups."],
  ["A ledger that shows what happens next.", "Track invoices and payments"], ["Drafts, due dates, accounting state and money are readable in one scan.", "See due dates, status, accounting and totals in one view."], ["A guarded bridge, not a black box.", "Xero connection"], ["See the connection, the drafts ready to move and the rules Churvox will not cross.", "Connect Xero and control when approved drafts sync."],
  ["See where value is flowing—and where it is stuck.", "Money overview"], ["Quotes and invoices sit on the same commercial line instead of separate dead-end pages.", "See open quotes, invoices owing and payments received."], ["A field signal board, not a staff list.", "See who is working"], ["See who is moving, who is stuck and which job each person carries.", "Check each worker's status and current job."],
  ["Recorded time with a clean approval trail.", "Review timesheets"], ["Review the person, work and pay period without pretending Churvox files tax or pays banks.", "Check recorded hours and payroll review status."], ["Make permissions obvious before they become a problem.", "Team access"], ["Each person has one role, one access level and one clear worker-app state.", "Set each person's role and app access."],
  ["A crew matrix built around the work.", "Your team"], ["The person, current job, field signal and access sit together.", "See each person's current job, status and access."], ["Conversation with the work still attached.", "Messages linked to jobs and clients"], ["The client, job, priority and prepared reply stay visible while you answer.", "Keep the message and related work together."], ["Conversation facts", "Linked details"],
  ["A decision theatre, not another inbox.", "Decisions waiting for you"], ["The reason, evidence, prepared result and consequence sit on one stage.", "Review what changed, the evidence and what happens next."], ["Decision queue", "Items to review"], ["Owner decision", "Your decision"], ["Exact effect", "What happens next"], ["Owner approval remains the final gate.", "Nothing changes until you approve it."],
  ["Controls organised by the way the business works.", "Business settings"], ["No random settings wall. Each rule sits beside the part of Churvox it changes.", "Update business details, money rules, worker app and security."], ["Your current plan first. The comparison second.", "Plans and billing"], ["Pricing stays exactly as set, with clear access and no hidden card requirement.", "See your current plan and compare available options."],
  ["Start with the exact place that is stuck.", "Help and support"], ["Support should understand the page, record and expected result—not make you retell the whole business.", "Tell us the page, record, what happened and what you expected."],
]);

const DYNAMIC_COPY = [[/^(\d+) moves need your judgement\.$/, "$1 things need your attention."], [/^(\d+) meaningful updates$/, "$1 updates"]];

function replaceTextNode(node) {
  if (!node || node.nodeType !== Node.TEXT_NODE) return;
  const raw = node.nodeValue || "";
  const trimmed = raw.trim();
  if (!trimmed) return;
  let next = EXACT_COPY.get(trimmed) || trimmed;
  for (const [pattern, replacement] of DYNAMIC_COPY) next = next.replace(pattern, replacement);
  if (next === trimmed) return;
  const leading = raw.match(/^\s*/)?.[0] || "";
  const trailing = raw.match(/\s*$/)?.[0] || "";
  node.nodeValue = `${leading}${next}${trailing}`;
}

function replaceCopy(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(replaceTextNode);
}

function labelNavigation(root) {
  root.querySelectorAll(".cvsWorkstream button").forEach((button) => {
    const label = String(button.querySelector("span")?.textContent || "").trim().toLowerCase();
    if (label) button.dataset.cvLabel = label;
  });
}

function routePlansSafely(root) {
  root.querySelectorAll("button").forEach((button) => {
    const text = String(button.textContent || "").replace(/\s+/g, " ").trim();
    if (!/^Plans(?:\s*&\s*billing)?$/i.test(text) || button.dataset.cvPlansSafe === "true") return;
    button.dataset.cvPlansSafe = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.location.assign("/plans");
    }, true);
  });
}

function repairSettings(root) {
  root.querySelectorAll(".cvsSecurityRows button").forEach((button) => {
    const text = String(button.textContent || "").trim();
    if (/^Delete account/i.test(text) && button.dataset.cvDeleteReady !== "true") {
      button.dataset.cvDeleteReady = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        window.location.assign("/delete-account");
      });
    }
    if (/^(Active sessions|Export business data)/i.test(text)) {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.title = "Coming soon";
      button.classList.add("cvComingSoonControl");
    }
  });
}

function applyCleanup() {
  const root = document.querySelector('main[data-churvox-layout="fresh-studio"]');
  if (!root) return;
  root.classList.add("cvPlainBusinessCopy");
  replaceCopy(root);
  labelNavigation(root);
  routePlansSafely(root);
  repairSettings(root);
}

export default function StudioCleanupBridge() {
  React.useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyCleanup();
      });
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    window.addEventListener("hashchange", schedule);
    window.addEventListener("resize", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}

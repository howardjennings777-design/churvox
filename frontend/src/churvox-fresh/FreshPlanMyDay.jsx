import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const route = [
  {
    id: "day-1",
    time: "8:30 AM",
    title: "Naenae lawn mow",
    area: "Naenae",
    type: "Job",
    reason: "Closest first job and quick completion.",
    duration: "45 min",
    action: "Send worker brief",
  },
  {
    id: "day-2",
    time: "9:45 AM",
    title: "Belmont lawn reset",
    area: "Belmont",
    type: "Job",
    reason: "Higher value job with invoice review after photos.",
    duration: "1 hr 30 min",
    action: "Check photos before invoice",
  },
  {
    id: "day-3",
    time: "12:15 PM",
    title: "Upper Hutt quote visit",
    area: "Upper Hutt",
    type: "Quote",
    reason: "Lead is warm and quote follow-up is ready for owner review.",
    duration: "30 min",
    action: "Build quote follow-up",
  },
  {
    id: "day-4",
    time: "2:00 PM",
    title: "Wainuiomata recurring check",
    area: "Wainuiomata",
    type: "Recurring",
    reason: "Client has not booked for 5 weeks.",
    duration: "20 min",
    action: "Send rebooking message",
  },
  {
    id: "day-5",
    time: "4:30 PM",
    title: "Invoice admin block",
    area: "Office",
    type: "Admin",
    reason: "Completed work is ready for invoice review before end of day.",
    duration: "25 min",
    action: "Open invoice checker",
  },
];

function sendPlanToCommand(onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `plan-day-${Date.now()}`,
      group: "AI Plan My Day",
      title: "Today's route is ready for approval",
      info: "5 stops - jobs, quote, recurring and invoice block",
      urgency: "High",
      found: "Churvox found scheduled work, quote visit, recurring risk and invoice admin for today.",
      prepared: route.map((item) => `${item.time} - ${item.title}`).join(" | "),
      why: "The owner starts the day with the best order and clear actions from one screen.",
      owner: "Approve plan, edit order, open dispatch, or send worker briefs.",
      area: "AI Plan My Day",
      page: "planday",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "plan-day" } }));
  } catch {
    // Fresh preview keeps working without storage.
  }

  onNavigate?.("command");
}

export default function FreshPlanMyDay({ onNavigate }) {
  const [approved, setApproved] = React.useState(false);
  const jobs = route.filter((item) => item.type === "Job").length;
  const admin = route.filter((item) => item.type === "Admin").length;

  return (
    <section className="freshPlanDayPage">
      <div className="freshPlanDayHero">
        <div>
          <span>AI Plan My Day</span>
          <h1>Open Churvox and know what to do first</h1>
          <p>Churvox turns jobs, quotes, admin and follow-ups into a plain-English daily plan.</p>
        </div>

        <div className="freshPlanDayStats">
          <div><b>{route.length}</b><small>actions</small></div>
          <div><b>{jobs}</b><small>jobs</small></div>
          <div><b>{admin}</b><small>admin block</small></div>
          <div><b>{approved ? "Yes" : "No"}</b><small>approved</small></div>
        </div>
      </div>

      <div className="freshPlanDayLayout">
        <article className="freshPlanDayPanel freshPlanDayWide">
          <header>
            <span>Recommended order</span>
            <h2>Today's plan</h2>
            <p>Each stop has a reason and a next action, so the owner approves the whole plan quickly.</p>
          </header>

          <div className="freshPlanDayTimeline">
            {route.map((item, index) => (
              <section key={item.id}>
                <div className="freshPlanDayNumber">{index + 1}</div>
                <div>
                  <b>{item.time} - {item.title}</b>
                  <p>{item.area} - {item.type} - {item.duration}</p>
                  <small><strong>Why:</strong> {item.reason}</small>
                  <small><strong>Next:</strong> {item.action}</small>
                </div>
              </section>
            ))}
          </div>
        </article>

        <article className="freshPlanDayPanel">
          <header>
            <span>AI reasoning</span>
            <h2>Why this helps</h2>
            <p>Owners start the day with the safest, most useful order already laid out.</p>
          </header>

          <div className="freshPlanDayReason">
            <section><b>Less hunting</b><p>Jobs, quotes and invoices sit in one day plan.</p></section>
            <section><b>More money</b><p>Invoice blocks keep completed work moving to paid.</p></section>
            <section><b>Less missed work</b><p>Recurring and follow-up risks show before they become lost jobs.</p></section>
          </div>

          <div className="freshPlanDayButtons">
            <button type="button" onClick={() => setApproved(true)}>{approved ? "Plan approved" : "Approve plan"}</button>
            <button type="button" onClick={() => sendPlanToCommand(onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.("dispatch")}>Open Dispatch</button>
            <button type="button" onClick={() => onNavigate?.("routes")}>Open Routes</button>
            <button type="button" onClick={() => onNavigate?.("invoicecheck")}>Open Invoice Checker</button>
          </div>
        </article>
      </div>
    </section>
  );
}

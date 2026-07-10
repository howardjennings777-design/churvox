(() => {
  const WEAK = /^(|needs amount|customer to confirm|prepare only|choose worker|choose date and time|needs date check|worker to confirm|normal time needs check|needs check|selected record|client|repeat client|customer|suggested: same worker|suggested: next available.*)$/i;
  const MONEY_WORDS = /invoice|payment|money|bookkeeper|extra|green waste|draft total|line items/i;
  const BOOKING_WORDS = /booking|rebook|appointment|schedule|repeat client|next booking/i;
  const HOURS_WORDS = /hours|timer|payroll|staff|worker/i;
  const CLIENT_WORDS = /client memory|preference|access|note to save/i;
  const QUALITY_WORDS = /quality|proof|photo|completion/i;
  const ACCOUNTING_WORDS = /accounting|gst|xero|myob|export|tax/i;

  function textOf(root) {
    return (root?.innerText || "").replace(/\s+/g, " ").trim();
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function fieldLabel(field) {
    return clean(field?.querySelector("span")?.innerText || "").toLowerCase();
  }

  function recordTitle(root) {
    return clean(root?.querySelector("h3")?.innerText || "this record");
  }

  function typeOf(root) {
    const all = textOf(root);
    if (MONEY_WORDS.test(all)) return "money";
    if (BOOKING_WORDS.test(all)) return "booking";
    if (HOURS_WORDS.test(all)) return "hours";
    if (ACCOUNTING_WORDS.test(all)) return "accounting";
    if (QUALITY_WORDS.test(all)) return "quality";
    if (CLIENT_WORDS.test(all)) return "client";
    return "office";
  }

  function setNativeValue(input, value) {
    const proto = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter ? setter.call(input, value) : (input.value = value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyLabel(field, labelText) {
    const label = field?.querySelector("span");
    if (label && labelText) label.textContent = labelText;
  }

  function recommendationFor(root) {
    const title = recordTitle(root);
    const type = typeOf(root);
    if (type === "money") {
      return {
        title: "Bookkeeper recommendation",
        problem: "Completed work has an extra green-waste decision before invoicing.",
        solution: "Create an invoice draft with base service plus a separate green-waste extra line. Owner edits the amount if needed, then approves the invoice draft. Payment link waits until invoice approval.",
        missing: "Only the exact dollar amount may need owner correction.",
        decision: "Approve invoice draft, edit amount/lines, ask staff, or park."
      };
    }
    if (type === "booking") {
      return {
        title: "Receptionist recommendation",
        problem: "Repeat client has no next booking in the normal cycle.",
        solution: "Prepare the next visit in the same 3-week cycle, same worker where possible, with a customer confirmation message held until owner approval.",
        missing: "Owner can change the exact date/time before approval.",
        decision: "Approve booking plan, edit date/time, ask client later, or park."
      };
    }
    if (type === "hours") {
      return {
        title: "Payroll Clerk recommendation",
        problem: "Timer is longer than the normal visit length.",
        solution: "Do not approve payroll blindly. Hold the hours review, ask staff for the reason, or edit the approved hours/note before clearing the review.",
        missing: "Staff reason is needed if the longer time is not already explained.",
        decision: "Approve corrected hours, edit notes, ask staff, or park."
      };
    }
    if (type === "accounting") {
      return {
        title: "Accountant recommendation",
        problem: "Accounting export/GST needs owner review before any sync.",
        solution: "Check GST/accounting coding, keep Xero/MYOB sync locked, and send changes back to Bookkeeper if the invoice needs correction.",
        missing: "Owner confirms export readiness.",
        decision: "Approve accounting review, send back, export later, or park."
      };
    }
    if (type === "quality") {
      return {
        title: "Quality Checker recommendation",
        problem: "Completed work is missing proof or a completion note.",
        solution: "Ask staff for missing proof before invoicing unless owner decides the job can be cleared anyway.",
        missing: "Final proof/photo or completion note.",
        decision: "Request proof, review completion, or park."
      };
    }
    if (type === "client") {
      return {
        title: "Client Memory recommendation",
        problem: "A useful client detail was found.",
        solution: "Save a short, useful client memory note only if it helps future jobs, access, messages or preferences.",
        missing: "Owner can edit the wording before saving.",
        decision: "Save memory, edit, ignore, or park."
      };
    }
    return {
      title: "Office recommendation",
      problem: title,
      solution: "Review the prepared draft, fix any field that looks wrong, then approve only when the office plan is clear.",
      missing: "Owner decides the final direction.",
      decision: "Approve, edit, ask, or park."
    };
  }

  function suggestion(root, label, oldValue) {
    const type = typeOf(root);
    const title = recordTitle(root);

    if (/prepared by/.test(label)) {
      return { money: "Bookkeeper", booking: "Receptionist", hours: "Payroll Clerk", accounting: "Accountant", quality: "Quality Checker", client: "Client Memory" }[type] || clean(oldValue) || "Office Manager";
    }

    if (type === "money") {
      if (/client|customer/.test(label)) return "Client from the completed job record";
      if (/job|record|shift/.test(label)) return title;
      if (/line items/.test(label)) return "Base service + green waste extra as its own invoice line";
      if (/draft total|amount|price|total/.test(label)) return "Base job price + green waste extra. Edit final $ amount here.";
      if (/payment link/.test(label)) return "Hold payment link until invoice draft is approved";
      if (/invoice note|note/.test(label)) return "Invoice draft prepared. Extra line held for owner approval before sending.";
    }

    if (type === "booking") {
      if (/client|customer/.test(label)) return "Repeat client from the last completed visit";
      if (/usual cycle/.test(label)) return "Every 3 weeks";
      if (/last visit/.test(label)) return "Use last completed visit date from client history";
      if (/suggested next booking|date|time/.test(label)) return "Next visit: 3 weeks after last visit, same time if available";
      if (/worker/.test(label)) return "Same worker as last visit if available";
      if (/prepared message/.test(label)) return "Hi, we can book your next visit in your usual 3-week cycle. The owner will confirm the date/time before this is sent.";
      if (/internal note/.test(label)) return "Receptionist found no next appointment for a regular client. Book next cycle or ask client if timing has changed.";
    }

    if (type === "hours") {
      if (/worker/.test(label)) return "Worker from the timer record";
      if (/job|record|shift/.test(label)) return title;
      if (/timer/.test(label)) return "Timer flagged as unusually long";
      if (/expected time/.test(label)) return "Use normal job time; edit approved hours after checking staff reason";
      if (/issue/.test(label)) return "Long timer needs explanation before payroll review is cleared";
      if (/prepared action/.test(label)) return "Ask staff for reason or edit approved hours/note before approving review";
    }

    if (type === "accounting") {
      if (/system/.test(label)) return "Xero/MYOB export review";
      if (/record/.test(label)) return title;
      if (/gst|code/.test(label)) return "Check GST and account code before export";
      if (/export status/.test(label)) return "Ready for review only — sync locked";
      if (/accounting note/.test(label)) return "Accountant checks GST/export risk; send back to Bookkeeper if invoice needs correction.";
    }

    if (type === "quality") {
      if (/job|record/.test(label)) return title;
      if (/missing/.test(label)) return "Final proof/photo or completion note";
      if (/staff request/.test(label)) return "Ask worker to upload missing proof before invoice is cleared.";
      if (/hold invoice/.test(label)) return "Hold invoice until proof is attached unless owner clears it.";
    }

    if (type === "client") {
      if (/client|customer/.test(label)) return "Client from the source job/message";
      if (/detail to save/.test(label)) return "Short client memory note for future visits, access or preference";
      if (/source/.test(label)) return "Source job/message checked by Client Memory";
      if (/use for/.test(label)) return "Future jobs, access notes, replies and customer preferences";
    }

    return clean(oldValue) || "Mimic recommendation: check source, edit this field if needed, then approve only when clear.";
  }

  function ensureRecommendation(root) {
    if (root.querySelector(".cvSlipMimicRecommendation")) return;
    const form = root.querySelector(".cvSlipForm");
    if (!form) return;
    const rec = recommendationFor(root);
    const panel = document.createElement("section");
    panel.className = "cvSlipMimicRecommendation";
    panel.innerHTML = `
      <b>${rec.title}</b>
      <p><strong>Problem:</strong> ${rec.problem}</p>
      <p><strong>Suggested fix:</strong> ${rec.solution}</p>
      <p><strong>Still check:</strong> ${rec.missing}</p>
      <p><strong>Owner decision:</strong> ${rec.decision}</p>
    `;
    form.insertBefore(panel, form.children[1] || null);
  }

  function improveSlip(root) {
    if (!root) return;
    ensureRecommendation(root);
    root.querySelector(".cvSlipSmartNotice")?.remove();
    root.querySelectorAll(".cvSlipEditableGrid label").forEach((field) => {
      const input = field.querySelector("input, textarea");
      if (!input) return;
      const label = fieldLabel(field);
      const current = clean(input.value);
      const next = suggestion(root, label, current);
      const shouldReplace = WEAK.test(current) || /suggested: next available|suggested: same worker|use the client from|use the repeat client/i.test(current);
      if (next && shouldReplace && next !== current) {
        field.dataset.cvSmartSuggested = "true";
        setNativeValue(input, next);
      }
      if (/draft total|amount|price|total/.test(label)) applyLabel(field, "Draft total / amount");
      if (/suggested next booking|date|time/.test(label)) applyLabel(field, "Suggested booking date/time");
    });
  }

  function scan() {
    document.querySelectorAll(".cvCommandSlip").forEach(improveSlip);
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("hashchange", () => setTimeout(scan, 50));
  window.addEventListener("load", () => setTimeout(scan, 200));
  setInterval(scan, 1200);
})();

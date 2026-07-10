(() => {
  const WEAK = /^(|needs amount|customer to confirm|prepare only|choose worker|choose date and time|needs date check|worker to confirm|normal time needs check|needs check|selected record|client|repeat client|customer)$/i;
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

  function setNativeValue(input, value) {
    const proto = input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter ? setter.call(input, value) : (input.value = value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function suggestion(root, label, oldValue) {
    const all = textOf(root);
    const title = recordTitle(root);
    const isMoney = MONEY_WORDS.test(all);
    const isBooking = BOOKING_WORDS.test(all);
    const isHours = HOURS_WORDS.test(all);
    const isClient = CLIENT_WORDS.test(all);
    const isQuality = QUALITY_WORDS.test(all);
    const isAccounting = ACCOUNTING_WORDS.test(all);

    if (/prepared by/.test(label)) {
      if (isMoney) return "Bookkeeper";
      if (isBooking) return "Receptionist";
      if (isHours) return "Payroll Clerk";
      if (isAccounting) return "Accountant";
      if (isQuality) return "Quality Checker";
      if (isClient) return "Client Memory";
      return clean(oldValue) || "Office Manager";
    }

    if (/client|customer/.test(label)) {
      if (isBooking) return "Use the repeat client from the last completed visit. Edit here if this is not right.";
      if (isMoney) return "Use the client from the completed job before approving the invoice draft.";
      return "Use the customer on the source record. Edit here if Churvox picked the wrong one.";
    }

    if (/job|record|shift/.test(label)) return title;
    if (/usual cycle/.test(label)) return "Suggested: every 3 weeks based on the repeat booking pattern.";
    if (/last visit/.test(label)) return "Check last completed visit date, then keep or edit before approval.";
    if (/suggested next booking|date|time/.test(label)) return "Suggested: next available slot in the same 3-week cycle. Pick exact date/time before approving.";
    if (/worker/.test(label)) return "Suggested: same worker as the last visit, or choose the available worker here.";
    if (/prepared message/.test(label)) return "Hi, we can book your next visit in the usual cycle. The owner will confirm the date/time before this is sent.";

    if (/line items/.test(label)) return "Base service + extra green waste line. Edit the extra amount before approving.";
    if (/draft total|amount|price|total/.test(label)) return "Suggested: base job price + approved extra. Enter the final amount here before approval.";
    if (/payment link/.test(label)) return "Prepare payment link after invoice draft is approved. Do not charge card here.";
    if (/invoice note/.test(label)) return "Add extra green waste as a separate line, hold invoice for owner approval, then send only after approval.";

    if (/timer/.test(label)) return "Flagged timer is longer than normal. Check start/finish and edit approved hours here.";
    if (/expected time/.test(label)) return "Use normal time for this job type, then adjust if staff notes explain the extra time.";
    if (/issue/.test(label)) return "Timer or job detail needs owner review. Ask staff if the reason is not clear.";
    if (/prepared action/.test(label)) return "Approve corrected hours, edit the hours/note, or ask staff for detail before payroll review.";

    if (/detail to save/.test(label)) return "Suggested client memory from the job/message. Edit wording so it is useful next time.";
    if (/source/.test(label)) return "Source record checked by Churvox. Keep this note only if it helps future work.";
    if (/use for/.test(label)) return "Future jobs, access notes, customer preferences and reply drafts.";

    if (/missing/.test(label)) return "Final proof/photo/completion note is missing. Ask worker to add proof before invoice if needed.";
    if (/staff request/.test(label)) return "Please add the missing proof/photo or completion note so the owner can clear the job.";
    if (/hold invoice/.test(label)) return "Suggested: hold invoice until proof is added, unless owner approves completion anyway.";

    if (/gst|code/.test(label)) return "Check GST/account code before export. Do not sync until owner approves.";
    if (/export status/.test(label)) return "Ready for review only. Xero/MYOB export stays locked until approval.";
    if (/accounting note/.test(label)) return "Accountant checks GST/export risk and sends changes back to Bookkeeper if needed.";

    return clean(oldValue) || "Churvox suggestion: check the source record, edit this field, then approve only when right.";
  }

  function improveSlip(root) {
    if (!root) return;
    if (!root.querySelector(".cvSlipSmartNotice")) {
      const form = root.querySelector(".cvSlipForm");
      if (form) {
        const note = document.createElement("p");
        note.className = "cvSlipSmartNotice";
        note.textContent = "Churvox has filled a best suggestion for every weak field. Edit anything that is not right before approving.";
        form.insertBefore(note, form.children[1] || null);
      }
    }
    root.querySelectorAll(".cvSlipEditableGrid label").forEach((field) => {
      const input = field.querySelector("input, textarea");
      if (!input) return;
      const label = fieldLabel(field);
      const current = clean(input.value);
      if (!WEAK.test(current)) return;
      const next = suggestion(root, label, current);
      if (next && next !== current) {
        field.dataset.cvSmartSuggested = "true";
        setNativeValue(input, next);
      }
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

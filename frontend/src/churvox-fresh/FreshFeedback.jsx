import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const ignoredAreas = [
  ".freshNav",
  ".freshMobileNav",
  ".freshMobileMore",
  ".freshSearchResults",
];

function cleanButtonText(button) {
  return (button.textContent || "").replace(/\s+/g, " ").trim();
}

function currentFreshArea() {
  const label = document.querySelector(".freshTopbar strong")?.textContent?.trim() || "Fresh page";
  const hash = window.location.hash.replace("#", "").trim().toLowerCase();

  return {
    label,
    page: hash || "command",
  };
}

function shouldSendToCommand(text) {
  const lower = text.toLowerCase();

  return (
    lower.includes("command") &&
    (
      lower.includes("send issue") ||
      lower.includes("send to command") ||
      lower.includes("send follow-up") ||
      lower.includes("send")
    )
  );
}

function addCommandInboxIssue(actionText) {
  try {
    if (typeof window === "undefined") return;

    const area = currentFreshArea();
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const list = Array.isArray(current) ? current : [];

    const issue = {
      id: `inbox-${Date.now()}`,
      group: "Inbox",
      title: `${area.label} issue`,
      info: `${area.label} · ${actionText}`,
      urgency: "Owner review",
      found: `A ${area.label} action was sent to Command from the fresh preview.`,
      prepared: "Churvox prepared a safe owner-review slip instead of taking customer-facing action automatically.",
      why: "This keeps the approval desk honest: risky admin comes back to the owner first.",
      owner: `Review the ${area.label.toLowerCase()} issue, then approve, edit, decline or open the related area.`,
      area: area.label,
      page: area.page,
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([issue, ...list].slice(0, 12)));

    window.dispatchEvent(
      new CustomEvent("churvox:fresh-data-updated", {
        detail: { type: "command-inbox" },
      })
    );
  } catch {
    // Fresh preview still works if local storage is unavailable.
  }
}

export default function FreshFeedback() {
  const [message, setMessage] = React.useState("");
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    function show(messageText) {
      window.clearTimeout(timerRef.current);
      setMessage(messageText);
      timerRef.current = window.setTimeout(() => setMessage(""), 2200);
    }

    function onClick(event) {
      const button = event.target.closest?.("button");

      if (!button) return;
      if (!button.closest(".freshApp")) return;

      for (const selector of ignoredAreas) {
        if (button.closest(selector)) return;
      }

      const text = cleanButtonText(button);
      if (!text) return;

      if (shouldSendToCommand(text)) {
        addCommandInboxIssue(text);
        show("Sent to Command");
        return;
      }

      if (text.toLowerCase() === "command" || text.toLowerCase().includes("open command")) {
        show("Opened Command");
        return;
      }

      if (text.toLowerCase().includes("cancel") || text.toLowerCase().includes("close")) {
        show("Closed");
        return;
      }

      if (text.toLowerCase().includes("approve")) {
        show("Approved for owner review");
        return;
      }

      if (text.toLowerCase().includes("save")) {
        show("Saved in fresh preview");
        return;
      }

      if (text.toLowerCase().includes("export")) {
        show("Export prepared");
        return;
      }

      if (text.toLowerCase().includes("create") || text.toLowerCase().includes("add")) {
        show("Draft opened");
        return;
      }

      show(`${text} selected`);
    }

    // Capture phase means we read the current page before React navigates away.
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!message) return null;

  return (
    <div className="freshToast" role="status" aria-live="polite">
      <strong>{message}</strong>
      <span>Fresh preview action</span>
    </div>
  );
}

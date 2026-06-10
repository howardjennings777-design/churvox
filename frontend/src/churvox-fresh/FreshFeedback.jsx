import React from "react";

const ignoredAreas = [
  ".freshNav",
  ".freshMobileNav",
  ".freshMobileMore",
  ".freshSearchResults",
];

function cleanButtonText(button) {
  return (button.textContent || "").replace(/\s+/g, " ").trim();
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

      if (text.toLowerCase().includes("cancel") || text.toLowerCase().includes("close")) {
        show("Closed");
        return;
      }

      if (text.toLowerCase().includes("command")) {
        show("Sent to Command");
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

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
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

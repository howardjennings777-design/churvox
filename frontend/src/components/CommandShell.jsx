import React from "react";

export default function CommandShell({ children }) {
  React.useEffect(() => {
    try {
      document.body.classList.remove("cv-industrial-shell");
      document.body.classList.remove("cvx-command-shell");
    } catch {}
  }, []);

  return <>{children}</>;
}

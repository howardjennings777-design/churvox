import React from "react";

export default function FreshCommandOwnerDeskRedirect() {
  React.useEffect(() => {
    window.location.replace("/command-board");
  }, []);

  return (
    <section className="freshHero">
      <span>Opening Command</span>
      <h1>Taking you to the clean Command desk…</h1>
      <p>The old Command view has been retired. Churvox is opening the approval desk now.</p>
    </section>
  );
}

import React from "react";
import { InstallPrompt } from "./InstallPrompt";

export default function Layout({ children }) {
  return (
    <div className="steelworks-content-only" data-testid="layout-container">
      <main data-testid="main-content-area">{children}</main>
      <InstallPrompt />
    </div>
  );
}

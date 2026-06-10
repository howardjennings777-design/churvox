import React from "react";
import { InstallPrompt } from "./InstallPrompt";

/*
  Layout used to render the old Churvox nav/header.
  CommandShell is now the only app sidebar/navigation.
  Keep this as a safe content wrapper so older pages do not create a second sidebar.
*/
export default function Layout({ children }) {
  return (
    <>
      {children}
      <InstallPrompt />
    </>
  );
}

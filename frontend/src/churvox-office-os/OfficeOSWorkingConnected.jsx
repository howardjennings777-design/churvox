import React from "react";
import OfficeOSConnected from "./OfficeOSConnected";
import OfficeOSQuickPrepare from "./OfficeOSQuickPrepare";

export const OFFICE_OS_WORKING_CONNECTED_BUILD = "churvox-office-os-working-connected-20260723";

if (typeof window !== "undefined") {
  window.__CHURVOX_OFFICE_OS_WORKING_CONNECTED_BUILD__ = OFFICE_OS_WORKING_CONNECTED_BUILD;
}

export default function OfficeOSWorkingConnected() {
  return (
    <div data-working-connected-office-os="true">
      <OfficeOSConnected />
      <OfficeOSQuickPrepare />
    </div>
  );
}

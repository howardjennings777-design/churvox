import React from "react";
import OfficeOSConnected from "./OfficeOSConnected";
import OfficeOSQuickPrepare from "./OfficeOSQuickPrepare";
import OfficeOSApprovalDesk from "./OfficeOSApprovalDesk";
import OfficeOSPreparedRecords from "./OfficeOSPreparedRecords";

export const OFFICE_OS_WORKING_CONNECTED_BUILD = "churvox-office-os-working-connected-20260723-complete-command-proof";

if (typeof window !== "undefined") {
  window.__CHURVOX_OFFICE_OS_WORKING_CONNECTED_BUILD__ = OFFICE_OS_WORKING_CONNECTED_BUILD;
}

export default function OfficeOSWorkingConnected() {
  return (
    <div data-working-connected-office-os="true">
      <OfficeOSConnected />
      <OfficeOSQuickPrepare />
      <OfficeOSApprovalDesk />
      <OfficeOSPreparedRecords />
    </div>
  );
}

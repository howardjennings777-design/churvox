import React from "react";
import PaidLaunchHQSystem from "./PaidLaunchHQSystem";
import TesterApplicationsInbox from "./admin/TesterApplicationsInbox";
import ChurvoxPromotionCentre from "./admin/ChurvoxPromotionCentre";

export default function ChurvoxHQPage() {
  return (
    <div
      id="CHURVOX_HQ_SYSTEM"
      data-cv-allow-verbatim="true"
      aria-label="Churvox HQ system"
    >
      <TesterApplicationsInbox />
      <ChurvoxPromotionCentre />
      <PaidLaunchHQSystem />
    </div>
  );
}

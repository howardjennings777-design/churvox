import React from "react";
import PlatformAdminRoute from "../components/admin/PlatformAdminRoute";
import AppOwnerMachine from "./AppOwnerMachine";

export default function AppOwnerPage() {
  return (
    <PlatformAdminRoute>
      <AppOwnerMachine />
    </PlatformAdminRoute>
  );
}

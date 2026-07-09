import React from "react";
import OfficeTeamMessagesDesk from "./OfficeTeamMessagesDesk";
import OfficeTeamWorkerPhoneView from "./OfficeTeamWorkerPhoneView";

export function MessagesScreen(props) {
  return <OfficeTeamMessagesDesk {...props} />;
}

export function WorkerViewScreen(props) {
  return <OfficeTeamWorkerPhoneView {...props} />;
}

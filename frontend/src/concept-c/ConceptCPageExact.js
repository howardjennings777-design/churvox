// CHURVOX_TEAM_WORKSPACE_STABLE_ROUTING_20260601
// App imports ./concept-c/ConceptCPageExact without an extension. This .js wrapper
// takes precedence over the older .jsx file in the resolver, keeps every existing
// Command page intact, and routes only area="team" to the stable Team workspace.
import React from "react";
import ConceptCPageExact from "./ConceptCPageExact.jsx";
import TeamWorkspacePage from "../pages/TeamWorkspacePage";

export default function ConceptCPageExactRouter(props) {
  if (props?.area === "team") {
    return <TeamWorkspacePage />;
  }
  return <ConceptCPageExact {...props} />;
}

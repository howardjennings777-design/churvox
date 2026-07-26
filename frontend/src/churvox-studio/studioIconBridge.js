import { Check } from "lucide-react";

// StudioPages is intentionally independent from the inherited product UI.
// Expose the plan tick as a browser global until the page module is split into
// smaller route bundles; ES modules resolve this global binding at render time.
if (typeof globalThis !== "undefined") globalThis.Check = Check;

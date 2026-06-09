// Churvox pricing config.
// Backend plan keys stay: solo, team, pro, enterprise.
// Public plan names: Start, Crew, Operator, Command.

export const PLAN_KEYS = {
  START: "solo",
  CREW: "team",
  OPERATOR: "pro",
  COMMAND: "enterprise"
};

export const PLAN_ALIASES = {
  start: "solo",
  solo: "solo",
  crew: "team",
  team: "team",
  operator: "pro",
  pro: "pro",
  command: "enterprise",
  enterprise: "enterprise"
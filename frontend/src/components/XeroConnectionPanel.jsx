import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

const formDefaults = {
  invoice_sync_enabled: false,
  contact_sync_enabled: false,
  payment_sync_enabled: false,
  payroll_handoff_enabled
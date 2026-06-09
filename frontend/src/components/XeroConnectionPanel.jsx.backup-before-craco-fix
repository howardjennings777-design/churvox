import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

const defaultSettings = {
  invoice_sync_enabled: false,
  contact_sync_enabled: false,
  payment_sync_enabled: false,
  payroll_handoff_enabled: false,
  approval_required: true,
};

export default function XeroConnectionPanel({ compact = false }) {
  const api = useApi();
  const [status, setStatus] = React.useState({
    configured: false,
    addon_active: false,
    connected: false,
    connection: {},
    settings: defaultSettings,
  });
  const [settings, setSettings] = React.useState(defaultSettings);
  const [busy, setBusy] =
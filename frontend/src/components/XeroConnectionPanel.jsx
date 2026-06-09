import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

export default function XeroConnectionPanel({ compact = false }) {
  const api = useApi();
  const [status, setStatus]
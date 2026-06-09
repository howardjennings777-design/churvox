import React from "react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

const s = {
  panel: { borderRadius: 30, background: "#fffaf0", border: "1px solid rgba(15,23,42,.16)", boxShadow: "0 18px 46px rgba(2,6,23,.10)", padding: 22
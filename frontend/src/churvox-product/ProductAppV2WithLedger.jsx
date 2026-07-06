import React from "react";
import ProductAppV2 from "./ProductAppV2";
import WorldAdminLedger from "./WorldAdminLedger";
import WorldAdminLedgerNavBridge from "./WorldAdminLedgerNavBridge";

export default function ProductAppV2WithLedger() {
  return <>
    <ProductAppV2 />
    <WorldAdminLedger />
    <WorldAdminLedgerNavBridge />
  </>;
}

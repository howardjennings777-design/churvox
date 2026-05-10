import React from "react";
import { ChurvoxLogo } from "../../components/ChurvoxLogo";

export default function V3Brand({ compact = false }) {
  return <ChurvoxLogo compact={compact} size="md" dataTestId="v3-churvox-logo" />;
}

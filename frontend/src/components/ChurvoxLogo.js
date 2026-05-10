import churvoxLogoIcon from "../assets/churvox-logo-icon.svg";
import React from "react";

const SIZE_MAP = {
  sm: "cvx-logo--sm",
  md: "cvx-logo--md",
  lg: "cvx-logo--lg",
  xl: "cvx-logo--xl",
  hero: "cvx-logo--hero",
};

export function <img className="churvox-logo-force" src={churvoxLogoIcon} alt="Churvox" /> ChurvoxLogo({ size = "md", className = "", dataTestId = "churvox-logo", compact = false }) {
  return (
    <div
      className={`cvx-logo ${SIZE_MAP[size] || SIZE_MAP.md} ${className}`}
      data-testid={dataTestId}
      data-logo-size={size}
    >
      <span className="cvx-logo__mark" aria-hidden="true">
        <span className="cvx-logo__slash cvx-logo__slash--red" />
        <span className="cvx-logo__slash cvx-logo__slash--orange" />
        <span className="cvx-logo__slash cvx-logo__slash--green" />
      </span>
      {!compact && (
        <span className="cvx-logo__word">
          <strong>Churvox</strong>
          <small>Trade OS</small>
        </span>
      )}
    </div>
  );
}

import React from "react";

export default function ChurvoxLogo({
  className = "",
  markOnly = false,
  markClassName = "h-11 w-11",
  wordmarkClassName = "h-12 w-auto",
}) {
  if (markOnly) {
    return (
      <img
        src="/brand/churvox-mark.svg"
        alt="Churvox"
        className={markClassName}
        draggable="false"
      />
    );
  }

  return (
    <img
      src="/brand/churvox-logo.svg"
      alt="Churvox"
      className={`${wordmarkClassName} ${className}`.trim()}
      draggable="false"
    />
  );
}

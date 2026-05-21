import React from "react";

/**
 * Churvox primitive Button.
 * Variants: primary (lime), secondary (white), ghost, danger.
 * Sizes: sm, md, lg.
 */
const CxButton = React.forwardRef(function CxButton(
  {
    children,
    variant = "primary",
    size = "md",
    type = "button",
    disabled = false,
    loading = false,
    leftIcon = null,
    rightIcon = null,
    className = "",
    as: As = "button",
    ...rest
  },
  ref
) {
  const sizeCls = size === "lg" ? " cx-btn--lg" : size === "sm" ? " cx-btn--sm" : "";
  const variantCls = ` cx-btn--${variant}`;
  const disabledCls = disabled || loading ? " cx-btn--disabled" : "";
  const cls = `cx-btn${variantCls}${sizeCls}${disabledCls} ${className}`.trim();

  const props = {
    ref,
    className: cls,
    "aria-busy": loading || undefined,
    "aria-disabled": disabled || loading || undefined,
    ...rest,
  };
  if (As === "button") {
    props.type = type;
    props.disabled = disabled || loading;
  }

  return (
    <As {...props}>
      {loading ? (
        <span
          aria-hidden="true"
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "2px solid currentColor",
            borderRightColor: "transparent",
            animation: "cx-spin 0.7s linear infinite",
            display: "inline-block",
          }}
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!loading && rightIcon ? rightIcon : null}
      <style>{`@keyframes cx-spin { to { transform: rotate(360deg); } }`}</style>
    </As>
  );
});

export default CxButton;

export default function FloatingLogo({ small = false, wordmark = false }) {
  if (wordmark && !small) {
    return (
      <div className="op-sidebar-brand-logo">
        <img
          className="op-sidebar-brand-mark"
          src="/brand/churvox-holo-c.svg"
          alt="Churvox"
        />
        <div className="op-sidebar-brand-text">
          <strong>CHURVOX</strong>
          <span>OPERATOR OS</span>
        </div>
      </div>
    );
  }

  return (
    <div className={small ? "op-logo-wrap small" : "op-logo-wrap"}>
      <img
        className="op-floating-logo"
        src="/brand/churvox-holo-c.svg"
        alt="Churvox"
      />
      {!small ? (
        <div>
          <strong>CHURVOX</strong>
          <span>OPERATOR OS</span>
        </div>
      ) : null}
    </div>
  );
}

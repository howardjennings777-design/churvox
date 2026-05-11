export default function FloatingLogo({ small = false, wordmark = false }) {
  if (wordmark && !small) {
    return (
      <div className="op-wordmark-wrap">
        <img
          className="op-wordmark-logo"
          src="/brand/churvox-operator-logo.svg"
          alt="Churvox Operator OS"
        />
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

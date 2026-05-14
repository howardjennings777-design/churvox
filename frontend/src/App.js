export default function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        color: "#102033",
        background:
          "radial-gradient(circle at top left, rgba(103,232,249,.35), transparent 32rem), radial-gradient(circle at top right, rgba(37,99,235,.22), transparent 30rem), linear-gradient(135deg, #eaf8ff 0%, #eef5ff 48%, #e9fff8 100%)",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          width: "min(860px, 100%)",
          border: "1px solid rgba(255,255,255,.72)",
          borderRadius: 34,
          background: "rgba(255,255,255,.58)",
          boxShadow: "0 30px 90px rgba(16,32,51,.12)",
          padding: "clamp(28px, 6vw, 56px)",
          textAlign: "center",
          backdropFilter: "blur(24px)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 18px",
            borderRadius: 24,
            background: "linear-gradient(145deg, #102033, #2563eb)",
            boxShadow: "0 18px 44px rgba(37,99,235,.25)",
          }}
        />
        <p
          style={{
            margin: "0 0 12px",
            color: "#2563eb",
            fontSize: 12,
            fontWeight: 950,
            letterSpacing: ".14em",
            textTransform: "uppercase",
          }}
        >
          Churvox clean shell reset
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(40px, 7vw, 76px)",
            lineHeight: ".95",
            letterSpacing: "-.07em",
            fontWeight: 950,
          }}
        >
          Ready for the new AI-powered shell.
        </h1>
        <p
          style={{
            maxWidth: 620,
            margin: "22px auto 0",
            color: "#52677d",
            fontSize: 18,
            lineHeight: 1.7,
            fontWeight: 650,
          }}
        >
          Old public/auth shell attempts have been removed. Next step is to build one clean new shell from scratch.
        </p>
      </section>
    </main>
  );
}

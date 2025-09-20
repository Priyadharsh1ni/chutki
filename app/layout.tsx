export const metadata = {
  title: "MenuAI Extractor",
  description: "AI-powered menu data extraction",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "Inter, system-ui, Arial, sans-serif",
          margin: 0,
          backgroundColor: "#fdfcfa",
          color: "#333",
        }}
      >
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "24px" }}>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "48px",
            }}
          >

            <div>
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  margin: 0,
                  color: "#1a202c",
                }}
              >
                MenuAI Extractor
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  color: "#4a5568",
                }}
              >
                AI-powered menu data extraction
              </p>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
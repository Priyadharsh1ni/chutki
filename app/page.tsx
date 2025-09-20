"use client";

import { useEffect, useState } from "react";

enum Step {
  Idle,
  Processing,
  Done,
  Error,
}


export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>(Step.Idle);
  const [error, setError] = useState<string | null>(null);
  const [menus, setMenus] = useState<any[]>([]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    console.log(f);
    setFile(f);
    if (f) {
      onSubmit(f);
    }
  };

  const onSubmit = async (selectedFile: File) => {
    if (!selectedFile) return;
    setError(null);
    setStep(Step.Processing);
    const form = new FormData();
    form.append("file", selectedFile);

    const res = await fetch("/api/process", { method: "POST", body: form });
    if (!res.ok) {
      const ct = res.headers.get("content-type") || "";
      let msg = "Failed to process file";
      try {
        if (ct.includes("application/json")) {
          const j = await res.json();
          msg =
            j?.error ||
            j?.message ||
            (Array.isArray(j?.issues)
              ? "Validation failed"
              : JSON.stringify(j));
          if (Array.isArray(j?.issues) && j.issues[0]?.message) {
            msg += `: ${j.issues[0].message}`;
          }
        } else {
          msg = await res.text();
        }
      } catch {
        // ignore parse errors, keep default msg
      }
      setError(msg);
      setStep(Step.Error);
      return;
    }
    setStep(Step.Done);
    const result = await res.json();
    // Redirect to the new menu page
    if (result.menuId) {
      window.open(`/api/menu?id=${result.menuId}`, "_blank");
    }
    setFile(null);
  };

  useEffect(() => {
    fetch('/api/list')
      .then(res => res.json())
      .then(data => setMenus(data.menus || []))
      .catch(err => console.error('Failed to fetch menus:', err));
  }, []);

  const FeatureCard = ({ icon, title, text }: any) => (
    <div style={{ flex: 1, minWidth: 250, border: "1px solid orange", borderRadius: "12px", padding: "24px", textAlign: "center", backgroundColor: "#fff" }}>
      <div
        style={{
          fontSize: "24px",
          backgroundColor: "#fef3e9",
          color: "#f68b37",
          width: "48px",
          height: "48px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <h3 style={{ marginTop: "16px", color: "#1a202c" }}>{title}</h3>
      <p style={{ color: "#4a5568" }}>{text}</p>
    </div>
  );

  const InfoTag = ({ label, text }: any) => (
    <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
      <span
        style={{
          backgroundColor: "#fef3e9",
          color: "#f68b37",
          padding: "4px 8px",
          borderRadius: "6px",
          fontSize: "0.8rem",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span style={{ color: "#4a5568" }}>{text}</span>
    </div>
  );

  return (
    <div style={{ textAlign: "center" }}>
      {/* Hero Section */}
      <div
        style={{
          padding: "48px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <span
          style={{
            backgroundColor: "#fef3e9",
            color: "#f68b37",
            padding: "6px 12px",
            borderRadius: "16px",
            fontWeight: 500,
            marginBottom: "16px",
          }}
        >
           Powered by AI 
        </span>
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            margin: "0 0 16px 0",
            color: "#1a202c",
          }}
        >
          Extract Menu Data from Any Text File
        </h2>
        <p style={{ maxWidth: 600, color: "#4a5568", lineHeight: 1.6 }}>
          Upload WhatsApp chats, text documents, or any file containing menu
          information. Our AI will automatically extract and organize the data
          for you.
        </p>
      </div>

      {/* Features Section */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          justifyContent: "center",
          margin: "48px 0",
          textAlign: "left",
        }}
      >
        <FeatureCard
          icon={"⚡️"}
          title="AI-Powered"
          text="Advanced AI models extract structured menu data from unorganized text."
        />
        <FeatureCard
          icon={"🗂️"}
          title="Smart Storage"
          text="Automatically categorizes and stores extracted menu items in a database."
        />
        <FeatureCard
          icon={"🎨"}
          title="Beautiful Display"
          text="Clean, organized presentation of your menu data with rich formatting."
        />
      </div>

      {/* Upload Section */}
      <div style={{ margin: "48px 0" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#1a202c" }}>
          Ready to Get Started?
        </h2>
        <p style={{ color: "#4a5568" }}>
          Upload your text file and watch the magic happen.
        </p>

        {step === Step.Processing ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems: 'center' }}>
          <img src="/gif/Cooking.gif" alt="Cooking" style={{ width: 100, height: 100 }} />
          <h3 style={{ margin: 0, color: "#1a202c", fontWeight: 600 }}> 
            Processing your file...
          </h3>
          </div>
        ) : (
          <label
            htmlFor="file-upload"
            style={{
              display: "block",
              cursor: "pointer",
              border: "2px dashed #e2e8f0",
              borderRadius: "12px",
              padding: "48px 24px",
              marginTop: "24px",
              backgroundColor: "#fff",
            }}
          >
            <input
              id="file-upload"
              type="file"
              accept=".txt,text/plain"
              onChange={onFileChange}
              style={{ display: "none" }}
              disabled={step === Step.Processing}
            />
            <div
              style={{
                backgroundColor: "#fef3e9",
                width: 48,
                height: 48,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
                fontSize: "24px",
                color: "#f68b37",
              }}
            >
               ⬆️
            </div>
            <p style={{ color: "#4a5568", margin: "8px 0 0 0" }}>
              Drag & drop your .txt file here, or click to browse
            </p>
            <p style={{ color: "#718096", fontSize: "0.8rem" }}>
              Supports: WhatsApp chat exports, menu text files, and other .txt
              documents
            </p>
          </label>
        )}
        {error && (
          <div style={{ color: "#c53030", marginTop: "16px" }}>{error}</div>
        )}
      </div>

      {/* Info Section */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
          textAlign: "left",
          backgroundColor: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}> What can you upload? </h3>
        <div style={{ display: "grid", gap: 16 }}>
          <InfoTag
            label="WhatsApp"
            text="Exported chat files with menu discussions"
          />
          <InfoTag
            label="Text Files"
            text="Any .txt file containing menu information"
          />
          <InfoTag
            label="Menu Lists"
            text="Structured or unstructured menu data"
          />
        </div>
      </div>

      {/* Recent Menus Section */}
      <div
        style={{
          marginTop: "48px",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "24px",
          backgroundColor: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Recent Menus</h3>
        {menus.length === 0 ? (
          <p style={{ color: "#4a5568" }}>No menus yet. Upload a file to get started!</p>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {menus.map((menu) => (
              <div
                key={menu.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "16px",
                  backgroundColor: "#fafafa",
                }}
              >
                <h4 style={{ margin: "0 0 8px 0", color: "#1a202c" }}>
                  Menu #{menu.id}
                </h4>
                <p style={{ margin: "4px 0", color: "#4a5568" }}>
                  Vendor: {menu.vendor || "Unknown"}
                </p>
                <p style={{ margin: "4px 0", color: "#4a5568" }}>
                  Currency: {menu.currency || "N/A"}
                </p>
                <p style={{ margin: "4px 0", color: "#4a5568" }}>
                  Created: {new Date(menu.created_at).toLocaleString()}
                </p>
                <button
                  onClick={() => window.open(`/api/menu?id=${menu.id}`, "_blank")}
                  style={{
                    backgroundColor: "#f68b37",
                    color: "white",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  View Menu
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

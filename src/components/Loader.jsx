import React, { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

function Loader() {
  const { active, progress, loaded, total, item } = useProgress();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!active && progress >= 100) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [active, progress]);

  if (!isVisible) return null;

  const pct = Math.min(100, Math.max(0, progress || 0));

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111827",
        zIndex: 9999,
        opacity: !active && pct >= 100 ? 0 : 1,
        transition: "opacity 500ms",
        pointerEvents: !active && pct >= 100 ? "none" : "auto",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              width: "320px",
              height: "10px",
              backgroundColor: "#374151",
              borderRadius: "9999px",
              overflow: "hidden",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg,#60a5fa,#3b82f6)",
                width: `${pct}%`,
                transition: "width 200ms ease-out",
              }}
            />
          </div>
        </div>
        <p style={{ color: "white", fontSize: "1.125rem", fontWeight: 600 }}>
          Loading... {Math.round(pct)}%
        </p>
        <p
          style={{
            color: "#9ca3af",
            fontSize: "0.875rem",
            marginTop: "0.5rem",
          }}
        >
          {item ? `Downloading: ${item}` : `${loaded}/${total} assets`}
        </p>
      </div>
    </div>
  );
}

export default Loader;

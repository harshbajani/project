import React, { useEffect, useState } from "react";
import { useLoadingStore } from "../store/LoadingStore";

function Loader() {
  const progress = useLoadingStore((state) => state.getOverallProgress());
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (progress >= 100) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  if (!isVisible) return null;

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
        opacity: progress >= 100 ? 0 : 1,
        transition: "opacity 500ms",
        pointerEvents: progress >= 100 ? "none" : "auto",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              width: "256px",
              height: "8px",
              backgroundColor: "#374151",
              borderRadius: "9999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                backgroundColor: "#3b82f6",
                width: `${progress}%`,
                transition: "width 300ms ease-out",
              }}
            />
          </div>
        </div>
        <p style={{ color: "white", fontSize: "1.125rem", fontWeight: 600 }}>
          Loading... {Math.round(progress)}%
        </p>
        <p
          style={{
            color: "#9ca3af",
            fontSize: "0.875rem",
            marginTop: "0.5rem",
          }}
        >
          {progress < 50
            ? "Loading base model..."
            : progress < 100
            ? "Loading navigation mesh..."
            : "Complete!"}
        </p>
      </div>
    </div>
  );
}

export default Loader;

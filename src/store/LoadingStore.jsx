import React, { createContext, useContext, useState } from "react";

const LoadingContext = createContext();

export function LoadingProvider({ children }) {
  const [loadingProgress, setLoadingProgress] = useState({
    baseModel: 0,
    navMesh: 0,
  });

  const updateProgress = (key, value) => {
    setLoadingProgress((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const getOverallProgress = () => {
    const values = Object.values(loadingProgress);
    const total = values.reduce((acc, val) => acc + val, 0);
    return total / values.length;
  };

  return (
    <LoadingContext.Provider value={{ updateProgress, getOverallProgress }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoadingStore(selector) {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoadingStore must be used within LoadingProvider");
  }
  if (selector) {
    return selector(context);
  }
  return context;
}

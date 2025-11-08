import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import Scene from "./components/Scene";
import Loader from "./components/Loader";
import { LoadingProvider } from "./store/LoadingStore";

function App() {
  return (
    <LoadingProvider>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          margin: 0,
          padding: 0,
          overflow: "hidden",
          position: "fixed",
          top: 0,
          left: 0,
          background: "#000",
        }}
      >
        <Canvas
          camera={{
            position: [-1.1508156, -1.6764, 0.9319295],
            fov: 75,
            near: 0.1,
            far: 1000,
          }}
          gl={{ antialias: true }}
          style={{ display: "block" }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
        <Loader />
      </div>
    </LoadingProvider>
  );
}

export default App;

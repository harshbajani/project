import React, { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useLoadingStore } from "../store/LoadingStore";

function BaseModel() {
  const { scene } = useGLTF("/models/base_model.glb");
  const updateProgress = useLoadingStore((state) => state.updateProgress);

  useEffect(() => {
    updateProgress("baseModel", 100);
  }, [updateProgress]);

  return <primitive object={scene} position={[0, 0, 0]} rotation={[0, 0, 0]} />;
}

useGLTF.preload("/models/base_model.glb");

export default BaseModel;

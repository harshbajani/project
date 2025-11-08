// BaseModel.jsx
import React, { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useLoadingStore } from "../store/LoadingStore";

function BaseModel({ onLoad }) {
  const { scene } = useGLTF("/models/base_model.glb");
  const updateProgress = useLoadingStore((state) => state.updateProgress);

  useEffect(() => {
    if (scene) {
      // optional: toggle shadows or other props
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      if (onLoad) onLoad(scene);
      updateProgress("baseModel", 100);
    }
  }, [scene, onLoad, updateProgress]);

  return <primitive object={scene} position={[0, 0, 0]} rotation={[0, 0, 0]} />;
}

useGLTF.preload("/models/base_model.glb");

export default BaseModel;

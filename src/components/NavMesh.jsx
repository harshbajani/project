import React, { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLoadingStore } from "../store/LoadingStore";

function NavMesh({ onLoad, onClick }) {
  const { scene } = useGLTF("/models/navmesh.glb");
  const meshRef = useRef();
  const { raycaster, pointer, camera } = useThree();
  const updateProgress = useLoadingStore((state) => state.updateProgress);
  const lastClickTime = useRef(0);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
          });
          meshRef.current = child;
          onLoad(child);
        }
      });
      updateProgress("navMesh", 100);
    }
  }, [scene, onLoad, updateProgress]);

  const handleClick = (event) => {
    event.stopPropagation();

    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - lastClickTime.current;

    if (timeSinceLastClick < 300) {
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(meshRef.current, true);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        onClick(point);
      }
    }

    lastClickTime.current = currentTime;
  };

  return (
    <primitive
      object={scene}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      onClick={handleClick}
    />
  );
}

useGLTF.preload("/models/navmesh.glb");

export default NavMesh;

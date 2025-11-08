import React, { useState } from "react";
import BaseModel from "./BaseModel";
import NavMesh from "./NavMesh";
import CameraController from "./CameraController";
import Lights from "./Lights";

function Scene() {
  const [navMeshObject, setNavMeshObject] = useState(null);
  const [targetPosition, setTargetPosition] = useState(null);

  const handleNavMeshClick = (point) => {
    console.log("NavMesh clicked at:", point);
    setTargetPosition(point);
  };

  return (
    <>
      <Lights />
      <BaseModel />
      <NavMesh onLoad={setNavMeshObject} onClick={handleNavMeshClick} />
      <CameraController
        navMesh={navMeshObject}
        targetPosition={targetPosition}
        onReachTarget={() => setTargetPosition(null)}
      />
    </>
  );
}

export default Scene;

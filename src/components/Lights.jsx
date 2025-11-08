import React from "react";

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, 10, -5]} intensity={0.5} />
      <hemisphereLight args={["#ffffff", "#444444", 0.6]} />
    </>
  );
}

export default Lights;

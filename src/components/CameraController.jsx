// CameraController.jsx
import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function CameraController({ targetPosition, onReachTarget }) {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const rotationVelocity = useRef({ x: 0, y: 0 });

  const currentCameraHeight = useRef(0.9319295);
  const isMoving = useRef(false);
  const movementProgress = useRef(0);
  const startPosition = useRef(new THREE.Vector3());
  const endPosition = useRef(new THREE.Vector3());

  const [lookRotation, setLookRotation] = useState({
    yaw: Math.PI * 0.75, // Start facing into the gallery
    pitch: 0,
  });

  // Set initial camera orientation
  useEffect(() => {
    const euler = new THREE.Euler(0, Math.PI * 0.75, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);
  }, [camera]);

  // Mouse/Touch look around (IMPROVED)
  useEffect(() => {
    const handleStart = (e) => {
      isDragging.current = true;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      previousMousePosition.current = { x: clientX, y: clientY };
      // Stop any momentum
      rotationVelocity.current = { x: 0, y: 0 };
    };

    const handleMove = (e) => {
      if (!isDragging.current) return;

      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

      const deltaX = clientX - previousMousePosition.current.x;
      const deltaY = clientY - previousMousePosition.current.y;

      // Immediate rotation update (no velocity accumulation during drag)
      setLookRotation((prev) => {
        const newPitch = THREE.MathUtils.clamp(
          prev.pitch - deltaY * 0.003,
          -Math.PI / 2 + 0.1,
          Math.PI / 2 - 0.1
        );
        const newYaw = prev.yaw - deltaX * 0.003;
        return { pitch: newPitch, yaw: newYaw };
      });

      previousMousePosition.current = { x: clientX, y: clientY };
    };

    const handleEnd = () => {
      isDragging.current = false;
    };

    const canvas = gl.domElement;
    canvas.addEventListener("mousedown", handleStart);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseup", handleEnd);
    canvas.addEventListener("touchstart", handleStart, { passive: true });
    canvas.addEventListener("touchmove", handleMove, { passive: true });
    canvas.addEventListener("touchend", handleEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleStart);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseup", handleEnd);
      canvas.removeEventListener("touchstart", handleStart);
      canvas.removeEventListener("touchmove", handleMove);
      canvas.removeEventListener("touchend", handleEnd);
    };
  }, [gl, camera]);

  // Handle movement to target
  useEffect(() => {
    if (targetPosition && !isMoving.current) {
      startPosition.current.copy(camera.position);
      endPosition.current.set(
        targetPosition.x,
        currentCameraHeight.current,
        targetPosition.z
      );

      isMoving.current = true;
      movementProgress.current = 0;
    }
  }, [targetPosition, camera]);

  useFrame(() => {
    // Apply rotation to camera (removed damping for immediate response)
    const euler = new THREE.Euler(
      lookRotation.pitch,
      lookRotation.yaw,
      0,
      "YXZ"
    );
    camera.quaternion.setFromEuler(euler);

    // Handle movement
    if (isMoving.current) {
      movementProgress.current += 0.016 * 0.8; // ~60fps * speed

      if (movementProgress.current >= 1) {
        movementProgress.current = 1;
        isMoving.current = false;
        if (onReachTarget) onReachTarget();
      }

      const t = movementProgress.current;
      const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      camera.position.lerpVectors(
        startPosition.current,
        endPosition.current,
        easedT
      );
    }
  });

  return null;
}

export default CameraController;

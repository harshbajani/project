// CameraController.jsx
import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function CameraController({ navMesh, targetPosition, onReachTarget }) {
  const { camera, gl } = useThree();

  // Input / pointers
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Movement smoothing
  const velocity = useRef(new THREE.Vector3(0, 0, 0)); // world-space velocity
  const desiredVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const currentCameraHeight = useRef(0.9319295); // distance above navmesh surface
  const cameraHeightOffset = 0.9319295;

  // Movement flags
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  // Rotation smoothing
  const [lookRotation, setLookRotation] = useState({
    yaw: Math.PI * 0.75,
    pitch: 0,
  });
  const smoothRotation = useRef({
    yaw: lookRotation.yaw,
    pitch: lookRotation.pitch,
  });

  // Nav mesh raycaster
  const navRay = useRef(new THREE.Raycaster());
  navRay.current.far = 100;

  // Movement-to-target tween
  const isMovingToTarget = useRef(false);
  const startPosition = useRef(new THREE.Vector3());
  const endPosition = useRef(new THREE.Vector3());
  const movementProgress = useRef(0);

  // Tweakable parameters (tune these)
  const moveSpeed = 2.4; // units per second
  const accel = 18.0; // how quickly velocity approaches target
  const friction = 10.0; // slows down when no input
  const positionLerpSpeed = 12.0; // how tightly camera follows computed position
  const rotationLerpSpeed = 18.0; // smoothing rotation
  const navRayHeight = 20.0; // how high above candidate position to cast down

  // --- initial camera orientation
  useEffect(() => {
    const euler = new THREE.Euler(0, lookRotation.yaw, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);
  }, [camera]);

  // --- keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          keys.current.forward = true;
          break;
        case "s":
        case "arrowdown":
          keys.current.backward = true;
          break;
        case "a":
        case "arrowleft":
          keys.current.left = true;
          break;
        case "d":
        case "arrowright":
          keys.current.right = true;
          break;
      }
    };
    const handleKeyUp = (e) => {
      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          keys.current.forward = false;
          break;
        case "s":
        case "arrowdown":
          keys.current.backward = false;
          break;
        case "a":
        case "arrowleft":
          keys.current.left = false;
          break;
        case "d":
        case "arrowright":
          keys.current.right = false;
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- mouse/touch look (drag)
  useEffect(() => {
    const handleStart = (e) => {
      isDragging.current = true;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      previousMousePosition.current = { x: clientX, y: clientY };
    };
    const handleMove = (e) => {
      if (!isDragging.current) return;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      const deltaX = clientX - previousMousePosition.current.x;
      const deltaY = clientY - previousMousePosition.current.y;

      setLookRotation((prev) => {
        const newPitch = THREE.MathUtils.clamp(
          prev.pitch - deltaY * 0.0032,
          -Math.PI / 2 + 0.12,
          Math.PI / 2 - 0.12
        );
        const newYaw = prev.yaw - deltaX * 0.0032;
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
    window.addEventListener("mouseup", handleEnd);
    canvas.addEventListener("touchstart", handleStart, { passive: true });
    canvas.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleStart);
      canvas.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      canvas.removeEventListener("touchstart", handleStart);
      canvas.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [gl]);

  // --- handle double-click target moves (existing logic adapted)
  useEffect(() => {
    if (targetPosition && !isMovingToTarget.current) {
      startPosition.current.copy(camera.position);
      endPosition.current.set(
        targetPosition.x,
        camera.position.y,
        targetPosition.z
      );
      isMovingToTarget.current = true;
      movementProgress.current = 0;
    }
  }, [targetPosition, camera.position]);

  // Helper: returns intersection point on navmesh for given X,Z (or null)
  const getNavmeshFloorAt = (x, z) => {
    if (!navMesh) return null;
    const origin = new THREE.Vector3(x, navRayHeight, z);
    navRay.current.set(origin, new THREE.Vector3(0, -1, 0));
    const intersects = navRay.current.intersectObject(navMesh, true);
    if (intersects.length > 0) return intersects[0].point.clone();
    return null;
  };

  // main frame loop
  useFrame((state, delta) => {
    // --- Smooth rotation (yaw/pitch)
    smoothRotation.current.yaw = THREE.MathUtils.lerp(
      smoothRotation.current.yaw,
      lookRotation.yaw,
      1 - Math.exp(-rotationLerpSpeed * delta)
    );
    smoothRotation.current.pitch = THREE.MathUtils.lerp(
      smoothRotation.current.pitch,
      lookRotation.pitch,
      1 - Math.exp(-rotationLerpSpeed * delta)
    );
    const euler = new THREE.Euler(
      smoothRotation.current.pitch,
      smoothRotation.current.yaw,
      0,
      "YXZ"
    );
    camera.quaternion.setFromEuler(euler);

    // --- compute desired input direction in world-space (based on camera orientation)
    const inputDir = new THREE.Vector3(0, 0, 0);
    if (keys.current.forward) inputDir.z -= 1;
    if (keys.current.backward) inputDir.z += 1;
    if (keys.current.left) inputDir.x -= 1;
    if (keys.current.right) inputDir.x += 1;

    if (inputDir.lengthSq() > 0) {
      // transform from camera-local to world-space (ignore Y)
      inputDir.normalize();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        camera.quaternion
      );
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(
        camera.quaternion
      );
      right.y = 0;
      right.normalize();

      const worldDir = new THREE.Vector3();
      worldDir.addScaledVector(forward, -inputDir.z); // note: input z was -1 for forward
      worldDir.addScaledVector(right, inputDir.x);
      worldDir.normalize();

      desiredVelocity.current.copy(worldDir.multiplyScalar(moveSpeed));
    } else {
      // no input -> desired velocity zero
      desiredVelocity.current.set(0, 0, 0);
    }

    // --- accelerate / decelerate velocity toward desired
    // velocity = lerp(velocity, desiredVelocity, 1 - exp(-accel * dt))
    const blend = 1 - Math.exp(-accel * delta);
    velocity.current.lerp(desiredVelocity.current, blend);

    // apply friction if almost stopped
    if (
      desiredVelocity.current.lengthSq() === 0 &&
      velocity.current.length() < 0.01
    ) {
      velocity.current.set(0, 0, 0);
    }

    // --- compute candidate position
    const frameMove = velocity.current.clone().multiplyScalar(delta); // units this frame
    const candidatePos = camera.position.clone().add(frameMove);

    // --- check navmesh containment & get floor Y
    const floorPoint = getNavmeshFloorAt(candidatePos.x, candidatePos.z);

    if (floorPoint) {
      // position Y should be floor.y + cameraHeightOffset
      candidatePos.y = floorPoint.y + cameraHeightOffset;

      // If currently moving to a double-click target, we still want to respect navmesh:
      if (isMovingToTarget.current) {
        // progress movement along interpolation but clamp to navmesh
        movementProgress.current += delta * 0.8;
        if (movementProgress.current >= 1) {
          movementProgress.current = 1;
          isMovingToTarget.current = false;
          if (onReachTarget) onReachTarget();
        }
        const t = movementProgress.current;
        const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const lerpedPos = new THREE.Vector3().lerpVectors(
          startPosition.current,
          endPosition.current,
          easedT
        );

        const floorAtTarget = getNavmeshFloorAt(lerpedPos.x, lerpedPos.z);
        if (floorAtTarget) {
          lerpedPos.y = floorAtTarget.y + cameraHeightOffset;
          // smoothly follow lerpedPos
          camera.position.lerp(
            lerpedPos,
            1 - Math.exp(-positionLerpSpeed * delta)
          );
        } else {
          // target goes off navmesh — stop and cancel
          isMovingToTarget.current = false;
          velocity.current.set(0, 0, 0);
        }
      } else {
        // Normal keyboard movement: apply candidatePos (smooth)
        camera.position.lerp(
          candidatePos,
          1 - Math.exp(-positionLerpSpeed * delta)
        );
      }
    } else {
      // candidatePos is off the navmesh -> block movement (stop velocity)
      // Optionally, you could try to slide along the edge. For simplicity, stop.
      velocity.current.set(0, 0, 0);

      // If moving to a target and the target goes off navmesh, cancel it:
      if (isMovingToTarget.current) {
        isMovingToTarget.current = false;
      }
    }
  });

  return null;
}

export default CameraController;

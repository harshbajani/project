// CameraController.jsx
import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function CameraController({ targetPosition, onReachTarget, navMesh }) {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  const rotationVelocity = useRef({ x: 0, y: 0 });
  const currentCameraHeight = useRef(0.9319295);

  const isMoving = useRef(false);
  const movementProgress = useRef(0);
  const startPosition = useRef(new THREE.Vector3());
  const endPosition = useRef(new THREE.Vector3());

  const keysPressed = useRef(new Set());

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
      rotationVelocity.current = { x: 0, y: 0 };
    };

    const handleMove = (e) => {
      if (!isDragging.current) return;

      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

      const deltaX = clientX - previousMousePosition.current.x;
      const deltaY = clientY - previousMousePosition.current.y;

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
    window.addEventListener("mouseup", handleEnd); // use window to be robust
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
  }, [gl, camera]);

  // Handle movement to target (click target)
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

  // Keyboard walking: add listeners
  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      const map = {
        w: "forward",
        arrowup: "forward",
        s: "back",
        arrowdown: "back",
        a: "left",
        arrowleft: "left",
        d: "right",
        arrowright: "right",
      };
      if (map[key]) {
        keysPressed.current.add(map[key]);
        e.preventDefault();
      }
    };

    const onKeyUp = (e) => {
      const key = e.key.toLowerCase();
      const map = {
        w: "forward",
        arrowup: "forward",
        s: "back",
        arrowdown: "back",
        a: "left",
        arrowleft: "left",
        d: "right",
        arrowright: "right",
      };
      if (map[key]) {
        keysPressed.current.delete(map[key]);
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // helper: initiate a movement to a computed endPosition
  const startMoveTo = (candidateEnd) => {
    startPosition.current.copy(camera.position);
    endPosition.current.copy(candidateEnd);
    movementProgress.current = 0;
    isMoving.current = true;
  };

  // create a raycaster for navMesh queries
  const raycaster = useRef(new THREE.Raycaster());
  const upVec = new THREE.Vector3(0, 1, 0);

  // useFrame: apply rotation & handle movement + continuous keyboard steps
  useFrame((state, delta) => {
    // Apply rotation to camera
    const euler = new THREE.Euler(
      lookRotation.pitch,
      lookRotation.yaw,
      0,
      "YXZ"
    );
    camera.quaternion.setFromEuler(euler);

    // If not currently moving and keys pressed => compute next step and start moving
    if (!isMoving.current && keysPressed.current.size > 0) {
      // compute direction vector from keys
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        camera.quaternion
      );
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3()
        .crossVectors(forward, upVec)
        .normalize();

      const dir = new THREE.Vector3();
      if (keysPressed.current.has("forward")) dir.add(forward);
      if (keysPressed.current.has("back")) dir.sub(forward);
      if (keysPressed.current.has("left")) dir.sub(right);
      if (keysPressed.current.has("right")) dir.add(right);

      if (dir.lengthSq() > 0.0001) {
        dir.normalize();

        // step size - tweak this to change "stride"
        const STEP_SIZE = 1.2;
        const candidate = camera.position
          .clone()
          .add(dir.multiplyScalar(STEP_SIZE));

        // Raycast downward to find navMesh ground point if available
        if (navMesh) {
          const rayOrigin = candidate.clone();
          rayOrigin.y = candidate.y + 5; // cast from above
          raycaster.current.set(rayOrigin, new THREE.Vector3(0, -1, 0));
          const intersects = raycaster.current.intersectObject(navMesh, true);
          if (intersects.length > 0) {
            const hit = intersects[0].point;
            candidate.x = hit.x;
            candidate.z = hit.z;
            candidate.y = currentCameraHeight.current;
            startMoveTo(candidate);
          } else {
            // no navmesh hit -> still move on XZ plane
            candidate.y = currentCameraHeight.current;
            startMoveTo(candidate);
          }
        } else {
          candidate.y = currentCameraHeight.current;
          startMoveTo(candidate);
        }
      }
    }

    // Handle movement if active
    if (isMoving.current) {
      // speed factor - tweak to change movement speed
      const SPEED = 3.5;
      movementProgress.current += delta * (SPEED * 0.25);

      if (movementProgress.current >= 1) {
        movementProgress.current = 1;
        isMoving.current = false;
        camera.position.copy(endPosition.current);
        if (onReachTarget) onReachTarget();
        // Immediately attempt to continue walking if keys still pressed (handled at top of frame)
      } else {
        const t = movementProgress.current;
        // smooth ease in/out cubic-like easing
        const easedT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        camera.position.lerpVectors(
          startPosition.current,
          endPosition.current,
          easedT
        );
      }
    }
  });

  return null;
}

export default CameraController;

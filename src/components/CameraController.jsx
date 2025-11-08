// CameraController.jsx
import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Pathfinding } from "three-pathfinding";

// Specified initial camera transform
const INITIAL_POS = new THREE.Vector3(-1.1508156, -1.6764, 0.9319295);
const INITIAL_EULER = new THREE.Euler(-1.7284384, -1.6981315, -1.2633993, "YXZ");
// Avoid persistent tilt: start with zero roll so the camera doesn't feel skewed
const ROLL_OFFSET = 0; // previously: INITIAL_EULER.z
// Default human eye height above the ground if we need to rebase the initial Y
const DEFAULT_EYE_HEIGHT = 1.6;

function CameraController({ targetPosition, onReachTarget, navMesh, baseModel }) {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // Start with a safe human eye height; will be rebased to the navmesh once available
  const currentCameraHeight = useRef(DEFAULT_EYE_HEIGHT);

  // Pathfinding setup
  const pathfinder = useRef(new Pathfinding());
  const ZONE = "level1";
  const pathPoints = useRef([]); // Vector3[] including start and end
  const pathLengths = useRef([]); // cumulative lengths per point index
  const totalLength = useRef(0);
  const distanceTravelled = useRef(0);
  const moving = useRef(false);
  // Raycaster used for rebasing the camera to ground height
  const raycaster = useRef(new THREE.Raycaster());

  // Look (yaw/pitch only, no roll)
  const [lookRotation, setLookRotation] = useState({
    yaw: INITIAL_EULER.y,
    pitch: 0, // start looking straight ahead (no downward tilt)
  });

  // Initialize camera transform
  useEffect(() => {
    camera.position.copy(INITIAL_POS);
    // Apply initial yaw (from your settings) but start with zero pitch so we look straight ahead
    const initEuler = new THREE.Euler(0, INITIAL_EULER.y, ROLL_OFFSET, "YXZ");
    camera.quaternion.setFromEuler(initEuler);
    // Ensure sane FOV/zoom to avoid an over-zoomed view
    camera.zoom = 1;
    camera.fov = THREE.MathUtils.clamp(camera.fov || 75, 50, 80);
    camera.updateProjectionMatrix();
  }, [camera]);

  // Build navmesh zone when available
  useEffect(() => {
    if (!navMesh || !navMesh.geometry) return;
    try {
      const zone = Pathfinding.createZone(navMesh.geometry);
      pathfinder.current.setZoneData(ZONE, zone);
      // Also, rebase initial camera height to the ground under the current XZ
      const origin = new THREE.Vector3(
        camera.position.x,
        camera.position.y + 100,
        camera.position.z
      );
      raycaster.current.set(origin, new THREE.Vector3(0, -1, 0));
      const hits = raycaster.current.intersectObject(navMesh, true);
      if (hits.length > 0) {
        const groundY = hits[0].point.y;
        const newY = groundY + DEFAULT_EYE_HEIGHT;
        camera.position.y = newY;
        currentCameraHeight.current = newY;
      } else {
        // Fallback: ensure we are above ground at a safe height
        camera.position.y = DEFAULT_EYE_HEIGHT;
        currentCameraHeight.current = DEFAULT_EYE_HEIGHT;
      }
      camera.updateProjectionMatrix();
    } catch (e) {
      console.warn("Failed to build pathfinding zone", e);
    }
  }, [navMesh, camera]);

  // Mouse/Touch look around
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
  }, [gl, camera]);

  // When targetPosition is set (double-click), compute shortest path and start moving
  useEffect(() => {
    if (!targetPosition) return;

    if (navMesh) {
      try {
        const start = camera.position.clone();
        const end = new THREE.Vector3(targetPosition.x, start.y, targetPosition.z);

        const groupID = pathfinder.current.getGroup(ZONE, start);
        const closest = pathfinder.current.getClosestNode(end, ZONE, groupID);
        const clamped = closest
          ? pathfinder.current.clampStep(start, end, closest, ZONE, groupID)
          : end;

        const rawPath = pathfinder.current.findPath(start, clamped, ZONE, groupID) || [];

        const points = [start, ...rawPath, clamped];
        for (const p of points) p.y = currentCameraHeight.current;

        const lengths = [0];
        let accum = 0;
        for (let i = 1; i < points.length; i++) {
          accum += points[i].distanceTo(points[i - 1]);
          lengths.push(accum);
        }

        pathPoints.current = points;
        pathLengths.current = lengths;
        totalLength.current = accum;
        distanceTravelled.current = 0;
        moving.current = accum > 0.01;
        if (!moving.current && onReachTarget) onReachTarget();
        return;
      } catch (e) {
        console.warn("Pathfinding failed, falling back to straight-line.", e);
      }
    }

    // Fallback: straight-line motion if navmesh/zone missing or error
    pathPoints.current = [
      camera.position.clone(),
      new THREE.Vector3(targetPosition.x, currentCameraHeight.current, targetPosition.z),
    ];
    pathLengths.current = [0, pathPoints.current[0].distanceTo(pathPoints.current[1])];
    totalLength.current = pathLengths.current[1];
    distanceTravelled.current = 0;
    moving.current = totalLength.current > 0.01;
    if (!moving.current && onReachTarget) onReachTarget();
  }, [targetPosition, navMesh, onReachTarget, camera]);

  useFrame((_, delta) => {
    // Apply yaw/pitch with a fixed roll offset from initial values
    const euler = new THREE.Euler(lookRotation.pitch, lookRotation.yaw, ROLL_OFFSET, "YXZ");
    camera.quaternion.setFromEuler(euler);

    if (!moving.current) return;

    // Speed control with gentle acceleration/deceleration
    const BASE_SPEED = 1.8; // units per second
    const EASE_DIST = 1.2; // meters to ease in/out

    const remaining = Math.max(0, totalLength.current - distanceTravelled.current);
    const easedIn = Math.min(1, distanceTravelled.current / EASE_DIST);
    const easedOut = Math.min(1, remaining / EASE_DIST);
    const ease = Math.max(0.2, Math.min(easedIn, easedOut));

    const advance = BASE_SPEED * ease * delta;
    distanceTravelled.current = Math.min(
      totalLength.current,
      distanceTravelled.current + advance
    );

    // Find current segment
    const len = pathLengths.current;
    const pts = pathPoints.current;
    let i = 1;
    while (i < len.length && len[i] < distanceTravelled.current) i++;
    i = Math.min(i, len.length - 1);

    const segStart = pts[i - 1];
    const segEnd = pts[i];
    const segLen = len[i] - len[i - 1] || 0.0001;
    const segT = (distanceTravelled.current - len[i - 1]) / segLen;

    // Interpolate position along current segment
    const newPos = new THREE.Vector3().lerpVectors(segStart, segEnd, segT);
    newPos.y = currentCameraHeight.current; // maintain height
    camera.position.copy(newPos);

    // Smoothly orient towards movement direction for FPV feel
    const dir = new THREE.Vector3().subVectors(segEnd, segStart);
    dir.y = 0;
    if (dir.lengthSq() > 1e-5) {
      dir.normalize();
      const targetYaw = Math.atan2(-dir.x, -dir.z); // align -Z (camera forward) with movement direction
      // Smooth yaw blend
      const yawDiff = ((targetYaw - lookRotation.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      setLookRotation((prev) => ({ ...prev, yaw: prev.yaw + yawDiff * 0.08 }));
    }

    // Arrived
    if (distanceTravelled.current >= totalLength.current - 1e-3) {
      moving.current = false;
      if (onReachTarget) onReachTarget();
    }
  });

  return null;
}

export default CameraController;

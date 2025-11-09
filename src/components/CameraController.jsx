import { useRef, useEffect, useState } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Pathfinding } from "three-pathfinding";

const INITIAL_POS = new THREE.Vector3(-1.1508156, -1.6764, 0.9319295);
const INITIAL_EULER = new THREE.Euler(
  -1.7284384,
  -1.6981315,
  -1.2633993,
  "YXZ"
);
const ROLL_OFFSET = 0;
const DEFAULT_EYE_HEIGHT = 1.6;

function CameraController({ targetPosition, onReachTarget, navMesh }) {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  const currentCameraHeight = useRef(DEFAULT_EYE_HEIGHT);

  const pathfinder = useRef(new Pathfinding());
  const ZONE = "level1";
  const pathPoints = useRef([]);
  const pathLengths = useRef([]);
  const totalLength = useRef(0);
  const distanceTravelled = useRef(0);
  const moving = useRef(false);
  const raycaster = useRef(new THREE.Raycaster());

  const [lookRotation, setLookRotation] = useState({
    yaw: INITIAL_EULER.y,
    pitch: 0,
  });

  useEffect(() => {
    camera.position.copy(INITIAL_POS);
    const initEuler = new THREE.Euler(0, INITIAL_EULER.y, ROLL_OFFSET, "YXZ");
    camera.quaternion.setFromEuler(initEuler);
    camera.zoom = 1;
    camera.fov = THREE.MathUtils.clamp(camera.fov || 75, 50, 80);
    camera.updateProjectionMatrix();
  }, [camera]);

  useEffect(() => {
    if (!navMesh || !navMesh.geometry) return;
    try {
      const zone = Pathfinding.createZone(navMesh.geometry);
      pathfinder.current.setZoneData(ZONE, zone);
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
        camera.position.y = DEFAULT_EYE_HEIGHT;
        currentCameraHeight.current = DEFAULT_EYE_HEIGHT;
      }
      camera.updateProjectionMatrix();
    } catch (e) {
      console.warn("Failed to build pathfinding zone", e);
    }
  }, [navMesh, camera]);

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

  useEffect(() => {
    if (!targetPosition) return;

    if (navMesh) {
      try {
        const start = camera.position.clone();
        const end = new THREE.Vector3(
          targetPosition.x,
          start.y,
          targetPosition.z
        );

        const groupID = pathfinder.current.getGroup(ZONE, start);
        const closest = pathfinder.current.getClosestNode(end, ZONE, groupID);
        const clamped = closest
          ? pathfinder.current.clampStep(start, end, closest, ZONE, groupID)
          : end;

        const rawPath =
          pathfinder.current.findPath(start, clamped, ZONE, groupID) || [];

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

    pathPoints.current = [
      camera.position.clone(),
      new THREE.Vector3(
        targetPosition.x,
        currentCameraHeight.current,
        targetPosition.z
      ),
    ];
    pathLengths.current = [
      0,
      pathPoints.current[0].distanceTo(pathPoints.current[1]),
    ];
    totalLength.current = pathLengths.current[1];
    distanceTravelled.current = 0;
    moving.current = totalLength.current > 0.01;
    if (!moving.current && onReachTarget) onReachTarget();
  }, [targetPosition, navMesh, onReachTarget, camera]);

  useFrame((_, delta) => {
    const euler = new THREE.Euler(
      lookRotation.pitch,
      lookRotation.yaw,
      ROLL_OFFSET,
      "YXZ"
    );
    camera.quaternion.setFromEuler(euler);

    if (!moving.current) return;

    const BASE_SPEED = 1.8;
    const EASE_DIST = 1.2;

    const remaining = Math.max(
      0,
      totalLength.current - distanceTravelled.current
    );
    const easedIn = Math.min(1, distanceTravelled.current / EASE_DIST);
    const easedOut = Math.min(1, remaining / EASE_DIST);
    const ease = Math.max(0.2, Math.min(easedIn, easedOut));

    const advance = BASE_SPEED * ease * delta;
    distanceTravelled.current = Math.min(
      totalLength.current,
      distanceTravelled.current + advance
    );

    const len = pathLengths.current;
    const pts = pathPoints.current;
    let i = 1;
    while (i < len.length && len[i] < distanceTravelled.current) i++;
    i = Math.min(i, len.length - 1);

    const segStart = pts[i - 1];
    const segEnd = pts[i];
    const segLen = len[i] - len[i - 1] || 0.0001;
    const segT = (distanceTravelled.current - len[i - 1]) / segLen;

    const newPos = new THREE.Vector3().lerpVectors(segStart, segEnd, segT);
    newPos.y = currentCameraHeight.current;
    camera.position.copy(newPos);

    const dir = new THREE.Vector3().subVectors(segEnd, segStart);
    dir.y = 0;
    if (dir.lengthSq() > 1e-5) {
      dir.normalize();
      const targetYaw = Math.atan2(-dir.x, -dir.z);
      const yawDiff =
        ((targetYaw - lookRotation.yaw + Math.PI) % (Math.PI * 2)) - Math.PI;
      setLookRotation((prev) => ({ ...prev, yaw: prev.yaw + yawDiff * 0.08 }));
    }

    if (distanceTravelled.current >= totalLength.current - 1e-3) {
      moving.current = false;
      if (onReachTarget) onReachTarget();
    }
  });

  return null;
}

export default CameraController;

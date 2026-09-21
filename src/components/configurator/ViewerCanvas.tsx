"use client";

import { groupKeyFor } from "@/lib/cad/geometry";
import { partMaterial, usePartGeometries } from "@/lib/cad/three-geom";
import { setProject, useProject } from "@/lib/project-store";
import { OrbitControls, Grid } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  Box3,
  Group,
  Mesh,
  PerspectiveCamera,
  Vector3,
  type Object3D,
} from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const _box = new Box3();
const _center = new Vector3();
const _size = new Vector3();
const _dir = new Vector3();

function focusObject(
  object: Object3D,
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl,
) {
  _box.setFromObject(object);
  if (_box.isEmpty()) return;

  _box.getCenter(_center);
  _box.getSize(_size);

  const radius = Math.max(_size.x, _size.y, _size.z, 1) * 0.55;
  const fov = (camera.fov * Math.PI) / 180;
  const dist = Math.max((radius / Math.tan(fov / 2)) * 1.35, 60);

  _dir.copy(camera.position).sub(controls.target);
  if (_dir.lengthSq() < 1e-8) _dir.set(1, 0.85, 1);
  _dir.normalize();

  controls.target.copy(_center);
  camera.position.copy(_center).addScaledVector(_dir, dist);
  camera.near = Math.max(0.1, dist / 200);
  camera.far = Math.max(20000, dist * 40);
  camera.updateProjectionMatrix();
  controls.update();
}

function PartsScene({
  controlsRef,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) {
  const project = useProject();
  const { camera, invalidate } = useThree();
  const { geos, dispose } = usePartGeometries(project.parts);
  const rootRef = useRef<Group>(null);
  const meshRefs = useRef<Map<string, Mesh>>(new Map());
  const focusedKeyRef = useRef<string | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, moved: false });

  useEffect(() => dispose, [dispose]);

  const materials = useMemo(() => {
    return geos.map((_, index) => {
      const part = project.parts[index];
      const selected =
        Boolean(part) &&
        Boolean(project.selectedGroupKey) &&
        groupKeyFor(part) === project.selectedGroupKey;
      return partMaterial(index, selected);
    });
  }, [geos, project.parts, project.selectedGroupKey]);

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const centers = useMemo(() => {
    return geos.map((geo) => {
      geo.computeBoundingBox();
      const center = new Vector3();
      geo.boundingBox?.getCenter(center);
      return center;
    });
  }, [geos]);

  const cluster = useMemo(() => {
    const box = new Box3();
    for (const geo of geos) {
      if (geo.boundingBox) box.union(geo.boundingBox);
    }
    const center = new Vector3();
    if (!box.isEmpty()) box.getCenter(center);
    return center;
  }, [geos]);

  // Stable scene centering (no drei <Center> reflow that shifts orbit mid-drag).
  const rootOffset = useMemo(() => {
    return new Vector3(-cluster.x, -cluster.y, -cluster.z);
  }, [cluster]);

  // Frame camera only when selection key changes — never during orbit/damping.
  useEffect(() => {
    const key = project.selectedGroupKey ?? null;
    if (key === focusedKeyRef.current) return;

    const controls = controlsRef.current;
    if (!controls || !(camera instanceof PerspectiveCamera)) return;

    if (!key) {
      focusedKeyRef.current = null;
      return;
    }

    const part = project.parts.find((item) => groupKeyFor(item) === key);
    const mesh = part ? meshRefs.current.get(part.id) : undefined;
    if (!mesh) return;

    focusedKeyRef.current = key;
    // Wait one frame so mesh world matrix includes explode/offset.
    requestAnimationFrame(() => {
      if (controlsRef.current && camera instanceof PerspectiveCamera) {
        focusObject(mesh, camera, controlsRef.current);
        invalidate();
      }
    });
  }, [project.selectedGroupKey, project.parts, camera, controlsRef, invalidate]);

  // Keep orbit target glued to the selected part while explode/layout moves it.
  useFrame(() => {
    const key = project.selectedGroupKey;
    const controls = controlsRef.current;
    if (!key || !controls) return;
    const part = project.parts.find((item) => groupKeyFor(item) === key);
    const mesh = part ? meshRefs.current.get(part.id) : undefined;
    if (!mesh) return;
    _box.setFromObject(mesh);
    if (_box.isEmpty()) return;
    _box.getCenter(_center);
    if (controls.target.distanceToSquared(_center) > 1e-6) {
      controls.target.copy(_center);
    }
  });

  if (project.parts.length === 0) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[800, 600]} />
        <meshStandardMaterial color="#2a3124" />
      </mesh>
    );
  }

  function selectPart(groupKey: string, mesh: Mesh) {
    focusedKeyRef.current = groupKey;
    setProject({ selectedGroupKey: groupKey });
    const controls = controlsRef.current;
    if (controls && camera instanceof PerspectiveCamera) {
      focusObject(mesh, camera, controls);
      invalidate();
    }
  }

  return (
    <group ref={rootRef} position={rootOffset}>
      {geos.map((geo, index) => {
        const center = centers[index];
        const offset = center
          .clone()
          .sub(cluster)
          .multiplyScalar(project.explode * 1.4);
        const part = project.parts[index];
        if (!part) return null;
        const groupKey = groupKeyFor(part);
        return (
          <mesh
            key={part.id}
            ref={(node) => {
              if (node) meshRefs.current.set(part.id, node);
              else meshRefs.current.delete(part.id);
            }}
            geometry={geo}
            material={materials[index]}
            position={offset}
            castShadow
            receiveShadow
            onPointerDown={(event: ThreeEvent<PointerEvent>) => {
              pointerRef.current = {
                x: event.clientX,
                y: event.clientY,
                moved: false,
              };
            }}
            onPointerMove={(event: ThreeEvent<PointerEvent>) => {
              const dx = event.clientX - pointerRef.current.x;
              const dy = event.clientY - pointerRef.current.y;
              if (Math.hypot(dx, dy) > 5) pointerRef.current.moved = true;
            }}
            onClick={(event: ThreeEvent<MouseEvent>) => {
              event.stopPropagation();
              if (pointerRef.current.moved) return;
              selectPart(groupKey, event.object as Mesh);
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
          />
        );
      })}
    </group>
  );
}

function SceneBackground() {
  const pointerRef = useRef({ x: 0, y: 0, moved: false });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -4, 0]}
      onPointerDown={(event: ThreeEvent<PointerEvent>) => {
        pointerRef.current = {
          x: event.clientX,
          y: event.clientY,
          moved: false,
        };
      }}
      onPointerMove={(event: ThreeEvent<PointerEvent>) => {
        const dx = event.clientX - pointerRef.current.x;
        const dy = event.clientY - pointerRef.current.y;
        if (Math.hypot(dx, dy) > 5) pointerRef.current.moved = true;
      }}
      onClick={(event) => {
        event.stopPropagation();
        // Ignore orbit/pan releases — only a real click clears selection.
        if (pointerRef.current.moved) return;
        setProject({ selectedGroupKey: undefined });
      }}
    >
      <planeGeometry args={[20000, 20000]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function ViewerCanvas() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <Canvas
      shadows
      camera={{ position: [420, 340, 420], fov: 38, near: 0.1, far: 20000 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#1b2017"]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#d8decc", "#3a4032", 0.4]} />
      <directionalLight
        position={[240, 420, 160]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-260, 180, -140]} intensity={0.35} color="#c4cc9c" />
      <SceneBackground />
      <PartsScene controlsRef={controlsRef} />
      <Grid
        infiniteGrid
        fadeDistance={2400}
        sectionColor="#4a5340"
        cellColor="#2c3326"
        cellSize={50}
        sectionSize={250}
        position={[0, -2, 0]}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}

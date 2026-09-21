"use client";

import { partMaterial, usePartGeometries } from "@/lib/cad/three-geom";
import { groupKeyFor } from "@/lib/cad/geometry";
import { useProject } from "@/lib/project-store";
import { OrbitControls, Grid, Center } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Box3, Vector3 } from "three";

function PartsScene() {
  const project = useProject();
  const { geos, dispose } = usePartGeometries(project.parts);

  useEffect(() => dispose, [dispose]);

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
    box.getCenter(center);
    return center;
  }, [geos]);

  if (project.parts.length === 0) {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[800, 600]} />
        <meshStandardMaterial color="#2a3124" />
      </mesh>
    );
  }

  return (
    <Center>
      <group>
        {geos.map((geo, index) => {
          const center = centers[index];
          const explode = project.explode;
          const offset = center
            .clone()
            .sub(cluster)
            .multiplyScalar(explode * 1.4);
          const part = project.parts[index];
          if (!part) return null;
          const selected =
            Boolean(project.selectedGroupKey) &&
            groupKeyFor(part) === project.selectedGroupKey;
          const material = partMaterial(index, selected);
          return (
            <mesh
              key={part.id}
              geometry={geo}
              material={material}
              position={offset}
              castShadow
              receiveShadow
            />
          );
        })}
      </group>
    </Center>
  );
}

export function ViewerCanvas() {
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
      <PartsScene />
      <Grid
        infiniteGrid
        fadeDistance={2400}
        sectionColor="#4a5340"
        cellColor="#2c3326"
        cellSize={50}
        sectionSize={250}
        position={[0, -2, 0]}
      />
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  );
}

"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Sparkles, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { backgroundFragment, backgroundVertex } from "./shaders";
import { pointer, scrollState } from "@/lib/scroll";

const VIDEO_RES = new THREE.Vector2(1280, 720);
const SPACING = 2.4;

function VideoBackground() {
  const { size } = useThree();
  const video = useMemo(() => {
    const v = document.createElement("video");
    // Chromium builds without H.264 still play WebM; Safari prefers MP4.
    v.src = v.canPlayType('video/webm; codecs="vp9"') ? "/media/hero.webm" : "/media/hero.mp4";
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.play().catch(() => {});
    return v;
  }, []);
  useEffect(() => () => video.pause(), [video]);

  const uniforms = useMemo(
    () => ({
      uVideo: { value: new THREE.VideoTexture(video) },
      uRes: { value: new THREE.Vector2(1, 1) },
      uVideoRes: { value: VIDEO_RES },
      uPointer: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uVelocity: { value: 0 },
      uScreens: { value: 0 },
    }),
    [video],
  );

  useFrame((state, dt) => {
    uniforms.uTime.value += dt;
    uniforms.uRes.value.set(size.width, size.height);
    uniforms.uPointer.value.lerp(new THREE.Vector2(pointer.x, pointer.y), 0.06);
    uniforms.uProgress.value += (scrollState.progress - uniforms.uProgress.value) * 0.08;
    uniforms.uScreens.value += (scrollState.screens - uniforms.uScreens.value) * 0.08;
    uniforms.uVelocity.value += (scrollState.velocity - uniforms.uVelocity.value) * 0.1;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={backgroundVertex}
        fragmentShader={backgroundFragment}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

function Cover({ texture, index }: { texture: THREE.Texture; index: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const { size } = useThree();
  const narrow = size.width < 700;
  const angle = index * 2.39996; // golden angle spiral
  const radius = 2.6 + (index % 3) * 0.7;
  const base = useMemo(
    () =>
      new THREE.Vector3(
        Math.cos(angle) * radius * (narrow ? 0.85 : 1.35),
        Math.sin(angle) * radius * (narrow ? 1.25 : 0.8),
        -index * SPACING,
      ),
    [angle, radius, index, narrow],
  );
  texture.colorSpace = THREE.SRGBColorSpace;

  useFrame(({ clock, camera }) => {
    const m = ref.current;
    if (!m || !mat.current) return;
    const t = clock.elapsedTime + index;
    m.position.set(base.x, base.y + Math.sin(t * 0.8) * 0.15, base.z);
    m.rotation.set(Math.sin(t * 0.5) * 0.08 - pointer.y * 0.25, -Math.atan2(base.x, 6) + pointer.x * 0.3, Math.sin(t * 0.3) * 0.05);
    const s = 1 + Math.min(Math.abs(scrollState.velocity) * 0.004, 0.25);
    m.scale.set(s, s, s);
    // fade in from the distance and out as the camera passes, instead of fogging to black
    const dz = base.z - camera.position.z;
    const far = THREE.MathUtils.smoothstep(dz, -20, -9);
    const near = 1 - THREE.MathUtils.smoothstep(dz, -1.5, 1);
    mat.current.opacity = far * near * (narrow ? 0.6 : 0.95);
    m.visible = mat.current.opacity > 0.01;
  });

  return (
    <mesh ref={ref}>
      <planeGeometry args={[1.5, 2.13]} />
      <meshBasicMaterial ref={mat} map={texture} toneMapped={false} side={THREE.DoubleSide} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function CoverTunnel({ covers }: { covers: string[] }) {
  const textures = useTexture(covers);
  return (
    <>
      {textures.map((t, i) => (
        <Cover key={i} texture={t} index={i} />
      ))}
    </>
  );
}

function CameraRig({ depth }: { depth: number }) {
  useFrame(({ camera }) => {
    // fly through the tunnel while the hero and the caption section scroll past (~4.2 screens)
    const p = Math.min(scrollState.screens / (window.innerWidth < 768 ? 3.4 : 4.2), 1);
    const eased = 1 - Math.pow(1 - p, 3);
    const targetZ = 6 - eased * (depth + 4);
    camera.position.z += (targetZ - camera.position.z) * 0.08;
    camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.05;
    camera.position.y += (pointer.y * 0.4 - camera.position.y) * 0.05;
    camera.lookAt(camera.position.x * 0.3, camera.position.y * 0.3, camera.position.z - 6);
  });
  return null;
}

export default function Scene({ covers }: { covers: string[] }) {
  const depth = covers.length * SPACING;
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6], fov: 55, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <VideoBackground />
      <Suspense fallback={null}>
        <CoverTunnel covers={covers} />
      </Suspense>
      <Sparkles count={160} scale={[14, 8, depth + 10]} position={[0, 0, -depth / 2]} size={3} speed={0.4} color="#ff9ad5" />
      <Sparkles count={80} scale={[14, 8, depth + 10]} position={[0, 0, -depth / 2]} size={2} speed={0.3} color="#99ecff" />
      <CameraRig depth={depth} />
    </Canvas>
  );
}

"use client";
import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

const isRenderCalm = () => false

class OrbBoundary extends React.Component {
  constructor(props) { super(props); this.state = { dead: false }; this._tries = 0 }
  static getDerivedStateFromError() { return { dead: true } }
  componentDidCatch(err) {
    try { console.warn('[orb] 3D crashed:', err?.message) } catch {}
    clearTimeout(this._t)
    if (this._tries < 3) {
      this._tries += 1
      this._t = setTimeout(() => this.setState({ dead: false }), 8000)
    }
  }
  componentWillUnmount() { clearTimeout(this._t) }
  render() { return this.state.dead ? null : this.props.children }
}

function normalizeState(state) {
  const s = String(state || '').toLowerCase()
  if (s.includes('think') || s.includes('process')) return 'processing'
  if (s.includes('listen')) return 'listening'
  if (s.includes('speak')) return 'speaking'
  return 'standby'
}

function makeSprite() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

const lerp = (a, b, t) => a + (b - a) * t;
const getInterpolated = (pts, y) => {
  if (y >= pts[0].y) return pts[0].v;
  if (y <= pts[pts.length-1].y) return pts[pts.length-1].v;
  for (let i = 0; i < pts.length - 1; i++) {
    if (y <= pts[i].y && y > pts[i+1].y) {
      const t = (y - pts[i+1].y) / (pts[i].y - pts[i+1].y);
      return lerp(pts[i+1].v, pts[i].v, t);
    }
  }
  return 0;
};

// Adjusted for an elegant head/shoulder silhouette
const xPts = [
  {y: 1.0, v: 0.15}, {y: 0.8, v: 0.35}, {y: 0.6, v: 0.45}, {y: 0.3, v: 0.42}, {y: 0.1, v: 0.32}, 
  {y: -0.1, v: 0.22}, {y: -0.3, v: 0.25}, {y: -0.4, v: 0.50}, {y: -0.7, v: 0.85}, {y: -1.0, v: 1.0}
];
const zPts = [
  {y: 1.0, v: 0.15}, {y: 0.8, v: 0.45}, {y: 0.6, v: 0.55}, {y: 0.3, v: 0.52}, {y: 0.1, v: 0.42}, 
  {y: -0.1, v: 0.28}, {y: -0.3, v: 0.30}, {y: -0.4, v: 0.38}, {y: -0.7, v: 0.45}, {y: -1.0, v: 0.5}
];

function Humanoid({ state }) {
  const st = normalizeState(state);
  const group = useRef();
  const points = useRef();
  const innerCore = useRef();
  const ringsRef = useRef();
  
  const sprite = useMemo(makeSprite, []);

  const data = useMemo(() => {
    const pts = [];
    const slices = 70;
    
    for (let i = 0; i < slices; i++) {
      const y = -1.0 + (i / (slices - 1)) * 2.0;
      const rx = getInterpolated(xPts, y);
      const rz = getInterpolated(zPts, y);
      const circ = Math.PI * (rx + rz);
      const pointsInSlice = Math.max(12, Math.floor(circ * 70)); 
      
      for(let j=0; j<pointsInSlice; j++) {
         const theta = (j / pointsInSlice) * Math.PI * 2;
         const x = Math.cos(theta) * rx;
         const z = Math.sin(theta) * rz;
         
         const noiseX = (Math.random()-0.5)*0.015;
         const noiseY = (Math.random()-0.5)*0.015;
         const noiseZ = (Math.random()-0.5)*0.015;
         
         let isCore = 0;
         if (y > -0.2 && y < 0.4 && z > rz * 0.2 && Math.abs(x) < 0.4) {
             isCore = 1;
         }
         
         pts.push({
            ox: x + noiseX, oy: y + noiseY, oz: z + noiseZ,
            isCore,
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random(),
            sliceY: y
         });
      }
    }

    const innerPts = [];
    for(let i=0; i<600; i++) {
       const y = -0.1 + Math.random()*0.45;
       const x = (Math.random()-0.5)*0.45;
       const z = Math.random() * 0.45 + 0.1; 
       innerPts.push({
            ox: x, oy: y, oz: z,
            phase: Math.random() * Math.PI * 2,
            speed: 1.0 + Math.random() * 2.0
       });
    }
    
    const N = pts.length;
    const dir = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const phase = new Float32Array(N);
    const speed = new Float32Array(N);
    const sliceY = new Float32Array(N);
    
    const cBlue = new THREE.Color('#00bfff');
    const cCyan = new THREE.Color('#00e5ff');
    const cOrange = new THREE.Color('#ff5500');
    const cYellow = new THREE.Color('#ffaa00');

    for (let i = 0; i < N; i++) {
       const p = pts[i];
       dir[i*3] = p.ox; dir[i*3+1] = p.oy; dir[i*3+2] = p.oz;
       phase[i] = p.phase; speed[i] = p.speed; sliceY[i] = p.sliceY;
       
       let c = Math.random() > 0.5 ? cBlue : cCyan;
       if (p.isCore) {
           c = Math.random() > 0.4 ? cOrange : cYellow;
       }
       colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }

    const iN = innerPts.length;
    const iDir = new Float32Array(iN * 3);
    const iColors = new Float32Array(iN * 3);
    for (let i = 0; i < iN; i++) {
       const p = innerPts[i];
       iDir[i*3] = p.ox; iDir[i*3+1] = p.oy; iDir[i*3+2] = p.oz;
       let c = Math.random() > 0.3 ? cOrange : cYellow;
       iColors[i*3] = c.r; iColors[i*3+1] = c.g; iColors[i*3+2] = c.b;
    }

    return { dir, colors, phase, speed, sliceY, N, iDir, iColors, iN, pts, innerPts };
  }, []);

  const positions = useMemo(() => new Float32Array(data.N * 3), [data.N]);
  const iPositions = useMemo(() => new Float32Array(data.iN * 3), [data.iN]);
  
  const intensityRef = useRef(0);
  const ringScaleRef = useRef(1);

  useFrame((frame, dt) => {
    const t = frame.clock.elapsedTime;
    const sleeping = st === 'standby';
    const speaking = st === 'speaking';
    const listening = st === 'listening';
    
    const targetIntensity = speaking ? 1.0 : (listening ? 0.6 : (sleeping ? 0.1 : 0.4));
    intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, targetIntensity, 0.05);
    const int = intensityRef.current;
    
    const targetRingScale = speaking ? 1.05 : 1.0;
    ringScaleRef.current = THREE.MathUtils.lerp(ringScaleRef.current, targetRingScale, 0.05);

    const { dir, phase, speed, sliceY, N, iDir, iN, pts, innerPts } = data;
    
    for(let i=0; i<N; i++) {
       const k = i*3;
       const sy = sliceY[i];
       let wave = 0;
       
       if (speaking) {
          wave = Math.sin(sy * 10 - t * 8) * 0.04 * int;
          if (pts[i].isCore) wave += Math.sin(t * speed[i] * 12) * 0.05 * int;
       } else if (listening) {
          wave = Math.sin(sy * 6 - t * 4) * 0.02 * int;
       } else {
          wave = Math.sin(sy * 3 - t * 1.5) * 0.005; 
       }
       
       positions[k] = dir[k] * (1 + wave);
       positions[k+1] = dir[k+1] * (1 + wave*0.3);
       positions[k+2] = dir[k+2] * (1 + wave);
    }
    
    for(let i=0; i<iN; i++) {
       const k = i*3;
       const p = innerPts[i];
       const boil = Math.sin(t * p.speed * (speaking ? 18 : 6) + p.phase) * (speaking ? 0.1 : 0.03);
       iPositions[k] = iDir[k] + (Math.random()-0.5)*boil;
       iPositions[k+1] = iDir[k+1] + boil*0.8;
       iPositions[k+2] = iDir[k+2] + (Math.random()-0.5)*boil;
    }

    if (points.current) {
        points.current.geometry.attributes.position.needsUpdate = true;
        points.current.material.size = speaking ? 0.022 : 0.018;
    }
    if (innerCore.current) {
        innerCore.current.geometry.attributes.position.needsUpdate = true;
        innerCore.current.material.size = speaking ? 0.045 : 0.035;
    }
    
    if (ringsRef.current) {
        ringsRef.current.scale.setScalar(ringScaleRef.current);
        ringsRef.current.position.z = -1.5;
        ringsRef.current.position.y = 0.2;
    }
    
    if (group.current) {
       group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, frame.pointer.x * 0.20, 0.05);
       group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -frame.pointer.y * 0.12, 0.05);
    }
  });

  return (
    <group>
      <group ref={ringsRef}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <mesh key={i} position={[0, 0, -i*0.1]}>
             <torusGeometry args={[1.0 + i*0.8, 0.004, 8, 128]} />
             <meshBasicMaterial color="#00e5ff" transparent opacity={0.12 - (i*0.015)} />
          </mesh>
        ))}
      </group>
      <group ref={group} scale={[1.7, 1.7, 1.7]} position={[0, -0.4, 0]}>
        <points ref={points}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={data.N} array={positions} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={data.N} array={data.colors} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial size={0.018} map={sprite} vertexColors transparent opacity={0.85}
            sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} alphaTest={0.01} />
        </points>
        
        <points ref={innerCore}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={data.iN} array={iPositions} itemSize={3} />
            <bufferAttribute attach="attributes-color" count={data.iN} array={data.iColors} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial size={0.035} map={sprite} vertexColors transparent opacity={0.95}
            sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} alphaTest={0.01} />
        </points>
      </group>
    </group>
  );
}

export default function ApexCore3D({ state = 'idle', variant = 'humanoid', onClick, corner = false, bigDock = false, contained = false }) {
  const st = normalizeState(state)
  const label = st === 'processing' ? 'Processing' : st === 'listening' ? 'Listening' : st === 'speaking' ? 'Speaking' : 'Standby'
  
  return (
    <div onClick={onClick} style={{
      position: contained ? 'absolute' : 'fixed', inset: 0, zIndex: 15, pointerEvents: onClick ? 'auto' : 'none',
      background: 'transparent',
    }}>
      <OrbBoundary>
      <Canvas
        camera={{ position: [0, 0, 5.0], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent', pointerEvents: 'none' }}
        onCreated={({ gl, setFrameloop }) => {
          const canvas = gl.domElement
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            try { setFrameloop('never') } catch {}
          }, false)
          canvas.addEventListener('webglcontextrestored', () => {
            try { setFrameloop('always') } catch {}
          }, false)
        }}
      >
        <Humanoid state={state} />
        <EffectComposer>
          <Bloom intensity={2.5} luminanceThreshold={0.1} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
        </EffectComposer>
      </Canvas>
      </OrbBoundary>
      
      {/* STATUS UI like the screenshot */}
      <div style={{
          position: 'absolute', right: '10%', bottom: '20%',
          fontFamily: "'Share Tech Mono', monospace",
          color: '#00e5ff',
          letterSpacing: '0.2em',
          fontSize: 12,
          opacity: 0.8,
          pointerEvents: 'none'
      }}>
        STATUS: {label.toUpperCase()}
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { getSkinById } from '../data/skins';
import { animateCharacterRig, buildCharacterRig, CharacterRig } from '../engine/characterBuilder';

interface SkinPreview3DProps {
  skinId: string;
  height?: number;
}

export function SkinPreview3D({ skinId, height = 280 }: SkinPreview3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<CharacterRig | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const yawRef = useRef(0.35);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const w = container.clientWidth || 320;
    const h = height;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 40);
    camera.position.set(0, 1.35, 3.35);
    camera.lookAt(0, 0.95, 0);

    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.9);
    const key = new THREE.DirectionalLight(0xfff7ed, 1.7);
    key.position.set(2.5, 4, 3);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rim.position.set(-3, 2, -2);
    scene.add(hemi, key, rim);

    // Pedestal disc
    const discGeo = new THREE.CylinderGeometry(0.95, 1.05, 0.14, 28);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.65,
      roughness: 0.25,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.07;
    scene.add(disc);

    let dragging = false;
    let lastX = 0;
    const dom = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      yawRef.current += (e.clientX - lastX) * 0.014;
      lastX = e.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    let disposed = false;
    let frameId = 0;
    let sim = 0;
    let last = performance.now();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      sim += dt;
      if (!dragging) yawRef.current += dt * 0.65;

      if (rigRef.current) {
        rigRef.current.root.rotation.y = yawRef.current;
        animateCharacterRig(rigRef.current, {
          speed: 0,
          maxSpeed: 10,
          grounded: true,
          crouching: false,
          vy: 0,
          doubleJumpFlipTimer: 0,
          landSquash: 0,
          time: sim,
        });
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (rigRef.current) {
        scene.remove(rigRef.current.root);
        rigRef.current.dispose();
        rigRef.current = null;
      }
      discGeo.dispose();
      discMat.dispose();
      env.dispose();
      renderer.dispose();
      if (dom.parentElement === container) {
        container.removeChild(dom);
      }
      sceneRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (rigRef.current) {
      scene.remove(rigRef.current.root);
      rigRef.current.dispose();
    }
    const rig = buildCharacterRig(getSkinById(skinId));
    rig.root.rotation.y = yawRef.current;
    scene.add(rig.root);
    rigRef.current = rig;
  }, [skinId]);

  return (
    <div
      ref={mountRef}
      style={{ height }}
      className="w-full cursor-grab active:cursor-grabbing rounded-xl overflow-hidden bg-slate-950/80 border border-slate-700/60"
      title="Arraste para girar o personagem"
    />
  );
}

import * as THREE from 'three';
import { WorldId } from '../types/game';

const textureCache = new Map<string, THREE.CanvasTexture>();

export function getWorldPlatformTexture(
  worldId: WorldId,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const key = `plat_${worldId}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  switch (worldId) {
    case 'urban': {
      ctx.fillStyle = '#475569';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      for (let i = 0; i <= 256; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
      }
      // Subtle concrete speckle
      for (let i = 0; i < 320; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect((i * 53) % 256, (i * 97) % 256, 3, 3);
      }
      // Safety edge trim
      ctx.fillStyle = '#f97316';
      ctx.fillRect(0, 0, 256, 10);
      break;
    }
    case 'forest': {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#5c280a';
      for (let y = 0; y < 256; y += 32) {
        ctx.fillRect(0, y, 256, 3);
      }
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = 'rgba(255, 220, 170, 0.06)';
        ctx.fillRect((i * 41) % 256, (i * 23) % 256, 36, 4);
      }
      // Moss patches
      ctx.fillStyle = 'rgba(74, 222, 128, 0.28)';
      ctx.beginPath();
      ctx.arc(48, 48, 28, 0, Math.PI * 2);
      ctx.arc(200, 180, 34, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'volcanic': {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 45, 0);
        ctx.lineTo((i * 45 + 32) % 256, 128);
        ctx.lineTo((i * 45 + 10) % 256, 256);
        ctx.stroke();
      }
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, 40);
      ctx.lineTo(130, 120);
      ctx.lineTo(220, 200);
      ctx.stroke();
      break;
    }
    case 'frozen': {
      const grad = ctx.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#bae6fd');
      grad.addColorStop(0.5, '#7dd3fc');
      grad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 32, 0);
        ctx.lineTo((i * 32 + 54) % 256, 256);
        ctx.stroke();
      }
      break;
    }
    case 'cyberpunk': {
      ctx.fillStyle = '#0f0728';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 256; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
      }
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 248, 248);
      break;
    }
    case 'desert': {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 4;
      for (let y = 0; y < 256; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
        const offset = (y / 64) % 2 === 0 ? 0 : 64;
        for (let x = offset; x < 256; x += 128) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 64);
          ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(254, 240, 138, 0.14)';
      ctx.fillRect(16, 16, 96, 32);
      ctx.fillRect(144, 80, 96, 32);
      break;
    }
    case 'space': {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(8, 8, 240, 240);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, 192, 192);
      // Rivets
      ctx.fillStyle = '#94a3b8';
      for (const x of [20, 236]) {
        for (const y of [20, 236]) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'medieval': {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 4; row++) {
        const y = row * 64;
        const shift = row % 2 === 0 ? 0 : 48;
        for (let col = -1; col < 4; col++) {
          const x = col * 96 + shift;
          ctx.fillStyle = (row + col) % 2 === 0 ? '#64748b' : '#576578';
          ctx.fillRect(x + 2, y + 2, 92, 60);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 1, y + 1, 94, 62);
        }
      }
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = maxAnisotropy;
  textureCache.set(key, texture);
  return texture;
}

export function getHazardStripeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const key = 'hazard_stripes';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#18181b';
  for (let i = -128; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 16, 0);
    ctx.lineTo(i + 144, 128);
    ctx.lineTo(i + 128, 128);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  textureCache.set(key, tex);
  return tex;
}

export function getSoftShadowTexture(): THREE.CanvasTexture {
  const key = 'contact_shadow';
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.65)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, tex);
  return tex;
}

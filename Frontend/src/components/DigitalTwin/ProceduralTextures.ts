import * as THREE from 'three';

/**
 * Procedural texture generator for high-realism CubeSat materials
 * Creates crisp, self-contained textures without requiring external image assets.
 */

/**
 * High-efficiency space-grade monocrystalline solar cell wafer texture
 */
export function createSolarCellTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Deep space-grade silicon gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
  bgGrad.addColorStop(0, '#061329');
  bgGrad.addColorStop(0.5, '#0b2347');
  bgGrad.addColorStop(1, '#071833');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // 4 Wafer cell grid layout (2x2 cells per panel section)
  const cellW = 240;
  const cellH = 240;
  const pad = 12;

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const x = pad + c * (cellW + pad);
      const y = pad + r * (cellH + pad);

      // Cell border / chamfered wafer corner profile
      ctx.save();
      ctx.beginPath();
      const bevel = 18;
      ctx.moveTo(x + bevel, y);
      ctx.lineTo(x + cellW - bevel, y);
      ctx.lineTo(x + cellW, y + bevel);
      ctx.lineTo(x + cellW, y + cellH - bevel);
      ctx.lineTo(x + cellW - bevel, y + cellH);
      ctx.lineTo(x + bevel, y + cellH);
      ctx.lineTo(x, y + cellH - bevel);
      ctx.lineTo(x, y + bevel);
      ctx.closePath();

      // Wafer base fill
      const waferGrad = ctx.createRadialGradient(x + cellW / 2, y + cellH / 2, 10, x + cellW / 2, y + cellH / 2, 160);
      waferGrad.addColorStop(0, '#12396d');
      waferGrad.addColorStop(0.7, '#0d2b54');
      waferGrad.addColorStop(1, '#081c38');
      ctx.fillStyle = waferGrad;
      ctx.fill();
      ctx.clip();

      // Ultra-fine horizontal silver contact fingers
      ctx.strokeStyle = 'rgba(186, 215, 255, 0.35)';
      ctx.lineWidth = 1;
      for (let ly = y + 4; ly < y + cellH; ly += 6) {
        ctx.beginPath();
        ctx.moveTo(x, ly);
        ctx.lineTo(x + cellW, ly);
        ctx.stroke();
      }

      // Vertical silver busbar ribbons (3 per cell)
      const busbars = [x + cellW * 0.22, x + cellW * 0.5, x + cellW * 0.78];
      busbars.forEach((bx) => {
        // Busbar ribbon
        const busGrad = ctx.createLinearGradient(bx - 3, 0, bx + 3, 0);
        busGrad.addColorStop(0, '#94a3b8');
        busGrad.addColorStop(0.5, '#f8fafc');
        busGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = busGrad;
        ctx.fillRect(bx - 2.5, y, 5, cellH);

        // Gold solder pads
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(bx, y + cellH * 0.25, 4, 0, Math.PI * 2);
        ctx.arc(bx, y + cellH * 0.75, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // Outer gold/copper cell trace boundary
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, cellW + 4, cellH + 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Crinkled Kapton Gold Multi-Layer Insulation (MLI) Thermal Blanket Texture
 */
export function createGoldMLITexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Metallic deep amber base
  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 0, 512, 512);

  // Procedural crinkle quilt facets
  const gridSize = 32;
  for (let y = 0; y < 512; y += gridSize) {
    for (let x = 0; x < 512; x += gridSize) {
      const grad = ctx.createLinearGradient(x, y, x + gridSize, y + gridSize);
      const r = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const rnd = r - Math.floor(r);

      if (rnd > 0.6) {
        grad.addColorStop(0, '#fef08a');
        grad.addColorStop(0.5, '#f59e0b');
        grad.addColorStop(1, '#92400e');
      } else if (rnd > 0.3) {
        grad.addColorStop(0, '#fbbf24');
        grad.addColorStop(0.7, '#d97706');
        grad.addColorStop(1, '#78350f');
      } else {
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(0.6, '#b45309');
        grad.addColorStop(1, '#451a03');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(x, y, gridSize, gridSize);

      // Crinkle seam highlight & shadow
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + gridSize);
      ctx.lineTo(x + gridSize, y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(69, 26, 3, 0.5)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + gridSize, y + gridSize);
      ctx.stroke();
    }
  }

  // Tape seam lines (MLI blanket stitching tape)
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
  ctx.lineWidth = 3;
  for (let i = 128; i < 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Realistic Earth Sphere Texture with Oceans, Continents, Clouds, and Night City Lights
 */
export function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Deep Oceanic Base with Subtle Rayleigh Scattering Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
  oceanGrad.addColorStop(0, '#020917');
  oceanGrad.addColorStop(0.22, '#051329');
  oceanGrad.addColorStop(0.5, '#081c3b');
  oceanGrad.addColorStop(0.78, '#051329');
  oceanGrad.addColorStop(1, '#020917');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 1024, 512);

  // 2. Continents & Landmasses - Realistic muted deep forest & slate tones
  ctx.fillStyle = '#0f241a';
  // North America
  ctx.beginPath();
  ctx.ellipse(220, 160, 90, 60, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // South America
  ctx.beginPath();
  ctx.ellipse(300, 340, 50, 90, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Eurasia
  ctx.beginPath();
  ctx.ellipse(650, 160, 150, 80, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Africa
  ctx.beginPath();
  ctx.ellipse(540, 280, 70, 95, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Australia
  ctx.beginPath();
  ctx.ellipse(820, 360, 45, 35, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Subtle coastal shelf contour - thin deep marine cyan
  ctx.strokeStyle = '#063254';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Continental terrain texture (arid sahara & mountain highlands)
  ctx.fillStyle = '#261e16';
  ctx.beginPath();
  ctx.ellipse(540, 230, 45, 25, 0, 0, Math.PI * 2); // Sahara
  ctx.ellipse(660, 180, 50, 20, 0, 0, Math.PI * 2); // Central Asia
  ctx.fill();

  // 3. Night-Side City Lights (Pinpoint warm amber clusters)
  ctx.fillStyle = '#fbbf24';
  const cityClusters = [
    [520, 150], [535, 140], [550, 160], [600, 145], [680, 190],
    [720, 200], [750, 220], [770, 180], [800, 170], [830, 220],
    [540, 360], [560, 370], [820, 380], [840, 390],
  ];
  cityClusters.forEach(([cx, cy]) => {
    ctx.shadowColor = '#d97706';
    ctx.shadowBlur = 3;
    for (let i = 0; i < 9; i++) {
      const ox = (Math.random() - 0.5) * 20;
      const oy = (Math.random() - 0.5) * 14;
      ctx.fillRect(cx + ox, cy + oy, 1.5, 1.5);
    }
  });
  ctx.shadowBlur = 0;

  // 4. Subtle Atmospheric Wispy Cloud Layers (Delicate transparency so it never looks white)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  for (let i = 0; i < 35; i++) {
    const rx = ((i * 37) % 1024);
    const ry = 90 + ((i * 47) % 340);
    ctx.beginPath();
    ctx.ellipse(rx, ry, 50 + (i % 25), 10 + (i % 6), (i * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }

  // Polar ice frost (very subtle, thin)
  ctx.fillStyle = 'rgba(203, 213, 225, 0.28)';
  ctx.fillRect(0, 0, 1024, 16);
  ctx.fillRect(0, 496, 1024, 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Anodized Dark Spacecraft Titanium & Screw Countersink Texture
 */
export function createChassisTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Dark matte brushed anodized titanium
  ctx.fillStyle = '#18202c';
  ctx.fillRect(0, 0, 256, 256);

  // Micro-grain brushed lines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let y = 0; y < 256; y += 2) {
    ctx.fillRect(0, y, 256, 1);
  }

  // Fastener screws at corners
  const screws = [
    [16, 16], [240, 16], [16, 240], [240, 240],
    [128, 16], [128, 240], [16, 128], [240, 128]
  ];
  screws.forEach(([sx, sy]) => {
    // Countersink circle
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fill();

    // Screw head
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Screw cross slot
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy);
    ctx.lineTo(sx + 3, sy);
    ctx.moveTo(sx, sy - 3);
    ctx.lineTo(sx, sy + 3);
    ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

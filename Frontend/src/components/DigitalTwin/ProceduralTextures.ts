import * as THREE from 'three';

/**
 * Procedural texture generator for high-realism CubeSat materials
 * Creates crisp, self-contained textures without requiring external image assets.
 */

let _cachedSolarCellTexture: THREE.CanvasTexture | null = null;
let _cachedGoldMLITexture: THREE.CanvasTexture | null = null;
let _cachedEarthTexture: THREE.CanvasTexture | null = null;
let _cachedChassisTexture: THREE.CanvasTexture | null = null;

/**
 * High-efficiency space-grade monocrystalline solar cell wafer texture
 */
export function createSolarCellTexture(): THREE.CanvasTexture {
  if (_cachedSolarCellTexture) return _cachedSolarCellTexture;
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

  _cachedSolarCellTexture = new THREE.CanvasTexture(canvas);
  _cachedSolarCellTexture.wrapS = THREE.RepeatWrapping;
  _cachedSolarCellTexture.wrapT = THREE.RepeatWrapping;
  _cachedSolarCellTexture.anisotropy = 8;
  return _cachedSolarCellTexture;
}

/**
 * Crinkled Kapton Gold Multi-Layer Insulation (MLI) Thermal Blanket Texture
 */
export function createGoldMLITexture(): THREE.CanvasTexture {
  if (_cachedGoldMLITexture) return _cachedGoldMLITexture;
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

  _cachedGoldMLITexture = new THREE.CanvasTexture(canvas);
  _cachedGoldMLITexture.wrapS = THREE.RepeatWrapping;
  _cachedGoldMLITexture.wrapT = THREE.RepeatWrapping;
  return _cachedGoldMLITexture;
}

/**
 * Realistic Earth Sphere Texture with Oceans, Detailed Continents, Clouds, and Night City Lights
 */
export function createEarthTexture(): THREE.CanvasTexture {
  if (_cachedEarthTexture) return _cachedEarthTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Deep Oceanic Base with Realistic Bathymetric Depth
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
  oceanGrad.addColorStop(0, '#010814');
  oceanGrad.addColorStop(0.18, '#031229');
  oceanGrad.addColorStop(0.5, '#051d3e');
  oceanGrad.addColorStop(0.82, '#031229');
  oceanGrad.addColorStop(1, '#010814');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 2048, 1024);

  // 2. Continental Shelf Margins (shallow coastal marine cyan)
  ctx.fillStyle = '#062d4f';
  // North America shelf
  ctx.beginPath();
  ctx.ellipse(450, 310, 210, 140, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // South America shelf
  ctx.beginPath();
  ctx.ellipse(620, 680, 125, 200, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Eurasia shelf
  ctx.beginPath();
  ctx.ellipse(1320, 310, 330, 180, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // Africa shelf
  ctx.beginPath();
  ctx.ellipse(1090, 560, 160, 210, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Australia shelf
  ctx.beginPath();
  ctx.ellipse(1660, 720, 115, 90, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 3. Continents & Major Landmasses - Realistic Natural Biomes
  // Base vegetation green
  ctx.fillStyle = '#183827';

  // North America
  ctx.beginPath();
  ctx.ellipse(440, 305, 180, 120, 0.2, 0, Math.PI * 2);
  ctx.ellipse(360, 240, 90, 70, 0.3, 0, Math.PI * 2); // Alaska / NW
  ctx.ellipse(540, 370, 45, 55, 0.2, 0, Math.PI * 2); // Florida / SE
  ctx.fill();

  // Greenland (glacier tundra)
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.ellipse(660, 140, 60, 85, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // South America
  ctx.fillStyle = '#163b26'; // Amazon lush green
  ctx.beginPath();
  ctx.ellipse(615, 670, 105, 175, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Europe & British Isles
  ctx.fillStyle = '#1b3d2b';
  ctx.beginPath();
  ctx.ellipse(1040, 260, 110, 75, -0.1, 0, Math.PI * 2); // Europe
  ctx.ellipse(980, 230, 25, 40, -0.2, 0, Math.PI * 2); // British Isles
  ctx.ellipse(1080, 170, 45, 90, 0.3, 0, Math.PI * 2); // Scandinavia
  ctx.fill();

  // Eurasia Main Landmass
  ctx.fillStyle = '#173624';
  ctx.beginPath();
  ctx.ellipse(1350, 300, 290, 150, -0.1, 0, Math.PI * 2); // Russia/Siberia
  ctx.ellipse(1460, 430, 95, 75, 0.1, 0, Math.PI * 2); // East Asia
  ctx.ellipse(1320, 490, 65, 85, 0.1, 0, Math.PI * 2); // India
  ctx.ellipse(1560, 370, 20, 75, 0.4, 0, Math.PI * 2); // Japan
  ctx.fill();

  // Africa
  ctx.fillStyle = '#223c2a'; // Sub-saharan savannah & Congo
  ctx.beginPath();
  ctx.ellipse(1085, 560, 140, 185, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Madagascar
  ctx.beginPath();
  ctx.ellipse(1260, 680, 20, 55, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Australia
  ctx.fillStyle = '#2d3320';
  ctx.beginPath();
  ctx.ellipse(1650, 720, 95, 75, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Arid Deserts & Plateaus (Sahara, Arabian Peninsula, Gobi, Australian Outback)
  ctx.fillStyle = '#3c301e';
  // Sahara & Sahel
  ctx.beginPath();
  ctx.ellipse(1080, 460, 110, 55, 0, 0, Math.PI * 2);
  ctx.fill();
  // Arabian Peninsula
  ctx.beginPath();
  ctx.ellipse(1220, 440, 50, 40, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // Central Asian Steppes & Gobi
  ctx.beginPath();
  ctx.ellipse(1360, 350, 120, 45, 0, 0, Math.PI * 2);
  ctx.fill();
  // Australian Outback (red sand / arid plateau)
  ctx.fillStyle = '#442d1c';
  ctx.beginPath();
  ctx.ellipse(1650, 720, 65, 45, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Mountain Ranges (Highlands / Snow peaks)
  ctx.fillStyle = '#2b231c';
  ctx.beginPath();
  ctx.ellipse(370, 330, 25, 120, 0.1, 0, Math.PI * 2); // Rockies
  ctx.ellipse(560, 710, 20, 150, 0.2, 0, Math.PI * 2); // Andes
  ctx.ellipse(1350, 420, 85, 25, -0.1, 0, Math.PI * 2); // Himalayas
  ctx.fill();

  // Thin coastal shelf contour - delicate marine cyan boundary
  ctx.strokeStyle = '#084873';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // 4. Night-Side City Lights (Pinpoint warm incandescent clusters)
  // These clusters give the night side authentic aerospace realism
  const cityClusters = [
    // US East Coast & Great Lakes
    [480, 300], [510, 290], [525, 310], [490, 330], [540, 360],
    // US West Coast
    [360, 300], [350, 340], [380, 360],
    // South America (SE Coast)
    [660, 700], [640, 740], [600, 680],
    // Western & Central Europe
    [1020, 240], [1050, 250], [1070, 240], [1040, 270], [1090, 280],
    // Middle East & Nile Delta
    [1130, 400], [1200, 420], [1240, 450],
    // India
    [1300, 470], [1330, 490], [1320, 520], [1350, 480],
    // East Asia & Japan
    [1460, 380], [1480, 420], [1500, 440], [1550, 360], [1570, 380],
    // Australia Coast
    [1690, 730], [1710, 750], [1640, 750],
  ];

  cityClusters.forEach(([cx, cy]) => {
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#fef08a';
    for (let i = 0; i < 11; i++) {
      const ox = (Math.sin(i * 9.2 + cx) * 22);
      const oy = (Math.cos(i * 7.4 + cy) * 16);
      ctx.fillRect(cx + ox, cy + oy, 1.8, 1.8);
    }
  });
  ctx.shadowBlur = 0;

  // 5. Delicate Atmospheric Wispy Cloud Layers (Soft translucent swirling bands)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  for (let i = 0; i < 55; i++) {
    const rx = ((i * 73) % 2048);
    const ry = 140 + ((i * 61) % 740);
    const rw = 80 + (i % 60) * 2.5;
    const rh = 16 + (i % 16);
    const rot = (i * 0.14) - 0.3;

    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, rot, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cyclonic Storm Vortex System (Mid-Atlantic & Pacific)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.arc(800, 340, 60, 0, Math.PI * 1.5);
  ctx.lineWidth = 14;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.stroke();

  // Polar Ice Caps (Glacial white with subtle gradient falloff)
  const northIce = ctx.createLinearGradient(0, 0, 0, 60);
  northIce.addColorStop(0, 'rgba(235, 245, 255, 0.65)');
  northIce.addColorStop(1, 'rgba(235, 245, 255, 0)');
  ctx.fillStyle = northIce;
  ctx.fillRect(0, 0, 2048, 60);

  const southIce = ctx.createLinearGradient(0, 960, 0, 1024);
  southIce.addColorStop(0, 'rgba(235, 245, 255, 0)');
  southIce.addColorStop(1, 'rgba(235, 245, 255, 0.7)');
  ctx.fillStyle = southIce;
  ctx.fillRect(0, 960, 2048, 64);

  _cachedEarthTexture = new THREE.CanvasTexture(canvas);
  _cachedEarthTexture.wrapS = THREE.RepeatWrapping;
  _cachedEarthTexture.wrapT = THREE.ClampToEdgeWrapping;
  _cachedEarthTexture.anisotropy = 8;
  return _cachedEarthTexture;
}

/**
 * Anodized Dark Spacecraft Titanium & Screw Countersink Texture
 */
export function createChassisTexture(): THREE.CanvasTexture {
  if (_cachedChassisTexture) return _cachedChassisTexture;
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

  _cachedChassisTexture = new THREE.CanvasTexture(canvas);
  _cachedChassisTexture.wrapS = THREE.RepeatWrapping;
  _cachedChassisTexture.wrapT = THREE.RepeatWrapping;
  return _cachedChassisTexture;
}

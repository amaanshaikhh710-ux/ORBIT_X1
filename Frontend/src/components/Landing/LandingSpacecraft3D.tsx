import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Dedicated high-resolution procedural Earth texture for the landing hero horizon.
 * Features realistic deep midnight oceans, authentic continental contours,
 * natural wispy cloud bands, and pinpoint golden night-side metropolis clusters.
 */
let _cachedLandingEarthTexture: THREE.CanvasTexture | null = null;
let _cachedLandingSolarCellTexture: THREE.CanvasTexture | null = null;
let _cachedLandingChassisTexture: THREE.CanvasTexture | null = null;

function createLandingOrbitalEarthTexture(): THREE.CanvasTexture {
  if (_cachedLandingEarthTexture) return _cachedLandingEarthTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Deep Midnight Ocean Base (Rich dark navy, atmospheric depth)
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
  oceanGrad.addColorStop(0, '#020815');
  oceanGrad.addColorStop(0.2, '#041126');
  oceanGrad.addColorStop(0.5, '#061a38');
  oceanGrad.addColorStop(0.8, '#041126');
  oceanGrad.addColorStop(1, '#020815');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 2048, 1024);

  // 2. Continental Landmasses with authentic geography & muted aerospace tones
  const drawPolygon = (pts: [number, number][], fill: string) => {
    if (pts.length === 0) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  };

  // North America
  drawPolygon(
    [
      [180, 200], [240, 160], [350, 170], [420, 210], [460, 260],
      [420, 310], [450, 340], [440, 380], [390, 410], [340, 440],
      [310, 410], [280, 460], [240, 400], [210, 340], [170, 280],
    ],
    '#0e2419'
  );
  // Central America & Caribbean
  drawPolygon(
    [[340, 440], [380, 490], [395, 520], [375, 530], [350, 480], [330, 450]],
    '#0e2419'
  );
  // South America
  drawPolygon(
    [
      [390, 520], [440, 500], [510, 530], [540, 580], [520, 660],
      [460, 750], [420, 840], [395, 840], [405, 740], [390, 640],
      [370, 560],
    ],
    '#0d2217'
  );
  // Europe & Scandinavia
  drawPolygon(
    [
      [980, 180], [1030, 150], [1070, 200], [1050, 250], [1090, 270],
      [1040, 320], [990, 330], [960, 290], [940, 310], [920, 260],
      [950, 220],
    ],
    '#11291d'
  );
  // Africa
  drawPolygon(
    [
      [930, 340], [1030, 340], [1100, 400], [1140, 460], [1110, 540],
      [1080, 620], [1050, 720], [1000, 720], [960, 630], [920, 500],
      [880, 450], [890, 370],
    ],
    '#162315'
  );
  // Eurasia / Siberia / Central Asia
  drawPolygon(
    [
      [1070, 200], [1200, 160], [1380, 170], [1520, 210], [1620, 240],
      [1580, 310], [1480, 320], [1420, 360], [1320, 340], [1220, 360],
      [1120, 300],
    ],
    '#102619'
  );
  // East Asia & Southeast Asia
  drawPolygon(
    [
      [1420, 360], [1500, 340], [1550, 380], [1530, 450], [1470, 490],
      [1400, 470], [1380, 420],
    ],
    '#0d2217'
  );
  // Indian Subcontinent
  drawPolygon(
    [[1260, 380], [1330, 380], [1350, 440], [1310, 510], [1270, 450]],
    '#172418'
  );
  // Australia
  drawPolygon(
    [
      [1560, 640], [1630, 620], [1690, 660], [1710, 730], [1650, 790],
      [1560, 760], [1520, 700],
    ],
    '#1a2318'
  );

  // Arid interior highlands / Sahara & Middle East desert plateaus (Muted sepia/ochre)
  ctx.fillStyle = '#262018';
  // Sahara
  ctx.beginPath();
  ctx.ellipse(990, 400, 110, 45, 0.05, 0, Math.PI * 2);
  ctx.fill();
  // Arabian Peninsula
  ctx.beginPath();
  ctx.ellipse(1190, 410, 55, 40, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Australian Outback
  ctx.beginPath();
  ctx.ellipse(1610, 710, 60, 35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Continental shelf subtle turquoise contours
  ctx.strokeStyle = 'rgba(8, 62, 92, 0.45)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // 3. Subtle Night-Side Metropolitan City Light Clusters (Warm amber/golden pinpricks)
  ctx.fillStyle = '#f59e0b';
  const cityClusters = [
    // US East Coast & Great Lakes
    [390, 330], [410, 340], [420, 320], [430, 310], [360, 330],
    // Western Europe
    [970, 270], [990, 290], [1020, 280], [980, 310], [1010, 320],
    // Nile & Middle East
    [1060, 390], [1070, 410], [1160, 390], [1200, 400],
    // India & East Asia
    [1280, 430], [1310, 450], [1480, 380], [1510, 410], [1580, 340],
    // Australia & South America coastal cities
    [520, 650], [480, 700], [1680, 740], [1640, 770],
  ];
  cityClusters.forEach(([cx, cy]) => {
    ctx.shadowColor = '#d97706';
    ctx.shadowBlur = 2;
    for (let i = 0; i < 8; i++) {
      const ox = (Math.random() - 0.5) * 24;
      const oy = (Math.random() - 0.5) * 18;
      ctx.fillRect(cx + ox, cy + oy, 1.4, 1.4);
    }
  });
  ctx.shadowBlur = 0;

  // 4. Natural Atmospheric Swirling Cloud Layers (Delicate, organic, wispy)
  ctx.fillStyle = 'rgba(225, 238, 252, 0.16)';
  for (let i = 0; i < 40; i++) {
    const rx = (i * 53) % 2048;
    const ry = 140 + ((i * 67) % 720);
    ctx.beginPath();
    ctx.ellipse(rx, ry, 95 + (i % 35), 18 + (i % 10), i * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }

  // Intertropical Convergence Zone (ITCZ) organic cloud belt
  ctx.fillStyle = 'rgba(235, 245, 255, 0.14)';
  for (let c = 0; c < 2048; c += 120) {
    ctx.beginPath();
    ctx.ellipse(c, 510 + Math.sin(c * 0.008) * 35, 75, 14, 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mid-latitude cyclonic swirls
  for (let s = 0; s < 4; s++) {
    const sx = 300 + s * 480;
    const sy = 260 + (s % 2) * 440;
    ctx.fillStyle = 'rgba(230, 242, 255, 0.18)';
    ctx.beginPath();
    ctx.arc(sx, sy, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(sx + 24, sy - 12, 50, 12, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  _cachedLandingEarthTexture = new THREE.CanvasTexture(canvas);
  _cachedLandingEarthTexture.wrapS = THREE.RepeatWrapping;
  _cachedLandingEarthTexture.wrapT = THREE.ClampToEdgeWrapping;
  _cachedLandingEarthTexture.anisotropy = 8;
  return _cachedLandingEarthTexture;
}

/**
 * Dedicated high-fidelity solar cell wafer texture for the scaled CubeSat wings.
 * Features deep blue photovoltaic silicon cells with visible wafer borders and silver busbars.
 */
function createLandingSolarCellTexture(): THREE.CanvasTexture {
  if (_cachedLandingSolarCellTexture) return _cachedLandingSolarCellTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Deep space-navy background
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
  bgGrad.addColorStop(0, '#081832');
  bgGrad.addColorStop(0.5, '#0d254b');
  bgGrad.addColorStop(1, '#091b38');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 512, 512);

  // 2x3 Wafer Cell Grid Layout
  const cols = 2;
  const rows = 3;
  const pad = 10;
  const cellW = (512 - (cols + 1) * pad) / cols;
  const cellH = (512 - (rows + 1) * pad) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pad + c * (cellW + pad);
      const y = pad + r * (cellH + pad);

      // Chamfered wafer corner profile
      ctx.save();
      ctx.beginPath();
      const bevel = 12;
      ctx.moveTo(x + bevel, y);
      ctx.lineTo(x + cellW - bevel, y);
      ctx.lineTo(x + cellW, y + bevel);
      ctx.lineTo(x + cellW, y + cellH - bevel);
      ctx.lineTo(x + cellW - bevel, y + cellH);
      ctx.lineTo(x + bevel, y + cellH);
      ctx.lineTo(x, y + cellH - bevel);
      ctx.lineTo(x, y + bevel);
      ctx.closePath();

      // Deep rich photovoltaic blue silicon fill with soft radial depth
      const waferGrad = ctx.createRadialGradient(
        x + cellW * 0.4,
        y + cellH * 0.4,
        6,
        x + cellW * 0.5,
        y + cellH * 0.5,
        130
      );
      waferGrad.addColorStop(0, '#1c4d8c');
      waferGrad.addColorStop(0.65, '#12396d');
      waferGrad.addColorStop(1, '#0b2348');
      ctx.fillStyle = waferGrad;
      ctx.fill();
      ctx.clip();

      // High-contrast silver horizontal collector grid fingers
      ctx.strokeStyle = 'rgba(215, 235, 255, 0.65)';
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
        const busGrad = ctx.createLinearGradient(bx - 2, 0, bx + 2, 0);
        busGrad.addColorStop(0, '#94a3b8');
        busGrad.addColorStop(0.5, '#ffffff');
        busGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = busGrad;
        ctx.fillRect(bx - 2, y, 4, cellH);

        // Gold interconnect solder pads
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(bx, y + cellH * 0.25, 3.5, 0, Math.PI * 2);
        ctx.arc(bx, y + cellH * 0.75, 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();

      // Outer cell trace perimeter
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 1, y - 1, cellW + 2, cellH + 2);
    }
  }

  _cachedLandingSolarCellTexture = new THREE.CanvasTexture(canvas);
  _cachedLandingSolarCellTexture.wrapS = THREE.RepeatWrapping;
  _cachedLandingSolarCellTexture.wrapT = THREE.RepeatWrapping;
  _cachedLandingSolarCellTexture.anisotropy = 8;
  return _cachedLandingSolarCellTexture;
}

/**
 * Dedicated procedural chassis texture for the landing CubeSat
 * Produces subtle mid-tone graphite panel division seams and aerospace screw points
 */
function createLandingChassisTexture(): THREE.CanvasTexture {
  if (_cachedLandingChassisTexture) return _cachedLandingChassisTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base mid-tone graphite
  ctx.fillStyle = '#3a4658';
  ctx.fillRect(0, 0, 512, 512);

  // Panel division seam lines
  ctx.strokeStyle = '#263140';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 480, 480);
  ctx.beginPath();
  ctx.moveTo(16, 256);
  ctx.lineTo(496, 256);
  ctx.moveTo(256, 16);
  ctx.lineTo(256, 496);
  ctx.stroke();

  // Silver countersunk aerospace fasteners along perimeter
  ctx.fillStyle = '#c5d0de';
  const screwOffsets = [32, 128, 256, 384, 480];
  screwOffsets.forEach((px) => {
    [24, 488].forEach((py) => {
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  screwOffsets.forEach((py) => {
    [24, 488].forEach((px) => {
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  _cachedLandingChassisTexture = new THREE.CanvasTexture(canvas);
  _cachedLandingChassisTexture.anisotropy = 8;
  return _cachedLandingChassisTexture;
}

/**
 * LandingSpacecraft3D — Presentation-Grade Cinematic Hero Space Scene
 *
 * Visual Corrections:
 * - CubeSat size reduced by 28-30% (desktop scale ~0.35), placed in right-center hero with ample negative space
 * - Spacecraft materials improved: mid-tone graphite metallic body, visible silver structural rails, deep blue photovoltaic panels
 * - Earth horizon completely redesigned: spherical geometry (radius 16) curved across bottom ~18-20% of viewport
 * - Custom Earth spherical shader: soft natural lighting, dark blue oceans, night lights, zero grey/white patches, zero platform look
 * - Razor-thin subtle blue atmospheric limb (Rayleigh scattering, NOT bright cyan)
 * - Deep cinematic navy background with subtle space haze, sparse tiny stars
 * - Strictly non-interactive showcase with continuous slow auto-rotation and fixed camera
 */
export const LandingSpacecraft3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // Check user preference for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionFactor = prefersReducedMotion ? 0.0 : 1.0;

    // ==========================================
    // Three.js Scene, Camera, Renderer
    // ==========================================
    const scene = new THREE.Scene();
    // Transparent scene background allows CSS cinematic radial navy gradient to show through seamlessly
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
    // Fixed camera distance and fixed camera angle
    camera.position.set(0, 0, 7.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0); // Transparent canvas

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // ==========================================
    // Dedicated High-Fidelity Textures
    // ==========================================
    const solarTex = createLandingSolarCellTexture();
    const earthTex = createLandingOrbitalEarthTexture();
    const chassisTex = createLandingChassisTexture();

    // ==========================================
    // Controlled Aerospace Lighting
    // ==========================================
    // Ambient navy fill ensures deep shadows remain visible without washing out
    const ambientLight = new THREE.AmbientLight(0x14223d, 0.95);
    scene.add(ambientLight);

    // Primary warm sunlight hitting CubeSat from upper right
    const sunLight = new THREE.DirectionalLight(0xfff8ed, 2.2);
    sunLight.position.set(10, 8, 9);
    scene.add(sunLight);

    // Cool sky-blue fill light from lower-left to sculpt graphite chassis and metallic details
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    fillLight.position.set(-6, -2, 5);
    scene.add(fillLight);

    // Crisp white specular rim light from rear-top to catch silver rails and chamfers
    const rimLight = new THREE.DirectionalLight(0xf0f6ff, 1.8);
    rimLight.position.set(4, 6, -5);
    scene.add(rimLight);

    // Subtle local point light dedicated to highlighting CubeSat front details
    const satPointLight = new THREE.PointLight(0xdbeafe, 1.2, 8, 1.2);
    satPointLight.position.set(3.2, 1.8, 3.0);
    scene.add(satPointLight);

    // ==========================================
    // Sparse, Tiny Stars in Deep Navy Space
    // ==========================================
    const starCount = 350;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 140;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 140;
      starPos[i * 3 + 2] = -25 - Math.random() * 50;

      const r = Math.random();
      if (r > 0.82) {
        // Faint sky-blue pinprick
        starColors[i * 3] = 0.5;
        starColors[i * 3 + 1] = 0.78;
        starColors[i * 3 + 2] = 1.0;
      } else if (r > 0.65) {
        // Faint warm star
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.92;
        starColors[i * 3 + 2] = 0.78;
      } else {
        // Crisp white pinprick
        starColors[i * 3] = 0.88;
        starColors[i * 3 + 1] = 0.92;
        starColors[i * 3 + 2] = 0.98;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.13,
      vertexColors: true,
      transparent: true,
      opacity: 0.44,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ==========================================
    // Realistic Curved Earth Horizon (~18-20% of Viewport Bottom)
    // Spherical geometry (radius 16) centered low below camera creates an authentic planetary arc
    // NO flat platform, NO grey patch, NO artificial spotlight
    // ==========================================
    const earthRadius = 16.0;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 96, 96);

    // Custom Planetary Spherical Shader: soft natural lighting, dark blue oceans,
    // subtle night city lights, and zero overexposed patches
    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uEarthMap: { value: earthTex },
        uSunDirection: { value: new THREE.Vector3(10.0, 8.0, 9.0).normalize() },
        uAtmoColor: { value: new THREE.Color(0x1a62bf) }, // Soft aerospace deep blue (NOT cyan)
        uNightOceanColor: { value: new THREE.Color(0x020a17) }, // Deep midnight ocean
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uEarthMap;
        uniform vec3 uSunDirection;
        uniform vec3 uAtmoColor;
        uniform vec3 uNightOceanColor;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 eye = normalize(cameraPosition - vWorldPosition);
          
          // Sun incidence angle
          float NdotL = dot(normal, uSunDirection);
          
          // Soft natural day/night terminator transition
          float dayFactor = smoothstep(-0.12, 0.18, NdotL);
          
          vec4 mapColor = texture2D(uEarthMap, vUv);
          
          // Controlled daytime surface brightness: mostly dark aesthetic, no white blowout
          vec3 daySurface = mapColor.rgb * (0.10 + 0.60 * max(NdotL, 0.0));
          
          // Restrained soft ocean specular glint (subtle blue sheen, NEVER white)
          float isOcean = clamp((mapColor.b - mapColor.g) * 2.8, 0.0, 1.0);
          vec3 halfVec = normalize(uSunDirection + eye);
          float spec = pow(max(dot(normal, halfVec), 0.0), 32.0) * isOcean * 0.16 * dayFactor;
          daySurface += vec3(0.20, 0.42, 0.72) * spec;
          
          // Night side: dark navy ocean with subtle golden city light clusters
          float cityMask = step(0.55, mapColor.r) * step(0.35, mapColor.g) * (1.0 - isOcean);
          vec3 nightSurface = uNightOceanColor + vec3(1.0, 0.72, 0.30) * cityMask * 0.85;
          
          // Blend day and night across the terminator
          vec3 planetColor = mix(nightSurface, daySurface, dayFactor);
          
          // Subtle atmospheric rim along the horizon curve (Rayleigh scattering)
          float rim = 1.0 - max(dot(eye, normal), 0.0);
          float atmoLimb = pow(rim, 4.2);
          float atmoSun = smoothstep(-0.25, 0.25, NdotL);
          vec3 atmoGlow = uAtmoColor * atmoLimb * (0.16 + 0.84 * atmoSun) * 0.65;
          
          planetColor += atmoGlow;
          
          gl_FragColor = vec4(planetColor, 1.0);
        }
      `,
    });

    const earthMesh = new THREE.Mesh(earthGeo, earthShaderMat);
    // Positioned so the top curve apex reaches ~18-20% of the viewport bottom (y = -1.45)
    earthMesh.position.set(0.6, -17.45, -1.2);
    earthMesh.rotation.x = 0.14;
    earthMesh.rotation.y = 1.85;
    scene.add(earthMesh);

    // Razor-Thin Precision Atmospheric Outer Shell
    const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.007, 96, 96);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        rimColor: { value: new THREE.Color(0x1a62bf) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vEyeVector;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vEyeVector = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 rimColor;
        varying vec3 vNormal;
        varying vec3 vEyeVector;
        void main() {
          float rim = 1.0 - max(dot(vEyeVector, vNormal), 0.0);
          float glow = pow(rim, 5.0) * 0.45; // Razor-thin atmospheric glow
          gl_FragColor = vec4(rimColor, glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    atmoMesh.position.copy(earthMesh.position);
    scene.add(atmoMesh);

    // ==========================================
    // Spacecraft Master Group — Realistic 3U CubeSat
    // Reduced by ~28-30% in apparent size, floating high above Earth with generous space
    // ==========================================
    const satelliteGroup = new THREE.Group();
    // Dynamic 3/4 cinematic orbital orientation
    const defaultSatRot = new THREE.Euler(-0.24, -0.60, 0.28);
    satelliteGroup.rotation.copy(defaultSatRot);
    scene.add(satelliteGroup);

    // Materials — Mid-Tone Graphite Metallic, Visible Silver Rails & Deep Blue Cells
    const chassisMat = new THREE.MeshStandardMaterial({
      map: chassisTex,
      metalness: 0.80,
      roughness: 0.28,
      color: 0x3e4a5c, // Mid-tone aerospace graphite metallic (clearly visible, not pitch black)
    });
    const railsMat = new THREE.MeshStandardMaterial({
      color: 0xd4dce6, // Visible Anodized Aluminum 6061-T6 Silver
      metalness: 0.94,
      roughness: 0.14,
    });
    const solarWingMat = new THREE.MeshStandardMaterial({
      map: solarTex,
      metalness: 0.82,
      roughness: 0.16,
      color: 0xffffff,
      emissive: 0x081e3d,
      emissiveIntensity: 0.32,
    });
    const panelFrameMat = new THREE.MeshStandardMaterial({
      color: 0x141f30,
      metalness: 0.88,
      roughness: 0.20,
    });
    const goldHardwareMat = new THREE.MeshStandardMaterial({
      color: 0xd49b28, // Restrained aerospace gold Alodine / TiN
      metalness: 0.90,
      roughness: 0.20,
    });
    const radiatorMat = new THREE.MeshStandardMaterial({
      color: 0xe6edf5, // Silver Teflon radiator
      metalness: 0.92,
      roughness: 0.12,
    });
    const mliMat = new THREE.MeshStandardMaterial({
      color: 0xd99b24,
      metalness: 0.88,
      roughness: 0.24,
    });

    // 1. 4 Corner Structural Rails (Anodized Al 6061-T6 Silver)
    const railGeo = new THREE.BoxGeometry(0.08, 3.02, 0.08);
    [
      [0.5, 0, 0.5],
      [-0.5, 0, 0.5],
      [0.5, 0, -0.5],
      [-0.5, 0, -0.5],
    ].forEach(([rx, ry, rz]) => {
      const rail = new THREE.Mesh(railGeo, railsMat);
      rail.position.set(rx, ry, rz);
      satelliteGroup.add(rail);

      // Spring plunger guide tabs at each rail tip
      const plungerTop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), goldHardwareMat);
      plungerTop.position.set(rx, 1.54, rz);
      satelliteGroup.add(plungerTop);
      const plungerBot = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), goldHardwareMat);
      plungerBot.position.set(rx, -1.54, rz);
      satelliteGroup.add(plungerBot);
    });

    // 2. Top and Bottom Bulkheads
    const plateGeo = new THREE.BoxGeometry(1.02, 0.05, 1.02);
    const topPlate = new THREE.Mesh(plateGeo, chassisMat);
    topPlate.position.set(0, 1.48, 0);
    satelliteGroup.add(topPlate);

    const bottomPlate = new THREE.Mesh(plateGeo, chassisMat);
    bottomPlate.position.set(0, -1.48, 0);
    satelliteGroup.add(bottomPlate);

    // 3. Intermediate Structural Rib Frames (3 bays)
    const ribGeo = new THREE.BoxGeometry(1.0, 0.04, 1.0);
    const rib1 = new THREE.Mesh(ribGeo, chassisMat);
    rib1.position.set(0, 0.48, 0);
    satelliteGroup.add(rib1);
    const rib2 = new THREE.Mesh(ribGeo, chassisMat);
    rib2.position.set(0, -0.48, 0);
    satelliteGroup.add(rib2);

    // 4. Chassis Side Walls & Radiator Thermal Plate
    const sideWallZ = new THREE.Mesh(new THREE.BoxGeometry(0.94, 2.88, 0.04), chassisMat);
    sideWallZ.position.set(0, 0, -0.49);
    satelliteGroup.add(sideWallZ);

    const sideWallX = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.88, 0.94), chassisMat);
    sideWallX.position.set(-0.49, 0, 0);
    satelliteGroup.add(sideWallX);

    // Thermal Radiator Patch on -X face
    const radiatorPatch = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.2, 0.72), radiatorMat);
    radiatorPatch.position.set(-0.51, 0.3, 0);
    satelliteGroup.add(radiatorPatch);

    // 5. Internal PC104 Avionics Stack
    const pcbGeo = new THREE.BoxGeometry(0.78, 0.03, 0.78);
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.5, roughness: 0.4 });
    const pcbChipsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
    for (let p = 0; p < 3; p++) {
      const pcb = new THREE.Mesh(pcbGeo, pcbMat);
      pcb.position.set(0, 0.1 + p * 0.22, 0);
      satelliteGroup.add(pcb);

      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.2), pcbChipsMat);
      chip.position.set(0, 0.13 + p * 0.22, 0);
      satelliteGroup.add(chip);
    }

    // 6. Deployable Dual Solar Array Wings (+X and -X) with Deep Blue Photovoltaic Panels
    const wingGeo = new THREE.BoxGeometry(1.28, 2.68, 0.04);

    // Left Wing (-X)
    const leftWing = new THREE.Mesh(wingGeo, solarWingMat);
    leftWing.position.set(-1.22, 0, 0);
    satelliteGroup.add(leftWing);

    const leftBack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.7, 0.01), panelFrameMat);
    leftBack.position.set(-1.22, 0, -0.022);
    satelliteGroup.add(leftBack);

    // Right Wing (+X)
    const rightWing = new THREE.Mesh(wingGeo, solarWingMat);
    rightWing.position.set(1.22, 0, 0);
    satelliteGroup.add(rightWing);

    const rightBack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.7, 0.01), panelFrameMat);
    rightBack.position.set(1.22, 0, -0.022);
    satelliteGroup.add(rightBack);

    // Gold Articulation Wing Hinges
    const hingeL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.56, 12), goldHardwareMat);
    hingeL.position.set(-0.54, 0, 0);
    satelliteGroup.add(hingeL);

    const hingeR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.56, 12), goldHardwareMat);
    hingeR.position.set(0.54, 0, 0);
    satelliteGroup.add(hingeR);

    // 7. Gold MLI Battery Bay Pack (Front Face)
    const batteryPack = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.44, 0.22), mliMat);
    batteryPack.position.set(0, -0.35, 0.52);
    satelliteGroup.add(batteryPack);

    // Aluminum mounting flanges
    const topFlange = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.24), railsMat);
    topFlange.position.set(0, -0.12, 0.52);
    satelliteGroup.add(topFlange);
    const botFlange = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.24), railsMat);
    botFlange.position.set(0, -0.58, 0.52);
    satelliteGroup.add(botFlange);

    // Telemetry Status Beacon LED (Subtle green pulse)
    const batteryLedMat = new THREE.MeshStandardMaterial({
      color: 0x27d17f,
      emissive: 0x10b981,
      emissiveIntensity: 0.85,
    });
    const batteryLed = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.02), batteryLedMat);
    batteryLed.position.set(0, -0.35, 0.635);
    satelliteGroup.add(batteryLed);

    // 8. Earth Observation Optical Payload (Stepped barrel + multi-coated optical lens)
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.26, 0.34, 32),
      new THREE.MeshStandardMaterial({ color: 0x131d2e, metalness: 0.90, roughness: 0.18 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, -1.02, 0.56);
    satelliteGroup.add(barrel);

    // Knurled focus collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 0.08, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.35 })
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -1.02, 0.5);
    satelliteGroup.add(collar);

    // Polished titanium aperture bezel
    const bezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.04, 32),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.96, roughness: 0.08 })
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(0, -1.02, 0.74);
    satelliteGroup.add(bezel);

    // Multi-coated optical glass lens with controlled specular highlight
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4),
      new THREE.MeshPhysicalMaterial({
        color: 0x1e3a5f,
        emissive: 0x052042,
        emissiveIntensity: 0.16,
        roughness: 0.05,
        metalness: 0.12,
        transmission: 0.84,
        transparent: true,
        opacity: 0.90,
      })
    );
    lens.position.set(0, -1.02, 0.7);
    satelliteGroup.add(lens);

    // 9. Communications Antennas on Zenith/Top Deck
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 1.2, 16), goldHardwareMat);
    mast.position.set(0.18, 2.08, 0.18);
    satelliteGroup.add(mast);

    const whipL = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.88, 12), goldHardwareMat);
    whipL.position.set(0.44, 1.82, 0);
    whipL.rotation.z = -Math.PI / 4;
    satelliteGroup.add(whipL);

    const whipR = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.88, 12), goldHardwareMat);
    whipR.position.set(-0.44, 1.82, 0);
    whipR.rotation.z = Math.PI / 4;
    satelliteGroup.add(whipR);

    // Conical X-band feed horn on top deck
    const horn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.05, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0xc4ceda, metalness: 0.92, roughness: 0.16 })
    );
    horn.position.set(-0.2, 1.58, -0.2);
    satelliteGroup.add(horn);

    // 10. ADCS Reaction Wheels Assembly & Star Tracker
    const adcsBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.42, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x182436, metalness: 0.90, roughness: 0.20 })
    );
    adcsBlock.position.set(0.51, 0.92, 0.24);
    satelliteGroup.add(adcsBlock);

    const rimMat = new THREE.MeshStandardMaterial({ color: 0xc27803, metalness: 0.92, roughness: 0.18 });
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.024, 12, 24), rimMat);
    wheelRim.rotation.y = Math.PI / 2;
    wheelRim.position.set(0.67, 0.92, 0.24);
    satelliteGroup.add(wheelRim);

    // Star tracker optical baffle tube
    const starTracker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.15 })
    );
    starTracker.position.set(0.51, 1.18, 0.42);
    starTracker.rotation.x = Math.PI / 4;
    satelliteGroup.add(starTracker);

    // ==========================================
    // Responsive Spacecraft Sizing & Framing
    // Reduced by ~28-30% in apparent size (scale ~0.35 on desktop)
    // Placed in right-center hero with generous breathing room
    // ==========================================
    let basePosY = 0.35;
    const updateResponsivePosition = () => {
      const w = window.innerWidth;
      if (w < 768) {
        // Mobile: scaled down, placed below hero text
        basePosY = -0.45;
        satelliteGroup.position.set(0, basePosY, -0.5);
        satelliteGroup.scale.set(0.22, 0.22, 0.22);
      } else if (w < 1180) {
        // Tablet / small laptop
        basePosY = 0.25;
        satelliteGroup.position.set(1.5, basePosY, 0.0);
        satelliteGroup.scale.set(0.28, 0.28, 0.28);
      } else if (w >= 1440) {
        // High-res widescreen (1080p, 1440p)
        basePosY = 0.40;
        satelliteGroup.position.set(2.45, basePosY, 0.0);
        satelliteGroup.scale.set(0.38, 0.38, 0.38);
      } else {
        // Standard desktop (~1180-1439px)
        basePosY = 0.35;
        satelliteGroup.position.set(2.25, basePosY, 0.0);
        satelliteGroup.scale.set(0.35, 0.35, 0.35);
      }
    };
    updateResponsivePosition();

    // ==========================================
    // Continuous Slow Aerospace Auto-Rotation
    // Strictly non-interactive presentation showcase
    // ==========================================
    let reqId: number;
    let clock = 0;

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      clock += 0.01;

      // Continuous slow orbital rotation on Y axis
      satelliteGroup.rotation.y += 0.0016 * motionFactor;

      // Extremely subtle harmonic pitch/roll float
      satelliteGroup.rotation.x = defaultSatRot.x + Math.sin(clock * 0.35) * 0.02 * motionFactor;
      satelliteGroup.position.y = basePosY + Math.sin(clock * 0.45) * 0.012 * motionFactor;

      // Gentle reaction wheel spin
      wheelRim.rotation.x += 0.05;

      // Battery LED soft breathing pulse
      batteryLedMat.emissiveIntensity = 0.8 + Math.sin(clock * 1.8) * 0.15;

      // Very slow planetary drift
      earthMesh.rotation.y += 0.00003 * motionFactor;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      updateResponsivePosition();
    };
    window.addEventListener('resize', handleResize);

    // ==========================================
    // Clean Memory Disposal on Unmount
    // ==========================================
    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);

      // Recursive disposal of Three.js objects
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        // Crucial: Pointer events disabled so camera is 100% fixed and user cannot drag/zoom
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useSimulation } from '../../context/SimulationContext';
import {
  createSolarCellTexture,
  createGoldMLITexture,
  createEarthTexture,
  createChassisTexture,
} from './ProceduralTextures';
import { ComponentDetailPanel } from './ComponentDetailPanel';
import { ComponentDock, type ViewMode } from './ComponentDock';
import { CalloutOverlay, type ScreenAnchor, getCardAnchorOrigin } from './CalloutOverlay';
import { Clock } from 'lucide-react';

export const CubeSat3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  const rotateStepRef = useRef<(() => void) | null>(null);
  const panStepRef = useRef<(() => void) | null>(null);
  const zoomStepRef = useRef<(() => void) | null>(null);
  const focusComponentRef = useRef<((id: string) => void) | null>(null);

  const { state, selectedComponent, setSelectedComponent } = useSimulation();

  const [viewMode, setViewMode] = useState<ViewMode>('rotate');
  const viewModeRef = useRef<ViewMode>('rotate');

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const stateRef = useRef(state);
  const selectedRef = useRef(selectedComponent);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    selectedRef.current = selectedComponent;
  }, [selectedComponent]);

  // Screen anchor coordinates for 2D callout leader lines (managed with high-performance DOM tracking)
  const [anchors] = useState<Record<string, ScreenAnchor>>({});
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 750 });

  // Format simulation seconds to HH:MM:SS
  const formatSimTime = (totalSeconds: number) => {
    const s = Math.floor(totalSeconds % 60);
    const m = Math.floor((totalSeconds / 60) % 60);
    const h = Math.floor(totalSeconds / 3600);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 750;
    setContainerDimensions({ width, height });

    // ==========================================
    // Three.js Scene, Camera, Renderer
    // ==========================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(3.8, 2.6, 5.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // ==========================================
    // Procedural Textures & Materials
    // ==========================================
    const solarTex = createSolarCellTexture();
    const goldMliTex = createGoldMLITexture();
    const earthTex = createEarthTexture();
    const chassisTex = createChassisTexture();

    // 1. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.7);
    scene.add(ambientLight);

    // Directional Sunlight (from upper-left, matching the sunburst flare in reference image)
    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.4);
    sunLight.position.set(-14, 16, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // Subtle Earth-shine reflection from below
    const earthShineLight = new THREE.DirectionalLight(0x0284c7, 0.6);
    earthShineLight.position.set(0, -10, 0);
    scene.add(earthShineLight);

    // Rim backlight for silhouette separation
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(10, -5, -10);
    scene.add(rimLight);

    // ==========================================
    // Deep Space Environment & Realistic Earth
    // ==========================================

    // Starfield with depth and subtle magnitude variation
    const starCount = 1400;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 160;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 160;
      starPos[i * 3 + 2] = -30 - Math.random() * 80;

      // Slight color temperature tint (white, soft blue, pale amber)
      const rnd = Math.random();
      if (rnd > 0.8) {
        starColors[i * 3] = 0.75;
        starColors[i * 3 + 1] = 0.85;
        starColors[i * 3 + 2] = 1.0;
      } else if (rnd > 0.6) {
        starColors[i * 3] = 1.0;
        starColors[i * 3 + 1] = 0.95;
        starColors[i * 3 + 2] = 0.8;
      } else {
        starColors[i * 3] = 0.95;
        starColors[i * 3 + 1] = 0.98;
        starColors[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Sun Starburst Glow in top-left
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 128;
    sunCanvas.height = 128;
    const sCtx = sunCanvas.getContext('2d');
    if (sCtx) {
      const g = sCtx.createRadialGradient(64, 64, 2, 64, 64, 60);
      g.addColorStop(0, 'rgba(255, 255, 255, 1)');
      g.addColorStop(0.2, 'rgba(254, 240, 138, 0.9)');
      g.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
      g.addColorStop(1, 'rgba(245, 158, 11, 0)');
      sCtx.fillStyle = g;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const sunTex = new THREE.CanvasTexture(sunCanvas);
    const sunSpriteMat = new THREE.SpriteMaterial({
      map: sunTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const sunSprite = new THREE.Sprite(sunSpriteMat);
    sunSprite.position.set(-18, 14, -20);
    sunSprite.scale.set(14, 14, 1);
    scene.add(sunSprite);

    // Realistic Curved Earth below spacecraft
    const earthRadius = 26;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.8,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.position.set(0, -27.8, -4);
    earthMesh.rotation.x = 0.25;
    earthMesh.rotation.y = 1.2;
    scene.add(earthMesh);

    // Glowing Atmospheric Limb Ring (Atmosphere haze)
    const atmoGeo = new THREE.SphereGeometry(earthRadius * 1.018, 64, 64);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    atmoMesh.position.copy(earthMesh.position);
    scene.add(atmoMesh);

    // ==========================================
    // Spacecraft Master Group
    // ==========================================
    const satelliteGroup = new THREE.Group();
    scene.add(satelliteGroup);

    // Maintain a list of component mesh maps for highlight handling
    const componentMeshes: Record<string, THREE.Mesh[]> = {
      solar: [],
      battery: [],
      payload: [],
      comm: [],
      adcs: [],
      bus: [],
    };

    const registerMesh = (mesh: THREE.Mesh, compId: string) => {
      mesh.userData.componentId = compId;
      if (!componentMeshes[compId]) {
        componentMeshes[compId] = [];
      }
      componentMeshes[compId].push(mesh);
    };

    // Shared Base Materials
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e2736,
      map: chassisTex,
      metalness: 0.85,
      roughness: 0.25,
    });

    const railsMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.95,
      roughness: 0.18,
    });

    const mliMat = new THREE.MeshStandardMaterial({
      map: goldMliTex,
      metalness: 0.88,
      roughness: 0.2,
      bumpMap: goldMliTex,
      bumpScale: 0.04,
    });

    const solarCellMatLeft = new THREE.MeshStandardMaterial({
      map: solarTex,
      metalness: 0.65,
      roughness: 0.22,
      emissive: 0x081a38,
      emissiveIntensity: 0.4,
    });
    const solarCellMatRight = solarCellMatLeft.clone();

    // ==========================================
    // 1. BUS COMPONENT (3U Frame, Rails, Avionics)
    // ==========================================
    const busGroup = new THREE.Group();
    busGroup.name = 'bus';
    satelliteGroup.add(busGroup);

    // 4 Corner Structural Rails (Anodized Aluminum 6061-T6, 10x10x30cm CubeSat Standard)
    const railGeo = new THREE.BoxGeometry(0.08, 3.12, 0.08);
    const railPositions = [
      [0.5, 0, 0.5],
      [-0.5, 0, 0.5],
      [0.5, 0, -0.5],
      [-0.5, 0, -0.5],
    ];
    railPositions.forEach(([rx, ry, rz]) => {
      const rail = new THREE.Mesh(railGeo, railsMat);
      rail.position.set(rx, ry, rz);
      rail.castShadow = true;
      registerMesh(rail, 'bus');
      busGroup.add(rail);
    });

    // Top Bulkhead Plate & Bottom Bulkhead Plate
    const plateGeo = new THREE.BoxGeometry(1.04, 0.06, 1.04);
    const topPlate = new THREE.Mesh(plateGeo, chassisMat);
    topPlate.position.set(0, 1.53, 0);
    registerMesh(topPlate, 'bus');
    busGroup.add(topPlate);

    const bottomPlate = new THREE.Mesh(plateGeo, chassisMat);
    bottomPlate.position.set(0, -1.53, 0);
    registerMesh(bottomPlate, 'bus');
    busGroup.add(bottomPlate);

    // Intermediate Structural Rib Frames (separating into 3x 1U bays)
    const ribGeo = new THREE.BoxGeometry(1.02, 0.04, 1.02);
    const rib1 = new THREE.Mesh(ribGeo, chassisMat);
    rib1.position.set(0, 0.5, 0);
    registerMesh(rib1, 'bus');
    busGroup.add(rib1);

    const rib2 = new THREE.Mesh(ribGeo, chassisMat);
    rib2.position.set(0, -0.5, 0);
    registerMesh(rib2, 'bus');
    busGroup.add(rib2);

    // Chassis Side Panels (Dark anodized titanium with slotted vents)
    const sideWallZNeg = new THREE.Mesh(new THREE.BoxGeometry(0.96, 2.96, 0.04), chassisMat);
    sideWallZNeg.position.set(0, 0, -0.5);
    registerMesh(sideWallZNeg, 'bus');
    busGroup.add(sideWallZNeg);

    // Interior PC104 Avionics Stack visible through frame
    const pcbGeo = new THREE.BoxGeometry(0.78, 0.03, 0.78);
    const pcbMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, metalness: 0.5, roughness: 0.4 });
    const pcbChipsMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
    for (let p = 0; p < 4; p++) {
      const pcb = new THREE.Mesh(pcbGeo, pcbMat);
      pcb.position.set(0, 0.1 + p * 0.18, 0);
      registerMesh(pcb, 'bus');
      busGroup.add(pcb);

      const chip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.2), pcbChipsMat);
      chip.position.set(0, 0.13 + p * 0.18, 0);
      registerMesh(chip, 'bus');
      busGroup.add(chip);
    }

    // Bus Hit Box (ensures clean raycasting on the central chassis)
    const busHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 2.9, 0.95),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    busHitBox.position.set(0, 0, 0);
    registerMesh(busHitBox, 'bus');
    busGroup.add(busHitBox);

    // ==========================================
    // 2. SOLAR ARRAY COMPONENT (+X and -X Wings)
    // ==========================================
    const solarGroup = new THREE.Group();
    solarGroup.name = 'solar';
    satelliteGroup.add(solarGroup);

    const wingPanelGeo = new THREE.BoxGeometry(1.28, 2.7, 0.035);
    const panelFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const hingeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });

    // Left Wing (Inner & Outer articulated panels)
    const leftWingInner = new THREE.Mesh(wingPanelGeo, solarCellMatLeft);
    leftWingInner.position.set(-1.24, 0, 0);
    leftWingInner.castShadow = true;
    registerMesh(leftWingInner, 'solar');
    solarGroup.add(leftWingInner);

    // Left Wing Frame backing
    const leftBack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.72, 0.01), panelFrameMat);
    leftBack.position.set(-1.24, 0, -0.02);
    registerMesh(leftBack, 'solar');
    solarGroup.add(leftBack);

    // Right Wing
    const rightWingInner = new THREE.Mesh(wingPanelGeo, solarCellMatRight);
    rightWingInner.position.set(1.24, 0, 0);
    rightWingInner.castShadow = true;
    registerMesh(rightWingInner, 'solar');
    solarGroup.add(rightWingInner);

    const rightBack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.72, 0.01), panelFrameMat);
    rightBack.position.set(1.24, 0, -0.02);
    registerMesh(rightBack, 'solar');
    solarGroup.add(rightBack);

    // Hinge brackets connecting wings to bus
    const hingeL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12), hingeMat);
    hingeL.position.set(-0.55, 0, 0);
    registerMesh(hingeL, 'solar');
    solarGroup.add(hingeL);

    const hingeR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12), hingeMat);
    hingeR.position.set(0.55, 0, 0);
    registerMesh(hingeR, 'solar');
    solarGroup.add(hingeR);

    // Dedicated Solar Hit Volumes
    const leftSolarHit = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.8, 0.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    leftSolarHit.position.set(-1.24, 0, 0);
    registerMesh(leftSolarHit, 'solar');
    solarGroup.add(leftSolarHit);

    const rightSolarHit = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 2.8, 0.2),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    rightSolarHit.position.set(1.24, 0, 0);
    registerMesh(rightSolarHit, 'solar');
    solarGroup.add(rightSolarHit);

    // ==========================================
    // 3. BATTERY COMPONENT (Gold MLI Bay on Front)
    // ==========================================
    // Prominently mounted on lower-front (z = 0.54, y = -0.35), clearly visible and accessible!
    const batteryGroup = new THREE.Group();
    batteryGroup.name = 'battery';
    satelliteGroup.add(batteryGroup);

    // Main Gold MLI Pack Enclosure
    const batteryEnclosure = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 0.24), mliMat);
    batteryEnclosure.position.set(0, -0.35, 0.54);
    batteryEnclosure.castShadow = true;
    registerMesh(batteryEnclosure, 'battery');
    batteryGroup.add(batteryEnclosure);

    // Aluminum mounting flanges
    const flangeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const topFlange = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.03, 0.26), flangeMat);
    topFlange.position.set(0, -0.12, 0.54);
    registerMesh(topFlange, 'battery');
    batteryGroup.add(topFlange);

    const botFlange = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.03, 0.26), flangeMat);
    botFlange.position.set(0, -0.58, 0.54);
    registerMesh(botFlange, 'battery');
    batteryGroup.add(botFlange);

    // Multi-segment Battery SOC Status Gauge LED Bar
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.8,
    });
    const ledGauge = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.02), ledMat);
    ledGauge.position.set(0, -0.35, 0.665);
    registerMesh(ledGauge, 'battery');
    batteryGroup.add(ledGauge);

    // Generous Battery Hit Box for effortless clicking
    const batteryHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.55, 0.35),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    batteryHitBox.position.set(0, -0.35, 0.58);
    registerMesh(batteryHitBox, 'battery');
    batteryGroup.add(batteryHitBox);

    // ==========================================
    // 4. OPTICAL PAYLOAD COMPONENT (Camera Barrel)
    // ==========================================
    // Protruding from lower nadir section (z = 0.55, y = -1.05)
    const payloadGroup = new THREE.Group();
    payloadGroup.name = 'payload';
    satelliteGroup.add(payloadGroup);

    // Outer Anodized Stepped Telescope Barrel
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x090e17, metalness: 0.92, roughness: 0.15 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.36, 32), barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, -1.05, 0.58);
    barrel.castShadow = true;
    registerMesh(barrel, 'payload');
    payloadGroup.add(barrel);

    // Knurled Focus Collar
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 0.08, 32),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.4 })
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -1.05, 0.52);
    registerMesh(collar, 'payload');
    payloadGroup.add(collar);

    // Titanium Front Aperture Bezel Ring
    const bezel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.04, 32),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.95, roughness: 0.1 })
    );
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(0, -1.05, 0.77);
    registerMesh(bezel, 'payload');
    payloadGroup.add(bezel);

    // Curved Convex Optical Glass Lens with Anti-Reflective Sheen
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.9,
      transparent: true,
      opacity: 0.85,
      reflectivity: 0.9,
    });
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), lensMat);
    lens.position.set(0, -1.05, 0.73);
    registerMesh(lens, 'payload');
    payloadGroup.add(lens);

    // Dynamic Optical Imaging Cone Beam
    const imagingConeGeo = new THREE.ConeGeometry(1.6, 4.5, 32, 1, true);
    const imagingConeMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const imagingCone = new THREE.Mesh(imagingConeGeo, imagingConeMat);
    imagingCone.position.set(0, -1.05, 2.8);
    imagingCone.rotation.x = -Math.PI / 2;
    payloadGroup.add(imagingCone);

    // Generous Payload Hit Box
    const payloadHitBox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.6, 16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    payloadHitBox.rotation.x = Math.PI / 2;
    payloadHitBox.position.set(0, -1.05, 0.62);
    registerMesh(payloadHitBox, 'payload');
    payloadGroup.add(payloadHitBox);

    // ==========================================
    // 5. COMM / ANTENNA COMPONENT (Masts & Horn)
    // ==========================================
    const commGroup = new THREE.Group();
    commGroup.name = 'comm';
    satelliteGroup.add(commGroup);

    const antennaGoldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15 });

    // High-Gain Mast extending upward from top deck
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.25, 16), antennaGoldMat);
    mast.position.set(0.18, 2.15, 0.18);
    registerMesh(mast, 'comm');
    commGroup.add(mast);

    // Deployable Dual Angled Whip Rods (45° angle)
    const whipL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 12), antennaGoldMat);
    whipL.position.set(0.45, 1.85, 0);
    whipL.rotation.z = -Math.PI / 4;
    registerMesh(whipL, 'comm');
    commGroup.add(whipL);

    const whipR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 12), antennaGoldMat);
    whipR.position.set(-0.45, 1.85, 0);
    whipR.rotation.z = Math.PI / 4;
    registerMesh(whipR, 'comm');
    commGroup.add(whipR);

    // X-band Conical Feed Horn on top deck
    const horn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.05, 0.18, 24),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 })
    );
    horn.position.set(-0.2, 1.62, -0.2);
    registerMesh(horn, 'comm');
    commGroup.add(horn);

    // RF Link Beam (Downlink microwaves toward Earth)
    const rfLineGeo = new THREE.CylinderGeometry(0.05, 0.05, 6.0, 12);
    const rfLineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const rfBeam = new THREE.Mesh(rfLineGeo, rfLineMat);
    rfBeam.position.set(0, -4.5, 0);
    scene.add(rfBeam);

    // Generous Comm Hit Box
    const commHitBox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 1.4, 16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    commHitBox.position.set(0.15, 2.1, 0.15);
    registerMesh(commHitBox, 'comm');
    commGroup.add(commHitBox);

    // ==========================================
    // 6. ADCS COMPONENT (Reaction Wheels Assembly)
    // ==========================================
    const adcsGroup = new THREE.Group();
    adcsGroup.name = 'adcs';
    satelliteGroup.add(adcsGroup);

    // Mounted on upper corner (x = 0.52, y = 0.95, z = 0.25)
    const adcsHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.44, 0.44),
      new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 })
    );
    adcsHousing.position.set(0.52, 0.95, 0.25);
    registerMesh(adcsHousing, 'adcs');
    adcsGroup.add(adcsHousing);

    // 3-Axis Orthogonal Reaction Wheels with Brass Flywheel Rims
    const flywheelRimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.92, roughness: 0.2 });
    const wheelCenterMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });

    // Wheel X
    const wheelX = new THREE.Group();
    wheelX.position.set(0.68, 0.95, 0.25);
    const rimX = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 12, 24), flywheelRimMat);
    rimX.rotation.y = Math.PI / 2;
    wheelX.add(rimX);
    const hubX = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 16), wheelCenterMat);
    hubX.rotation.z = Math.PI / 2;
    wheelX.add(hubX);
    registerMesh(rimX, 'adcs');
    registerMesh(hubX, 'adcs');
    adcsGroup.add(wheelX);

    // Wheel Y
    const wheelY = new THREE.Group();
    wheelY.position.set(0.52, 1.18, 0.25);
    const rimY = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 12, 24), flywheelRimMat);
    rimY.rotation.x = Math.PI / 2;
    wheelY.add(rimY);
    const hubY = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 16), wheelCenterMat);
    wheelY.add(hubY);
    registerMesh(rimY, 'adcs');
    registerMesh(hubY, 'adcs');
    adcsGroup.add(wheelY);

    // Star Tracker Optical Baffle
    const starTracker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.15 })
    );
    starTracker.position.set(0.52, 1.22, 0.44);
    starTracker.rotation.x = Math.PI / 4;
    registerMesh(starTracker, 'adcs');
    adcsGroup.add(starTracker);

    // Generous ADCS Hit Box
    const adcsHitBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.6, 0.55),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    adcsHitBox.position.set(0.55, 1.0, 0.28);
    registerMesh(adcsHitBox, 'adcs');
    adcsGroup.add(adcsHitBox);

    // ==========================================
    // 3D Anchor Points for Callout Leader Lines
    // ==========================================
    const componentAnchors3D: Record<string, THREE.Vector3> = {
      solar: new THREE.Vector3(-1.4, 0.7, 0.1),
      comm: new THREE.Vector3(0.2, 2.2, 0.2),
      adcs: new THREE.Vector3(0.65, 1.1, 0.35),
      bus: new THREE.Vector3(-0.45, 0.1, 0.5),
      battery: new THREE.Vector3(-0.15, -0.35, 0.68),
      payload: new THREE.Vector3(0.0, -1.05, 0.78),
    };

    // ==========================================
    // Selection Highlighting Management
    // ==========================================
    // Subtle cyan outline / emissive glow on the selected component only
    const updateSelectionHighlight = (selectedId: string | null) => {
      Object.keys(componentMeshes).forEach((compId) => {
        const isSelected = selectedId === compId;
        const meshes = componentMeshes[compId];
        meshes.forEach((m) => {
          if (m.material && m.material instanceof THREE.MeshStandardMaterial) {
            if (isSelected) {
              m.material.emissive.setHex(0x0284c7);
              m.material.emissiveIntensity = 0.65;
            } else {
              // Restore nominal emissive
              if (compId === 'solar') {
                m.material.emissive.setHex(0x081a38);
                m.material.emissiveIntensity = 0.4;
              } else if (compId === 'battery') {
                m.material.emissive.setHex(0x000000);
                m.material.emissiveIntensity = 0.0;
              } else {
                m.material.emissive.setHex(0x000000);
                m.material.emissiveIntensity = 0.0;
              }
            }
          }
        });
      });
    };

    // ==========================================
    // Raycaster for Bulletproof Component Selection
    // ==========================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const getComponentId = (obj: THREE.Object3D | null): string | null => {
      while (obj && obj !== satelliteGroup && obj !== scene) {
        if (obj.userData?.componentId) {
          return obj.userData.componentId;
        }
        if (obj.name && ['solar', 'battery', 'payload', 'comm', 'adcs', 'bus'].includes(obj.name)) {
          return obj.name;
        }
        obj = obj.parent;
      }
      return null;
    };

    const handlePointerDown = (e: MouseEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: MouseEvent) => {
      // If mouse moved more than 5px, it's a drag/orbit/pan, NOT a click!
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(satelliteGroup.children, true);

      let hitId: string | null = null;
      for (const hit of intersects) {
        const id = getComponentId(hit.object);
        if (id) {
          hitId = id;
          break;
        }
      }

      if (hitId) {
        setSelectedComponent(hitId);
      } else {
        // Clicked empty space: deselect
        setSelectedComponent(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // View Action Callbacks for Bottom Control Dock
    rotateStepRef.current = () => {
      satelliteGroup.rotation.y += Math.PI / 4;
    };

    panStepRef.current = () => {
      camera.position.x = Math.abs(camera.position.x - 3.8) < 0.1 ? 2.6 : 3.8;
      camera.lookAt(0, 0, 0);
    };

    zoomStepRef.current = () => {
      if (camera.position.z > 5.2) {
        camera.position.z -= 1.4;
      } else {
        camera.position.z = 7.0;
      }
    };

    focusComponentRef.current = (id: string) => {
      const anchor = componentAnchors3D[id];
      if (anchor) {
        const targetAngleY = Math.atan2(anchor.x, anchor.z);
        satelliteGroup.rotation.y = -targetAngleY + 0.25;
      }
    };

    resetViewRef.current = () => {
      camera.position.set(3.8, 2.6, 5.8);
      camera.lookAt(0, 0, 0);
      satelliteGroup.rotation.set(0, 0, 0);
    };

    // ==========================================
    // Camera Controls (Rotate, Pan, Zoom)
    // ==========================================
    let isDragging = false;
    let isPanning = false;
    let isZooming = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const updateCursor = (active: boolean) => {
      if (!containerRef.current) return;
      const mode = viewModeRef.current;
      if (mode === 'pan') {
        containerRef.current.style.cursor = active ? 'grabbing' : 'move';
      } else if (mode === 'zoom') {
        containerRef.current.style.cursor = 'ns-resize';
      } else {
        containerRef.current.style.cursor = active ? 'grabbing' : 'grab';
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isPanning = true;
      } else if (e.button === 0) {
        if (e.shiftKey || viewModeRef.current === 'pan') {
          isPanning = true;
        } else if (viewModeRef.current === 'zoom') {
          isZooming = true;
        } else {
          isDragging = true;
        }
      }
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      updateCursor(true);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging && !isPanning && !isZooming) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;

      if (isDragging) {
        satelliteGroup.rotation.y += deltaX * 0.007;
        satelliteGroup.rotation.x += deltaY * 0.007;
      } else if (isPanning) {
        camera.position.x -= deltaX * 0.006;
        camera.position.y += deltaY * 0.006;
      } else if (isZooming) {
        camera.position.z = Math.max(3.0, Math.min(14.0, camera.position.z - deltaY * 0.015));
      }
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
      isPanning = false;
      isZooming = false;
      updateCursor(false);
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(3.0, Math.min(14.0, camera.position.z + e.deltaY * 0.005));
    };

    updateCursor(false);

    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);

    // ==========================================
    // 60FPS State Simulation & Animation Loop
    // ==========================================
    let reqId: number;
    let clock = 0;
    const tempVec = new THREE.Vector3();
    let lastHighlightedId: string | null = '__init__';

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      clock += 0.016;

      const cur = stateRef.current;
      const currentSelected = selectedRef.current;

      // Update selection visual highlight only when changed
      if (currentSelected !== lastHighlightedId) {
        updateSelectionHighlight(currentSelected);
        lastHighlightedId = currentSelected;
      }

      if (cur) {
        // 1. Sunlight vs Eclipse Environment Lighting
        if (cur.in_sunlight) {
          sunLight.intensity = 2.4;
          ambientLight.intensity = 0.6;
        } else {
          sunLight.intensity = 0.05; // Eclipse darkness
          ambientLight.intensity = 0.2;
        }

        // 2. Solar Degradation Color & Emissive Binding
        const health = cur.solar_health;
        if (health < 0.8) {
          // Degradation scorched reddish-amber tint
          const r = 0.15 + (1.0 - health) * 0.7;
          const g = 0.2 * health;
          const b = 0.5 * health;
          solarCellMatLeft.color.setRGB(r, g, b);
          solarCellMatRight.color.setRGB(r, g, b);
          solarCellMatLeft.emissive.setRGB((1.0 - health) * 0.5, 0, 0);
          solarCellMatRight.emissive.setRGB((1.0 - health) * 0.5, 0, 0);
        } else {
          solarCellMatLeft.color.setHex(0xffffff);
          solarCellMatRight.color.setHex(0xffffff);
          solarCellMatLeft.emissive.setHex(0x081a38);
          solarCellMatRight.emissive.setHex(0x081a38);
        }

        // 3. Battery LED Color & Pulse Binding
        const soc = cur.battery_soc_pct;
        if (soc > 40) {
          ledMat.color.setHex(0x10b981); // Emerald
          ledMat.emissive.setHex(0x059669);
          ledMat.emissiveIntensity = 0.8 + Math.sin(clock * 2) * 0.2;
        } else if (soc > 20) {
          ledMat.color.setHex(0xf59e0b); // Warning Amber
          ledMat.emissive.setHex(0xd97706);
          ledMat.emissiveIntensity = 0.9 + Math.sin(clock * 5) * 0.3;
        } else {
          ledMat.color.setHex(0xef4444); // Critical Red
          ledMat.emissive.setHex(0xb91c1c);
          ledMat.emissiveIntensity = 1.0 + Math.sin(clock * 10) * 0.5;
        }

        // 4. Optical Imaging Dynamic Cone
        if (cur.payload_state === 'IMAGING') {
          imagingCone.visible = true;
          imagingConeMat.opacity = 0.38 + Math.sin(clock * 6) * 0.12;
        } else if (cur.payload_state === 'PROCESSING') {
          imagingCone.visible = true;
          imagingConeMat.opacity = 0.1;
        } else {
          imagingCone.visible = false;
        }

        // 5. RF Downlink Beam
        if (cur.comm_link_state === 'DOWNLINKING' && cur.ground_station_visible) {
          rfBeam.visible = true;
          rfLineMat.opacity = 0.75 + Math.sin(clock * 8) * 0.25;
          if (cur.packet_loss_pct > 5 || cur.comm_health < 0.7) {
            rfLineMat.color.setHex(0xf59e0b);
          } else {
            rfLineMat.color.setHex(0x38bdf8);
          }
        } else {
          rfBeam.visible = false;
        }

        // 6. ADCS Reaction Wheels Active Spin
        rimX.rotation.x += 0.15;
        rimY.rotation.z += 0.15;

        // If pointing error exceeds limit (>2.0°), add visible wobble
        if (cur.adcs_pointing_error_deg > 2.0) {
          satelliteGroup.rotation.z = Math.sin(clock * 3) * (cur.adcs_pointing_error_deg * 0.04);
        } else {
          satelliteGroup.rotation.z = 0;
        }
      }

      // Gentle orbital passive yaw drift
      satelliteGroup.rotation.y += 0.0015;

      // Project 3D Component Anchor Positions directly to SVG leader lines without React re-renders
      const curW = renderer.domElement.clientWidth;
      const curH = renderer.domElement.clientHeight;

      Object.entries(componentAnchors3D).forEach(([id, anchor3D]) => {
        tempVec.copy(anchor3D);
        tempVec.applyMatrix4(satelliteGroup.matrixWorld);
        tempVec.project(camera);

        const isVisible = tempVec.z < 1.0;
        const screenX = Math.round((tempVec.x * 0.5 + 0.5) * curW);
        const screenY = Math.round((-(tempVec.y * 0.5) + 0.5) * curH);

        let cached = calloutElementMap.get(id);
        if (cached === undefined) {
          const g = document.getElementById(`callout-anchor-${id}`);
          if (g) {
            const polyline = document.getElementById(`callout-line-${id}`) as unknown as SVGPolylineElement;
            const dot = document.getElementById(`callout-dot-${id}`) as unknown as SVGCircleElement;
            const ring = document.getElementById(`callout-ring-${id}`) as unknown as SVGCircleElement;
            if (polyline && dot && ring) {
              cached = { g, polyline, dot, ring };
              calloutElementMap.set(id, cached);
            }
          }
        }

        if (cached) {
          cached.g.style.display = isVisible ? 'inline' : 'none';
          if (isVisible) {
            const origin = getCardAnchorOrigin(id, curW, curH);
            const midX = (origin.x + screenX) / 2;
            cached.polyline.setAttribute('points', `${origin.x},${origin.y} ${midX},${screenY} ${screenX},${screenY}`);
            cached.dot.setAttribute('cx', String(screenX));
            cached.dot.setAttribute('cy', String(screenY));
            cached.ring.setAttribute('cx', String(screenX));
            cached.ring.setAttribute('cy', String(screenY));
          }
        }
      });

      renderer.render(scene, camera);
    };

    const calloutElementMap = new Map<string, {
      g: HTMLElement;
      polyline: SVGPolylineElement;
      dot: SVGCircleElement;
      ring: SVGCircleElement;
    }>();

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      setContainerDimensions({ width: w, height: h });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, [setSelectedComponent]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    viewModeRef.current = mode;
    if (mode === 'rotate') {
      rotateStepRef.current?.();
    } else if (mode === 'pan') {
      panStepRef.current?.();
    } else if (mode === 'zoom') {
      zoomStepRef.current?.();
    }
  };

  const handleSelectComponent = useCallback(
    (componentId: string) => {
      const next = selectedComponent === componentId ? null : componentId;
      setSelectedComponent(next);
      if (next) {
        focusComponentRef.current?.(next);
      }
    },
    [selectedComponent, setSelectedComponent]
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '750px',
        overflow: 'hidden',
        background: '#030712',
      }}
    >
      {/* Three.js WebGL Canvas */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* 2D Callout Overlay with Live Leader Lines */}
      <CalloutOverlay
        state={state}
        selectedComponent={selectedComponent}
        onSelectComponent={handleSelectComponent}
        anchors={anchors}
        containerWidth={containerDimensions.width}
        containerHeight={containerDimensions.height}
      />

      {/* Top-Left Simulation Time Card */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '24px',
          background: 'rgba(9, 14, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.28)',
          borderRadius: '10px',
          padding: '12px 18px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          zIndex: 10,
          pointerEvents: 'auto',
          minWidth: '150px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '2px' }}>
          <Clock size={13} color="var(--accent-cyan)" />
          <span>Simulation Time</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.8px' }}>
          {formatSimTime(state?.simulation_time_s || 0)}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px', fontWeight: 500 }}>
          {state?.active_faults && state.active_faults.length > 0
            ? '(V-003 Demo)'
            : state?.in_sunlight
            ? '(Nominal Orbit)'
            : '(Eclipse Period)'}
        </div>
      </div>

      {/* Bottom Unified Control Dock (View Controls + Subsystems) */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15,
          pointerEvents: 'auto',
        }}
      >
        <ComponentDock
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onResetView={() => {
            resetViewRef.current?.();
            setViewMode('rotate');
            viewModeRef.current = 'rotate';
          }}
          onToggleFullscreen={() => {
            if (!containerRef.current) return;
            if (!document.fullscreenElement) {
              containerRef.current.parentElement?.requestFullscreen?.();
            } else {
              document.exitFullscreen?.();
            }
          }}
          selectedComponent={selectedComponent}
          onSelectComponent={handleSelectComponent}
        />
      </div>

      {/* Top-Right Component Detail Panel (Opens when component is selected) */}
      {selectedComponent && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            zIndex: 20,
            pointerEvents: 'auto',
          }}
        >
          <ComponentDetailPanel
            component={selectedComponent}
            state={state}
            onClose={() => setSelectedComponent(null)}
          />
        </div>
      )}
    </div>
  );
};

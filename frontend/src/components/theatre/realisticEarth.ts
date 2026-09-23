import * as THREE from "three";

/* ─────────────────────────────────────────────────────────────
   PHOTOREALISTIC 3D SATELLITE EARTH ENGINE (NASA SPEC)
   Generates a high-fidelity satellite Earth with:
   1. Recognizable continental geography & bathymetric shelves
   2. Realistic vegetation, deserts (Sahara, Thar, Outback), ice caps
   3. True ocean specular reflectivity mask (sun glint on water)
   4. Elevation bump relief mapping on mountain ranges & coastlines
   5. Independent orbital cloud layer with realistic formations
   6. Physically believable directional sunlight & day/night terminator
   7. Delicate blue Rayleigh atmospheric scattering glow
   ───────────────────────────────────────────────────────────── */

interface LonLatPoly {
  points: [number, number][]; // [lon, lat]
  type: "land" | "desert" | "mountain" | "ice";
}

/* Precision Equirectangular Continental Shorelines */
const WORLD_GEOGRAPHY: LonLatPoly[] = [
  // ── AFRICA & MIDDLE EAST ──
  {
    type: "land",
    points: [
      [-5.5, 36.0], [10.5, 37.2], [24.0, 32.5], [32.0, 31.5], [34.5, 27.8], // Med coast
      [38.5, 22.0], [43.5, 12.5], [51.2, 11.8], [49.5, 8.5], [41.0, -2.0], // Red Sea & Horn of Africa
      [39.5, -5.0], [36.0, -18.0], [32.5, -28.5], [26.0, -33.8], [18.5, -34.8], // East coast to Cape
      [15.0, -29.0], [12.0, -17.5], [8.8, 4.0], [2.0, 6.2], [-5.0, 5.0], // West coast to Gulf of Guinea
      [-15.0, 11.0], [-17.5, 14.8], [-16.0, 21.0], [-10.0, 28.5], [-5.5, 36.0], // NW Africa
    ],
  },
  // Sahara Desert Overlay
  {
    type: "desert",
    points: [
      [-12.0, 29.0], [5.0, 32.0], [28.0, 30.5], [34.0, 26.0], [37.0, 18.0],
      [32.0, 14.0], [18.0, 15.0], [0.0, 16.0], [-13.0, 18.0], [-12.0, 29.0],
    ],
  },
  // Madagascar
  {
    type: "land",
    points: [
      [49.5, -12.0], [50.5, -16.0], [47.5, -25.2], [44.0, -25.5], [43.5, -16.5], [49.5, -12.0],
    ],
  },
  // Arabian Peninsula
  {
    type: "desert",
    points: [
      [34.5, 28.0], [40.0, 31.5], [48.0, 30.0], [50.5, 26.5], [56.5, 26.0],
      [59.8, 22.5], [55.0, 17.0], [45.0, 12.8], [43.2, 16.5], [34.5, 28.0],
    ],
  },

  // ── EURASIA ──
  {
    type: "land",
    points: [
      [-9.5, 37.0], [-9.0, 43.0], [-1.5, 43.5], [2.5, 51.0], [8.0, 55.0], // Iberia & France
      [12.0, 58.0], [18.0, 69.0], [28.0, 71.0], [45.0, 68.0], [68.0, 73.0], // Scandinavia & Arctic Russia
      [90.0, 75.0], [120.0, 74.0], [145.0, 72.0], [170.0, 67.0], [190.0, 65.0], // Siberia & Chukotka
      [175.0, 60.0], [158.0, 52.0], [142.0, 48.0], [130.0, 42.0], [126.0, 37.5], // Kamchatka, Sakhalin, Korea
      [120.0, 32.0], [118.0, 24.5], [108.0, 21.5], [105.0, 10.0], [100.0, 4.0], // East China, Indochina, Malacca
      [98.0, 16.0], [92.0, 21.0], // Myanmar & Bay of Bengal head
      // Indian Subcontinent (High-Precision Detailed Coastline)
      [89.5, 22.0], // Ganges Delta
      [86.0, 19.8], // Odisha coast
      [80.3, 13.0], // Chennai / Coromandel
      [77.5, 8.1],  // Kanyakumari (Southern Tip)
      [75.0, 13.0], // Malabar coast
      [72.8, 18.9], // Mumbai / Konkan
      [72.2, 21.5], // Gulf of Khambhat
      [70.0, 20.8], // Saurashtra South (Veraval)
      [69.0, 22.2], // Dwarka / Okha
      [70.0, 23.0], // Gulf of Kutch / Kandla
      [68.5, 23.8], // Kutch North (Koteshwar)
      [67.0, 24.8], // Indus Delta / Karachi
      // Makran coast & Persian Gulf
      [62.0, 25.2], [57.0, 26.5], [50.0, 30.0], [48.0, 31.0], [36.0, 35.5], [26.0, 40.5],
      [23.0, 38.0], [16.0, 41.0], [12.0, 44.0], [2.0, 42.0], [-5.0, 36.0], [-9.5, 37.0],
    ],
  },
  // Thar Desert (Gujarat/Rajasthan)
  {
    type: "desert",
    points: [
      [69.0, 23.5], [74.5, 28.5], [76.0, 27.0], [71.5, 23.8], [69.0, 23.5],
    ],
  },
  // Himalayan Mountain Ridge
  {
    type: "mountain",
    points: [
      [74.0, 35.0], [80.0, 31.0], [86.0, 28.0], [94.0, 28.5], [92.0, 31.5], [82.0, 34.0], [74.0, 35.0],
    ],
  },
  // Tibetan Plateau
  {
    type: "mountain",
    points: [
      [78.0, 34.0], [92.0, 32.0], [98.0, 35.0], [94.0, 38.0], [82.0, 37.5], [78.0, 34.0],
    ],
  },
  // Sri Lanka
  {
    type: "land",
    points: [
      [80.0, 9.8], [81.8, 7.5], [80.5, 6.0], [79.6, 7.8], [80.0, 9.8],
    ],
  },
  // British Isles
  {
    type: "land",
    points: [
      [-5.5, 50.0], [1.5, 52.5], [-2.0, 58.5], [-6.0, 56.5], [-5.5, 50.0],
    ],
  },
  // Japan (Honshu/Hokkaido)
  {
    type: "land",
    points: [
      [131.0, 33.5], [137.0, 35.0], [141.5, 41.0], [144.5, 44.0], [141.0, 45.0], [139.5, 37.0], [131.0, 33.5],
    ],
  },
  // Indonesia & Sunda Islands
  {
    type: "land",
    points: [
      [95.5, 5.5], [105.0, -6.0], [115.0, -8.5], [124.0, -9.0], [120.0, -5.0], [105.0, 0.0], [95.5, 5.5],
    ],
  },
  {
    type: "land",
    points: [
      [109.0, 1.0], [117.0, 4.5], [119.0, -3.0], [112.0, -4.0], [109.0, 1.0], // Borneo
    ],
  },

  // ── NORTH AMERICA ──
  {
    type: "land",
    points: [
      [-168.0, 65.5], [-150.0, 71.0], [-130.0, 70.0], [-95.0, 73.0], [-80.0, 62.0], // Alaska & Arctic
      [-64.0, 60.0], [-55.0, 50.0], [-66.0, 44.0], [-74.0, 40.5], [-80.0, 25.5], // Labrador, East Coast, Florida
      [-88.0, 30.0], [-97.0, 26.0], [-97.0, 19.0], [-87.0, 14.0], [-77.0, 8.0], // Gulf of Mexico & Central America
      [-85.0, 10.0], [-105.0, 20.0], [-110.0, 23.0], [-117.0, 32.5], [-124.0, 42.0], // Mexico & Pacific West
      [-128.0, 52.0], [-140.0, 60.0], [-160.0, 58.0], [-168.0, 65.5], // BC, Alaska Pacific
    ],
  },
  // Rocky Mountains
  {
    type: "mountain",
    points: [
      [-120.0, 55.0], [-112.0, 42.0], [-105.0, 35.0], [-110.0, 34.0], [-122.0, 48.0], [-120.0, 55.0],
    ],
  },
  // Greenland Ice Sheet
  {
    type: "ice",
    points: [
      [-44.0, 60.0], [-25.0, 70.0], [-18.0, 80.0], [-45.0, 83.5], [-60.0, 77.0], [-50.0, 65.0], [-44.0, 60.0],
    ],
  },

  // ── SOUTH AMERICA ──
  {
    type: "land",
    points: [
      [-77.0, 8.0], [-65.0, 11.0], [-50.0, 0.0], [-35.0, -5.5], [-38.0, -15.0], // North & Brazil Bulge
      [-45.0, -24.0], [-55.0, -34.0], [-65.0, -45.0], [-68.0, -55.0], [-75.0, -50.0], // Argentina to Cape Horn
      [-72.0, -35.0], [-76.0, -18.0], [-81.0, -5.0], [-80.0, 2.0], [-77.0, 8.0], // Chile & Peru West
    ],
  },
  // Andes Mountain Cordillera
  {
    type: "mountain",
    points: [
      [-76.0, 6.0], [-74.0, -12.0], [-69.0, -25.0], [-71.0, -45.0], [-74.0, -45.0], [-78.0, -10.0], [-76.0, 6.0],
    ],
  },

  // ── AUSTRALIA & NEW ZEALAND ──
  {
    type: "land",
    points: [
      [114.0, -22.0], [122.0, -16.5], [130.0, -12.0], [136.0, -12.0], [142.0, -11.0], // NW to Cape York
      [150.0, -22.0], [153.5, -28.0], [151.0, -34.0], [145.0, -38.5], [137.0, -35.0], // East Coast to Melbourne
      [125.0, -33.0], [115.0, -34.5], [113.0, -26.0], [114.0, -22.0], // Bight & West Coast
    ],
  },
  // Australian Outback (Red Desert Center)
  {
    type: "desert",
    points: [
      [120.0, -22.0], [138.0, -20.0], [142.0, -27.0], [130.0, -30.0], [120.0, -26.0], [120.0, -22.0],
    ],
  },
  // New Zealand
  {
    type: "land",
    points: [
      [172.0, -35.0], [178.0, -38.0], [175.0, -41.5], [170.0, -46.0], [166.5, -46.0], [172.0, -35.0],
    ],
  },

  // ── ANTARCTICA ──
  {
    type: "ice",
    points: [
      [-180.0, -70.0], [-120.0, -74.0], [-60.0, -64.0], [0.0, -70.0], [60.0, -68.0],
      [120.0, -66.0], [180.0, -72.0], [180.0, -90.0], [-180.0, -90.0], [-180.0, -70.0],
    ],
  },
];

/**
 * Procedural Earth Textures Generator (Diffuse Map, Specular Mask, Bump Elevation)
 */
export function generateRealisticEarthTextures(width = 2048, height = 1024): {
  diffuseTexture: THREE.CanvasTexture;
  specularTexture: THREE.CanvasTexture;
  bumpTexture: THREE.CanvasTexture;
} {
  // 1. Color Map Canvas
  const cvColor = document.createElement("canvas");
  cvColor.width = width;
  cvColor.height = height;
  const ctxColor = cvColor.getContext("2d")!;

  // 2. Specular Map Canvas (Oceans = White high glint, Land = Black matte)
  const cvSpec = document.createElement("canvas");
  cvSpec.width = width;
  cvSpec.height = height;
  const ctxSpec = cvSpec.getContext("2d")!;

  // 3. Bump Elevation Map Canvas
  const cvBump = document.createElement("canvas");
  cvBump.width = width;
  cvBump.height = height;
  const ctxBump = cvBump.getContext("2d")!;

  // Deep Navy Satellite Ocean Gradient
  const oceanGrad = ctxColor.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, "#030e20");    // Arctic ocean
  oceanGrad.addColorStop(0.25, "#041530"); // North temperate
  oceanGrad.addColorStop(0.5, "#062044");  // Equatorial tropics deep blue
  oceanGrad.addColorStop(0.75, "#041632"); // Southern ocean
  oceanGrad.addColorStop(1, "#020a18");    // Antarctic deep
  ctxColor.fillStyle = oceanGrad;
  ctxColor.fillRect(0, 0, width, height);

  // Specular initial ocean fill (100% white for water sun glint)
  ctxSpec.fillStyle = "#ffffff";
  ctxSpec.fillRect(0, 0, width, height);

  // Bump initial ocean fill (mid-gray flat sea level)
  ctxBump.fillStyle = "#808080";
  ctxBump.fillRect(0, 0, width, height);

  // Coordinate Conversion Helper: [lon, lat] -> [x, y] in equirectangular projection
  const toX = (lon: number) => ((lon + 180) / 360) * width;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  // Draw Shallow Continental Shelves & Coastal Water Tint
  WORLD_GEOGRAPHY.forEach((geo) => {
    if (geo.type === "land" || geo.type === "desert") {
      ctxColor.strokeStyle = "rgba(12, 65, 120, 0.4)";
      ctxColor.lineWidth = 14;
      ctxColor.beginPath();
      geo.points.forEach(([lon, lat], i) => {
        const x = toX(lon);
        const y = toY(lat);
        if (i === 0) ctxColor.moveTo(x, y);
        else ctxColor.lineTo(x, y);
      });
      ctxColor.closePath();
      ctxColor.stroke();
    }
  });

  // Render Continents, Deserts, Mountains & Ice
  WORLD_GEOGRAPHY.forEach((geo) => {
    // 1. Color Canvas
    ctxColor.beginPath();
    geo.points.forEach(([lon, lat], i) => {
      const x = toX(lon);
      const y = toY(lat);
      if (i === 0) ctxColor.moveTo(x, y);
      else ctxColor.lineTo(x, y);
    });
    ctxColor.closePath();

    switch (geo.type) {
      case "land":
        ctxColor.fillStyle = "#1e3b22"; // Natural vegetation dark green
        ctxColor.fill();
        break;
      case "desert":
        ctxColor.fillStyle = "#8a6d3c"; // Earthy ochre sand
        ctxColor.fill();
        break;
      case "mountain":
        ctxColor.fillStyle = "#4a3e2c"; // Alpine rock / ridge
        ctxColor.fill();
        break;
      case "ice":
        ctxColor.fillStyle = "#dce8f5"; // Polar glacier ice
        ctxColor.fill();
        break;
    }

    // 2. Specular Canvas (Land is non-reflective / black)
    ctxSpec.beginPath();
    geo.points.forEach(([lon, lat], i) => {
      const x = toX(lon);
      const y = toY(lat);
      if (i === 0) ctxSpec.moveTo(x, y);
      else ctxSpec.lineTo(x, y);
    });
    ctxSpec.closePath();
    ctxSpec.fillStyle = geo.type === "ice" ? "#222222" : "#000000";
    ctxSpec.fill();

    // 3. Bump Canvas (Elevation relief)
    ctxBump.beginPath();
    geo.points.forEach(([lon, lat], i) => {
      const x = toX(lon);
      const y = toY(lat);
      if (i === 0) ctxBump.moveTo(x, y);
      else ctxBump.lineTo(x, y);
    });
    ctxBump.closePath();
    ctxBump.fillStyle =
      geo.type === "mountain" ? "#ffffff" : geo.type === "desert" ? "#b0b0b0" : geo.type === "ice" ? "#d0d0d0" : "#999999";
    ctxBump.fill();
  });

  // Micro-Texture Noise for Terrestrial Realism
  const imgData = ctxColor.getImageData(0, 0, width, height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isLand = g > b; // Vegetation or desert detection
    if (isLand) {
      const noise = (Math.random() - 0.5) * 12;
      data[i] = Math.max(0, Math.min(255, r + noise));
      data[i + 1] = Math.max(0, Math.min(255, g + noise));
      data[i + 2] = Math.max(0, Math.min(255, b + noise));
    }
  }
  ctxColor.putImageData(imgData, 0, 0);

  const diffuseTexture = new THREE.CanvasTexture(cvColor);
  diffuseTexture.colorSpace = THREE.SRGBColorSpace;

  const specularTexture = new THREE.CanvasTexture(cvSpec);
  const bumpTexture = new THREE.CanvasTexture(cvBump);

  return { diffuseTexture, specularTexture, bumpTexture };
}

/**
 * Procedural Realistic Cloud Formations Texture
 */
export function generateRealisticCloudTexture(width = 2048, height = 1024): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = width;
  cv.height = height;
  const ctx = cv.getContext("2d")!;

  ctx.clearRect(0, 0, width, height);

  // Equatorial Intertropical Convergence Zone (ITCZ) Cloud Bands
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * width;
    const y = height * 0.44 + (Math.random() - 0.5) * 80;
    const rw = 90 + Math.random() * 160;
    const rh = 12 + Math.random() * 22;
    const alpha = 0.25 + Math.random() * 0.35;

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rw, rh, (Math.random() - 0.5) * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mid-Latitude Cyclonic Swirls & Fronts
  for (let i = 0; i < 45; i++) {
    const x = Math.random() * width;
    const isNorth = Math.random() > 0.5;
    const y = isNorth ? height * 0.28 + (Math.random() - 0.5) * 70 : height * 0.72 + (Math.random() - 0.5) * 70;
    const rw = 110 + Math.random() * 190;
    const rh = 18 + Math.random() * 32;
    const alpha = 0.22 + Math.random() * 0.32;

    ctx.fillStyle = `rgba(245, 250, 255, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rw, rh, isNorth ? 0.35 : -0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wispy Cirrus Strands
  ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * width;
    const y = 80 + Math.random() * (height - 160);
    ctx.beginPath();
    ctx.arc(x, y, 20 + Math.random() * 45, 0, Math.PI * 2);
    ctx.fill();
  }

  const cloudTex = new THREE.CanvasTexture(cv);
  return cloudTex;
}

/**
 * Assembles the Complete Realistic 3D Earth Globe System
 */
export function buildRealisticEarthSystem(globeRadius: number): {
  earthMesh: THREE.Mesh;
  cloudMesh: THREE.Mesh;
  atmosphereMesh: THREE.Mesh;
  sunLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
} {
  const { diffuseTexture, specularTexture, bumpTexture } = generateRealisticEarthTextures();
  const cloudTexture = generateRealisticCloudTexture();

  // 1. Earth Sphere Mesh (MeshStandardMaterial with Specular/Roughness & Bump Relief)
  const earthGeo = new THREE.SphereGeometry(globeRadius, 96, 96);
  const earthMat = new THREE.MeshStandardMaterial({
    map: diffuseTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.08,
    roughnessMap: specularTexture, // Ocean specular mask
    roughness: 0.85,
    metalness: 0.12,
  });
  const earthMesh = new THREE.Mesh(earthGeo, earthMat);

  // 2. Separate Orbital Cloud Sphere Mesh (True 3D Parallax above Earth Surface)
  const cloudGeo = new THREE.SphereGeometry(globeRadius * 1.012, 64, 64);
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    roughness: 0.9,
    metalness: 0.0,
  });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);

  // 3. Delicate Blue Atmospheric Glow Rim (Rayleigh Scattering Shader)
  const atmoGeo = new THREE.SphereGeometry(globeRadius * 1.028, 64, 64);
  const atmoMat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main(){
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main(){
        vec3 viewDir = normalize(vViewPosition);
        float edge = 1.0 - max(dot(viewDir, vNormal), 0.0);
        float intensity = pow(edge, 3.6) * 1.4;
        gl_FragColor = vec4(0.18, 0.62, 1.0, 1.0) * intensity;
      }
    `,
  });
  const atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);

  // 4. Physically Believable Directional Sunlight (Day/Night Terminator)
  const sunLight = new THREE.DirectionalLight(0xfff6ea, 2.9);
  sunLight.position.set(32, 10, 24);

  // 5. Deep Space Ambient Lighting (Keeps Night Hemisphere Dark & Moody)
  const ambientLight = new THREE.AmbientLight(0x061426, 0.45);

  return {
    earthMesh,
    cloudMesh,
    atmosphereMesh,
    sunLight,
    ambientLight,
  };
}

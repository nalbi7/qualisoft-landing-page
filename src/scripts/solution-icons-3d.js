// 솔루션별 부드러운 3D 아이콘 — Web-Transition-Lab sandbox/Docs/_design/lab-sandbox.js 188~501행(2026-10-30 판)을 그대로 옮겼다 (D-021, BD-002).
// THREE 를 인자로 받는다 — 호출하는 쪽이 three 를 늦게 불러온다(solutions-v7.ts). 그룹 순서는 홈 제품 순서와 같다: CRM · PO · CI · BI · PP · Copilot
// Helper: Create soft beveled 3D rounded box geometry (Fluent 3D clay/acrylic style)
function createSoftBoxGeo(THREE, w, h, depth, radius) {
  var shape = new THREE.Shape();
  var x = -w / 2;
  var y = -h / 2;
  var r = Math.min(radius, w / 2, h / 2);
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  var bevel = Math.min(depth * 0.32, r * 0.45, 0.12);
  var geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, depth - bevel * 2),
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 20
  });
  geo.center();
  return geo;
}

// Helper: Soft tactile clay / frosted satin material (Matte, zero clearcoat glare, vibrant pigment)
function makeSoftMat(THREE, hex, opts) {
  opts = opts || {};
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex),
    roughness: opts.roughness !== undefined ? opts.roughness : 0.65,
    metalness: opts.metalness !== undefined ? opts.metalness : 0.0,
    clearcoat: opts.clearcoat !== undefined ? opts.clearcoat : 0.0,
    clearcoatRoughness: 0.85,
    transmission: 0,
    transparent: !!opts.transparent,
    opacity: opts.opacity !== undefined ? opts.opacity : 1.0,
    emissive: new THREE.Color(opts.emissive || hex),
    emissiveIntensity: opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0.08
  });
}

// Build the 6 intuitive, soft matte 3D solution icons (Toned up according to 디자인-방향.md)
export function buildSoftSolutionIcons(THREE) {
  var groups = [];

  // -------------------------------------------------------------------------
  // ICON 0: Dynamics 365 CRM — Soft Stacked Customer Profile Card + Avatar Bust + Bubble
  // -------------------------------------------------------------------------
  var gCrm = new THREE.Group();
  var matLavender = makeSoftMat(THREE, '#A292FF', { roughness: 0.65 });
  var matDeepViolet = makeSoftMat(THREE, '#4F46E5', { roughness: 0.62 });
  var matWhiteCard = makeSoftMat(THREE, '#FFFFFF', { roughness: 0.68 });
  var matPink = makeSoftMat(THREE, '#FF6DBE', { roughness: 0.65 });
  var matSky = makeSoftMat(THREE, '#38BDF8', { roughness: 0.65 });

  // Back stacked card
  var backCard = new THREE.Mesh(createSoftBoxGeo(THREE, 2.25, 1.52, 0.16, 0.28), matLavender);
  backCard.position.set(-0.14, -0.14, -0.24);
  backCard.rotation.z = 0.06;
  gCrm.add(backCard);

  // Main front customer card
  var frontCard = new THREE.Mesh(createSoftBoxGeo(THREE, 2.3, 1.56, 0.18, 0.28), matWhiteCard);
  gCrm.add(frontCard);

  // Avatar badge circle on left of card
  var badgeDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 32), matLavender);
  badgeDisc.rotation.x = Math.PI / 2;
  badgeDisc.position.set(-0.52, 0.04, 0.12);
  gCrm.add(badgeDisc);

  // Soft 3D Person Head + Shoulders inside Avatar badge
  var personHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 28, 28), matDeepViolet);
  personHead.position.set(-0.52, 0.17, 0.21);
  gCrm.add(personHead);

  var personBody = new THREE.Mesh(createSoftBoxGeo(THREE, 0.44, 0.24, 0.12, 0.11), matDeepViolet);
  personBody.position.set(-0.52, -0.12, 0.20);
  gCrm.add(personBody);

  // 2 rounded record lines on right of card
  var line1 = new THREE.Mesh(createSoftBoxGeo(THREE, 0.92, 0.18, 0.1, 0.08), matDeepViolet);
  line1.position.set(0.46, 0.22, 0.14);
  gCrm.add(line1);

  var line2 = new THREE.Mesh(createSoftBoxGeo(THREE, 0.68, 0.16, 0.1, 0.08), matLavender);
  line2.position.set(0.34, -0.08, 0.14);
  gCrm.add(line2);

  // Floating soft pink chat/connection pill at top-right (floats in animation)
  var chatBubble = new THREE.Mesh(createSoftBoxGeo(THREE, 0.68, 0.46, 0.18, 0.2), matPink);
  chatBubble.position.set(0.96, 0.68, 0.28);
  chatBubble.rotation.z = -0.1;
  chatBubble.userData.floatSpeed = 1.8;
  chatBubble.userData.baseY = 0.68;
  gCrm.add(chatBubble);

  // Floating sky sphere at bottom-left
  var crmOrb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 28, 28), matSky);
  crmOrb.position.set(-1.12, -0.62, 0.24);
  crmOrb.userData.floatSpeed = 2.2;
  crmOrb.userData.baseY = -0.62;
  gCrm.add(crmOrb);

  groups.push(gCrm);

  // -------------------------------------------------------------------------
  // ICON 1: Project Operations — Soft Gantt Schedule Board + 3 Pill Bars + Milestone Badge
  // -------------------------------------------------------------------------
  var gPo = new THREE.Group();
  var matRoseLight = makeSoftMat(THREE, '#FFE2F2', { roughness: 0.66 });
  var matRoseDeep = makeSoftMat(THREE, '#FF3385', { roughness: 0.64 });
  var matIndigo = makeSoftMat(THREE, '#4640DE', { roughness: 0.62 });

  var poBoard = new THREE.Mesh(createSoftBoxGeo(THREE, 2.4, 1.65, 0.18, 0.3), matRoseLight);
  gPo.add(poBoard);

  // 3 plump horizontal Gantt timeline bars
  var gBar1 = new THREE.Mesh(createSoftBoxGeo(THREE, 1.15, 0.24, 0.16, 0.11), matRoseDeep);
  gBar1.position.set(-0.38, 0.42, 0.15);
  gPo.add(gBar1);

  var gBar2 = new THREE.Mesh(createSoftBoxGeo(THREE, 1.35, 0.24, 0.16, 0.11), matPink);
  gBar2.position.set(0.05, 0.02, 0.15);
  gPo.add(gBar2);

  var gBar3 = new THREE.Mesh(createSoftBoxGeo(THREE, 1.05, 0.24, 0.16, 0.11), matLavender);
  gBar3.position.set(0.35, -0.38, 0.15);
  gPo.add(gBar3);

  // Vertical Indigo "Today" marker pill
  var todayLine = new THREE.Mesh(createSoftBoxGeo(THREE, 0.09, 1.36, 0.2, 0.04), matIndigo);
  todayLine.position.set(0.18, 0.02, 0.2);
  gPo.add(todayLine);

  // Floating soft-beveled Milestone Diamond at bottom-right
  var milestoneDiamond = new THREE.Mesh(createSoftBoxGeo(THREE, 0.56, 0.56, 0.22, 0.14), matIndigo);
  milestoneDiamond.rotation.z = Math.PI / 4;
  milestoneDiamond.position.set(1.02, -0.56, 0.34);
  milestoneDiamond.userData.floatSpeed = 2.0;
  milestoneDiamond.userData.baseY = -0.56;
  gPo.add(milestoneDiamond);

  groups.push(gPo);

  // -------------------------------------------------------------------------
  // ICON 2: Customer Insights — Soft 3-Tier Funnel Rings + Colorful Customer Spheres
  // -------------------------------------------------------------------------
  var gCi = new THREE.Group();
  var matCyan = makeSoftMat(THREE, '#38BDF8', { roughness: 0.65 });
  var matCyanDeep = makeSoftMat(THREE, '#0284C7', { roughness: 0.63 });
  var matGold = makeSoftMat(THREE, '#FBBF24', { roughness: 0.65 });
  var matMint = makeSoftMat(THREE, '#10B981', { roughness: 0.65 });

  // 3 plump horizontal funnel torus rings tapering down
  var ringSpecs = [
    { r: 0.92, tube: 0.15, y: 0.38, mat: matCyan },
    { r: 0.64, tube: 0.14, y: -0.02, mat: matCyanDeep },
    { r: 0.38, tube: 0.12, y: -0.38, mat: matCyan }
  ];
  ringSpecs.forEach(function (s) {
    var torus = new THREE.Mesh(new THREE.TorusGeometry(s.r, s.tube, 24, 64), s.mat);
    torus.rotation.x = Math.PI / 2.25;
    torus.position.y = s.y;
    gCi.add(torus);
  });

  // 3 incoming customer spheres floating above funnel
  var inSpheres = [
    { x: -0.55, y: 0.86, z: 0.15, r: 0.19, mat: matLavender, spd: 1.9 },
    { x: 0.08,  y: 0.98, z: -0.1, r: 0.22, mat: matPink,     spd: 2.3 },
    { x: 0.58,  y: 0.82, z: 0.18, r: 0.18, mat: matGold,     spd: 1.7 }
  ];
  inSpheres.forEach(function (sp) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(sp.r, 28, 28), sp.mat);
    m.position.set(sp.x, sp.y, sp.z);
    m.userData.floatSpeed = sp.spd;
    m.userData.baseY = sp.y;
    gCi.add(m);
  });

  // Unified output profile sphere at bottom
  var outSphere = new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 32), matIndigo);
  outSphere.position.set(0, -0.82, 0.12);
  outSphere.userData.floatSpeed = 1.5;
  outSphere.userData.baseY = -0.82;
  gCi.add(outSphere);

  groups.push(gCi);

  // -------------------------------------------------------------------------
  // ICON 3: Power BI · Fabric — Soft Rising 3D Bar Chart + Floating Trend Line Nodes
  // -------------------------------------------------------------------------
  var gBi = new THREE.Group();
  var matGoldLight = makeSoftMat(THREE, '#FEF3C7', { roughness: 0.66 });
  var matGoldMid = makeSoftMat(THREE, '#FBBF24', { roughness: 0.64 });
  var matGoldRich = makeSoftMat(THREE, '#F59E0B', { roughness: 0.63 });

  // Soft base slab
  var biBase = new THREE.Mesh(createSoftBoxGeo(THREE, 2.35, 0.24, 0.9, 0.11), matGoldLight);
  biBase.position.set(0, -0.78, 0);
  gBi.add(biBase);

  // 4 plump rising 3D bars
  var barHeights = [0.65, 0.98, 0.84, 1.42];
  var barMats = [matGoldMid, matGoldRich, matGoldMid, matIndigo];
  var nodePositions = [];
  for (var bIdx = 0; bIdx < 4; bIdx++) {
    var bh = barHeights[bIdx];
    var bx = -0.78 + bIdx * 0.52;
    var by = -0.66 + bh / 2;
    var barMesh = new THREE.Mesh(createSoftBoxGeo(THREE, 0.36, bh, 0.36, 0.1), barMats[bIdx]);
    barMesh.position.set(bx, by, 0);
    gBi.add(barMesh);
    nodePositions.push(new THREE.Vector3(bx, -0.66 + bh + 0.28, 0.24));
  }

  // Smooth 3D Trend Line + Spherical Data Nodes floating above bars
  var trendGroup = new THREE.Group();
  trendGroup.userData.floatSpeed = 1.8;
  trendGroup.userData.baseY = 0;
  var curve = new THREE.CatmullRomCurve3(nodePositions);
  var tubeGeo = new THREE.TubeGeometry(curve, 32, 0.055, 16, false);
  var tubeMesh = new THREE.Mesh(tubeGeo, matWhiteCard);
  trendGroup.add(tubeMesh);

  nodePositions.forEach(function (np, idx) {
    var nodeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 24, 24),
      idx === 3 ? matIndigo : matGoldRich
    );
    nodeSphere.position.copy(np);
    trendGroup.add(nodeSphere);
  });
  gBi.add(trendGroup);

  groups.push(gBi);

  // -------------------------------------------------------------------------
  // ICON 4: Power Platform — 2x2 Interlocking Soft App Tile Blocks
  // -------------------------------------------------------------------------
  var gPp = new THREE.Group();
  var matMintDeep = makeSoftMat(THREE, '#059669', { roughness: 0.63 });

  var tiles = [
    { x: -0.46, y: 0.44,  z: 0,    mat: matMint,     float: false },
    { x: 0.46,  y: 0.52,  z: 0.18, mat: matIndigo,   float: true  }, // Floating 4th block snapping in
    { x: -0.46, y: -0.46, z: 0,    mat: matSky,      float: false },
    { x: 0.46,  y: -0.46, z: 0,    mat: matMintDeep, float: false }
  ];

  tiles.forEach(function (t) {
    var tileGrp = new THREE.Group();
    tileGrp.position.set(t.x, t.y, t.z);
    var cube = new THREE.Mesh(createSoftBoxGeo(THREE, 0.78, 0.78, 0.32, 0.2), t.mat);
    tileGrp.add(cube);
    var innerCap = new THREE.Mesh(createSoftBoxGeo(THREE, 0.36, 0.36, 0.1, 0.1), matWhiteCard);
    innerCap.position.z = 0.16;
    tileGrp.add(innerCap);
    if (t.float) {
      tileGrp.userData.floatSpeed = 2.1;
      tileGrp.userData.baseY = t.y;
      tileGrp.rotation.z = -0.08;
    }
    gPp.add(tileGrp);
  });

  groups.push(gPp);

  // -------------------------------------------------------------------------
  // ICON 5: Copilot — Soft Satin AI Core Sphere + Tilted Orbital Ring + Sparkle Diamonds
  // -------------------------------------------------------------------------
  var gCop = new THREE.Group();
  var matCopCore = makeSoftMat(THREE, '#8B5CF6', { roughness: 0.65 });
  var matCopRing = makeSoftMat(THREE, '#38BDF8', { roughness: 0.65 });

  var copSphere = new THREE.Mesh(new THREE.SphereGeometry(0.68, 36, 36), matCopCore);
  gCop.add(copSphere);

  var copRing = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.085, 24, 72), matCopRing);
  copRing.rotation.x = 1.18;
  copRing.rotation.y = -0.26;
  gCop.add(copRing);

  var copMoon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 28), matPink);
  copMoon.position.set(0.98, 0.36, 0.28);
  copMoon.userData.floatSpeed = 2.1;
  copMoon.userData.baseY = 0.36;
  gCop.add(copMoon);

  var spark1 = new THREE.Mesh(createSoftBoxGeo(THREE, 0.32, 0.32, 0.14, 0.09), matWhiteCard);
  spark1.rotation.z = Math.PI / 4;
  spark1.position.set(-0.88, 0.62, 0.24);
  spark1.userData.floatSpeed = 1.9;
  spark1.userData.baseY = 0.62;
  gCop.add(spark1);

  var spark2 = new THREE.Mesh(createSoftBoxGeo(THREE, 0.24, 0.24, 0.12, 0.07), matGold);
  spark2.rotation.z = Math.PI / 4;
  spark2.position.set(-0.72, -0.58, 0.22);
  spark2.userData.floatSpeed = 2.4;
  spark2.userData.baseY = -0.58;
  gCop.add(spark2);

  groups.push(gCop);

  return groups;
}

import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

// Para ver como funciona Three.js
// https://threejs.org/manual/#en/installation

// Para ver como funciona Mesh, BoxGeometry y MeshStandardMaterial
// https://threejs.org/docs/#api/en/objects/Mesh
// https://threejs.org/docs/#api/en/geometries/BoxGeometry
// https://threejs.org/docs/#api/en/materials/MeshStandardMaterial

// Esto es para generar las cajas que usamos en las estanterías
export function spawnBox(scene, pos, color = 0xff6633, size = 0.9, opacity = 1) {
  const mat = new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.position.copy(pos);
  scene.add(mesh);
  return mesh;
}

// Esto es para cambiar la opacidad de las cajas dependiendo del signo de los valores
export function setOpacityBySign(mesh, rx, ry, rz) {
  const neg = (rx < 0) || (ry < 0) || (rz < 0);
  mesh.material.transparent = true;
  mesh.material.opacity = neg ? 0.5 : 1.0;
}

// Esto es para limpiar las cajas que ya no se necesitan
export function clearPickables(scene, pickables) {
  while (pickables.length) {
    const m = pickables.pop();
    scene.remove(m);
    m.geometry.dispose?.();
    m.material.dispose?.();
  }
}

// Esto se encarga de llenar la estantería Z con cajas
export function fillZBoxes(scene, zAnchors, pickables, tmpV) {
  const zFillIdx = [0, 1, 2, 3, 5, 6, 7, 8];
  zFillIdx.forEach(i => {
    zAnchors[i].getWorldPosition(tmpV);
    pickables.push(spawnBox(scene, tmpV, 0xff2b2b));
  });
}

// Esto se encarga de mover las cajas a la otra matriz y genera una especie de animación
export function moveBoxAlongPath(box, pathPoints, seconds = 0.8) {
  let t = 0, seg = 0;
  const segCount = pathPoints.length - 1;
  if (segCount <= 0) return Promise.resolve();

  return new Promise(resolve => {
    let last = performance.now();
    function loop(now) {
      const dt = (now - last) / 1000; last = now;
      t += dt / (seconds / segCount);
      if (t > 1) t = 1;

      const a = pathPoints[seg], b = pathPoints[seg + 1];
      box.position.lerpVectors(a, b, t);

      if (t >= 1) {
        seg++; t = 0;
        if (seg >= segCount) { resolve(); return; }
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  });
}


// Colorea en un gradiente HSL para distinguirlas
export function colorByIndex(i, n) {
  const hue = (i / Math.max(1, n)) * 0.9;
  return new THREE.Color().setHSL(hue, 0.85, 0.55);
}

// Esto es para controlar el orden de las filas y columnas de la matriz Z
const FLIP_Z_ROWS = true;
const FLIP_Z_COLS = true;

// Esta función construye las cajas de la matriz Z a partir de los anclajes y los valores Z
export function buildBoxesFromZ(scene, zAnchorsOrdered, Z, pickables, tmpV, shelfZ) {
  clearPickables(scene, pickables);

  let k = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++, k++) {

      const rr = FLIP_Z_ROWS ? (2 - r) : r;
      const cc = FLIP_Z_COLS ? (2 - c) : c;

      const v = Number(Z?.[rr]?.[cc]) || 0;
      if (v === 0) continue;

      const anchor = zAnchorsOrdered[k];

      anchor.getWorldPosition(tmpV);

      const color = colorByIndex(pickables.length, 9);
      const box = spawnBox(scene, tmpV, color);

      setOpacityBySign(box, v);
      box.userData.signZ = Math.sign(v);

      const pLocal = anchor.getWorldPosition(new THREE.Vector3());
      shelfZ.worldToLocal(pLocal);
      box.userData.zLocal = pLocal.clone();

      pickables.push(box);
    }
  }
}

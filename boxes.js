import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

// Para ver como funciona Three.js
// https://threejs.org/manual/#en/installation

// Para ver como funciona Mesh, BoxGeometry y MeshStandardMaterial
// https://threejs.org/docs/#api/en/objects/Mesh
// https://threejs.org/docs/#api/en/geometries/BoxGeometry
// https://threejs.org/docs/#api/en/materials/MeshStandardMaterial

// Esto es para generar las cajas que usamos en las estanterías
export function spawnBox(scene, pos, color = 0xff6633, size = 0.9) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.position.copy(pos);
  scene.add(mesh);
  return mesh;
}

// Esto se encarga de llenar la estantería Z con cajas
export function fillZBoxes(scene, zAnchors, pickables, tmpV) {
  // Llenar Z evitando el centro (La idea es generarlos de forma aleatoria basado en la matriz)
  const zFillIdx = [0, 1, 2, 3, 5, 6, 7, 8];
  zFillIdx.forEach(i => {
    zAnchors[i].getWorldPosition(tmpV);
    pickables.push(spawnBox(scene, tmpV, 0xff2b2b));
  });
}

// Esto es para agarrar las cajas, pero no funciona, así que esto hay que borrarlo
export function tryPick(claw, pickables, carriedRef, clawOpen) {
  if (!clawOpen || carriedRef.current) return;
  let best = null, bestDist = 1e9;
  for (const b of pickables) {
    const dist = b.position.distanceTo(claw.position);
    if (dist < 0.6 && dist < bestDist) { best = b; bestDist = dist; }
  }
  if (best) carriedRef.current = best;
}

// Esto es para soltar las cajas, pero no funciona, así que esto hay que borrarlo
export function tryPlace(claw, snapTargets, carriedRef, tmpV) {
  if (!carriedRef.current) return;
  let bestPos = null, bestDist = 1e9;
  for (const a of snapTargets) {
    a.getWorldPosition(tmpV);
    const d = tmpV.distanceTo(claw.position);
    if (d < bestDist) { bestPos = tmpV.clone(); bestDist = d; }
  }
  if (bestPos) carriedRef.current.position.copy(bestPos);
  carriedRef.current = null;
}

// Esto es para alinear todas las cajas
export function snapAll(pickables, snapTargets, tmpV) {
  for (const b of pickables) {
    let bestPos = null, bestDist = 1e9;
    for (const a of snapTargets) {
      a.getWorldPosition(tmpV);
      const d = tmpV.distanceTo(b.position);
      if (d < bestDist) { bestPos = tmpV.clone(); bestDist = d; }
    }
    if (bestPos) b.position.copy(bestPos);
  }
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

// Esto calcula donde deben ir las cajas en la matriz X
export async function moveAllZtoX(pickables, xAnchors, tmpV, lift = 1.4) {
  const dst = xAnchors.map(a => { a.getWorldPosition(tmpV); return tmpV.clone(); }).sort((p, q) => (q.y - p.y) || (p.z - q.z));
  const n = Math.min(pickables.length, dst.length);
  for (let i = 0; i < n; i++) {
    const box = pickables[i];
    const from = box.position.clone();
    const to = dst[i].clone();
    const mid1 = from.clone(); mid1.y += lift;
    const mid2 = to.clone(); mid2.y += lift;
    await moveBoxAlongPath(box, [from, mid1, mid2, to], 0.9);
  }
}

// Esto es lo mismo que el anterior, pero sin animación
export function snapAllToX(pickables, xAnchors, tmpV) {
  const dst = xAnchors.map(a => { a.getWorldPosition(tmpV); return tmpV.clone(); });
  const n = Math.min(pickables.length, dst.length);
  for (let i = 0; i < n; i++) pickables[i].position.copy(dst[i]);
}

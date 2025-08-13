import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';

// Para ver como funciona Three.js
// https://threejs.org/manual/#en/installation

// Para ver como funciona Group
// https://threejs.org/docs/#api/en/objects/Group

// Para ver como funciona BoxGeometry, EdgesGeometry, LineBasicMaterial y LineSegments
// https://threejs.org/docs/#api/en/geometries/BoxGeometry
// https://threejs.org/docs/#api/en/geometries/EdgesGeometry
// https://threejs.org/docs/#api/en/materials/LineBasicMaterial
// https://threejs.org/docs/#api/en/objects/LineSegments

// Para ver como funciona Object3D
// https://threejs.org/docs/#api/en/geometries/BoxGeometry

// Para ver como funciona Vector3 y Matrix4
// https://threejs.org/docs/#api/en/math/Vector3
// https://threejs.org/docs/#api/en/math/Matrix4


export function createShelves(scene, { unit = 1.2, shelfY = 0.6 } = {}) {
  const snapTargets = [];              // anclas Object3D (para snap)
  const shelfZ = new THREE.Group();    // Estantería en +Z (plano XY)
  const shelfX = new THREE.Group();    // Estantería en +X (plano YZ)
  scene.add(shelfZ, shelfX);

  // ==== POSICIONES DE LOS GRUPOS ====
  // Configurar la psoicion de la estantería Z
  shelfZ.position.set(-0.8, 0.8, 1.1);
  shelfZ.rotation.y = Math.PI / 2;

  // Configurar la posición de la estantería X
  shelfX.position.set(1.7, 1.05, -0.5);
  shelfX.rotation.y = Math.PI / 2;

  // Creación del marco de las celdas
  function makeCellFrame(size = 1) {
    const g = new THREE.BoxGeometry(size, size, size);
    const e = new THREE.EdgesGeometry(g);
    const m = new THREE.LineBasicMaterial({ color: 0x777777 });
    return new THREE.LineSegments(e, m);
  }

  // Con esto podemos crear una estantería de 3x3
  function buildShelf({ group, axis = 'z', size = 3, origin = new THREE.Vector3(), vertical = true }) {
    const anchors = [];
    const half = (size - 1) / 2;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let cx, cy, cz;
        if (vertical) {
          if (axis === 'z') { // Z fijo: columnas en X, filas en Y
            cx = origin.x + (j - half) * unit;
            cy = origin.y + (i - half) * unit;
            cz = origin.z;
          } else {            // X fijo: columnas en Z, filas en Y  ← (ESTANTERÍA X)
            cx = origin.x;
            cy = origin.y + (i - half) * unit;
            cz = origin.z + (j - half) * unit;
          }
        } else {
          if (axis === 'z') { cx = origin.x + (i - half) * unit; cy = origin.y; cz = origin.z + (j - half) * unit; }
          else { cx = origin.x + (j - half) * unit; cy = origin.y; cz = origin.z + (i - half) * unit; }
        }
        const anchor = new THREE.Object3D();
        anchor.position.set(cx, cy, cz);
        group.add(anchor);
        anchors.push(anchor);
        snapTargets.push(anchor);
        anchor.add(makeCellFrame(1.0));
      }
    }
    return anchors;
  }

  // Creamos la estantería en Z
  const zAnchors = buildShelf({
    group: shelfZ,
    axis: 'z',
    size: 3,
    origin: new THREE.Vector3(0, shelfY, 0),
    vertical: true
  });

  // Con esto creamos la estantería en X, el por defecto es 3x3
  let xAnchors = [];
  function buildXShelf(mode = '3x3') {

    // Limpiar estantería X
    while (shelfX.children.length) shelfX.remove(shelfX.children[0]);
    for (let i = snapTargets.length - 1; i >= 0; i--) {
      if (snapTargets[i].parent === shelfX) snapTargets.splice(i, 1);
    }

    const base = new THREE.Vector3(0, shelfY, 0);
    if (mode === '3x3') {
      xAnchors = buildShelf({ group: shelfX, axis: 'x', size: 3, origin: base, vertical: true });
    } else {
      const anchor = new THREE.Object3D();
      anchor.position.copy(base);
      shelfX.add(anchor);
      xAnchors = [anchor];
      snapTargets.push(anchor);
      anchor.add(makeCellFrame(1.0));
    }
    return xAnchors;
  }

  // Contruimos la estantería X
  buildXShelf('3x3');

  return {
    shelfZ, shelfX,
    zAnchors, xAnchors,
    buildXShelf,
    snapTargets
  };
}

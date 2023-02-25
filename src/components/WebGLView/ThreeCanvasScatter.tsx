import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import * as THREE from 'three';
import { selectNodes } from '../Store/NodeSlice';
import { selectEdges } from '../Store/EdgeSlice';

// Reasmouable defaults
const PIXEL_STEP = 10;
const LINE_HEIGHT = 40;
const PAGE_HEIGHT = 800;

function normalizeWheel(/* object */ event) /* object */ {
  let sX = 0;
  let sY = 0; // spinX, spinY
  let pX = 0;
  let pY = 0; // pixelX, pixelY

  // Legacy
  if ('detail' in event) {
    sY = event.detail;
  }
  if ('wheelDelta' in event) {
    sY = -event.wheelDelta / 120;
  }
  if ('wheelDeltaY' in event) {
    sY = -event.wheelDeltaY / 120;
  }
  if ('wheelDeltaX' in event) {
    sX = -event.wheelDeltaX / 120;
  }

  // side scrolling on FF with DOMMouseScroll
  if ('axis' in event && event.axis === event.HORIZONTAL_AXIS) {
    sX = sY;
    sY = 0;
  }

  pX = sX * PIXEL_STEP;
  pY = sY * PIXEL_STEP;

  if ('deltaY' in event) {
    pY = event.deltaY;
  }
  if ('deltaX' in event) {
    pX = event.deltaX;
  }

  if ((pX || pY) && event.deltaMode) {
    if (event.deltaMode === 1) {
      // delta in LINE units
      pX *= LINE_HEIGHT;
      pY *= LINE_HEIGHT;
    } else {
      // delta in PAGE units
      pX *= PAGE_HEIGHT;
      pY *= PAGE_HEIGHT;
    }
  }

  // Fall-back if spin cannot be determined
  if (pX && !sX) {
    sX = pX < 1 ? -1 : 1;
  }
  if (pY && !sY) {
    sY = pY < 1 ? -1 : 1;
  }

  return { spinX: sX, spinY: sY, pixelX: pX, pixelY: pY };
}

// function onClick(event: MouseEvent, canvasRef, raycaster, camera, scene) {
//   const canvas = canvasRef.current;
//   const rect = canvas?.getBoundingClientRect();
//   if (!canvas || !rect) return;

//   const mouse = new THREE.Vector2();
//   mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
//   mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

//   raycaster.setFromCamera(mouse, camera);

//   const intersects = raycaster.intersectObjects(scene.children, true);

//   if (intersects.length > 0) {
//     // The first intersection is the closest
//     const intersect = intersects[0];
//     const { object } = intersect;

//     // Change the attribute of the object here
//     // For example, change the size:
//     object.size = 1;
//   }
// }

// function onMouseMove(event: MouseEvent, canvasRef, raycaster, camera, scene) {
//   const canvas = canvasRef.current;
//   const rect = canvas?.getBoundingClientRect();
//   if (!canvas || !rect) return;

//   const mouse = new THREE.Vector2();
//   mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
//   mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

//   raycaster.setFromCamera(mouse, camera);

//   const intersects = raycaster.intersectObjects(scene.children, true);

//   if (intersects.length > 0) {
//     // The first intersection is the closest
//     const intersect = intersects[0];
//     const { object } = intersect;

//     // Change the attribute of the object here
//     // For example, change the color:
//     const material = object.material as THREE.MeshBasicMaterial;
//     material.color.set(0xff0000);
//   }
// }

/**
 * TODO - do this the first time the data is loaded and store the result in the store
 *
 * */
function getMinMaxPositions(data) {
  let minX = Number.MAX_VALUE;
  let minY = Number.MAX_VALUE;
  let maxX = Number.MIN_VALUE;
  let maxY = Number.MIN_VALUE;

  data.forEach(({ x, y }) => {
    if (x < minX) {
      minX = x;
    }
    if (y < minY) {
      minY = y;
    }
    if (x > maxX) {
      maxX = x;
    }
    if (y > maxY) {
      maxY = y;
    }
  });

  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
  };
}

/**
 *
 * @param data contains x1, y1, x2, y2
 * @param min contains min.x and min.y
 * @param max contains max.x and max.y
 * @returns the normalized positions
 */
function normalizedEdgePositions(data, min, max) {
  const normalizedPositions = [];

  data.forEach(({ x1, y1, x2, y2 }) => {
    const nx1 = ((x1 - min.x) / (max.x - min.x)) * 2 - 1;
    const ny1 = ((y1 - min.y) / (max.y - min.y)) * 2 - 1;
    const nx2 = ((x2 - min.x) / (max.x - min.x)) * 2 - 1;
    const ny2 = ((y2 - min.y) / (max.y - min.y)) * 2 - 1;
    normalizedPositions.push(nx1, ny1, 1);
    normalizedPositions.push(nx2, ny2, 1);
  });

  return normalizedPositions;
}

function normalizePositions(data, min, max) {
  const normalizedPositions = [];

  data.forEach(({ x, y }) => {
    const nx = ((x - min.x) / (max.x - min.x)) * 2 - 1;
    const ny = ((y - min.y) / (max.y - min.y)) * 2 - 1;
    normalizedPositions.push(nx, ny, 1);
  });

  return normalizedPositions;
}

function WebGLView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raycaster = new THREE.Raycaster();
  const nodes = useSelector(selectNodes);
  const edges = useSelector(selectEdges);
  const cameraZ = 2.5;

  useEffect(() => {
    if (!canvasRef.current || !nodes) {
      return;
    }

    const canvas = canvasRef.current;

    // create a container element around the canvas and set its overflow property to hidden
    const container = canvas.parentElement;
    container.style.overflow = 'hidden';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setClearColor(0xf2f2f2);
    // const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, powerPreference: 'high-performance' });
    // renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.setClearColor(0xffffff, 0); // second param is opacity, 0 => transparent

    // Normalize the positions
    const { min, max } = getMinMaxPositions(nodes);
    const normalizedPositions = normalizePositions(nodes, min, max);

    // Create the points
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({ size: 10, color: 0x999999, sizeAttenuation: false });

    const positionAttribute = new THREE.Float32BufferAttribute(normalizedPositions, 3);
    geometry.setAttribute('position', positionAttribute);

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Create the edges
    const edgeGeometry = new THREE.BufferGeometry();
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xdddddd, linewidth: 1 });

    if (edges && edges.length > 0 && edges !== undefined && edges !== null) {
      // use the same min and max for the edges
      const edgePositions = normalizedEdgePositions(edges, min, max);
      const edgePositionAttribute = new THREE.Float32BufferAttribute(edgePositions, 3);
      edgeGeometry.setAttribute('position', edgePositionAttribute);

      const edgeLineSegments = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      scene.add(edgeLineSegments);
    }

    // // Create the cube
    // const cubeGeometry = new THREE.BoxGeometry();
    // cubeGeometry.translate(1, 0, 1);
    // const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x89cff0 });
    // const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    // scene.add(cube);

    camera.position.z = cameraZ;

    // mousewheel listener
    canvasRef.current?.addEventListener('wheel', (event) => {
      event.preventDefault();
      camera.position.z += event.deltaY / 500;
    });

    // mouse click listener
    canvasRef.current?.addEventListener('click', (event) => {
      // calculate mouse position in normalized device coordinates
      const rect = canvasRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);
      raycaster.params.Far = 1000;
      raycaster.params.firstHitOnly = true;

      // calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObjects(scene.children, true);
      const intersectsArray = [];

      if (intersects.length > 0) {
        intersectsArray.push(intersects[0]);
      }
      console.log('intersectsArray', intersectsArray);

      for (let i = 0; i < intersectsArray.length; i++) {
        intersectsArray[i].object.material.color.set(0xff0000);
      }

      // if (intersects.length > 0) {
      //   // the first intersected object is the closest one to the camera
      //   const selectedObject = intersects[0].object;
      //   console.log('Selected object:', selectedObject);
      //   // do something with the selected object
      // }

      // calculate intersection point with a plane at z=0
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, point);

      // render a large point at the mouse position
      const mouseMaterial = new THREE.PointsMaterial({ size: 10, color: 0x000000, sizeAttenuation: false });
      const mouseGeometry = new THREE.BufferGeometry();
      const mousePositionAttribute = new THREE.Float32BufferAttribute([point.x, point.y, point.z], 3);
      mouseGeometry.setAttribute('position', mousePositionAttribute);
      const mousePoint = new THREE.Points(mouseGeometry, mouseMaterial);
      scene.add(mousePoint);
    });

    function animate() {
      requestAnimationFrame(animate);
      // cube.rotation.x += 0.01;
      // cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    }
    animate();
  }, [canvasRef, nodes, edges, cameraZ]);

  return <canvas ref={canvasRef} />;
}

export default WebGLView;

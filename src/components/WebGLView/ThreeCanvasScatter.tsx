import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import * as THREE from 'three';
import { selectNodes } from '../Store/CSVSlice';
import { selectEdges } from '../Store/CSVTrajectorySlice';

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

function ThreeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodes = useSelector(selectNodes);
  const edges = useSelector(selectEdges);

  useEffect(() => {
    if (!canvasRef.current || !nodes) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xffffff, 0); // second param is opacity, 0 => transparent

    // Normalize the positions
    const { min, max } = getMinMaxPositions(nodes);
    const normalizedPositions = normalizePositions(nodes, min, max);

    // Create the points
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({ size: 3, color: 0x999999, sizeAttenuation: false });

    const positionAttribute = new THREE.Float32BufferAttribute(normalizedPositions, 3);
    geometry.setAttribute('position', positionAttribute);

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Create the edges
    const edgeGeometry = new THREE.BufferGeometry();
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xdddddd });

    if (edges && edges.length > 0 && edges !== undefined && edges !== null) {
      // use the same min and max for the edges
      const edgePositions = normalizedEdgePositions(edges, min, max);
      const edgePositionAttribute = new THREE.Float32BufferAttribute(edgePositions, 3);
      edgeGeometry.setAttribute('position', edgePositionAttribute);

      const edgeLineSegments = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      scene.add(edgeLineSegments);
    }

    // Create the cube
    const cubeGeometry = new THREE.BoxGeometry();
    cubeGeometry.translate(1, 0, 1);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x89cff0 });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cube);

    camera.position.z = 2.5;

    function animate() {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    }
    animate();
  }, [canvasRef, nodes, edges]);

  return <canvas ref={canvasRef} />;
}

export default ThreeCanvas;

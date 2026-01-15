import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ProteinAnimation = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // Scene Setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff); // White background

        // Camera
        const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
        camera.position.z = 5;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        renderer.setClearColor(0x000000, 0); // Transparent
        mountRef.current.appendChild(renderer.domElement);

        // Molecule Group
        const molecule = new THREE.Group();

        // Helpers
        const createAtom = (color, x, y, z, size = 0.5) => {
            const geometry = new THREE.SphereGeometry(size, 32, 32);
            const material = new THREE.MeshPhongMaterial({ color: color, shininess: 100 });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(x, y, z);
            return sphere;
        };

        const createBond = (p1, p2) => {
            const start = new THREE.Vector3(p1.x, p1.y, p1.z);
            const end = new THREE.Vector3(p2.x, p2.y, p2.z);
            const distance = start.distanceTo(end);

            const geometry = new THREE.CylinderGeometry(0.1, 0.1, distance, 8);
            const material = new THREE.MeshPhongMaterial({ color: 0xffffff }); // White bonds
            const cylinder = new THREE.Mesh(geometry, material);

            // Position midpoint
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            cylinder.position.copy(mid);

            // Rotate to align
            cylinder.lookAt(end);
            cylinder.rotateX(Math.PI / 2);

            return cylinder;
        };

        // Construct simple molecule structure 
        // Central Carbon (Bright Silver)
        const cAlpha = createAtom(0xeeeeee, 0, 0, 0, 0.6);
        molecule.add(cAlpha);

        // Nitrogen (Deep Blue)
        const nTerm = createAtom(0x1a237e, -1.5, 0.5, 0, 0.5);
        molecule.add(nTerm);
        molecule.add(createBond(cAlpha.position, nTerm.position));

        // Carbonyl Carbon (Bright Silver)
        const cCarb = createAtom(0xeeeeee, 1.5, 0.2, 0, 0.5);
        molecule.add(cCarb);
        molecule.add(createBond(cAlpha.position, cCarb.position));

        // Oxygen (Vibrant Red) - Double bonded to Carbonyl
        const oxygen = createAtom(0xff1744, 2.0, 1.2, 0, 0.5);
        molecule.add(oxygen);
        molecule.add(createBond(cCarb.position, oxygen.position));

        // Side Chain R-Group (Bright Green)
        const rGroup = createAtom(0x00e676, 0, -1.5, 0.5, 0.7);
        molecule.add(rGroup);
        molecule.add(createBond(cAlpha.position, rGroup.position));

        // Hydrogens (White) - approximate
        const h1 = createAtom(0xffffff, -1.8, 1.2, 0, 0.3);
        molecule.add(h1);
        molecule.add(createBond(nTerm.position, h1.position));

        // Extra decoration atoms for more color
        const sulfur = createAtom(0xffea00, -0.8, -2.2, 0.8, 0.4); // Yellow Sulfur
        molecule.add(sulfur);
        molecule.add(createBond(rGroup.position, sulfur.position));

        const phosphorus = createAtom(0xff9100, 1.2, -1.0, -0.8, 0.45); // Orange Phosphorus
        molecule.add(phosphorus);
        molecule.add(createBond(cAlpha.position, phosphorus.position));

        scene.add(molecule);

        // LIGHTING SETUP (Bright & Vibrant)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // High intensity ambient
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);

        const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
        frontLight.position.set(0, 0, 10);
        scene.add(frontLight);

        // Animation Loop
        let animationId;
        const animate = () => {
            animationId = requestAnimationFrame(animate);

            // Rotate
            molecule.rotation.x += 0.015; // 3x faster
            molecule.rotation.y += 0.03;  // 3x faster

            renderer.render(scene, camera);
        };
        animate();

        // Handle Resize
        const handleResize = () => {
            if (mountRef.current) {
                const width = mountRef.current.clientWidth;
                const height = mountRef.current.clientHeight;
                renderer.setSize(width, height);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            }
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
            if (mountRef.current) {
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
        };
    }, []);

    return (
        <div
            ref={mountRef}
            style={{
                width: '100%',
                height: '200px',
                marginBottom: '20px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' // Subtle gradient background for container
            }}
        />
    );
};

export default ProteinAnimation;

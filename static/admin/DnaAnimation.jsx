import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const DnaAnimation = () => {
    const mountRef = useRef(null);

    useEffect(() => {
        if (!mountRef.current) return;

        // Scene Setup
        const scene = new THREE.Scene();
        // Transparent background handled by renderer/CSS, scene background can be null

        // Camera
        const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
        camera.position.z = 12;
        camera.position.y = 0;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        renderer.setClearColor(0x000000, 0); // Transparent
        mountRef.current.appendChild(renderer.domElement);

        // DNA Group
        const dnaGroup = new THREE.Group();

        // Parameters
        const numPairs = 40;
        const radius = 3;
        const height = 18;
        const turns = 2;
        const heightStep = height / numPairs;
        const angleStep = (Math.PI * 2 * turns) / numPairs;

        // Colors
        // Adenine (Red) - Thymine (Blue)
        // Guanine (Green) - Cytosine (Yellow)
        const colors = [
            { a: 0xff1744, b: 0x2979ff }, // A-T
            { a: 0x00e676, b: 0xffea00 }  // G-C
        ];

        // Geometries (Reuse for performance)
        const atomGeo = new THREE.SphereGeometry(0.4, 16, 16);
        const backboneGeo = new THREE.SphereGeometry(0.5, 16, 16);

        // Materials
        // Vibrant Backbone Colors (Alternating)
        const backboneMat1 = new THREE.MeshPhongMaterial({ color: 0xe040fb, shininess: 100 }); // Vibrant Purple
        const backboneMat2 = new THREE.MeshPhongMaterial({ color: 0x00b0ff, shininess: 100 }); // Vibrant Blue/Cyan
        // Translucent Bond
        const bondMat = new THREE.MeshPhongMaterial({ color: 0xffffff, opacity: 0.4, transparent: true });

        for (let i = 0; i < numPairs; i++) {
            const y = (i * heightStep) - (height / 2);
            const angle = i * angleStep;

            // Backbone positions
            const x1 = Math.cos(angle) * radius;
            const z1 = Math.sin(angle) * radius;

            const x2 = Math.cos(angle + Math.PI) * radius; // Opposite side
            const z2 = Math.sin(angle + Math.PI) * radius;

            // Choose backbone color based on sequence
            const bbMat = (i % 2 === 0) ? backboneMat1 : backboneMat2;

            // Create Backbone Atoms
            const bb1 = new THREE.Mesh(backboneGeo, bbMat);
            bb1.position.set(x1, y, z1);
            dnaGroup.add(bb1);

            const bb2 = new THREE.Mesh(backboneGeo, bbMat);
            bb2.position.set(x2, y, z2);
            dnaGroup.add(bb2);

            // Base Pair
            const colorPair = colors[i % 2]; // Alternating pattern

            // Half 1 
            const base1Mat = new THREE.MeshPhongMaterial({ color: colorPair.a, shininess: 80 });
            const base1 = new THREE.Mesh(atomGeo, base1Mat);
            // Position slightly towards center
            base1.position.set(x1 * 0.6, y, z1 * 0.6);
            dnaGroup.add(base1);

            // Half 2 
            const base2Mat = new THREE.MeshPhongMaterial({ color: colorPair.b, shininess: 80 });
            const base2 = new THREE.Mesh(atomGeo, base2Mat);
            base2.position.set(x2 * 0.6, y, z2 * 0.6);
            dnaGroup.add(base2);

            // Connection (Hydrogen Bond visual)
            const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, radius * 1.2, 8), bondMat);

            // Align bond
            const start = new THREE.Vector3(x1, y, z1);
            const end = new THREE.Vector3(x2, y, z2);
            const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

            bond.position.copy(mid);
            bond.lookAt(end);
            bond.rotateX(Math.PI / 2);

            dnaGroup.add(bond);
        }

        // Rotate slightly to show depth better initially
        dnaGroup.rotation.z = Math.PI / 8;
        dnaGroup.rotation.x = Math.PI / 6;

        scene.add(dnaGroup);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffffff, 1);
        spotLight.position.set(10, 20, 20);
        spotLight.castShadow = true;
        scene.add(spotLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        pointLight.position.set(-10, -10, 10);
        scene.add(pointLight);

        // Animation Loop
        let animationId;
        const animate = () => {
            animationId = requestAnimationFrame(animate);

            dnaGroup.rotation.y += 0.015; // Moderate spin

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
                height: '250px',
                marginBottom: '20px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' // Cyber/Pastel gradient
            }}
        />
    );
};

export default DnaAnimation;

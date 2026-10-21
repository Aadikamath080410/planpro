import React, { Suspense, useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, OrbitControls, Environment, ContactShadows, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface ModelProps {
    url: string;
    textureUrl?: string; // New: optional texture URL
}

const Model: React.FC<ModelProps> = ({ url, textureUrl }) => {
    const { scene } = useGLTF(url);
    const texture = textureUrl ? useTexture(textureUrl) : null;

    useLayoutEffect(() => {
        if (texture) {
            // Standard GLTF texture settings
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;
            
            scene.traverse((node) => {
                if ((node as THREE.Mesh).isMesh) {
                    const mesh = node as THREE.Mesh;
                    // Apply to the main material
                    if (mesh.material) {
                        const material = mesh.material as THREE.MeshStandardMaterial;
                        material.map = texture;
                        material.needsUpdate = true;
                    }
                }
            });
        }
    }, [scene, texture]);

    return <primitive object={scene} />;
};

interface Scene3DProps {
    modelUrl: string;
    textureUrl?: string; // Add textureUrl to props
}

const Scene3D: React.FC<Scene3DProps> = ({ modelUrl, textureUrl }) => {
    if (!modelUrl) return null;

    return (
        <div className="w-full h-full min-h-[400px] bg-[#F5F5F3] rounded-[32px] overflow-hidden relative group">
            <Canvas shadows camera={{ position: [0, 0, 4], fov: 45 }}>
                <Suspense fallback={null}>
                    <Stage environment="city" intensity={0.5} shadows={false} adjustCamera={2}>
                        <Model url={modelUrl} textureUrl={textureUrl} />
                    </Stage>
                    <OrbitControls
                        makeDefault
                        enableDamping={true}
                        dampingFactor={0.05}
                        minDistance={2}
                        maxDistance={6}
                        enablePan={false}
                    />
                    <Environment preset="city" />
                    <ContactShadows
                        position={[0, -1, 0]}
                        opacity={0.4}
                        scale={10}
                        blur={2.5}
                        far={2}
                    />
                </Suspense>
            </Canvas>

            {/* 3D View Indicator */}
            <div className="absolute top-6 left-6 flex items-center gap-3 py-2 px-4 bg-white/50 backdrop-blur-md rounded-full border border-black/5 pointer-events-none group-hover:opacity-0 transition-opacity">
                <div className="w-2 h-2 rounded-full bg-black animate-pulse"></div>
                <span className="text-[10px] font-black text-black uppercase tracking-[0.2em]">3D Mode Active</span>
            </div>
        </div>
    );
};

export default Scene3D;
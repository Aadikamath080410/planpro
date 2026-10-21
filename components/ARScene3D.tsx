import React, { Suspense, useLayoutEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Product } from '../types';

interface ModelProps {
    url: string;
    textureUrl?: string;
}

const Model: React.FC<ModelProps> = ({ url, textureUrl }) => {
    const { scene } = useGLTF(url);
    const texture = textureUrl ? useTexture(textureUrl) : null;

    useLayoutEffect(() => {
        if (texture) {
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;
            scene.traverse((node) => {
                if ((node as THREE.Mesh).isMesh) {
                    const mesh = node as THREE.Mesh;
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

interface ARScene3DProps {
    product: Product;
    rotation: number;
    scale: number;
}

const ARScene3D: React.FC<ARScene3DProps> = ({ product, rotation, scale }) => {
    if (!product.model) return <img src={product.image} className="w-48 md:w-64 h-auto drop-shadow-2xl" alt={product.name} />;

    return (
        <div className="w-56 h-56 md:w-80 md:h-80 pointer-events-none">
            <Canvas camera={{ position: [0, 1, 3], fov: 40 }} gl={{ alpha: true }}>
                <Suspense fallback={null}>
                    <group rotation={[0, (rotation * Math.PI) / 180, 0]} scale={scale}>
                        <Model url={product.model} textureUrl={product.texture} />
                    </group>
                    <Environment preset="city" />
                    <ContactShadows
                        position={[0, -0.5, 0]}
                        opacity={0.4}
                        scale={10}
                        blur={2}
                        far={1.5}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
};

export default ARScene3D;
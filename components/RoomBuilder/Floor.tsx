import React, { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

const TEXTURES = {
    wood: "../assets/texture/wood.jpeg",
    tiles: "../assets/texture/tiles.jpeg",
};

interface FloorProps {
    points: { x: number; y: number }[];
    textureType: 'plain' | 'wood' | 'tiles';
    onPlacement: (e: any) => void;
    color?: string;
}

export default function Floor({ points, textureType, onPlacement, color = "#ffffff" }: FloorProps) {
    // 1. Create the custom shape based on the perimeter points
    const floorShape = useMemo(() => {
        if (!points || points.length === 0) return null;

        const shape = new THREE.Shape();
        // Start at the first point
        shape.moveTo(points[0].x, points[0].y);

        // Draw lines to subsequent points
        for (let i = 1; i < points.length; i++) {
            shape.lineTo(points[i].x, points[i].y);
        }

        shape.closePath();
        return shape;
    }, [points]);

    // Extrude settings for a 2cm thick floor
    const extrudeSettings = useMemo(() => ({
        steps: 1,
        depth: 0.02,
        bevelEnabled: false,
    }), []);

    // 2. Texture Loading
    const isPlain = textureType === 'plain' || !TEXTURES[textureType];
    const originalTexture = useTexture(isPlain ? TEXTURES.wood : TEXTURES[textureType]);

    // 3. Texture Calculation (UV Tiling)
    const texture = useMemo(() => {
        if (!originalTexture || isPlain) return null;
        const t = originalTexture.clone();
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        const box = new THREE.Box2().setFromPoints(points.map(p => new THREE.Vector2(p.x, p.y)));
        const sizeX = Math.max(0.1, box.max.x - box.min.x);
        const sizeY = Math.max(0.1, box.max.y - box.min.y);
        t.repeat.set(sizeX, sizeY);
        t.needsUpdate = true;
        return t;
    }, [originalTexture, points, isPlain]);

    if (!floorShape) return null;

    return (
        <group>
            {/* Main Extruded Floor */}
            <mesh
                rotation={[Math.PI / 2, 0, 0]}
                position={[0, 0, 0]}
                onPointerDown={onPlacement}
                receiveShadow
            >
                <extrudeGeometry args={[floorShape, extrudeSettings]} />
                <meshStandardMaterial
                    map={isPlain ? null : texture}
                    color={isPlain ? (color || "#e2e8f0") : "#ffffff"}
                    roughness={0.7}
                    metalness={0.1}
                    key={isPlain ? "plain" : "textured"} 
                />
            </mesh>
        </group>
    );
}

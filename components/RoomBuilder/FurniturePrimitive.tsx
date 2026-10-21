
import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { useGLTF, Html, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BlueprintItem } from "../../types";
import { checkPlacementValidity } from "./RoomMath";

interface FurniturePrimitiveProps {
    item: BlueprintItem;
    index: number;
    isSelected: boolean;
    furnitureList: BlueprintItem[];
    setFurnitureList: (items: BlueprintItem[] | ((prev: BlueprintItem[]) => BlueprintItem[])) => void;
    setSelectedIndex: (id: string | null) => void;
    points: any[];
    controlsRef: React.RefObject<any>;
}

// Separate component for GLTF loading to handle hooks correctly
function Model({ path, onLoad, color, textureUrl }: { path: string, onLoad: (bounds: any) => void, color?: string, textureUrl?: string }) {
    const { scene } = useGLTF(path);
    const texture = textureUrl ? useTexture(textureUrl) : null;

    const clonedScene = useMemo(() => {
        const s = scene.clone();
        s.traverse((node) => {
            if (node instanceof THREE.Mesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                
                if (color || texture) {
                    node.material = node.material.clone();
                    if (color) (node.material as any).color.set(color);
                    if (texture) {
                        (node.material as any).map = texture;
                        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                        texture.repeat.set(2, 2);
                        (node.material as any).needsUpdate = true;
                    }
                }
            }
        });
        return s;
    }, [scene, color, texture]);

    // Calculate model size to ground it and report back
    const bounds = useMemo(() => {
        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        
        return {
            width: size.x,
            depth: size.z,
            height: size.y,
            centerX: center.x,
            centerZ: center.z,
            minY: box.min.y
        };
    }, [clonedScene]);

    useEffect(() => {
        if (clonedScene) {
            clonedScene.position.y = -bounds.minY;
        }
        onLoad(bounds);
    }, [clonedScene, bounds, onLoad]);

    return <primitive object={clonedScene} />;
}

export default function FurniturePrimitive({ 
    item, 
    index, 
    isSelected, 
    furnitureList, 
    setFurnitureList, 
    setSelectedIndex, 
    points, 
    controlsRef 
}: FurniturePrimitiveProps) {
    const { camera, gl } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const [showCollisionModal, setShowCollisionModal] = useState(false);
    const draggingRef = useRef({ active: false, offset: new THREE.Vector3() });

    // Use placeholder dimensions until model loads
    const [modelBounds, setModelBounds] = useState({ 
        width: 1, 
        depth: 1, 
        height: 1, 
        centerX: 0, 
        centerZ: 0,
        minY: 0
    });

    const handleModelLoad = useCallback((bounds: any) => {
        setModelBounds(bounds);
        
        // Only update the main list if dimensions are missing or different
        // This prevents infinite render loops
        if (!item.dimensions || 
            Math.abs(item.dimensions.width - bounds.width) > 0.01 ||
            Math.abs(item.dimensions.depth - bounds.depth) > 0.01) {
            
            setFurnitureList(prev => prev.map(f => 
                f.id === item.id ? { ...f, dimensions: bounds } : f
            ));
        }
    }, [item.id, item.dimensions, setFurnitureList]);

    // --- CAMERA LOCK LOGIC ---
    const setCameraLocked = useCallback((locked: boolean) => {
        if (controlsRef.current) {
            controlsRef.current.enabled = !locked;
        }
    }, [controlsRef]);

    const handleConfirmDeletion = useCallback(() => {
        setFurnitureList(prev => prev.filter((it) => it.id !== item.id));
        setSelectedIndex(null);
        setShowCollisionModal(false);
        setCameraLocked(false);
    }, [item.id, setFurnitureList, setSelectedIndex, setCameraLocked]);

    // --- KEYBOARD DELETE LOGIC ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isSelected && (e.key === 'Delete' || e.key === 'Backspace')) {
                handleConfirmDeletion();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSelected, handleConfirmDeletion]);

    // --- MOUSE/TOUCH MOVEMENT LOGIC ---
    const handlersRef = useRef<{ onMove: ((e: PointerEvent) => void) | null, onUp: (() => void) | null }>({ onMove: null, onUp: null });

    const stopDragging = useCallback(() => {
        if (handlersRef.current.onMove) window.removeEventListener("pointermove", handlersRef.current.onMove);
        if (handlersRef.current.onUp) window.removeEventListener("pointerup", handlersRef.current.onUp);
        draggingRef.current.active = false;
        setCameraLocked(false);
    }, [setCameraLocked]);

    const onMove = useCallback((ev: PointerEvent) => {
        if (!draggingRef.current.active) return;

        const rect = gl.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((ev.clientX - rect.left) / rect.width) * 2 - 1,
            -((ev.clientY - rect.top) / rect.height) * 2 + 1
        );

        const ray = new THREE.Raycaster();
        ray.setFromCamera(mouse, camera);
        const intersect = new THREE.Vector3();

        if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), intersect)) {
            const target = intersect.clone().add(draggingRef.current.offset);

            const { valid } = checkPlacementValidity(
                [target.x, 0, target.z],
                { width: modelBounds.width, depth: modelBounds.depth },
                (item.rotation * Math.PI) / 180 || 0,
                furnitureList,
                points,
                -1,
                item.id
            );

            if (!valid) {
                stopDragging();
                setShowCollisionModal(true);
                return;
            }

            if (groupRef.current) groupRef.current.position.set(target.x, 0, target.z);
        }
    }, [camera, furnitureList, gl, item.id, item.rotation, modelBounds, points, stopDragging]);

    const onUp = useCallback(() => {
        stopDragging();
        if (groupRef.current) {
            const p = groupRef.current.position;
            setFurnitureList(prev => prev.map((f) => f.id === item.id ? { ...f, position: [p.x, 0, p.z], x: p.x, y: p.z } : f));
        }
    }, [item.id, setFurnitureList, stopDragging]);

    useEffect(() => {
        handlersRef.current = { onMove, onUp };
    }, [onMove, onUp]);

    const itemPosition = item.position || [item.x, 0, item.y];

    return (
        <group ref={groupRef} position={itemPosition as [number, number, number]}>
            <group rotation={[0, (item.rotation * Math.PI) / 180, 0]}>
                <group
                    onPointerDown={(e: any) => {
                        e.stopPropagation();
                        setSelectedIndex(item.id);
                        setCameraLocked(true);
                        draggingRef.current.active = true;
                        if (groupRef.current) {
                            draggingRef.current.offset.copy(groupRef.current.position).sub(e.point);
                        }
                        window.addEventListener("pointermove", onMove);
                        window.addEventListener("pointerup", onUp);
                    }}
                >
                    {item.model ? (
                        <React.Suspense fallback={<mesh><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="gray" transparent opacity={0.5} /></mesh>}>
                            <Model path={item.model} onLoad={handleModelLoad} color={item.color} textureUrl={item.texture} />
                        </React.Suspense>
                    ) : (
                        <mesh position={[0, 0.5, 0]}>
                            <boxGeometry args={[1, 1, 1]} />
                            <meshStandardMaterial color={isSelected ? "#3b82f6" : "#E4E4F4"} />
                        </mesh>
                    )}
                </group>

                {isSelected && !showCollisionModal && (
                    <mesh 
                        rotation={[-Math.PI / 2, 0, 0]} 
                        position={[modelBounds.centerX, 0.01, modelBounds.centerZ]}
                    >
                        <planeGeometry args={[Math.ceil(modelBounds.width / 0.5) * 0.5, Math.ceil(modelBounds.depth / 0.5) * 0.5]} />
                        <meshBasicMaterial color="#00ff00" transparent opacity={0.3} />
                    </mesh>
                )}
            </group>

            {isSelected && !showCollisionModal && (
                <Html position={[0, modelBounds.height + 0.5, 0]} center>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmDeletion();
                        }}
                        className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                    >
                        ✕
                    </button>
                </Html>
            )}

            {showCollisionModal && (
                <Html center>
                    <div className="bg-white p-6 rounded-[32px] shadow-2xl border border-black/5 text-center min-w-[200px]">
                        <div className="text-3xl mb-2">⚠️</div>
                        <h4 className="font-serif text-lg text-black mb-1">Collision!</h4>
                        <p className="text-[10px] text-black/40 uppercase tracking-widest mb-4">Invalid placement detected.</p>
                        <button 
                            onClick={handleConfirmDeletion} 
                            className="w-full py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all"
                        >
                            Remove Item
                        </button>
                        <button 
                            onClick={() => setShowCollisionModal(false)}
                            className="w-full mt-2 py-3 bg-black/5 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black/10 transition-all"
                        >
                            Cancel Move
                        </button>
                    </div>
                </Html>
            )}
        </group>
    );
}

// Pre-load helper for GLTF
useGLTF.preload = (path: string) => {
    // Drei useGLTF.preload usually takes the path
};

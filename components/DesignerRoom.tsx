
import React, { useMemo, useRef, Suspense, useState, useEffect } from "react";
import { Canvas, useLoader, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, useTexture, Environment, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomData, RoomOpening, BlueprintItem, Product } from "../types";
import { PRODUCTS } from "../data/mockData";
import { getShapePoints } from "./RoomDesigner/RoomMath";
import FurniturePrimitive from "./RoomDesigner/FurniturePrimitive";

// --- 1.2 Ghost Model Component ---
const GhostModel: React.FC<{ product: Product, position: [number, number, number] }> = ({ product, position }) => {
    if (!product.model) {
        return (
            <mesh position={position}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
            </mesh>
        );
    }

    const { scene } = useGLTF(product.model);
    const texture = product.texture ? useTexture(product.texture) : null;

    const { ghostScene, bounds } = useMemo(() => {
        const s = scene.clone();
        
        if (texture) {
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;
        }

        const box = new THREE.Box3().setFromObject(s);
        const size = new THREE.Vector3();
        box.getSize(size);
        const wrapper = new THREE.Group();
        s.position.y = -box.min.y;
        wrapper.add(s);
        wrapper.traverse((node) => {
            if (node instanceof THREE.Mesh) {
                if (node.material) {
                    if (Array.isArray(node.material)) {
                        node.material = node.material.map(m => {
                            const newM = m.clone();
                            if (texture) (newM as any).map = texture;
                            (newM as any).transparent = true;
                            (newM as any).opacity = 0.5;
                            return newM;
                        });
                    } else {
                        node.material = node.material.clone();
                        if (texture) (node.material as any).map = texture;
                        (node.material as any).transparent = true;
                        (node.material as any).opacity = 0.5;
                    }
                }
            }
        });
        return { 
            ghostScene: wrapper, 
            bounds: { 
                width: size.x, 
                depth: size.z, 
                centerX: (box.max.x + box.min.x)/2, 
                centerZ: (box.max.z + box.min.z)/2 
            } 
        };
    }, [scene, texture]);

    return (
        <group position={position}>
            <primitive object={ghostScene} />
            <mesh position={[bounds.centerX, 0.01, bounds.centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[bounds.width, bounds.depth]} />
                <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
            </mesh>
        </group>
    );
};

// --- 2. Textured Wall Component ---
function TexturedWall({ url, width, height, position, rotation, offsetIndex, visible = true }: any) {
    const texture = useTexture(url);

    const wallTexture = useMemo(() => {
        if (!texture || Array.isArray(texture)) return null;
        const t = (texture as THREE.Texture).clone();
        t.wrapS = THREE.RepeatWrapping;
        t.repeat.set(0.25, 1);
        t.offset.set(offsetIndex * 0.25, 0);
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.needsUpdate = true;
        return t;
    }, [texture, offsetIndex]);

    return (
        <mesh position={position} rotation={rotation} visible={visible}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial
                map={wallTexture}
                side={THREE.DoubleSide}
                transparent={true}
                opacity={visible ? 1 : 0.1}
            />
        </mesh>
    );
}

// --- 3. Wall Aperture Component ---
function WallAperture({ wall, color, isHidden }: any) {
    const { opening, dist } = wall;
    const isDoor = opening.type === 'DOOR';
    const holeW = isDoor ? 1.0 : 1.4;
    const holeH = isDoor ? 2.1 : 1.2;
    const sillH = isDoor ? 0.0 : 0.9;

    const holeCenterOnWall = (opening.offset * dist) - (dist / 2);
    const leftSectionWidth = (opening.offset * dist) - (holeW / 2);
    const rightSectionWidth = (dist - (opening.offset * dist)) - (holeW / 2);

    return (
        <group>
            {leftSectionWidth > 0 && (
                <mesh position={[(-dist / 2) + (leftSectionWidth / 2), 1.25, 0]}>
                    <planeGeometry args={[leftSectionWidth, 2.5]} />
                    <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent={isHidden} opacity={isHidden ? 0.2 : 1} />
                </mesh>
            )}
            {rightSectionWidth > 0 && (
                <mesh position={[(dist / 2) - (rightSectionWidth / 2), 1.25, 0]}>
                    <planeGeometry args={[rightSectionWidth, 2.5]} />
                    <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent={isHidden} opacity={isHidden ? 0.2 : 1} />
                </mesh>
            )}
            <mesh position={[holeCenterOnWall, (2.5 + (sillH + holeH)) / 2, 0]}>
                <planeGeometry args={[holeW, 2.5 - (sillH + holeH)]} />
                <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent={isHidden} opacity={isHidden ? 0.2 : 1} />
            </mesh>
            {!isDoor && (
                <mesh position={[holeCenterOnWall, sillH / 2, 0]}>
                    <planeGeometry args={[holeW, sillH]} />
                    <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent={isHidden} opacity={isHidden ? 0.2 : 1} />
                </mesh>
            )}
            <mesh position={[holeCenterOnWall, sillH + holeH / 2, 0.01]}>
                <planeGeometry args={[holeW, holeH]} />
                <meshStandardMaterial color={isDoor ? "#1a1a1a" : "#87ceeb"} transparent opacity={isHidden ? 0.1 : 0.6} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

// --- 4. Main Scene Content ---
function SceneContent({
    roomData,
    items,
    setItems,
    selectedItemId,
    setSelectedItemId,
    viewMode = '3D',
    placingProduct,
    onPlaceItem,
    onCancelPlacement
}: {
    roomData: RoomData,
    items: BlueprintItem[],
    setItems: (items: BlueprintItem[]) => void,
    selectedItemId: string | null,
    setSelectedItemId: (id: string | null) => void,
    viewMode: string;
    placingProduct: Product | null;
    onPlaceItem: (pos: [number, number, number]) => void;
    onCancelPlacement?: () => void;
}) {
    const { camera, scene, raycaster, mouse } = useThree();
    const controlsRef = useRef<any>(null);
    const [mousePos, setMousePos] = useState<[number, number, number]>([0, 0, 0]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onCancelPlacement) {
                onCancelPlacement();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onCancelPlacement]);
    const [viewTarget, setViewTarget] = useState({
        pos: new THREE.Vector3(8, 8, 8),
        look: new THREE.Vector3(0, 0, 0)
    });
    const [hasInteracted, setHasInteracted] = useState(false);

    useFrame((state) => {
        if (!hasInteracted) {
            state.camera.position.lerp(viewTarget.pos, 0.1);
            if (controlsRef.current) {
                controlsRef.current.target.lerp(viewTarget.look, 0.1);
                controlsRef.current.update();
            }
            if (state.camera.position.distanceTo(viewTarget.pos) < 0.1) {
                setHasInteracted(true);
            }
        }
    });

    const { shape, dimensions, openings = [], wallColor, floorTexture, panoramaUrl } = roomData;
    console.log("Current RoomData:", { shape, dimensions, panoramaUrl });
    const { length: L = 6, width: W = 6 } = dimensions;

    const pointsData = useMemo(() => {
        const rawPoints = getShapePoints(shape, dimensions);
        return rawPoints.map(p => ({ pos: new THREE.Vector2(p[0], p[1]) }));
    }, [shape, dimensions]);

    const wallData = useMemo(() => {
        return pointsData.map((p1Obj, i) => {
            const p1 = p1Obj.pos;
            const p2 = pointsData[(i + 1) % pointsData.length].pos;
            const dist = p1.distanceTo(p2);
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const opening = (openings || []).find(o => o.wallIndex === i);
            const staticCenter = new THREE.Vector2().lerpVectors(p1, p2, 0.5);
            return { staticCenter, dist, angle, opening };
        });
    }, [pointsData, openings]);

    useEffect(() => {
        const offsetDist = 5;
        if (viewMode === 'TOP') {
            setViewTarget({ pos: new THREE.Vector3(0, 15, 0), look: new THREE.Vector3(0, 0, 0) });
            if (controlsRef.current) controlsRef.current.enableRotate = false;
        } else if (viewMode.startsWith('WALL_')) {
            const wallIdx = parseInt(viewMode.split('_')[1]);
            const wall = wallData[wallIdx];
            if (wall) {
                const angle = -wall.angle + Math.PI / 2;
                setViewTarget({
                    pos: new THREE.Vector3(
                        wall.staticCenter.x + Math.cos(angle) * offsetDist,
                        1.25,
                        wall.staticCenter.y + Math.sin(angle) * offsetDist
                    ),
                    look: new THREE.Vector3(wall.staticCenter.x, 1.25, wall.staticCenter.y)
                });
            }
            if (controlsRef.current) controlsRef.current.enableRotate = true;
        } else {
            setViewTarget({ pos: new THREE.Vector3(8, 8, 8), look: new THREE.Vector3(0, 0, 0) });
            if (controlsRef.current) controlsRef.current.enableRotate = true;
        }
        setHasInteracted(false);
    }, [viewMode, wallData]);

    const floorShape = useMemo(() => {
        const pts = pointsData.map(p => p.pos);
        if (!pts.length) return null;
        const shapeObj = new THREE.Shape();
        shapeObj.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) shapeObj.lineTo(pts[i].x, pts[i].y);
        shapeObj.closePath();
        return shapeObj;
    }, [pointsData]);

    const handleFloorClick = (e: any) => {
        e.stopPropagation();
        if (placingProduct) {
            onPlaceItem(mousePos);
        } else {
            setSelectedItemId(null);
        }
    };

    const handlePointerMove = (e: any) => {
        if (placingProduct) {
            // Update raycaster with current mouse position
            raycaster.setFromCamera(mouse, camera);

            // Get intersection with the floor
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, intersection)) {
                setMousePos([intersection.x, 0, intersection.z]);
            }
        }
    };

    return (
        <>
            <OrbitControls
                ref={controlsRef}
                makeDefault
                onStart={() => setHasInteracted(true)}
                maxPolarAngle={Math.PI / 2} // Prevent looking from below
                minDistance={1}
                maxDistance={30}
            />
            <ambientLight intensity={0.7} />
            <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
            <Grid infiniteGrid cellSize={0.5} sectionSize={1} fadeDistance={30} sectionColor="#000000" sectionThickness={1} />
            <Environment preset="city" />
            <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.25} far={10} color="#000000" />

            <group name="DesignContent">
                {floorShape && (
                    <group>
                        {/* The floor itself */}
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} onPointerDown={handleFloorClick} receiveShadow>
                            <shapeGeometry args={[floorShape]} />
                            <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} />
                        </mesh>
                        {/* A solid bottom plate to hide underside leaks */}
                        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                            <shapeGeometry args={[floorShape]} />
                            <meshBasicMaterial color="#d1d1d1" side={THREE.FrontSide} />
                        </mesh>
                    </group>
                )}

                {panoramaUrl ? (
                    <group>
                        {[
                            { pos: [0, 1.25, -L / 2], rot: [0, 0, 0], idx: 0, w: W },
                            { pos: [W / 2, 1.25, 0], rot: [0, -Math.PI / 2, 0], idx: 1, w: L },
                            { pos: [0, 1.25, L / 2], rot: [0, Math.PI, 0], idx: 2, w: W },
                            { pos: [-W / 2, 1.25, 0], rot: [0, Math.PI / 2, 0], idx: 3, w: L },
                        ].map((wDef, i) => {
                            let isHidden = false;
                            if (viewMode.startsWith('WALL_')) {
                                const viewDir = new THREE.Vector3().subVectors(viewTarget.look, viewTarget.pos).normalize();
                                const wallPos = new THREE.Vector3(...(wDef.pos as [number, number, number]));
                                const dirToWall = new THREE.Vector3().subVectors(wallPos, camera.position).normalize();
                                if (viewDir.dot(dirToWall) < 0.1) isHidden = true;
                            }
                            return (
                                <TexturedWall
                                    key={i}
                                    url={panoramaUrl}
                                    width={wDef.w}
                                    height={2.5}
                                    position={wDef.pos}
                                    rotation={wDef.rot}
                                    offsetIndex={i}
                                    visible={!isHidden}
                                />
                            );
                        })}
                    </group>
                ) : (
                    wallData.map((wall, i) => {
                        let isHidden = false;
                        if (viewMode.startsWith('WALL_')) {
                            const viewDir = new THREE.Vector3().subVectors(viewTarget.look, viewTarget.pos).normalize();
                            const wallCenter = new THREE.Vector3(wall.staticCenter.x, 1.25, wall.staticCenter.y);
                            const dirToWall = new THREE.Vector3().subVectors(wallCenter, camera.position).normalize();
                            if (viewDir.dot(dirToWall) < 0.1) isHidden = true;
                        }
                        return (
                            <group key={i} position={[wall.staticCenter.x, 0, wall.staticCenter.y]} rotation={[0, -wall.angle, 0]}>
                                {!wall.opening ? (
                                    <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
                                        <planeGeometry args={[wall.dist, 2.5]} />
                                        <meshStandardMaterial color={wallColor} side={THREE.DoubleSide} transparent={isHidden} opacity={isHidden ? 0.2 : 1} />
                                    </mesh>
                                ) : (
                                    <WallAperture wall={wall} color={wallColor} isHidden={isHidden} />
                                )}
                            </group>
                        );
                    })
                )}

                {items.map((it, idx) => (
                    <FurniturePrimitive
                        key={it.id}
                        item={it}
                        index={idx}
                        isSelected={selectedItemId === it.id}
                        furnitureList={items}
                        setFurnitureList={setItems}
                        setSelectedIndex={setSelectedItemId}
                        points={pointsData}
                        controlsRef={controlsRef}
                    />
                ))}
            </group>

            {placingProduct && (
                <>
                    <GhostModel product={placingProduct} position={mousePos} />
                    {/* Invisible plane to catch mouse movement for placement */}
                    <mesh
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0, 0, 0]}
                        onPointerMove={handlePointerMove}
                        onPointerDown={handleFloorClick}
                        visible={false}
                    >
                        <planeGeometry args={[100, 100]} />
                    </mesh>
                </>
            )}
        </>
    );
}

export default React.forwardRef(function DesignerRoom(props: any, ref) {
    const designContentRef = useRef<THREE.Group>(null);

    React.useImperativeHandle(ref, () => ({
        getScene: () => {
            if (!designContentRef.current) {
                console.warn("DesignerRoom: designContentRef is null!");
            } else {
                console.log("DesignerRoom: getScene returning group", designContentRef.current);
            }
            return designContentRef.current;
        }
    }));

    return (
        <div className="w-full h-full relative cursor-crosshair">
            <Canvas shadows camera={{ position: [8, 8, 8], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
                <Suspense fallback={null}>
                    <SceneContent
                        {...props}
                    />
                    <SceneCapture onRef={(g: THREE.Group) => (designContentRef.current as any) = g} />
                </Suspense>
            </Canvas>
        </div>
    );
});

function SceneCapture({ onRef }: { onRef: (g: THREE.Group) => void }) {
    const { scene } = useThree();
    useEffect(() => {
        // Repeatedly try to find it in case it's not immediately available
        const interval = setInterval(() => {
            const designGroup = scene.getObjectByName("DesignContent") as THREE.Group;
            if (designGroup) {
                console.log("SceneCapture: Found DesignContent group.");
                onRef(designGroup);
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [scene, onRef]);
    return null;
}

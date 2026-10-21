import React, { useMemo, useRef, Suspense, useState, useEffect } from "react";
import { Canvas, useLoader, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, useTexture, Environment, ContactShadows, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { RoomData, RoomOpening, BlueprintItem, Product } from "../../types";
import { PRODUCTS } from "../../data/mockData";
import { getShapePoints, checkPlacementValidity } from "./RoomMath";
import FurniturePrimitive from "./FurniturePrimitive";
import Floor from "./Floor";

// Wall surfaces for textured walls - Using stable Three.js example textures
const WALL_TEXTURES = {
    brick: "../assets/texture/bricks.jpeg",
    concrete: "../assets/texture/design.jpeg",
    plaster: "../assets/texture/pattern.jpeg",
};

/*
hovering effect is missing
the buttons should be placed below the canvas not in between the canvas and the dimention also the feet measure ment looks very off please fix this too

Keep the canvas after the add window and door button only for mobiles and then let the door and windows added be in a scrollabale format . 

Also the designer page is still not responsive  so ensure that is done too 
*/

// --- 1.2 Ghost Model Component ---
const GhostModel: React.FC<{ product: Product, position: [number, number, number], isValid: boolean }> = ({ product, position, isValid }) => {
    if (!product.model) {
        return (
            <mesh position={position}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={isValid ? "#9DB496" : "#af2d2d"} transparent opacity={0.3} />
            </mesh>
        );
    }

    const { scene } = useGLTF(product.model);
    const { ghostScene, bounds } = useMemo(() => {
        const s = scene.clone();
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
                            (newM as any).transparent = true;
                            (newM as any).opacity = 0.5;
                            (newM as any).color = new THREE.Color(isValid ? "#ffffff" : "#ff0000");
                            return newM;
                        });
                    } else {
                        node.material = node.material.clone();
                        (node.material as any).transparent = true;
                        (node.material as any).opacity = 0.5;
                        (node.material as any).color = new THREE.Color(isValid ? "#ffffff" : "#ff0000");
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
    }, [scene, isValid]);

    return (
        <group position={position}>
            <primitive object={ghostScene} />
            <mesh position={[bounds.centerX, 0.01, bounds.centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[Math.ceil(bounds.width / 0.5) * 0.5, Math.ceil(bounds.depth / 0.5) * 0.5]} />
                <meshBasicMaterial color={isValid ? "#00ff00" : "#ff0000"} transparent opacity={0.4} />
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
            <meshStandardMaterial
                map={wallTexture}
                side={THREE.DoubleSide}
                transparent={true}
                opacity={visible ? 1 : 0.05}
            />
        </mesh>
    );
}

// --- 3. Wall Segment Component (Handles individual tiling) ---
function WallSegment({ width, height, color, texture, isHidden, position }: any) {
    const wallTex = useMemo(() => {
        if (!texture) return null;
        try {
            const t = texture.clone();
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            const safeW = Math.max(0.1, width || 0);
            const safeH = Math.max(0.1, height || 0);
            t.repeat.set(safeW, safeH);
            t.needsUpdate = true;
            return t;
        } catch (e) {
            console.error("Texture cloning failed:", e);
            return null;
        }
    }, [texture, width, height]);

    // Safety check for geometry
    const safeW = Math.max(0.01, width || 0);
    const safeH = Math.max(0.01, height || 0);

    return (
        <mesh position={position} castShadow receiveShadow>
            <planeGeometry args={[safeW, safeH]} />
            <meshStandardMaterial 
                color={wallTex ? "#ffffff" : (color || "#2a2a2a")} 
                map={wallTex || null}
                side={THREE.DoubleSide} 
                transparent={isHidden} 
                opacity={isHidden ? 0.2 : 1} 
                key={wallTex ? "textured" : "plain"} // Using key to force Re-Mount of material
            />
        </mesh>
    );
}

// --- 4. Wall Aperture Component ---
function WallAperture({ wall, color, texture, isHidden, height = 2.5 }: any) {
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
                <WallSegment 
                    position={[(-dist / 2) + (leftSectionWidth / 2), height / 2, 0]}
                    width={leftSectionWidth}
                    height={height}
                    color={color}
                    texture={texture}
                    isHidden={isHidden}
                />
            )}
            {rightSectionWidth > 0 && (
                <WallSegment 
                    position={[(dist / 2) - (rightSectionWidth / 2), height / 2, 0]}
                    width={rightSectionWidth}
                    height={height}
                    color={color}
                    texture={texture}
                    isHidden={isHidden}
                />
            )}
            <WallSegment 
                position={[holeCenterOnWall, (height + (sillH + holeH)) / 2, 0]}
                width={holeW}
                height={Math.max(0, height - (sillH + holeH))}
                color={color}
                texture={texture}
                isHidden={isHidden}
            />
            {!isDoor && (
                <WallSegment 
                    position={[holeCenterOnWall, sillH / 2, 0]}
                    width={holeW}
                    height={sillH}
                    color={color}
                    texture={texture}
                    isHidden={isHidden}
                />
            )}
            <mesh position={[holeCenterOnWall, sillH + holeH / 2, 0.01]}>
                <planeGeometry args={[holeW, holeH]} />
                <meshStandardMaterial color={isDoor ? "#111111" : "#87ceeb"} transparent opacity={isHidden ? 0.1 : 0.6} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

function SceneContent({
    roomData,
    items,
    setItems,
    selectedItemId,
    setSelectedItemId,
    viewMode = '3D',
    placingProduct,
    onPlaceItem,
    onCancelPlacement,
    onWallClick,
    isPlacementMode,
    isPreviewActive = false,
    showWalls = true,
    isMobile = false
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
    onWallClick?: (index: number) => void;
    isPlacementMode?: boolean;
    isPreviewActive?: boolean;
    showWalls?: boolean;
    isMobile?: boolean;
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
        pos: new THREE.Vector3(12, 12, 12),
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

    const { shape, dimensions, openings = [], wallColor, wallTexture = 'plain', floorTexture, panoramaUrl } = roomData;
    const { length: L = 6, width: W = 6, ceilingHeight = 2.5 } = dimensions;

    // Direct, strict comparison for plain mode
    const isActuallyTextured = wallTexture === 'brick' || wallTexture === 'concrete' || wallTexture === 'plaster';
    
    const wallTex = useTexture(
        isActuallyTextured 
            ? (WALL_TEXTURES[wallTexture as keyof typeof WALL_TEXTURES]!) 
            : "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/brick_diffuse.jpg" // Fallback resource (brick) to keep hook alive
    );

    const activeTexture = isActuallyTextured ? wallTex : null;

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
        const offsetDist = 8;
        if (viewMode === 'TOP') {
            setViewTarget({ pos: new THREE.Vector3(0, 22, 0), look: new THREE.Vector3(0, 0, 0) });
            if (controlsRef.current) controlsRef.current.enableRotate = false;
        } else if (viewMode.startsWith('WALL_')) {
            const wallIdx = parseInt(viewMode.split('_')[1]);
            const wall = wallData[wallIdx];
            if (wall) {
                const angle = -wall.angle + Math.PI / 2;
                setViewTarget({
                    pos: new THREE.Vector3(
                        wall.staticCenter.x + Math.cos(angle) * offsetDist,
                        ceilingHeight / 2,
                        wall.staticCenter.y + Math.sin(angle) * offsetDist
                    ),
                    look: new THREE.Vector3(wall.staticCenter.x, ceilingHeight / 2, wall.staticCenter.y)
                });
            }
            if (controlsRef.current) controlsRef.current.enableRotate = true;
        } else {
            setViewTarget({ pos: new THREE.Vector3(12, 12, 12), look: new THREE.Vector3(0, 0, 0) });
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

    const [isPlacementValid, setIsPlacementValid] = useState(true);

    const handleFloorClick = (e: any) => {
        e.stopPropagation();
        if (placingProduct) {
            if (isPlacementValid) {
                onPlaceItem(mousePos);
            }
        } else {
            setSelectedItemId(null);
        }
    };

    const handlePointerMove = (e: any) => {
        if (placingProduct) {
            raycaster.setFromCamera(mouse, camera);
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const intersection = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, intersection)) {
                const newPos: [number, number, number] = [intersection.x, 0, intersection.z];
                setMousePos(newPos);
                
                // Real-time validity check
                const { valid } = checkPlacementValidity(
                    newPos,
                    { width: 1, depth: 1 }, // Default, will use real bounds if available
                    0,
                    items,
                    pointsData
                );
                setIsPlacementValid(valid);
            }
        }
    };

    return (
        <>
            <OrbitControls
                ref={controlsRef}
                makeDefault
                onStart={() => setHasInteracted(true)}
                maxPolarAngle={Math.PI / 2}
                minDistance={1}
                maxDistance={30}
            />
            <ambientLight intensity={0.7} />
            <pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
            {!isPreviewActive && <Grid infiniteGrid cellSize={0.5} sectionSize={1} fadeDistance={30} sectionColor="#000000" sectionThickness={1} />}
            <Environment preset="city" />
            <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.25} far={10} color="#000000" />

            <group name="DesignContent">
                {floorShape && (
                    <Floor 
                        points={pointsData.map(p => ({ x: p.pos.x, y: p.pos.y }))}
                        textureType={floorTexture as any}
                        onPlacement={handleFloorClick}
                    />
                )}

                {showWalls && (
                    panoramaUrl ? (
                        <group>
                            {[
                                { pos: [0, ceilingHeight / 2, -W / 2], rot: [0, 0, 0], idx: 0, w: L },
                                { pos: [L / 2, ceilingHeight / 2, 0], rot: [0, -Math.PI / 2, 0], idx: 1, w: W },
                                { pos: [0, ceilingHeight / 2, W / 2], rot: [0, Math.PI, 0], idx: 2, w: L },
                                { pos: [-L / 2, ceilingHeight / 2, 0], rot: [0, Math.PI / 2, 0], idx: 3, w: W },
                            ].map((wDef, i) => {
                                let isHidden = false;
                                if (isPreviewActive && viewMode.startsWith('WALL_')) {
                                    const viewDir = new THREE.Vector3().subVectors(viewTarget.look, viewTarget.pos).normalize();
                                    const wallPos = new THREE.Vector3(...(wDef.pos as [number, number, number]));
                                    const dirToWall = new THREE.Vector3().subVectors(wallPos, camera.position).normalize();
                                    if (viewDir.dot(dirToWall) < 0.1) isHidden = true;
                                }
                                return (
                                    <group key={i} onClick={(e) => { e.stopPropagation(); onWallClick?.(i); }}>
                                        <TexturedWall
                                            url={panoramaUrl}
                                            width={wDef.w}
                                            height={ceilingHeight}
                                            position={wDef.pos}
                                            rotation={wDef.rot}
                                            offsetIndex={i}
                                            visible={!isHidden}
                                        />
                                    </group>
                                );
                            })}
                        </group>
                    ) : (
                        wallData.map((wall, i) => {
                            let isHidden = false;
                            if (isPreviewActive && viewMode.startsWith('WALL_')) {
                                const viewDir = new THREE.Vector3().subVectors(viewTarget.look, viewTarget.pos).normalize();
                                const wallCenter = new THREE.Vector3(wall.staticCenter.x, ceilingHeight / 2, wall.staticCenter.y);
                                const dirToWall = new THREE.Vector3().subVectors(wallCenter, camera.position).normalize();
                                if (viewDir.dot(dirToWall) < 0.1) isHidden = true;
                            }
                            return (
                                <group 
                                    key={i} 
                                    position={[wall.staticCenter.x, 0, wall.staticCenter.y]} 
                                    rotation={[0, -wall.angle, 0]}
                                    onClick={(e) => { e.stopPropagation(); onWallClick?.(i); }}
                                >
                                    {!wall.opening ? (
                                        <WallSegment 
                                            position={[0, ceilingHeight / 2, 0]}
                                            width={wall.dist}
                                            height={ceilingHeight}
                                            color={wallColor || "#2a2a2a"}
                                            texture={activeTexture}
                                            isHidden={isHidden}
                                        />
                                    ) : (
                                        <WallAperture 
                                            wall={wall} 
                                            color={wallColor || "#2a2a2a"} 
                                            texture={activeTexture}
                                            isHidden={isHidden} 
                                            height={ceilingHeight} 
                                        />
                                    )}
                                </group>
                            );
                        })
                    )
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
                    <GhostModel product={placingProduct} position={mousePos} isValid={isPlacementValid} />
                    
                    {/* Measurement Lines - Ghost Guides (Mobile Only) */}
                    {isMobile && (
                        <group>
                            {/* Calculate distances to walls in real-time */}
                            {wallData.map((wall, i) => {
                                return (
                                    <group key={i}>
                                        <line>
                                            <bufferGeometry attach="geometry" setFromPoints={[
                                                new THREE.Vector3(mousePos[0], 0.05, mousePos[2]),
                                                new THREE.Vector3(wall.staticCenter.x, 0.05, wall.staticCenter.y)
                                            ]} />
                                            <lineBasicMaterial attach="material" color={isPlacementValid ? "#9DB496" : "#af2d2d"} transparent opacity={0.3} />
                                        </line>
                                        <Html position={[(mousePos[0] + wall.staticCenter.x) / 2, 0.1, (mousePos[2] + wall.staticCenter.y) / 2]} center>
                                            <div className="bg-background/80 backdrop-blur-md px-2 py-1 rounded-md border border-text/5">
                                                <span className="text-[7px] font-black tracking-tighter text-text/60">
                                                    {(new THREE.Vector2(mousePos[0], mousePos[2]).distanceTo(wall.staticCenter)).toFixed(2)}m
                                                </span>
                                            </div>
                                        </Html>
                                    </group>
                                );
                            })}
                        </group>
                    )}

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
            }
            return designContentRef.current;
        }
    }));

    return (
        <div className="w-full h-full relative cursor-crosshair">
            <Canvas shadows camera={{ position: [12, 12, 12], fov: 45 }} gl={{ preserveDrawingBuffer: true }}>
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
        const interval = setInterval(() => {
            const designGroup = scene.getObjectByName("DesignContent") as THREE.Group;
            if (designGroup) {
                onRef(designGroup);
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, [scene, onRef]);
    return null;
}

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, ContactShadows, OrbitControls, Stage } from '@react-three/drei';
import { BlueprintItem, Product } from "../../types";
import { PRODUCTS } from "../../data/mockData";

interface ModelItemProps {
    item: BlueprintItem;
    product?: Product;
}

const ModelItem: React.FC<ModelItemProps> = ({ item, product }) => {
    if (!product?.model) {
        // If no model, show a representative box
        return (
            <mesh position={[item.x / 100 - 10, 0.5, item.y / 100 - 10]} rotation={[0, (item.rotation * Math.PI) / 180, 0]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#E4E4F4" />
            </mesh>
        );
    }

    const { scene } = useGLTF(product.model);
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    return (
        <primitive
            object={clonedScene}
            position={[item.x / 100 - 10, 0, item.y / 100 - 10]}
            rotation={[0, (item.rotation * Math.PI) / 180, 0]}
        />
    );
};

interface Blueprint3DSceneProps {
    items: BlueprintItem[];
    onClose: () => void;
}

const Blueprint3DScene: React.FC<Blueprint3DSceneProps> = ({ items, onClose }) => {
    const itemsWithProducts = useMemo(() => {
        return items.map(item => ({
            item,
            product: PRODUCTS.find(p => p.name === item.type)
        }));
    }, [items]);

    return (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in fade-in duration-500">
            <div className="p-10 flex justify-between items-center border-b border-black/5">
                <div>
                    <h2 className="text-3xl font-serif">Spatial Preview</h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 pt-1">Real-time room visualization</p>
                </div>
                <button onClick={onClose} className="px-8 py-3 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">Back to Plan</button>
            </div>

            <div className="flex-1 bg-[#F5F5F3] relative group">
                <Canvas shadows camera={{ position: [15, 15, 15], fov: 45 }}>
                    <Suspense fallback={null}>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} intensity={1} castShadow />

                        <group>
                            {/* Floor */}
                            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                                <planeGeometry args={[100, 100]} />
                                <meshStandardMaterial color="#FBFBF9" />
                            </mesh>

                            {/* Grid decoration */}
                            <gridHelper args={[60, 60, "#0000000a", "#00000005"]} position={[0, 0, 0]} />

                            {/* Items */}
                            {itemsWithProducts.map(({ item, product }) => (
                                <ModelItem key={item.id} item={item} product={product} />
                            ))}
                        </group>

                        <OrbitControls makeDefault />
                        <Environment preset="city" />
                        <ContactShadows
                            position={[0, 0, 0]}
                            opacity={0.3}
                            scale={50}
                            blur={2.5}
                            far={10}
                        />
                    </Suspense>
                </Canvas>

                {/* Dynamic Rotation Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/5 backdrop-blur-md px-6 py-3 rounded-full border border-black/5 pointer-events-none text-[9px] font-black uppercase tracking-[0.3em] text-black/40">
                    Drag to rotate world
                </div>
            </div>
        </div>
    );
};

export default Blueprint3DScene;


import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Layout, Move, RotateCw, Plus, Trash2, Save, Sparkles, Loader2,
  AlertCircle, X, Box, MousePointer2, Info, Star, Maximize,
  ArrowLeft, ArrowRight, ChevronRight, Camera, Download, Check, Upload, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlueprintItem, Product, RoomData, RoomShape, RoomOpening } from '../types';
import { PRODUCTS } from '../data/mockData';
import DesignerRoom from './DesignerRoom';
import html2canvas from 'html2canvas';
import { exportSceneToGLB, uploadToAppScript } from '../services/exporter';
import { toast } from 'sonner';
import DimensionSetup from './RoomDesigner/DimensionSetup';
import OpeningsSetup from './RoomDesigner/OpeningsSetup';

const BlueprintDesigner: React.FC = () => {
  // --- REFS ---
  const designerRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // --- STEP STATE ---
  const [step, setStep] = useState<'selection' | 'shape-selection' | 'dimension-setup' | 'openings-setup' | 'ai-flow' | 'ai-validate' | 'designing'>('selection');

  // --- ROOM DATA STATE ---
  const [roomData, setRoomData] = useState<RoomData>({
    shape: 'SQUARE',
    dimensions: { length: 6, width: 6 },
    openings: [],
    wallColor: '#ffffff',
    floorTexture: 'plain',
    projectTitle: 'Untitled Project'
  });

  const [items, setItems] = useState<BlueprintItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>('3D');
  const [placingProduct, setPlacingProduct] = useState<Product | null>(null);

  // --- UI STATE ---
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'structure' | 'appearance' | 'library'>('structure');
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [aiImages, setAiImages] = useState<File[]>([]);
  const [libraryCategory, setLibraryCategory] = useState<string>('All');
  const [librarySubcategory, setLibrarySubcategory] = useState<string>('All');

  const categories = useMemo(() => ['All', ...new Set(PRODUCTS.map(p => p.category))], []);

  const subCategories = useMemo(() => {
    if (libraryCategory === 'All') return [];
    const subs = PRODUCTS
      .filter(p => p.category === libraryCategory)
      .map(p => p.subcategory);
    return ['All', ...new Set(subs)];
  }, [libraryCategory]);

  useEffect(() => {
    setLibrarySubcategory('All');
  }, [libraryCategory]);

  const filteredLibraryProducts = useMemo(() => {
    return PRODUCTS.filter(p => {
      const matchesCategory = libraryCategory === 'All' || p.category === libraryCategory;
      const subcat = p.subcategory || '';
      const matchesSubcategory = librarySubcategory === 'All' || subcat.toLowerCase() === librarySubcategory.toLowerCase();
      return matchesCategory && matchesSubcategory;
    });
  }, [libraryCategory, librarySubcategory]);


  // --- HELPERS ---
  const updateRoom = (updates: Partial<RoomData>) => {
    setRoomData(prev => ({ ...prev, ...updates }));
  };

  const addOpening = (type: 'DOOR' | 'WINDOW') => {
    const newOpening: RoomOpening = {
      type,
      wallIndex: 0,
      offset: 0.5
    };
    updateRoom({ openings: [...roomData.openings, newOpening] });
  };

  const removeOpening = (index: number) => {
    const newOpenings = [...roomData.openings];
    newOpenings.splice(index, 1);
    updateRoom({ openings: newOpenings });
  };

  const updateOpening = (index: number, updates: Partial<RoomOpening>) => {
    const newOpenings = [...roomData.openings];
    newOpenings[index] = { ...newOpenings[index], ...updates };
    updateRoom({ openings: newOpenings });
  };

  const handleWallClick = (index: number) => {
    // If we're in the library or appearance tab, maybe switch to structure
    if (activeSidebarTab !== 'structure') {
      setActiveSidebarTab('structure');
    }
  };

  const addItemToPlacement = (product: Product) => {
    setPlacingProduct(product);
    setSelectedItemId(null);
    setActiveSidebarTab('library');
  };

  const handlePlaceItem = (position: [number, number, number]) => {
    if (!placingProduct) return;

    const newItem: BlueprintItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: placingProduct.name,
      model: placingProduct.model,
      x: position[0],
      y: position[2],
      rotation: 0,
      position: position
    };

    setItems([...items, newItem]);
    setSelectedItemId(newItem.id);
    setPlacingProduct(null);
  };

  const handleImageUpload = (files: FileList) => {
    const newFiles = Array.from(files);
    setAiImages(prev => [...prev, ...newFiles]);
  };

  const handleStitchRoom = async () => {
    if (aiImages.length < 1) {
      toast.error("Please upload at least one image.");
      return;
    }
    toast.info("Stitching room photos...");

    setIsProcessing(true);
    const formData = new FormData();
    aiImages.forEach(file => formData.append('files', file));

    try {
      const response = await fetch(import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:8000/process-room', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.status === 'success') {
        toast.success("Room stitched successfully!");
        console.log("AI result received:", result);

        console.log("Transitioning to 'ai-validate' step...");
        setStep('ai-validate');
      } else {
        toast.error(`Processing error: ${result.message}`);
      }
    } catch (error) {
      console.error("AI Processing failed:", error);
      toast.error("Failed to process room. Ensure the AI server is running.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScreenshot = async () => {
    if (canvasContainerRef.current) {
      const canvas = await html2canvas(canvasContainerRef.current);
      const link = document.createElement('a');
      link.download = `${roomData.projectTitle}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleExportGLB = async () => {
    if (designerRef.current) {
      const scene = designerRef.current.getScene();
      if (scene) {
        await exportSceneToGLB(scene, `${roomData.projectTitle}.glb`);
      }
    }
  };

  const handleProductHover = (e: React.MouseEvent, product: Product) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPos({ top: Math.max(100, rect.top - 100), left: rect.right + 20 });
    setHoveredProduct(product);
  };

  // --- VIEWS ---

  if (step === 'selection') {
    const initializeManualFlow = () => {
      setItems([]); // Clear any previous items
      setRoomData({
        shape: 'SQUARE',
        dimensions: { length: 6, width: 6 },
        openings: [],
        wallColor: '#ffffff',
        floorTexture: 'plain',
        projectTitle: 'Untitled Project'
      });
      setStep('shape-selection');
    };

    const initializeAiFlow = () => {
      setItems([]); // Clear any previous items
      setAiImages([]); // Clear previous photos
      setRoomData({
        shape: 'SQUARE',
        dimensions: { length: 6, width: 6 },
        openings: [],
        wallColor: '#ffffff',
        floorTexture: 'plain',
        projectTitle: 'Untitled Project'
      });
      setStep('ai-flow');
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen w-full pt-20 bg-[#FBFBF9] flex flex-col items-center justify-center p-4 text-black overflow-hidden relative"
      >
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-0 border border-black/5 rounded-[40px] overflow-hidden bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)]">
          {/* Manual Designer Side */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-16 md:p-24 flex flex-col justify-between border-b md:border-b-0 md:border-r border-black/5 group hover:bg-[#FBFBF9] transition-colors duration-700"
          >
            <div className="space-y-8">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20 block">Option 01</span>
              <div className="space-y-4">
                <h2 className="text-5xl font-serif tracking-tight leading-tight">Manual <br /><span className="font-light">Designer</span></h2>
                <p className="text-black/40 text-sm leading-relaxed max-w-xs">Precision-driven spatial planning. Build your environment from the ground up with custom dimensions and architectural modules.</p>
              </div>
            </div>
            <motion.button
              whileHover={{ x: 10 }}
              onClick={initializeManualFlow}
              className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] group-hover:text-black text-black/40 transition-all mt-12"
            >
              Enter Studio <ArrowRight size={16} />
            </motion.button>
          </motion.div>

          {/* AI Designer Side */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-16 md:p-24 flex flex-col justify-between bg-black text-white group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
              <Sparkles size={200} strokeWidth={0.5} />
            </div>
            <div className="space-y-8 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 block">Option 02</span>
              <div className="space-y-4">
                <h2 className="text-5xl font-serif tracking-tight leading-tight">AI Image <br /><span className="font-light text-white/60">Synthesis</span></h2>
                <p className="text-white/40 text-sm leading-relaxed max-w-xs">Neural reconstruction from photography. Upload your space and let our engine generate a digital twin in seconds.</p>
              </div>
            </div>
            <motion.button
              whileHover={{ x: 10 }}
              onClick={initializeAiFlow}
              className="flex items-center gap-4 text-[11px] font-black uppercase tracking-[0.3em] group-hover:text-white text-white/40 transition-all mt-12 relative z-10"
            >
              Initialize Flow <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        </div>

        {/* Minimal Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-[9px] font-black uppercase tracking-[0.5em] text-black/10"
        >
          PlanPro Architectural Suite © 2026
        </motion.div>
      </motion.div>
    );
  }

  if (step === 'shape-selection') {
    const shapes = [
      { id: 'SQUARE' as RoomShape, name: 'Square', icon: <div className="w-12 h-12 border border-black/20 rounded-sm" /> },
      {
        id: 'L_SHAPE' as RoomShape, name: 'L-Shaped', icon: (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-black/20 stroke-[1.5]">
            <path d="M10 10V38H38V24H24V10H10Z" />
          </svg>
        )
      },
      {
        id: 'T_SHAPE' as RoomShape, name: 'T-Shaped', icon: (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-black/20 stroke-[1.5]">
            <path d="M10 10H38V24H28V38H20V24H10V10Z" />
          </svg>
        )
      },
      {
        id: 'HEXAGON' as RoomShape, name: 'Hexagon', icon: (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-black/20 stroke-[1.5]">
            <path d="M24 6L39.5885 15V33L24 42L8.41154 33V15L24 6Z" />
          </svg>
        )
      },
    ];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen w-full pt-20 bg-[#FBFBF9] flex flex-col items-center justify-center p-4 text-black overflow-hidden relative"
      >
        <motion.button
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => setStep('selection')}
          className="absolute top-32 left-10 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </motion.button>

        <div className="max-w-5xl w-full space-y-24 text-center">
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20 block">Spatial Footprint</span>
            <h2 className="text-5xl font-serif tracking-tight leading-tight">Select <span className="font-light">Foundation</span></h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {shapes.map((shape, idx) => (
              <motion.button
                key={shape.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -10 }}
                onClick={() => {
                  updateRoom({ shape: shape.id });
                  setStep('dimension-setup');
                }}
                className="group flex flex-col items-center gap-8"
              >
                <div className="w-full aspect-square rounded-[40px] bg-white border border-black/5 flex items-center justify-center group-hover:border-black transition-all duration-500 group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)]">
                  {shape.icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30 group-hover:text-black transition-colors">{shape.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (step === 'ai-flow') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-screen w-full pt-20 bg-[#FBFBF9] flex flex-col items-center justify-center p-4 text-black overflow-hidden relative"
      >
        <motion.button
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => setStep('selection')}
          className="absolute top-32 left-10 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </motion.button>

        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20 block">Neural Engine</span>
            <h2 className="text-5xl font-serif tracking-tight leading-tight">Room <br /><span className="font-light">Stitching</span></h2>
            <p className="text-black/40 text-sm leading-relaxed">Our AI analyzes visual depth and spatial geometry from your photos to construct a precise 3D model.</p>

            <div className="space-y-4 pt-8 border-t border-black/5">
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-black/40">
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
                Minimum 3 angles required
              </div>
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-black/40">
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
                High resolution preferred
              </div>
            </div>

            {aiImages.length > 0 && (
              <div className="space-y-4 pt-4">
                <div className="bg-white border border-black/5 p-8 rounded-[40px] space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30">Custom Room Scale</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-black/30 uppercase tracking-widest">Length (m)</p>
                      <input
                        type="number"
                        value={roomData.dimensions.length}
                        onChange={(e) => updateRoom({ dimensions: { ...roomData.dimensions, length: parseFloat(e.target.value) || 0 } })}
                        className="text-xl font-bold tracking-tighter w-full bg-transparent border-b border-black/10 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-black/30 uppercase tracking-widest">Width (m)</p>
                      <input
                        type="number"
                        value={roomData.dimensions.width}
                        onChange={(e) => updateRoom({ dimensions: { ...roomData.dimensions, width: parseFloat(e.target.value) || 0 } })}
                        className="text-xl font-bold tracking-tighter w-full bg-transparent border-b border-black/10 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStitchRoom}
                  className="w-full py-6 bg-black text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl flex items-center justify-center gap-3"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  Construct digital twin
                </motion.button>
              </div>
            )}

            {!aiImages.length && (
              <button
                onClick={() => {
                  setItems([]);
                  setStep('designing');
                }}
                className="text-[10px] font-black uppercase tracking-widest text-black/30 hover:text-black transition-colors"
              >
                Skip to Empty Designer
              </button>
            )}
          </div>

          <label className="aspect-square bg-white border border-black/5 rounded-[40px] p-12 flex flex-col items-center justify-center text-center space-y-8 shadow-[0_40px_100px_rgba(0,0,0,0.05)] cursor-pointer group hover:scale-[1.02] transition-all">
            <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleImageUpload(e.target.files)} />
            <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-500">
              {aiImages.length > 0 ? <Check size={32} /> : <Plus size={32} />}
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest">
                {aiImages.length > 0 ? `${aiImages.length} Images selected` : 'Drop files here'}
              </p>
              <p className="text-[9px] text-black/30 uppercase tracking-widest">or click to browse</p>
            </div>
          </label>
        </div>
      </motion.div>
    );
  }

  if (step === 'ai-validate') {
    return (
      <div className="h-screen bg-black relative overflow-hidden">
        {/* Floating Controls */}
        <div className="absolute top-12 left-12 z-50 flex items-center gap-6">
          <button
            onClick={() => setStep('ai-flow')}
            className="w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="space-y-1">
            <h2 className="text-3xl font-serif text-white">Review Environment</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">AI Stitched 3D Reconstruction</p>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 flex gap-4">
          <button
            onClick={() => setStep('ai-flow')}
            className="px-8 py-5 bg-white/10 backdrop-blur-xl border border-white/10 text-white rounded-[32px] font-black uppercase tracking-widest text-[10px] hover:bg-white/20 transition-all"
          >
            Re-Stitch
          </button>
          <button
            onClick={() => setStep('designing')}
            className="px-12 py-5 bg-white text-black rounded-[32px] font-black uppercase tracking-widest text-[10px] shadow-[0_20px_40px_rgba(255,255,255,0.2)] hover:scale-105 transition-all flex items-center gap-3"
          >
            Looks Good! Add Furniture <Box size={16} />
          </button>
        </div>

        {/* 3D Preview */}
        <div className="w-full h-full">
          <DesignerRoom
            roomData={roomData}
            items={[]}
            setItems={() => { }}
            viewMode="3D"
          />
        </div>

        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/20" />
      </div>
    );
  }

  if (step === 'dimension-setup') {
    return (
      <div className="h-screen w-full pt-20 bg-[#FBFBF9] flex items-center justify-center p-4 overflow-hidden">
        <DimensionSetup
          data={roomData}
          onUpdate={updateRoom}
          onNext={() => setStep('openings-setup')}
          onBack={() => setStep('shape-selection')}
        />
      </div>
    );
  }

  if (step === 'openings-setup') {
    return (
      <div className="h-screen w-full pt-20 bg-[#FBFBF9] flex items-center justify-center p-4 overflow-hidden">
        <OpeningsSetup
          data={roomData}
          onUpdate={updateRoom}
          onNext={() => setStep('designing')}
          onBack={() => setStep('dimension-setup')}
        />
      </div>
    );
  }


  // --- DESIGNER VIEW ---
  return (
    <div className="flex h-screen w-full pt-20 bg-[#F5F5F3] overflow-hidden relative">
      {/* Product Info Popup */}
      <AnimatePresence>
        {hoveredProduct && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed z-[300] w-[320px] bg-white border border-black/5 rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.15)] pointer-events-none flex flex-col overflow-hidden max-h-[85vh]"
            style={{ top: `${popupPos.top}px`, left: `${popupPos.left}px` }}
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-[#F5F5F3]">
              <img src={hoveredProduct.image} className="w-full h-full object-cover" alt={hoveredProduct.name} />
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-[0.3em] text-black/30 font-black block">{hoveredProduct.category}</span>
                <h5 className="font-serif text-2xl leading-tight text-black">{hoveredProduct.name}</h5>
              </div>
              <div className="flex justify-between items-center py-4 border-y border-black/5">
                <span className="text-2xl font-bold tracking-tighter text-black">${hoveredProduct.price}</span>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full text-amber-500">
                  <Star size={14} fill="currentColor" />
                  <span className="text-[11px] font-black text-black">{hoveredProduct.rating}</span>
                </div>
              </div>
              <p className="text-[11px] text-black/40 leading-relaxed font-medium italic">{hoveredProduct.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          width: isSidebarCollapsed ? 0 : 320,
          x: isSidebarCollapsed ? -320 : 0,
          opacity: isSidebarCollapsed ? 0 : 1,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="h-full bg-white border-r border-black/5 flex flex-col z-[50] shadow-2xl shadow-black/5 overflow-hidden relative flex-shrink-0"
        style={{
          pointerEvents: isSidebarCollapsed ? 'none' : 'auto',
          visibility: isSidebarCollapsed && !isSidebarCollapsed /* trick to keep it in DOM but hide if needed */ ? 'hidden' : 'visible'
        }}
      >
        <div className="p-8 border-b border-black/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep('selection')}
                  className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors text-black/40 hover:text-black"
                >
                  <ArrowLeft size={20} />
                </button>

              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">Precise Room Design</p>
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
          </div>

          <div className="flex gap-2 p-1 bg-black/5 rounded-2xl">
            {(['appearance', 'library'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSidebarTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeSidebarTab === tab ? 'bg-black text-white shadow-lg' : 'text-black/40 hover:text-black'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 pb-32">
          <div className="space-y-6">
          {activeSidebarTab === 'appearance' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
              <section className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30">Wall color</h4>
                <div className="grid grid-cols-4 gap-3">
                  {['#ffffff', '#E4E4F4', '#FDE7D1', '#F5F5F3', '#000000', '#2d3436', '#636e72', '#b2bec3'].map(col => (
                    <button
                      key={col}
                      onClick={() => updateRoom({ wallColor: col })}
                      className={`aspect-square rounded-full border-2 transition-all ${roomData.wallColor === col ? 'border-black scale-110' : 'border-black/5'}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </section>
              <section className="space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30">Floor Materials</h4>
                {['plain', 'wood', 'tiles'].map(mat => (
                  <button
                    key={mat}
                    onClick={() => updateRoom({ floorTexture: mat as any })}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${roomData.floorTexture === mat ? 'bg-black text-white border-black' : 'bg-white border-black/5 text-black'}`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">{mat}</span>
                    {roomData.floorTexture === mat && <Check size={16} />}
                  </button>
                ))}
              </section>
            </motion.div>
          )}

          {activeSidebarTab === 'library' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
              <section className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40">Categories</h3>
                  <span className="text-[8px] font-bold text-black/20 uppercase tracking-widest">{filteredLibraryProducts.length} Items</span>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setLibraryCategory(cat)}
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${libraryCategory === cat ? 'bg-black border-black text-white shadow-md' : 'bg-white border-black/5 text-black/30 hover:text-black hover:border-black/20'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {libraryCategory !== 'All' && subCategories.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 animate-in slide-in-from-top-2 duration-500">
                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-black/20 px-1">Refine</span>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {subCategories.map(sub => (
                        <button
                          key={sub}
                          onClick={() => setLibrarySubcategory(sub)}
                          className={`whitespace-nowrap px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${librarySubcategory.toLowerCase() === sub.toLowerCase() ? 'bg-black text-white shadow-sm' : 'bg-white/50 border-black/5 text-black/40 hover:text-black hover:border-black/20'}`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 px-1">Furniture Pieces</h3>
                <div className="grid grid-cols-2 gap-3">
                  {filteredLibraryProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addItemToPlacement(p)}
                      onMouseEnter={(e) => handleProductHover(e, p)}
                      onMouseLeave={() => setHoveredProduct(null)}
                      className="group flex flex-col gap-2"
                    >
                      <div className="aspect-square bg-[#F5F5F3] rounded-2xl overflow-hidden border border-black/5 group-hover:border-black transition-all p-3 relative shadow-sm">
                        <img src={p.image} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-white opacity-0 group-hover:opacity-100"><Info size={10} /></div>
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-black/40 group-hover:text-black truncate px-1">{p.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </div>
      </div>

      <div className="p-8 border-t border-black/5 bg-white space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-black/30">Total Value</span>
            <span className="text-lg font-bold tracking-tighter">${items.reduce((acc, it) => acc + (PRODUCTS.find(p => p.name === it.type)?.price || 0), 0)}</span>
          </div>
          <button
            onClick={async () => {
              const saveToast = toast.loading("Initializing save process...");
              try {
                const APPSCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
                console.log("--- Starting Project Save ---");
                console.log("Target AppScript URL:", APPSCRIPT_URL);

                if (!APPSCRIPT_URL) {
                  throw new Error("VITE_APPSCRIPT_URL is missing in environment variables.");
                }

                const timestamp = Date.now();
                const projectTitle = roomData.projectTitle || 'Project';

                // 1. Capture Thumbnail
                toast.loading("Capturing workspace preview...", { id: saveToast });
                if (canvasContainerRef.current) {
                  console.log("Step 1: Capturing Workspace Screenshot...");
                  try {
                    const canvas = await html2canvas(canvasContainerRef.current, {
                      useCORS: true,
                      allowTaint: true,
                      backgroundColor: '#FBFBF9',
                      ignoreElements: (element) => element.tagName === 'ASIDE' || element.classList.contains('z-30')
                    });

                    const pngData = canvas.toDataURL('image/png');
                    const blob = await (await fetch(pngData)).blob();

                    console.log("Uploading Thumbnail...");
                    await uploadToAppScript(blob, `Preview_${projectTitle}_${timestamp}.png`, 'image/png');
                    console.log("Thumbnail Saved.");
                    toast.success("Thumbnail saved.", { id: saveToast });
                  } catch (scrErr) {
                    console.warn("Screenshot capture failed, continuing with model only:", scrErr);
                  }
                }

                // 2. Export 3D Model
                toast.loading("Processing 3D Scene...", { id: saveToast });
                if (designerRef.current) {
                  console.log("Step 2: Accessing 3D Scene...");
                  const scene = designerRef.current.getScene();
                  if (scene) {
                    console.log("Exporting Scene to GLB...");
                    // This function will now show its own "Uploading 3D Model" toast info
                    await exportSceneToGLB(scene, `${projectTitle}_${timestamp}.glb`);
                    console.log("3D Model Saved.");
                  } else {
                    throw new Error("Could not access 3D scene data. Try again.");
                  }
                } else {
                  throw new Error("Designer reference is not ready.");
                }

                // 3. Upload AI Source Images (if any)
                if (aiImages && aiImages.length > 0) {
                  toast.loading(`Uploading ${aiImages.length} source images...`, { id: saveToast });
                  console.log(`Step 3: Uploading ${aiImages.length} AI sources to 'AI_Uploads'...`);
                  for (const imgFile of aiImages) {
                    await uploadToAppScript(imgFile, `Source_${timestamp}_${imgFile.name}`, imgFile.type);
                  }
                  console.log("AI Sources Saved.");
                }

                toast.success("Project saved successfully!", { id: saveToast });
                console.log("--- Project Save Complete ---");
              } catch (err) {
                console.error("FATAL SAVE FAILURE:", err);
                toast.error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { id: saveToast });
              }
            }}
            className="w-full py-5 bg-black text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-black/80 transition-all font-bold"
          >
            Save Project
          </button>
        </div>
      </motion.aside>


      {/* Workspace */}
      <main className="flex-1 relative bg-[#FBFBF9] flex flex-col" ref={canvasContainerRef}>
        <div className="absolute top-8 left-0 right-0 px-8 flex justify-center items-start z-20 pointer-events-none">
          <div className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-black/5 p-1.5 rounded-full flex items-center shadow-xl">
            {[
              { id: '3D', label: 'Free View' },
              { id: 'TOP', label: 'Plan View' },
              { id: 'WALL_0', label: 'Wall 1' },
              { id: 'WALL_1', label: 'Wall 2' },
              { id: 'WALL_2', label: 'Wall 3' },
              { id: 'WALL_3', label: 'Wall 4' }
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-6 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${viewMode === v.id ? 'bg-black text-white shadow-lg' : 'text-black/30 hover:text-black'}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-10 right-10 flex flex-col gap-4 z-20">
          <button onClick={handleScreenshot} className="p-4 bg-white text-black rounded-2xl shadow-xl border border-black/5 hover:bg-black/5 transition-all"><Camera size={20} /></button>
          <button onClick={handleExportGLB} className="p-4 bg-white text-black rounded-2xl shadow-xl border border-black/5 hover:bg-black/5 transition-all"><Download size={20} /></button>
          <button className="p-4 bg-black text-white rounded-2xl shadow-2xl hover:scale-105 transition-all"><Sparkles size={20} /></button>
        </div>

        <div className="flex-1 relative">
          <DesignerRoom
            ref={designerRef}
            roomData={roomData}
            items={items}
            setItems={setItems}
            selectedItemId={selectedItemId}
            setSelectedItemId={setSelectedItemId}
            viewMode={viewMode}
            placingProduct={placingProduct}
            onPlaceItem={handlePlaceItem}
            onCancelPlacement={() => setPlacingProduct(null)}
            onWallClick={handleWallClick}
          />

          {placingProduct && (
            <div className="absolute top-32 left-1/2 -translate-x-1/2 z-40 bg-indigo-600 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
              <MousePointer2 size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Click floor to place {placingProduct.name}</span>
              <div className="w-px h-4 bg-white/20" />
              <span className="text-[9px] font-bold opacity-60 uppercase">ESC TO CANCEL</span>
            </div>
          )}

          {selectedItemId && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 bg-black/90 text-white px-8 py-4 rounded-[32px] shadow-2xl flex gap-8 items-center animate-in slide-in-from-bottom-8">
              <div className="flex flex-col pr-8 border-r border-white/10">
                <span className="text-[11px] font-black uppercase tracking-widest truncate max-w-[120px]">
                  {items.find(i => i.id === selectedItemId)?.type}
                </span>
                <span className="text-[9px] opacity-40 uppercase tracking-widest font-bold">Selected Element</span>
              </div>
              <div className="flex gap-6">
                <button
                  onClick={() => setItems(items.map(it => it.id === selectedItemId ? { ...it, rotation: (it.rotation + 45) % 360 } : it))}
                  className="flex flex-col items-center gap-1 hover:text-white/50 transition-colors"
                >
                  <RotateCw size={18} />
                  <span className="text-[8px] font-black uppercase">Rotate</span>
                </button>
                <button
                  onClick={() => { setItems(items.filter(it => it.id !== selectedItemId)); setSelectedItemId(null); }}
                  className="flex flex-col items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={18} />
                  <span className="text-[8px] font-black uppercase">Delete</span>
                </button>
                <button onClick={() => setSelectedItemId(null)} className="flex flex-col items-center gap-1 hover:text-white/50 transition-colors">
                  <X size={18} />
                  <span className="text-[8px] font-black uppercase">Close</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Redesigned Floating Sidebar Toggle - Placed at the very end for max visibility */}
      <AnimatePresence>
        {isSidebarCollapsed && (
          <motion.div
            initial={{ x: -150, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -150, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-[99999] flex flex-col gap-4 pl-6"
          >
            <motion.button
              whileHover={{ scale: 1.05, x: 10 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                console.log("Expanding Sidebar...");
                setIsSidebarCollapsed(false);
                toast.success("Designer Toolbar Expanded");
              }}
              className="flex items-center gap-5 bg-black text-white p-6 rounded-r-[40px] rounded-l-[20px] shadow-[10px_30px_60px_rgba(0,0,0,0.5)] border border-white/20 group transition-all relative overflow-hidden"
            >
              {/* Glow highlight */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-all border border-white/10">
                <ChevronRight size={28} className="group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="text-left pr-8 relative z-10">
                <p className="text-[12px] font-black uppercase tracking-[0.3em] leading-tight mb-0.5">Editor</p>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.1em]">Collapse / Expand</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05, x: 10 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStep('selection')}
              className="flex items-center gap-5 bg-white text-black p-6 rounded-r-[40px] rounded-l-[20px] shadow-2xl border border-black/5 group transition-all"
            >
              <div className="w-14 h-14 bg-black/5 rounded-full flex items-center justify-center group-hover:bg-black/10 transition-colors">
                <ArrowLeft size={24} />
              </div>
              <div className="text-left pr-8">
                <p className="text-[12px] font-black uppercase tracking-[0.3em] leading-tight mb-0.5">Exit</p>
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.1em]">Return to Menu</p>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BlueprintDesigner;

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Layout, Move, RotateCw, Plus, Trash2, Save, Sparkles, Loader2,
  AlertCircle, X, Box, MousePointer2, Info, Star, Maximize, Heart,
  ArrowLeft, ArrowRight, ChevronRight, Camera, Download, Check, Upload, ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BlueprintItem, Product, RoomData, RoomShape, RoomOpening } from '../types';
import { PRODUCTS } from '../data/mockData';
import DesignerRoom from './DesignerRoom';
import html2canvas from 'html2canvas';
import { exportSceneToGLB, uploadToAppScript } from '../services/exporter';
import { toast } from 'sonner';

interface BlueprintDesignerProps {
  wishlist?: string[];
  toggleWishlist?: (id: string) => void;
}

const BlueprintDesigner: React.FC<BlueprintDesignerProps> = ({ wishlist = [], toggleWishlist }) => {
  // --- REFS ---
  const designerRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // --- STEP STATE ---
  const [step, setStep] = useState<'selection' | 'shape-selection' | 'ai-flow' | 'ai-validate' | 'designing'>('selection');

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

  // New states
  const [projectTitle, setProjectTitle] = useState('Untitled Project');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

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

  const totalCost = items.reduce((sum, item) => sum + (item.price || 0), 0);

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

  const addItemToPlacement = (product: Product) => {
    setPlacingProduct(product);
    setSelectedItemId(null);
    setActiveSidebarTab('library');
  };

  const handlePlaceItem = (position: [number, number, number]) => {
    if (!placingProduct) return;

    const newItem: BlueprintItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: placingProduct.name,
      type: placingProduct.subcategory,
      model: placingProduct.model,
      texture: placingProduct.texture,
      x: position[0],
      y: position[2],
      rotation: 0,
      position: position,
      price: placingProduct.price
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
        updateRoom({
          dimensions: {
            length: result.results?.length || roomData.dimensions.length || 6,
            width: result.results?.breadth || roomData.dimensions.width || 6
          },
          panoramaUrl: result.panorama_url
        });
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
      link.download = `${projectTitle}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const handleExportGLB = async () => {
    if (designerRef.current) {
      const scene = designerRef.current.getScene();
      if (scene) {
        await exportSceneToGLB(scene, `${projectTitle}.glb`);
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
      setItems([]);
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
      setItems([]);
      setAiImages([]);
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
        className="min-h-screen pt-24 bg-[#FBFBF9] flex flex-col items-center justify-center p-6 text-black overflow-hidden relative"
      >
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-0 border border-black/5 rounded-[40px] overflow-hidden bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)]">
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
        className="min-h-screen pt-24 bg-[#FBFBF9] flex flex-col items-center justify-center p-6 text-black overflow-hidden relative"
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
                  setStep('designing');
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
        className="min-h-screen pt-24 bg-[#FBFBF9] flex flex-col items-center justify-center p-6 text-black overflow-hidden relative"
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
  // --- DESIGNER VIEW ---
  return (
    <div className="flex h-screen bg-[#FBFBF9] overflow-hidden relative">
      {/* Dynamic Header - Floating and Integrated */}
      <header className="absolute top-8 left-0 right-0 z-[100] px-10 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-6 pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowExitConfirm(true)} 
            className="p-4 bg-white/80 backdrop-blur-xl rounded-full shadow-2xl border border-white/20 hover:bg-black hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </motion.button>
          
          <div className="bg-white/80 backdrop-blur-xl px-10 py-4 rounded-full shadow-2xl border border-white/20 flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-black/30 leading-none mb-1">Project</span>
              {isEditingTitle ? (
                <input
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                  className="font-serif text-xl outline-none bg-transparent min-w-[120px]"
                  autoFocus
                />
              ) : (
                <h1 className="font-serif text-xl cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => setIsEditingTitle(true)}>
                  {projectTitle}
                </h1>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPreviewActive(!isPreviewActive)}
            className={`px-8 py-4 rounded-full shadow-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
              isPreviewActive 
                ? 'bg-black text-white border-black' 
                : 'bg-white/80 backdrop-blur-xl text-black border-white/20 hover:bg-black hover:text-white'
            }`}
          >
            {isPreviewActive ? 'Exit Preview' : 'Full Preview'}
          </motion.button>
          
          <div className="w-px h-8 bg-black/10 mx-1" />
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsBillOpen(true)} 
            className="px-10 py-4 bg-black text-white rounded-full shadow-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all"
          >
            ₹{totalCost.toLocaleString()}
          </motion.button>
        </div>
      </header>

      {/* Main Experience Container */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Left Control Sidebar - Floating Glassmorphism */}
        <AnimatePresence mode="wait">
          {!isPreviewActive && (
            <motion.aside
              initial={{ x: -440, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -440, opacity: 0 }}
              transition={{ type: "spring", damping: 35, stiffness: 250, restDelta: 0.001 }}
              className="absolute left-8 top-32 bottom-8 w-[380px] bg-white/80 backdrop-blur-2xl rounded-[40px] border border-white/40 shadow-[0_40px_100px_rgba(0,0,0,0.05)] flex flex-col z-50 overflow-hidden"
            >
              <div className="p-10 border-b border-black/5">
                <div className="flex gap-2 p-1.5 bg-black/5 rounded-2xl">
                  {(['structure', 'appearance'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveSidebarTab(tab)}
                      className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeSidebarTab === tab 
                          ? 'bg-black text-white shadow-xl' 
                          : 'text-black/40 hover:text-black hover:bg-black/5'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-10 py-6 custom-scrollbar">
                {activeSidebarTab === 'structure' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                    <section className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-black/30">Geometric Bounds</h3>
                      <div className="grid grid-cols-2 gap-5">
                        <div className="bg-white p-6 rounded-[28px] border border-black/5 shadow-sm space-y-2 group focus-within:border-indigo-500 transition-all">
                          <p className="text-[8px] font-black text-black/20 uppercase tracking-widest">Length (m)</p>
                          <input
                            type="number"
                            value={roomData.dimensions.length}
                            onChange={(e) => updateRoom({ dimensions: { ...roomData.dimensions, length: parseFloat(e.target.value) || 0 } })}
                            className="text-3xl font-serif italic w-full bg-transparent focus:outline-none"
                          />
                        </div>
                        <div className="bg-white p-6 rounded-[28px] border border-black/5 shadow-sm space-y-2 group focus-within:border-indigo-500 transition-all">
                          <p className="text-[8px] font-black text-black/20 uppercase tracking-widest">Width (m)</p>
                          <input
                            type="number"
                            value={roomData.dimensions.width}
                            onChange={(e) => updateRoom({ dimensions: { ...roomData.dimensions, width: parseFloat(e.target.value) || 0 } })}
                            className="text-3xl font-serif italic w-full bg-transparent focus:outline-none"
                          />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-black/30">Wall Modules</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => addOpening('DOOR')} className="p-5 bg-white border border-black/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-black hover:shadow-lg transition-all">Add Door</button>
                        <button onClick={() => addOpening('WINDOW')} className="p-5 bg-white border border-black/5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-black hover:shadow-lg transition-all">Add Window</button>
                      </div>
                      <div className="space-y-4">
                        {roomData.openings.map((op, idx) => (
                          <div key={idx} className="p-5 bg-white border border-black/5 rounded-[24px] space-y-4 shadow-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase tracking-widest">{op.type} Unit - Wall {op.wallIndex + 1}</span>
                              <button onClick={() => removeOpening(idx)} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={16} /></button>
                            </div>
                            <input
                              type="range" min="0" max="1" step="0.01" value={op.offset}
                              onChange={(e) => updateOpening(idx, { offset: parseFloat(e.target.value) })}
                              className="w-full h-1 bg-black/5 rounded-lg appearance-none cursor-pointer accent-black"
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  </motion.div>
                )}

                {activeSidebarTab === 'appearance' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                    <section className="space-y-8">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30">Chromatic Tint</h4>
                      <div className="grid grid-cols-4 gap-4">
                        {['#ffffff', '#F5F5F3', '#E4E4F4', '#FDE7D1', '#FFF4E5', '#F5E6E8', '#000000', '#2d3436'].map(col => (
                          <button
                            key={col}
                            onClick={() => updateRoom({ wallColor: col })}
                            className={`aspect-square rounded-full border-4 transition-all shadow-md ${
                              roomData.wallColor === col ? 'border-indigo-500 scale-110' : 'border-white hover:border-black/10'
                            }`}
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                    </section>

                    <section className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30">Flooring Matrix</h4>
                      <div className="space-y-3">
                        {['plain', 'wood', 'tiles'].map(mat => (
                          <button
                            key={mat}
                            onClick={() => updateRoom({ floorTexture: mat as any })}
                            className={`w-full p-6 rounded-2xl flex items-center justify-between border-2 transition-all ${
                              roomData.floorTexture === mat 
                                ? 'bg-black text-white border-black shadow-xl ring-4 ring-black/5' 
                                : 'bg-white border-black/5 text-black hover:border-black/20'
                            }`}
                          >
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{mat}</span>
                            {roomData.floorTexture === mat && <Check size={18} />}
                          </button>
                        ))}
                      </div>
                    </section>
                  </motion.div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Dynamic Workspace */}
        <main 
          className="flex-1 relative bg-[#FBFBF9] transition-all duration-700 ease-in-out" 
          ref={canvasContainerRef}
        >
          {/* View Controller - Centered Floating Pill */}
          <div className="absolute top-32 left-0 right-0 flex justify-center z-40 pointer-events-none">
            <div className="pointer-events-auto bg-black/90 backdrop-blur-3xl border border-white/10 p-2 rounded-full flex items-center shadow-2xl">
              {[
                { id: '3D', label: '3D Studio' },
                { id: 'TOP', label: 'Blueprint' },
                { id: 'WALL_0', label: 'W1' },
                { id: 'WALL_1', label: 'W2' },
                { id: 'WALL_2', label: 'W3' },
                { id: 'WALL_3', label: 'W4' }
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={`px-8 py-3.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    viewMode === v.id 
                      ? 'bg-white text-black shadow-xl scale-105' 
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Tools - Floating Stack */}
          <div className="absolute bottom-10 right-10 flex flex-col gap-5 z-40">
            <motion.button
              whileHover={{ scale: 1.1, x: -10 }}
              onClick={handleScreenshot}
              className="p-5 bg-white/90 backdrop-blur-xl text-black rounded-3xl shadow-2xl border border-white/50 hover:bg-black hover:text-white transition-all"
            >
              <Camera size={24} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, x: -10 }}
              onClick={handleExportGLB}
              className="p-5 bg-white/90 backdrop-blur-xl text-black rounded-3xl shadow-2xl border border-white/50 hover:bg-black hover:text-white transition-all"
            >
              <Download size={24} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.2, rotate: 10 }}
              className="p-6 bg-indigo-600 text-white rounded-[32px] shadow-[0_30px_60px_rgba(79,70,229,0.4)] hover:bg-black transition-all border border-indigo-400/30"
            >
              <Sparkles size={28} />
            </motion.button>
          </div>

          <div className="w-full h-full relative">
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
            />

            {/* Interaction Overlays */}
            <AnimatePresence>
              {placingProduct && (
                <motion.div
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 60, opacity: 0 }}
                  className="absolute bottom-32 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-12 py-6 rounded-full shadow-[0_40px_100px_rgba(0,0,0,0.4)] flex items-center gap-6 border border-white/10"
                >
                  <div className="p-3 bg-white/10 rounded-full animate-pulse"><MousePointer2 size={18} /></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.4em] whitespace-nowrap">Tap floor to instantiate unit</span>
                  <div className="w-px h-6 bg-white/20 mx-2" />
                  <span className="text-[9px] font-bold opacity-40 uppercase tracking-widest whitespace-nowrap">ESC: Dismiss</span>
                </motion.div>
              )}

              {selectedItemId && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="absolute bottom-10 left-10 right-10 flex justify-center z-50 pointer-events-none"
                >
                  <div className="pointer-events-auto bg-white/80 backdrop-blur-3xl border border-white/50 text-black px-12 py-6 rounded-[48px] shadow-[0_50px_120px_rgba(0,0,0,0.15)] flex gap-12 items-center">
                    <div className="flex flex-col pr-12 border-r border-black/5">
                      <span className="text-[12px] font-black uppercase tracking-[0.4em] mb-1">
                        {items.find(i => i.id === selectedItemId)?.name || 'Selected Object'}
                      </span>
                      <span className="text-[9px] opacity-40 font-bold uppercase tracking-widest">Active Manipulation</span>
                    </div>

                    <div className="flex items-center gap-10">
                      <button
                        onClick={() => setItems(items.map(it => it.id === selectedItemId ? { ...it, rotation: (it.rotation + 45) % 360 } : it))}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div className="p-4 bg-black/5 rounded-full group-hover:bg-black group-hover:text-white transition-all"><RotateCw size={22} /></div>
                        <span className="text-[8px] font-black uppercase tracking-widest">Rotate</span>
                      </button>

                      <button
                        onClick={() => { setItems(items.filter(it => it.id !== selectedItemId)); setSelectedItemId(null); }}
                        className="flex flex-col items-center gap-2 group"
                      >
                        <div className="p-4 bg-red-50 rounded-full text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all"><Trash2 size={22} /></div>
                        <span className="text-[8px] font-black uppercase tracking-widest">Destroy</span>
                      </button>

                      <div className="w-px h-10 bg-black/5" />

                      <button onClick={() => setSelectedItemId(null)} className="flex flex-col items-center gap-2 group">
                        <div className="p-4 bg-black/5 rounded-full group-hover:bg-black group-hover:text-white transition-all"><X size={22} /></div>
                        <span className="text-[8px] font-black uppercase tracking-widest">Close</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Right Catalog Sidebar - Floating Glassmorphism */}
        <AnimatePresence mode="wait">
          {!isPreviewActive && (
            <motion.aside
              initial={{ x: 440, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 440, opacity: 0 }}
              transition={{ type: "spring", damping: 35, stiffness: 250, restDelta: 0.001 }}
              className="absolute right-8 top-32 bottom-8 w-[400px] bg-white/80 backdrop-blur-2xl rounded-[40px] border border-white/40 shadow-[-40px_0_100px_rgba(0,0,0,0.05)] flex flex-col z-50 overflow-hidden"
            >
              <div className="p-12 pb-6 flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black uppercase tracking-[0.5em] text-black/20 mb-2 leading-none">Vault Library</span>
                  <h3 className="text-5xl font-serif italic text-black leading-none">Catalog</h3>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black uppercase tracking-widest text-black/20 mb-2 leading-none">Objects</span>
                  <div className="px-5 py-2 bg-black/5 rounded-full font-serif text-lg italic text-black/60 shadow-inner">
                    {items.length}
                  </div>
                </div>
              </div>

              <div className="px-12 py-8">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search master collection..."
                    className="w-full bg-white/50 border border-black/5 rounded-[22px] px-8 py-5 text-[11px] font-bold tracking-widest text-black focus:outline-none focus:ring-2 focus:ring-black/10 transition-all placeholder:text-black/10"
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 p-2 bg-black/5 rounded-full"><Plus size={14} className="text-black/30" /></div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-12 custom-scrollbar">
                <div className="grid grid-cols-1 gap-10 pb-24">
                  {filteredLibraryProducts.map((product) => {
                    const isWishlisted = wishlist.includes(product.id);
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="group bg-white/50 border border-white/50 rounded-[44px] overflow-hidden hover:shadow-[0_30px_80px_rgba(0,0,0,0.06)] transition-all cursor-pointer relative"
                      >
                        <div className="p-10" onClick={() => addItemToPlacement(product)}>
                          <div className="aspect-square bg-white rounded-[32px] mb-8 overflow-hidden relative shadow-inner p-10 flex items-center justify-center border border-black/5">
                            <motion.img
                              whileHover={{ scale: 1.1, rotate: -3 }}
                              src={product.image}
                              alt={product.name}
                              className="max-w-full max-h-full object-contain drop-shadow-2xl"
                            />
                            <div className="absolute top-6 left-6">
                              <div className="bg-black text-white text-[7px] font-black px-4 py-2 rounded-full uppercase tracking-[0.2em] shadow-lg">
                                {product.subcategory}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-end">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-black/30 mb-2 leading-none">{product.material}</span>
                              <h4 className="text-xl font-serif italic text-black leading-tight mb-2 tracking-tight">{product.name}</h4>
                              <span className="text-lg font-serif italic text-indigo-600 font-bold">₹{product.price.toLocaleString()}</span>
                            </div>
                            <motion.div 
                              whileHover={{ scale: 1.1 }}
                              className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center group-hover:bg-indigo-600 transition-all shadow-xl"
                            >
                              <Plus size={24} />
                            </motion.div>
                          </div>
                        </div>

                        <div className="absolute top-12 right-12 z-20">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWishlist?.(product.id);
                            }}
                            className={`p-4 rounded-full backdrop-blur-md transition-all shadow-xl ${
                              isWishlisted ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-black/5 text-black hover:bg-black hover:text-white'
                            }`}
                          >
                            <Star size={18} className={isWishlisted ? "fill-current" : ""} />
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="p-12 bg-white/80 backdrop-blur-xl border-t border-black/5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    const saveToast = toast.loading("Synthesizing project artifacts...");
                    try {
                      if (canvasContainerRef.current) {
                        const canvas = await html2canvas(canvasContainerRef.current, {
                          useCORS: true,
                          allowTaint: true,
                          backgroundColor: '#FBFBF9',
                          ignoreElements: (el) => el.tagName === 'ASIDE' || el.classList.contains('z-[100]')
                        });
                        const pngData = canvas.toDataURL('image/png');
                        const blob = await (await fetch(pngData)).blob();
                        await uploadToAppScript(blob, `Design_${projectTitle}_${Date.now()}.png`, 'image/png');
                      }
                      if (designerRef.current) {
                        const scene = designerRef.current.getScene();
                        if (scene) await exportSceneToGLB(scene, `${projectTitle}_${Date.now()}.glb`);
                      }
                      toast.success("Design archived to cloud vault!", { id: saveToast });
                    } catch (err) {
                      toast.error(`Fabrication failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { id: saveToast });
                    }
                  }}
                  className="w-full py-6 bg-black text-white rounded-[28px] font-black uppercase tracking-[0.4em] text-[10px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-indigo-600 transition-all"
                >
                  Confirm & Archive Design
                </motion.button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Persistence Modals */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-xl p-8">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-16 rounded-[60px] max-w-lg w-full text-center space-y-10 shadow-[0_60px_150px_rgba(0,0,0,0.5)] border border-black/5"
            >
              <div className="w-24 h-24 bg-black text-white rounded-[32px] flex items-center justify-center mx-auto rotate-12 shadow-2xl mb-4">
                <Info size={40} />
              </div>
              <div className="space-y-4">
                <h3 className="text-4xl font-serif italic text-black">Terminate Session?</h3>
                <p className="text-black/40 text-[11px] font-black uppercase tracking-[0.3em] leading-relaxed px-10">
                  Volatile modifications to "{projectTitle}" will be lost. Return to the lobby?
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep('selection')}
                  className="w-full py-6 bg-red-500 text-white rounded-full font-black text-[10px] uppercase tracking-[0.3em] hover:bg-red-600 transition-all shadow-xl shadow-red-500/20"
                >
                  Discard & Exit
                </motion.button>
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="w-full py-6 rounded-full border border-black/10 text-black font-black text-[10px] uppercase tracking-[0.3em] hover:bg-black/5 transition-all"
                >
                  Remain in Studio
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isBillOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-xl p-8">
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="bg-white p-16 rounded-[60px] max-w-xl w-full space-y-12 shadow-[0_60px_150px_rgba(0,0,0,0.5)] border border-black/5"
            >
              <div className="flex justify-between items-start border-b border-black/5 pb-10">
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-black/30">Capital Report</span>
                  <h3 className="text-4xl font-serif italic text-black leading-none">Project Estimate</h3>
                </div>
                <motion.button 
                  whileHover={{ rotate: 90 }}
                  onClick={() => setIsBillOpen(false)} 
                  className="p-4 bg-black/5 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <div className="space-y-8 max-h-[35vh] overflow-y-auto pr-8 custom-scrollbar">
                {items.length === 0 ? (
                  <p className="text-center py-16 text-[10px] font-black uppercase tracking-[0.4em] text-black/20 italic">Architectural manifest is empty</p>
                ) : (
                  items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center group py-2 border-b border-black/5 last:border-0 hover:border-black transition-all">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black uppercase tracking-widest text-black group-hover:text-indigo-600 transition-colors">
                          {item.name || item.type}
                        </span>
                        <span className="text-[9px] opacity-30 font-bold uppercase tracking-widest">Serial #{item.id.slice(-8).toUpperCase()}</span>
                      </div>
                      <span className="text-2xl font-serif italic text-black">₹{item.price?.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-12 border-t-2 border-black space-y-10">
                <div className="flex justify-between items-baseline">
                  <span className="text-[12px] font-black uppercase tracking-[0.6em] opacity-30">Total Capital</span>
                  <span className="text-6xl font-serif italic text-black leading-none">₹{totalCost.toLocaleString()}</span>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsBillOpen(false)}
                  className="w-full py-8 bg-black text-white rounded-[40px] font-black text-[12px] uppercase tracking-[0.5em] shadow-[0_30px_100px_rgba(0,0,0,0.3)] hover:bg-indigo-600 transition-all font-bold"
                >
                  Finalize Report
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlueprintDesigner;
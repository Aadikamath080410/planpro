import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight, ChevronRight, Camera, Download, Check, Upload, ChevronLeft, Eye, EyeOff, Menu, Sparkles, Loader2, Box, Star, X, Maximize, Save, Plus, Layout, RotateCw, Trash2, MousePointer2, PanelLeft, PanelLeftClose, Layers, ChevronDown, Settings }
  from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { BlueprintItem, Product, RoomData, RoomShape, RoomOpening } from "../../types";
import { PRODUCTS } from "../../data/mockData";
import DesignerRoom from './DesignerRoom';
import html2canvas from 'html2canvas';
import { exportSceneToGLB, uploadToAppScript } from "../../services/exporter";
import { toast } from 'sonner';
import { DimensionSetup, OpeningsSetup } from './RoomSetup';
import { calculateRoomArea, calculateFurnitureArea } from './RoomMath';
import { HexColorPicker } from 'react-colorful';
import SaveConfirmationModal from '../SaveConfirmationModal';
import { formatArea, toFeetDecimal, toMetersFromDecimal } from "../../services/UnitUtils";
import { supabase } from "../../services/supabase";


interface BlueprintDesignerProps {
  wishlist: string[];
  toggleWishlist: (id: string) => Promise<void>;
  user: any;
  onBack?: () => void;
  initialProject?: any;
}

const BlueprintDesigner: React.FC<BlueprintDesignerProps> = ({ wishlist, toggleWishlist, user, onBack, initialProject }) => {
  // --- REFS ---
  const designerRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  // --- STEP STATE ---
  const [step, setStep] = useState<'selection' | 'shape-selection' | 'dimension-setup' | 'openings-setup' | 'ai-flow' | 'ai-validate' | 'designing'>('selection');

  // --- ROOM DATA STATE ---
  const [roomData, setRoomData] = useState<RoomData>({
    shape: 'SQUARE',
    dimensions: { 
      length: 6, 
      width: 4, 
      ceilingHeight: 3,
      frontWall: 4,
      backWall: 4,
      rightWall: 6,
      leftWall: 6
    },
    units: 'METERS',
    openings: [],
    wallColor: '#2a2a2a',
    wallTexture: 'plain',
    floorTexture: 'plain',
    projectTitle: 'Untitled Project'
  });

  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [items, setItems] = useState<BlueprintItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>('3D');
  const [placingProduct, setPlacingProduct] = useState<Product | null>(null);

  // --- UI STATE ---
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'appearance' | 'library'>('appearance');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<Product | null>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const [aiImages, setAiImages] = useState<File[]>([]);
  const [libraryCategory, setLibraryCategory] = useState<string>('All');
  const [librarySubcategory, setLibrarySubcategory] = useState<string>('All');

  // NEW: Integrated Designer States
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showWalls, setShowWalls] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitAction, setExitAction] = useState<() => void>(() => () => {});

  // --- RESPONSIVE: track viewport width reactively ---
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isMobile = windowWidth < 640;

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

  useEffect(() => {
    if (initialProject) {
      console.log("Loading initial project:", initialProject);
      const layout = initialProject.layoutData || {};

      setRoomData({
        shape: layout.shape || 'SQUARE',
        dimensions: layout.dimensions || { length: 6, width: 4, ceilingHeight: 3 },
        units: layout.units || 'METERS',
        openings: layout.openings || [],
        wallColor: layout.wallColor || '#2a2a2a',
        wallTexture: layout.wallTexture || 'plain',
        floorTexture: layout.floorTexture || 'plain',
        projectTitle: initialProject.name || 'Untitled Project'
      });

      if (layout.items) {
        setItems(layout.items);
      }

      setStep('designing');
    }
  }, [initialProject]);
  // --- HELPERS ---
  const updateRoom = (updates: Partial<RoomData>) => {
    setRoomData(prev => ({ ...prev, ...updates }));
  };

  const handleUnitToggle = (newUnits: 'METERS' | 'FEET') => {
    setRoomData(prev => ({ ...prev, units: newUnits }));
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

  const handleWallClick = (_index: number) => {
    // Wall click in the main designer — no tab switch needed
  };

  const handleColorChange = (newColor: string) => {
    updateRoom({ wallColor: newColor });
  };

  const saveToRecentColors = (color: string) => {
    const presets = ['#ffffff', '#E4E4F4', '#FDE7D1', '#F5F5F3', '#000000', '#2d3436', '#636e72', '#b2bec3'];
    if (presets.includes(color.toLowerCase())) return;

    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== color);
      return [color, ...filtered].slice(0, 4);
    });
  };

  const addItemToPlacement = (product: Product) => {
    setPlacingProduct(product);
    setSelectedItemId(null);
    setActiveSidebarTab('library');
    setViewMode('TOP');
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
      position: position,
      texture: placingProduct.texture
    };

    setItems([...items, newItem]);
    setSelectedItemId(null);
    setPlacingProduct(null);
    setViewMode('3D');
  };

  const handleImageUpload = (files: FileList) => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const newFiles = Array.from(files);

    const validFiles = newFiles.filter(file => {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setAiImages(prev => {
        const total = [...prev, ...validFiles];
        if (total.length > 20) {
          toast.error("Maximum 20 images allowed. Keeping first 20.");
          return total.slice(0, 20);
        }
        toast.success(`Added ${validFiles.length} image(s) - Total: ${total.length}/20`);
        return total;
      });
    }
  };

  const handleStitchRoom = async () => {
    if (aiImages.length < 4) {
      toast.error("Please upload at least 4 images (min 4, max 20).");
      return;
    }
    toast.info("Stitching room photos...");

    setIsProcessing(true);
    const formData = new FormData();
    aiImages.forEach(file => formData.append('files', file));
    if (roomData.dimensions.ceilingHeight) {
      formData.append('ceilingHeight', String(roomData.dimensions.ceilingHeight));
    }

    try {
      const response = await fetch(import.meta.env.VITE_AI_SERVER_URL || 'http://localhost:8000/process-room', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      if (result.status === 'success') {
        toast.success("Room stitched successfully!");
        console.log("AI result received:", result);
        const panoramaUrlWithCache = `${result.panorama_url}?t=${Date.now()}`;
        const updates: Partial<RoomData> = {
          panoramaUrl: panoramaUrlWithCache
        };
        if (result.results?.length && result.results?.breadth) {
          updates.dimensions = {
            ...roomData.dimensions,
            length: result.results.length,
            width: result.results.breadth,
            frontWall: result.results.breadth,
            backWall: result.results.breadth,
            leftWall: result.results.length,
            rightWall: result.results.length
          };
        }
        updateRoom(updates);
        toast.success("Room stitched successfully! Review the 3D twin on the right.");
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

  const saveToSupabase = async (payload: {
    type: 'manual' | 'ai',
    projectTitle: string,
    thumbnailUrl?: string,
    layoutData?: any,
    imageUrls?: string[],
    panoramaUrl?: string
  }) => {
    if (!user) {
      toast.error("You must be logged in to save projects.");
      return;
    }

    try {
      if (payload.type === 'manual') {
        const { error } = await supabase
          .from('RoomDesign')
          .insert({
            userId: user.id,
            name: payload.projectTitle,
            layoutData: payload.layoutData,
            thumbnailUrl: payload.thumbnailUrl
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('AiDesign')
          .insert({
            userId: user.id,
            name: payload.projectTitle,
            imageUrls: payload.imageUrls || [],
            panoramaUrl: payload.panoramaUrl
          });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Supabase Save Error:", err);
      throw err;
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

  const togglePreview = () => {
    if (isPreviewActive) {
      // Exiting full preview
      setViewMode('3D');
      setIsPreviewActive(false);
    } else {
      // Entering full preview
      setIsPreviewActive(true);
      setSelectedItemId(null); // Clear selection for a cleaner preview
      setIsColorPickerOpen(false);
      setIsBillOpen(false);
    }
  };

  useEffect(() => {
    if (!isPreviewActive && step === 'designing') {
      setActiveSidebarTab('library');
      setIsSidebarOpen(true);   // always show sidebar when entering designer
      setIsColorPickerOpen(false);
      setIsBillOpen(false);
    }
  }, [isPreviewActive, step]);

  const carpetArea = useMemo(() => {
    const totalArea = calculateRoomArea(roomData);
    const furnitureArea = calculateFurnitureArea(items);
    return Math.max(0, totalArea - furnitureArea);
  }, [roomData, items]);

  const handleSaveProject = async () => {
    const saveToast = toast.loading("Initializing save process...");
    try {
      const APPSCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;
      if (!APPSCRIPT_URL) throw new Error("VITE_APPSCRIPT_URL is missing.");
      const timestamp = Date.now();
      const projectTitle = roomData.projectTitle || 'Project';

      // 1. Capture Thumbnail
      let thumbnailUrl = "";
      if (canvasContainerRef.current) {
        toast.loading("Capturing workspace preview...", { id: saveToast });
        const canvas = await html2canvas(canvasContainerRef.current, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#FBFBF9',
          ignoreElements: (element) => element.tagName === 'ASIDE' || element.classList.contains('z-[100]')
        });
        const pngData = canvas.toDataURL('image/png');
        const blob = await (await fetch(pngData)).blob();
        const filename = `Preview_${projectTitle}_${timestamp}.png`;

        await uploadToAppScript(blob, filename, 'image/png');
      }

      // 2. Export 3D Model
      if (designerRef.current && items.length > 0) {
        toast.loading("Processing 3D Scene...", { id: saveToast });
        const scene = designerRef.current.getScene();
        if (scene) await exportSceneToGLB(scene, `${projectTitle}_${timestamp}.glb`);
      }

      // 3. Upload AI Source Images
      const uploadedImageNames: string[] = [];
      if (aiImages && aiImages.length > 0) {
        toast.loading(`Uploading ${aiImages.length} source images...`, { id: saveToast });
        for (const imgFile of aiImages) {
          const fname = `Source_${timestamp}_${imgFile.name}`;
          await uploadToAppScript(imgFile, fname, imgFile.type);
          uploadedImageNames.push(fname);
        }
      }

      // 4. Save Record to Supabase
      toast.loading("Finalizing cloud record...", { id: saveToast });
      if (aiImages.length > 0 || roomData.panoramaUrl) {
        await saveToSupabase({
          type: 'ai',
          projectTitle,
          imageUrls: uploadedImageNames,
          panoramaUrl: roomData.panoramaUrl
        });
      } else {
        await saveToSupabase({
          type: 'manual',
          projectTitle,
          layoutData: { items, roomData },
          thumbnailUrl: `Preview_${projectTitle}_${timestamp}.png`
        });
      }

      toast.success("Project saved successfully!", { id: saveToast });
    } catch (err) {
      console.error("Save failure:", err);
      toast.error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`, { id: saveToast });
    }
  };

  const handleExitAttempt = (action: () => void) => {
    const hasWork = items.length > 0 || aiImages.length > 0 || roomData.panoramaUrl || roomData.openings.length > 0;
    if (hasWork) {
      setExitAction(() => action);
      setShowExitConfirm(true);
    } else {
      action();
    }
  };

  const handleSaveAndExit = async () => {
    await handleSaveProject();
    setShowExitConfirm(false);
    exitAction();
  };

  const handleDiscardAndExit = () => {
    setAiImages([]);
    updateRoom({ panoramaUrl: undefined });
    setItems([]);
    setShowExitConfirm(false);
    exitAction();
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
        wallTexture: 'plain',
        floorTexture: 'plain',
        projectTitle: 'Untitled Project'
      });
      setStep('shape-selection');
    };

    const initializeAiFlow = () => {
      if (!user) {
        toast.error("Login Required", {
          description: "Please log in to use AI Room Synthesis."
        });
        return;
      }
      setItems([]); // Clear any previous items
      setAiImages([]); // Clear previous photos
      setRoomData({
        shape: 'SQUARE',
        dimensions: { length: 6, width: 6 },
        openings: [],
        wallColor: '#ffffff',
        wallTexture: 'plain',
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
        className="min-h-screen md:h-screen w-full py-12 bg-[#f4fff0] flex flex-col items-center justify-center p-4 sm:p-6 text-text overflow-y-auto md:overflow-hidden relative"
      >
        {/* Floating back button */}
        {onBack && (
          <button
            onClick={() => handleExitAttempt(onBack)}
            className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-secondary/80 backdrop-blur-md border border-text/10 rounded-full text-[10px] font-black uppercase tracking-widest text-text hover:bg-primary hover:text-background hover:border-primary transition-all shadow-lg z-50"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
        <div className="w-[95%] max-w-[1600px] grid grid-cols-1 md:grid-cols-2 gap-0 border border-text/5 rounded-[40px] overflow-hidden bg-background shadow-[0_40px_100px_-20px_rgba(0,0,0,0.05)]">
          {/* Manual Designer Side */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-6 sm:p-10 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-text/5 bg-background group hover:bg-secondary/5 transition-colors duration-700"
          >
            <div className="space-y-8">
              <div className="space-y-6">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight leading-tight text-primary">Manual <br /><span className="font-light text-[var(--text-muted)]">Designer</span></h2>
                <p className="text-[var(--text-muted)] text-base md:text-lg leading-relaxed max-w-md">Precision-driven spatial planning. Build your environment from the ground up with custom dimensions and architectural modules.</p>
              </div>
            </div>
            <motion.button
              whileHover={{ x: 10 }}
              onClick={initializeManualFlow}
              className="flex items-center gap-4 text-[13px] font-black uppercase tracking-[0.3em] hover:text-primary text-[var(--text-muted)] transition-all mt-12"
            >
              Enter Studio <ArrowRight size={18} />
            </motion.button>
          </motion.div>

          {/* AI Designer Side */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-6 sm:p-10 md:p-16 flex flex-col justify-between bg-[var(--color-warm-primary)] text-[var(--background)] group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-1000">
              <Sparkles size={200} strokeWidth={0.5} className="text-[var(--background)]" />
            </div>
            <div className="space-y-8 relative z-10">

              <div className="space-y-6">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight leading-tight text-[var(--background)]">AI Image <br /><span className="opacity-70 font-light">Synthesis</span></h2>
                <p className="text-[var(--background)] opacity-70 text-base md:text-lg leading-relaxed max-w-md">Neural reconstruction from photography. Upload your space and let our engine generate a digital twin in seconds.</p>
              </div>
            </div>
            <motion.button
              whileHover={{ x: 10 }}
              onClick={initializeAiFlow}
              className="flex items-center gap-4 text-[13px] font-black uppercase tracking-[0.3em] font-bold text-[var(--background)] opacity-60 hover:opacity-100 transition-all mt-12 relative z-10"
            >
              Initialize Flow <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </div>

        {/* Minimal Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-[9px] font-black uppercase tracking-[0.5em] text-text/10"
        >
          PlanPro Architectural Suite © 2026
        </motion.div>

        <SaveConfirmationModal
          isOpen={showExitConfirm}
          onClose={() => setShowExitConfirm(false)}
          onSave={handleSaveAndExit}
          onDiscard={handleDiscardAndExit}
          description="Leaving this view will reset your current progress or images. Would you like to save your project first?"
        />
      </motion.div>
    );
  }

  if (step === 'shape-selection') {
    const shapes = [
      { id: 'SQUARE' as RoomShape, name: 'Square', icon: <div className="w-12 h-12 border-[2.5px] border-primary rounded-sm shadow-[0_0_20px_rgba(205,170,128,0.2)]" /> },
      {
        id: 'L_SHAPE' as RoomShape, name: 'L-Shaped', icon: (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary group-hover:text-highlight transition-colors">
            <path d="M10 10V38H38V24H24V10H10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      },
      {
        id: 'T_SHAPE' as RoomShape, name: 'T-Shaped', icon: (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary group-hover:text-highlight transition-colors">
            <path d="M10 10H38V24H28V38H20V24H10V10Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      },
      {
        id: 'HEXAGON' as RoomShape, name: 'Hexagon', icon: (
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary group-hover:text-highlight transition-colors">
            <path d="M24 6L39.5885 15V33L24 42L8.41154 33V15L24 6Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      },
    ];

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen md:h-screen w-full py-12 bg-[#f4fff0] flex flex-col items-center justify-center p-4 sm:p-6 text-text overflow-y-auto md:overflow-hidden relative"
      >
        <motion.button
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => handleExitAttempt(() => setStep('selection'))}
          className="absolute top-10 sm:top-14 left-6 sm:left-10 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-text/40 hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </motion.button>

        <div className="max-w-5xl w-full space-y-12 sm:space-y-24 text-center">
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text/20 block">Spatial Footprint</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif tracking-tight leading-tight text-primary">Select <span className="font-light text-text/60">Foundation</span></h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-12">
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
                <div className="w-full aspect-square rounded-[24px] sm:rounded-[40px] bg-background border border-text/5 flex items-center justify-center group-hover:border-text transition-all duration-500 group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)]">
                  <div className="scale-75 sm:scale-100">
                    {shape.icon}
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text/30 group-hover:text-text transition-colors">{shape.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
        <SaveConfirmationModal
          isOpen={showExitConfirm}
          onClose={() => setShowExitConfirm(false)}
          onSave={handleSaveAndExit}
          onDiscard={handleDiscardAndExit}
          description="Leaving this view will reset your current progress or images. Would you like to save your project first?"
        />
      </motion.div>
    );
  }

  if (step === 'dimension-setup') {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center relative">
        <DimensionSetup
          data={roomData}
          onUpdate={updateRoom}
          onNext={() => setStep('openings-setup')}
          onBack={() => handleExitAttempt(() => setStep('shape-selection'))}
        />
        <SaveConfirmationModal
          isOpen={showExitConfirm}
          onClose={() => setShowExitConfirm(false)}
          onSave={handleSaveAndExit}
          onDiscard={handleDiscardAndExit}
          description="Leaving this view will reset your current progress. Would you like to save your project first?"
        />
      </div>
    );
  }

  if (step === 'openings-setup') {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center relative">
        <OpeningsSetup
          data={roomData}
          onUpdate={updateRoom}
          onNext={() => {
            setStep('designing');
            setActiveSidebarTab('library');
          }}
          onBack={() => handleExitAttempt(() => setStep('dimension-setup'))}
        />
        <SaveConfirmationModal
          isOpen={showExitConfirm}
          onClose={() => setShowExitConfirm(false)}
          onSave={handleSaveAndExit}
          onDiscard={handleDiscardAndExit}
          description="Leaving this view will reset your current progress. Would you like to save your project first?"
        />
      </div>
    );
  }

  if (step === 'ai-flow') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen lg:h-screen w-full flex flex-col lg:flex-row bg-[#f4fff0] overflow-hidden relative"
      >
        {/* Left Sidebar - Studio Controls */}
        <div className="w-full lg:w-[500px] shrink-0 h-full  flex flex-col p-6 lg:p-8 border-r border-text/5 z-20">
          <div className="flex items-center gap-4 mb-4 lg:mb-6">
            <button
              onClick={() => handleExitAttempt(() => setStep('selection'))}
              className="flex items-center gap-2 text-text/40 hover:text-primary transition-all text-xs font-black uppercase tracking-[0.2em] group bg-secondary/30 px-4 py-2 rounded-full"
            >
              <ChevronLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Back
            </button>

          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-1">

            {isMobile && roomData.panoramaUrl ? (
              <div className="flex-1 min-h-[300px] relative bg-text/5 rounded-3xl overflow-hidden border border-text/10 mb-6 group">
                <DesignerRoom
                  roomData={roomData}
                  items={[]}
                  setItems={() => { }}
                  viewMode="3D"
                />
                <div className="absolute top-4 left-4 p-2.5 bg-background/80 backdrop-blur-md rounded-xl border border-text/5 shadow-xl">
                  <p className="text-[8px] font-black uppercase tracking-widest text-text mb-0.5">Live Twin</p>
                  <p className="text-[7px] font-medium text-text/40">Neural Reconstruction View</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto no-scrollbar pr-1 -mr-1 space-y-5">
                {/* Ceiling Height */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text/40 uppercase tracking-[0.2em]">Ceiling Height</label>
                  <div className="relative group w-full">
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={(() => {
                        const val = roomData.dimensions.ceilingHeight || 0;
                        if (val === 0) return '';
                        return roomData.units === 'FEET' ? toFeetDecimal(val) : val;
                      })()}
                      onChange={(e) => {
                        let val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                        if (roomData.units === 'FEET') val = toMetersFromDecimal(val);
                        updateRoom({ dimensions: { ...roomData.dimensions, ceilingHeight: val } });
                      }}
                      className="w-full bg-secondary/30 border border-text/5 rounded-xl h-10 px-5 font-bold text-text text-sm outline-none focus:bg-background focus:border-text/20 transition-all"
                      placeholder="2.5"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-text/20">{roomData.units === 'FEET' ? 'FT' : 'M'}</span>
                  </div>
                </div>

                {/* Wall Measurements */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black text-text/40 uppercase tracking-[0.2em]">Wall Measurements</p>
                    <div className="flex items-center bg-secondary/30 border border-text/5 rounded-full p-0.5">
                      <button
                        onClick={() => handleUnitToggle('METERS')}
                        className={`px-3 py-1 text-[12px] font-black uppercase tracking-wider rounded-full transition-all ${roomData.units !== 'FEET' ? 'bg-background text-text shadow-sm' : 'text-text/30 hover:text-text/60'}`}
                      >
                        M
                      </button>
                      <button
                        onClick={() => handleUnitToggle('FEET')}
                        className={`px-3 py-1 text-[12px] font-black uppercase tracking-wider rounded-full transition-all ${roomData.units === 'FEET' ? 'bg-background text-text shadow-sm' : 'text-text/30 hover:text-text/60'}`}
                      >
                        FT
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {['Front Wall', 'Right Wall', 'Back Wall', 'Left Wall'].map((wall, i) => (
                      <div key={wall} className="p-2 bg-secondary/50 sm:bg-secondary rounded-[18px] sm:rounded-[16px] border border-text/5 group hover:bg-text/5 hover:border-text/10 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <span className="text-[8px] font-black text-text/60 uppercase tracking-[0.2em] sm:w-20 shrink-0">{wall}</span>

                          <div className="flex-1 flex items-center gap-2 sm:gap-2">
                            <div className="relative flex-1 sm:flex-none sm:w-32">
                              <input
                                type="number"
                                min={0}
                                step="0.1"
                                onFocus={(e) => e.target.select()}
                                value={(() => {
                                  const wallKey = ['frontWall', 'rightWall', 'backWall', 'leftWall'][i] as keyof typeof roomData.dimensions;
                                  const val = roomData.dimensions[wallKey] || 0;
                                  if (!val || val === 0) return '';
                                  return roomData.units === 'FEET' ? toFeetDecimal(val) : val;
                                })()}
                                onChange={(e) => {
                                  let val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                                  if (roomData.units === 'FEET') val = toMetersFromDecimal(val);
                                  
                                  const wallKey = ['frontWall', 'rightWall', 'backWall', 'leftWall'][i] as keyof typeof roomData.dimensions;
                                  const newDims = { ...roomData.dimensions, [wallKey]: val };
                                  newDims.width = Math.max(newDims.frontWall || 0, newDims.backWall || 0);
                                  newDims.length = Math.max(newDims.leftWall || 0, newDims.rightWall || 0);
                                  updateRoom({ dimensions: newDims });
                                }}
                                className="w-full h-10 sm:h-11 bg-background border border-text/10 rounded-xl text-sm font-bold text-text outline-none focus:border-primary/20 text-center shadow-inner"
                              />
                              <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[9px] sm:text-[12px] font-black text-text/30">{roomData.units === 'FEET' ? 'FT' : 'M'}</span>
                            </div>

                            <label className="flex-none sm:flex-[1.5] w-12 sm:w-auto h-10 sm:h-11 px-0 sm:px-5 flex items-center justify-center gap-2 sm:gap-3 bg-primary text-[var(--background)] rounded-xl cursor-pointer hover:bg-primary/90 active:scale-75 transition-all shadow-md shadow-primary/5 whitespace-nowrap overflow-hidden">
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files) {
                                    handleImageUpload(e.target.files);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <Camera size={16} className="opacity-60 shrink-0" />
                              <span className="hidden sm:block text-[10px] font-black uppercase tracking-widest">Upload Images</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

        {/* Bottom Controls Area (Buttons & Status / Green Box) */}
        <div className="mt-auto pt-6 border-t border-text/5 bg-background/50 backdrop-blur-sm -mx-6 px-6 pb-2">
          <div className="space-y-4">
            {/* Photo Registry Status */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-text/40" />
                <span className="text-xs font-black text-text/40 uppercase tracking-[0.15em]">{aiImages.length} Photos Recorded</span>
              </div>
              {roomData.panoramaUrl && (
                <div className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Check size={10} /> Model Ready
                </div>
              )}
            </div>

            {!roomData.panoramaUrl ? (
              <button
                onClick={handleStitchRoom}
                disabled={isProcessing || aiImages.length < 4}
                className="w-full py-4 bg-primary text-[var(--background)] rounded-[20px] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:bg-text/5 disabled:text-text/20 disabled:scale-100"
              >
                {isProcessing ? <Loader2 className="animate-spin text-background/40" size={14} /> : <Sparkles size={16} />}
                {aiImages.length < 4 ? `Upload ${4 - aiImages.length} More Photos` : 'Generate 3D Twin'}
              </button>
            ) : (
              <div className={`grid ${isMobile ? 'grid-cols-2' : 'flex flex-col'} gap-2`}>
                <button
                  onClick={() => {
                    setStep('designing');
                    setActiveSidebarTab('library');
                  }}
                  className="w-full py-3.5 bg-highlight text-background rounded-[20px] text-black text-[12px] font-bold  uppercase tracking-tight sm:tracking-[0.2em] shadow-2xl shadow-highlight/10 hover:scale-[1.02] active:scale-75 transition-all flex items-center justify-center gap-1"
                >
                  {isMobile ? 'Enter Designer' : 'Enter 3D Studio'} {isMobile ? <ArrowRight size={12} /> : <ArrowRight size={14} />}
                </button>
                <button
                  onClick={() => updateRoom({ panoramaUrl: undefined })}
                  className={`w-full py-3 bg-text/10 border border-text/10 hover:bg-text/20 text-text rounded-[20px] font-black text-[9px] sm:text-[8px] uppercase tracking-tight sm:tracking-widest transition-all flex items-center justify-center gap-2`}
                >
                  <RotateCw size={12} className="opacity-60" />
                  {isMobile ? 'Restitch Images' : 'Clear Results & Re-Stitch'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
        </div >

  {/* Instructions Viewport - Only show on desktop if panorama active, or always if no panorama */ }
{
  (!isMobile || !roomData.panoramaUrl) && (
    <div className="flex-1 relative bg-secondary/20 flex flex-col items-center justify-center p-12 lg:p-24 overflow-hidden">
      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
        <div className="w-full h-full bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      {roomData.panoramaUrl ? (
        <div className="relative z-10 w-full h-full bg-text/5 rounded-[40px] overflow-hidden border border-text/10 backdrop-blur-sm p-2 group">
          <DesignerRoom
            roomData={roomData}
            items={[]}
            setItems={() => { }}
            viewMode="3D"
          />
          <div className="absolute top-8 left-8 p-4 bg-background/80 backdrop-blur-md rounded-2xl border border-text/5 shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-text mb-1">Live Reconstruction</p>
            <p className="text-[8px] font-medium text-text/40">AI-Synthesized environment from {aiImages.length} frames</p>
          </div>
          <div className="absolute top-8 right-8 flex gap-2">
            <div className="px-4 py-2 bg-highlight text-background rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-pulse">
              <Check size={12} /> Stitched
            </div>
          </div>
        </div>
      ) : (aiImages.length > 0 && !isMobile) ? (
        <div className="relative z-10 w-full h-full flex flex-col pt-10 px-10">
          <div className="flex items-center justify-between mb-12">
            <div className="space-y-1">
              <h3 className="text-3xl font-serif text-text">Captured Environment</h3>
              <p className="text-[10px] font-black text-text/20 uppercase tracking-[0.3em]">{aiImages.length} Images Recorded</p>
            </div>
            <button
              onClick={() => setAiImages([])}
              className="px-6 py-3 bg-text/5 hover:bg-text/10 text-text rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
            >
              Clear Session
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 overflow-y-auto no-scrollbar pb-20">
            <AnimatePresence>
              {aiImages.map((file, idx) => {
                const url = URL.createObjectURL(file);
                return (
                  <motion.div
                    key={file.name + idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="aspect-[4/5] relative group bg-secondary rounded-3xl overflow-hidden border border-text/5 shadow-sm"
                  >
                    <img
                      src={url}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                      onLoad={() => URL.revokeObjectURL(url)}
                    />
                    <button
                      onClick={() => setAiImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-4 right-4 w-10 h-10 bg-highlight text-background rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95"
                    >
                      <X size={18} />
                    </button>
                  </motion.div>
                );
              })}

              {aiImages.length < 20 && (
                <label className="aspect-[4/5] border-2 border-dashed border-text/10 rounded-3xl flex flex-col items-center justify-center gap-6 cursor-pointer hover:border-text/20 hover:bg-text/[0.02] transition-all group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  />
                  <div className="w-20 h-20 bg-text/[0.02] group-hover:bg-text group-hover:text-highlight rounded-full flex items-center justify-center transition-all shadow-xl shadow-text/5">
                    <Plus size={32} />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[12px] font-black text-text uppercase tracking-[0.2em] group-hover:text-text">Add Frame</span>
                    <p className="text-[9px] font-medium text-text/30">Capture more angles</p>
                  </div>
                </label>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : aiImages.length === 0 ? (
        <div className="relative z-10 w-full max-w-2xl space-y-20">
          <div className="space-y-6">
            <h3 className="text-4xl sm:text-5xl font-serif text-text leading-tight">Neural Reconstruction Requirements</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
            {[
              { title: "ORIENTATION", desc: "Photos can be captured in landscape or horizontal orientation." },
              { title: "VOLUME", desc: "Upload a minimum of 4 and maximum of 20 photos for optimal results." },
              { title: "OVERLAP", desc: "Include images of the corners of the room to ensure accurate alignment." },
              { title: "POSITION", desc: "Shoot all photos while standing consistently in the same central spot." }
            ].map((item, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border border-text/10 flex items-center justify-center text-[10px] font-bold text-text/20">{idx + 1}</div>
                  <span className="text-[10px] font-black text-text uppercase tracking-widest">{item.title}</span>
                </div>
                <p className="text-sm text-text/40 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="pt-10 flex items-center gap-6">
            <div className="px-5 py-2.5 bg-background border border-text/5 rounded-full shadow-sm text-[10px] font-black uppercase tracking-widest text-text/40 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-text animate-pulse" />
              AI Reconstruction Engine Active
            </div>
            <p className="text-[10px] font-serif italic text-text/30">Pro Tip: Higher coverage results in deeper model accuracy.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
      <SaveConfirmationModal
          isOpen={showExitConfirm}
          onClose={() => setShowExitConfirm(false)}
          onSave={handleSaveAndExit}
          onDiscard={handleDiscardAndExit}
          description="Leaving this view will reset your current progress or images. Would you like to save your project first?"
        />
      </motion.div>
    );
  }

  // --- DESIGNER VIEW (designing step) ---
  return (
    <div className="flex flex-col h-screen w-full bg-secondary/10 overflow-hidden relative">
      <AnimatePresence>
        {hoveredProduct && !isMobile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed z-[300] w-[320px] bg-background border border-text/5 rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.15)] pointer-events-none flex flex-col overflow-hidden max-h-[85vh]"
            style={{ top: `${popupPos.top}px`, left: `${popupPos.left}px` }}
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
              <img
                src={hoveredProduct.image}
                className="w-full h-full object-cover"
                alt={hoveredProduct.name}
              />
            </div>
            <div className="p-8 space-y-5">
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-[0.3em] text-text/30 font-black block">
                  {hoveredProduct.category}
                </span>
                <h5 className="font-serif text-2xl leading-tight text-text">
                  {hoveredProduct.name}
                </h5>
              </div>
              <div className="flex justify-between items-center py-4 border-y border-text/5">
                <span className="text-2xl font-bold tracking-tighter text-text">
                  ₹{hoveredProduct.price}
                </span>
                <div className="flex items-center gap-1.5 bg-text/5 px-3 py-1.5 rounded-full">
                  <Star size={10} className="fill-text text-text" />
                  <span className="text-[10px] font-black">{hoveredProduct.rating}</span>
                </div>
              </div>
              <p className="text-[11px] text-text/40 leading-relaxed font-medium italic">
                {hoveredProduct.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="fixed top-0 left-0 right-0 h-20 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--border-light)] flex items-center justify-between px-4 sm:px-8 z-[100]">
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => handleExitAttempt(() => setStep('selection'))}
            className="p-1.5 sm:p-2 hover:bg-white/5 rounded-full transition-colors"
            title="Back to step selection"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5 text-[var(--text)]" />
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-text/5 rounded-full transition-colors flex items-center gap-1.5 text-[var(--text)]"
            title={isSidebarOpen ? 'Hide Panel' : 'Show Panel'}
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>

          {/* Centered Project Title */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-0">
            {isEditingTitle ? (
              <input
                autoFocus
                className="bg-transparent border-b-2 border-primary text-[var(--text)] text-center outline-none text-lg sm:text-2xl font-black tracking-tighter w-48 sm:w-64 pointer-events-auto"
                value={roomData.projectTitle}
                onChange={(e) => setRoomData({ ...roomData, projectTitle: e.target.value })}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
              />
            ) : (
              <div className="flex flex-col items-center pointer-events-auto cursor-pointer group" onClick={() => setIsEditingTitle(true)}>
                <h2 className="text-lg sm:text-2xl font-black tracking-tighter text-[var(--text)] group-hover:text-primary transition-colors flex items-center gap-2">
                  {roomData.projectTitle}
                  <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text)]/30 whitespace-nowrap">
                    CARPET AREA:
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-primary whitespace-nowrap">
                    {formatArea(carpetArea, roomData.units === 'METERS' ? 'METRIC' : 'IMPERIAL')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-4">
          <button
            className={`px-3 sm:px-6 py-2 sm:py-2.5 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${isPreviewActive
              ? 'bg-primary text-[var(--background)] shadow-xl shadow-primary/20'
              : 'bg-text/5 text-[var(--text)] hover:bg-text/10'
              }`}
            onClick={togglePreview}
            title={isPreviewActive ? 'Exit Studio' : 'Cinema View'}
          >
            {isPreviewActive ? <X size={14} className="sm:hidden" /> : <Maximize size={14} className="sm:hidden" />}
            <span className="hidden sm:inline italic">{isPreviewActive ? ' Exit Studio' : ' Cinema View'}</span>
          </button>

          <button
            onClick={handleSaveProject}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-primary border border-primary/20 rounded-full flex items-center justify-center text-[var(--background)] shadow-[0_0_30px_rgba(200,90,84,0.2)] hover:scale-110 active:scale-95 transition-all group relative overflow-hidden"
            title="Save Project"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Save size={18} className="relative z-10 sm:w-[20px] sm:h-[20px]" />
          </button>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        {!isPreviewActive && isSidebarOpen && !(isMobile && placingProduct) && (
          <aside
            key="designer-sidebar"
            style={isMobile ? { width: '100%', height: 'auto', maxHeight: '380px' } : { width: '550px' }}
            className={`fixed z-[150] architect-sidebar flex flex-col overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.3)] transition-all duration-500 rounded-t-[2.5rem] lg:rounded-none lg:shadow-2xl ${isMobile
              ? `bottom-0 left-0 border-t ${isSidebarOpen ? 'translate-y-0' : 'translate-y-full opacity-0'}`
              : `top-20 bottom-0 left-0 border-r ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full opacity-0'}`
              }`}
          >
            {/* Color Picker Overlay - Integrated into Sidebar */}
            <AnimatePresence>
              {isColorPickerOpen && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="absolute inset-0 z-[100] bg-background flex flex-col p-8"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text/30">Color Studio</span>
                      <h3 className="text-xl font-serif mt-1 text-text">Wall Palette</h3>
                    </div>
                    <button
                      onClick={() => {
                        saveToRecentColors(roomData.wallColor);
                        setIsColorPickerOpen(false);
                      }}
                      className="p-3 hover:bg-text/5 rounded-full transition-all group"
                    >
                      <X size={20} className="text-text/30 group-hover:text-text" />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center space-y-10">
                    <div className="relative group">
                      <div className="absolute -inset-4 bg-text/5 rounded-[48px] blur-xl group-hover:bg-text/10 transition-all" />
                      <HexColorPicker
                        color={roomData.wallColor}
                        onChange={handleColorChange}
                        style={{ width: '280px', height: '280px' }}
                        className="relative"
                      />
                    </div>

                    <div className="w-full grid grid-cols-2 gap-4">
                      <div className="bg-text/[0.02] border border-text/5 rounded-[32px] p-6 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-text/20 mb-3">Live Result</span>
                        <div className="w-14 h-14 rounded-full border-4 border-background shadow-2xl" style={{ backgroundColor: roomData.wallColor }} />
                      </div>
                      <div className="bg-text/[0.02] border border-text/5 rounded-[32px] p-6 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-text/20 mb-3">Hex Pattern</span>
                        <span className="text-xs font-bold tracking-tight text-text/80">{roomData.wallColor.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      saveToRecentColors(roomData.wallColor);
                      setIsColorPickerOpen(false);
                    }}
                    className="w-full mt-10 py-6 rounded-[28px] bg-text text-[var(--background)] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-text/20"
                  >
                    Apply Selection
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Sidebar Header & Tabs */}
            <div className="p-8 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div>

                </div>
                {isMobile && (
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-[var(--text-muted)]">
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Tabs Overlay-style */}
              <div className="flex bg-[var(--background)] p-1 rounded-2xl border border-[var(--border-light)] mb-4">
                <button
                  onClick={() => setActiveSidebarTab('appearance')}
                  className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSidebarTab === 'appearance' ? 'bg-primary text-[var(--background)] shadow-lg' : 'text-[var(--text-secondary)] hover:text-primary'
                    }`}
                >
                  Appearance
                </button>
                <button
                  onClick={() => setActiveSidebarTab('library')}
                  className={`flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeSidebarTab === 'library' ? 'bg-primary text-[var(--background)] shadow-lg' : 'text-[var(--text-secondary)] hover:text-primary'
                    }`}
                >
                  Library
                </button>
              </div>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-6">
              {activeSidebarTab === 'appearance' && (
                <div className="flex flex-col space-y-8">
                  <section className="space-y-4 shrink-0">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-text/20 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-text/20" />
                      Wall Color
                    </h4>
                    <div className={`grid ${isMobile ? 'grid-flow-col grid-rows-2' : 'grid-cols-6'} gap-3`}>
                      {(() => {
                        const presets = [
                          '#2a2a2a', '#1a1a1b', '#353b48', '#2d3436', '#ffffff', '#E4E4F4', '#FDE7D1', '#F5F5F3'
                        ];
                        const isCustom = !presets.includes(roomData.wallColor);

                        return (
                          <>
                            {presets.map((col) => (
                              <button
                                key={col}
                                onClick={() => updateRoom({ wallColor: col })}
                                className={`aspect-square rounded-full border-2 transition-all ${roomData.wallColor === col
                                  ? 'border-text scale-110 shadow-lg shadow-text/5'
                                  : 'border-text/5'
                                  }`}
                                style={{ backgroundColor: col }}
                              />
                            ))}

                            {/* Recent Colors Slots */}
                            {[0, 1, 2, 3].map((idx) => {
                              const col = recentColors[idx];
                              return (
                                <button
                                  key={`recent-${idx}`}
                                  onClick={() => col && updateRoom({ wallColor: col })}
                                  className={`aspect-square rounded-full border-2 transition-all ${col && roomData.wallColor === col
                                    ? 'border-text scale-110 shadow-lg shadow-text/5'
                                    : 'border-text/5'
                                    } flex items-center justify-center ${!col ? 'border-dashed border-text/10 bg-text/[0.02]' : ''}`}
                                  style={{ backgroundColor: col || 'transparent' }}
                                >
                                  {!col && <div className="w-1.5 h-1.5 rounded-full bg-text/10" />}
                                </button>
                              );
                            })}

                            {/* Custom Color Picker Button */}
                            <button
                              onClick={() => setIsColorPickerOpen(true)}
                              className={`aspect-square rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center overflow-hidden ${isCustom ? 'border-text shadow-lg shadow-text/10' : 'border-text/5 bg-text/5'
                                }`}
                              style={{ backgroundColor: isCustom ? roomData.wallColor : undefined }}
                            >
                              <Plus
                                size={14}
                                className={`transition-colors ${isCustom ? (['#ffffff', '#FBFBF9', '#F5F5F3'].includes(roomData.wallColor.toLowerCase()) ? 'text-text' : 'text-highlight') : 'text-text/30'}`}
                              />
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </section>
                  <section className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text/30">
                      Wall Materials
                    </h4>
                    <div className="flex gap-2 p-1 bg-text/5 rounded-2xl">
                      {['plain', 'brick', 'concrete', 'plaster'].map((mat) => (
                        <button
                          key={mat}
                          onClick={() => updateRoom({ wallTexture: mat as any })}
                          className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${roomData.wallTexture === mat
                            ? 'bg-text text-[var(--background)] shadow-lg'
                            : 'text-text/40 hover:text-text'
                            }`}
                        >
                          {mat}
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-text/30">
                      Floor Materials
                    </h4>
                    {['plain', 'wood', 'tiles'].map((mat) => (
                      <button
                        key={mat}
                        onClick={() => updateRoom({ floorTexture: mat as any })}
                        className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${roomData.floorTexture === mat
                          ? 'bg-text text-[var(--background)] border-text'
                          : 'bg-background border-text/5 text-text'
                          }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {mat}
                        </span>
                        {roomData.floorTexture === mat && <Check size={16} />}
                      </button>
                    ))}
                  </section>
                </div>
              )}

              {activeSidebarTab === 'library' && (
                <div className="flex flex-col gap-6">
                  {/* Categories UI */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-text/30">Collections</h4>
                      {!isMobile && <span className="text-[10px] font-bold text-text/20 uppercase tracking-widest">{filteredLibraryProducts.length} Items</span>}
                    </div>

                    <div className="relative group/select">
                      <select
                        value={libraryCategory}
                        onChange={(e) => setLibraryCategory(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border-light)] rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest focus:ring-1 focus:ring-primary appearance-none cursor-pointer transition-all hover:bg-[var(--card-bg)] text-[var(--text)]"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text)]/30">
                        <ChevronRight size={16} className="rotate-90" />
                      </div>
                    </div>

                    {libraryCategory !== 'All' && subCategories.length > 1 && (
                      <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto no-scrollbar gap-2 animate-in slide-in-from-top-2 duration-300">
                        {subCategories.map(sub => (
                          <button
                            key={sub}
                            onClick={() => setLibrarySubcategory(sub)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${librarySubcategory.toLowerCase() === sub.toLowerCase() ? 'bg-primary border-primary text-background shadow-[0_4px_10px_rgba(193,200,228,0.3)]' : 'bg-text/5 border-text/10 text-text/30 hover:text-text hover:border-text/20'}`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 xs:grid-cols-3 gap-3 sm:gap-4 pb-10">
                    {filteredLibraryProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addItemToPlacement(p)}
                        onMouseEnter={(e) => handleProductHover(e, p)}
                        onMouseLeave={() => setHoveredProduct(null)}
                        className="aspect-square group bg-secondary/30 rounded-2xl sm:rounded-3xl p-3 sm:p-5 hover:bg-background hover:shadow-2xl hover:shadow-text/5 transition-all relative border border-transparent hover:border-text/5 overflow-hidden"
                      >
                        <img
                          src={p.image}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                          alt={p.name}
                        />
                        <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Plus size={24} className="text-text scale-75 group-hover:scale-100 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PC Bottom Controls */}
            {!isMobile && (
              <div className="mt-auto p-8 border-t border-text/5 bg-background/50 backdrop-blur-xl">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text/20">Project Inventory</p>
                    <span className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">{items.length} ITEMS</span>
                  </div>

                  <div className="flex items-baseline justify-between py-2">
                    <span className="text-2xl font-bold tracking-tighter text-text">
                      ₹{items.reduce((acc, it) => acc + (PRODUCTS.find((p) => p.name === it.type)?.price || 0), 0).toLocaleString()}
                    </span>
                    <button
                      onClick={() => setIsBillOpen(true)}
                      className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/70 transition-colors underline underline-offset-8 decoration-primary/20"
                    >
                      View Statement
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}

        <section
          className="w-full mt-20 architect-canvas relative transition-all duration-500"
          style={isPreviewActive
            ? { height: '100%', marginTop: 0, paddingTop: 0 }
            : {
              height: isMobile ? (isSidebarOpen ? 'calc(100% - 380px)' : 'calc(100% - 5rem)') : 'calc(100% - 5rem)',
              paddingLeft: (!isMobile && isSidebarOpen) ? '550px' : '0',
              paddingRight: '0',
              paddingBottom: '0'
            }
          }
        >
          <div
            ref={canvasContainerRef}
            className={`w-full h-full overflow-hidden transition-all duration-700 ${isPreviewActive ? 'rounded-none shadow-none' : 'canvas-3d'
              }`}
          >
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
              isPreviewActive={isPreviewActive}
              showWalls={showWalls}
              isMobile={isMobile}
            />

            {!isPreviewActive && (
              <div className="absolute top-4 right-4 z-[100] flex flex-col gap-3 items-end">
                <div className="flex flex-col gap-2 items-end">
                  <motion.div
                    initial={false}
                    animate={{
                      height: isToolbarExpanded ? 'auto' : 0,
                      opacity: isToolbarExpanded ? 1 : 0,
                      marginBottom: isToolbarExpanded ? 8 : 0
                    }}
                    className="overflow-hidden flex flex-col gap-2 p-1 bg-background/80 backdrop-blur-xl border border-text/5 rounded-3xl shadow-2xl"
                  >
                    <button
                      onClick={() => setViewMode('TOP')}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${viewMode === 'TOP' ? 'bg-text text-highlight shadow-xl' : 'text-text/40 hover:text-text hover:bg-text/5'
                        }`}
                      title="Plan View"
                    >
                      <Maximize size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode('3D')}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${viewMode === '3D' ? 'bg-text text-highlight shadow-xl' : 'text-text/40 hover:text-text hover:bg-text/5'
                        }`}
                      title="3D Room View"
                    >
                      <Box size={18} />
                    </button>
                    <div className="w-5 h-px bg-text/10 mx-auto my-1" />
                    <button
                      onClick={() => setShowWalls(!showWalls)}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${showWalls ? 'bg-highlight text-background ring-4 ring-highlight/10 shadow-[0_0_25px_rgba(248,232,193,0.5)]' : 'bg-background/40 text-text/20 hover:text-text/40 border border-text/10'
                        }`}
                      title={showWalls ? "Hide Walls" : "Show Walls"}
                    >
                      {showWalls ? <Eye size={18} className="animate-pulse" /> : <EyeOff size={18} />}
                    </button>
                    {isMobile && (
                      <>
                        <div className="w-5 h-px bg-text/10 mx-auto my-1" />
                        <button
                          onClick={() => setIsBillOpen(true)}
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-text/40 hover:text-text hover:bg-text/5 border border-text/10 transition-all"
                          title="View Bill"
                        >
                          <Layout size={18} />
                        </button>
                      </>
                    )}
                  </motion.div>

                  <button
                    onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl backdrop-blur-xl border border-text/5 ${isToolbarExpanded ? 'bg-text text-highlight' : 'bg-background/80 text-text'
                      }`}
                    title="Studio Settings"
                  >
                    <Layers size={20} />
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence>
              {(selectedItemId || placingProduct) && (
                isMobile ? (
                  <div className={`absolute ${isSidebarOpen ? 'bottom-28' : 'bottom-5'} inset-x-0 flex justify-center z-[200] px-6 pointer-events-none`}>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      className="pointer-events-auto flex items-center bg-background/95 backdrop-blur-xl p-3 rounded-[32px] border border-text/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] gap-2 w-full max-w-[340px]"
                    >
                      <div className="flex flex-col px-4 border-r border-text/5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-text/20 mb-0.5">Editing</span>
                        <h4 className="text-[10px] font-bold text-text truncate max-w-[120px] lg:max-w-[200px]">
                          {placingProduct?.name || items.find(it => it.id === selectedItemId)?.type || 'Object'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 lg:gap-2 px-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const id = placingProduct ? 'placing' : selectedItemId;
                            if (id && id !== 'placing') {
                              setItems(prev => prev.map(f => f.id === id ? { ...f, rotation: ((f.rotation || 0) + 45) % 360 } : f));
                            }
                          }}
                          className="p-3 bg-text/5 hover:bg-text/10 rounded-2xl transition-all group"
                          title="Rotate Object"
                        >
                          <RotateCw size={20} className="text-text/40 group-hover:text-text group-hover:rotate-90 transition-transform" />
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); if (placingProduct) setPlacingProduct(null); else if (selectedItemId) { setItems(items.filter(it => it.id !== selectedItemId)); setSelectedItemId(null); } }} className="p-3 bg-[#E11D48]/5 hover:bg-[#E11D48]/10 rounded-2xl transition-all group">
                          <X size={20} className="text-[#E11D48]/40 group-hover:text-[#E11D48]" />
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); if (placingProduct) setPlacingProduct(null); else setSelectedItemId(null); }} className="p-3 bg-primary/10 hover:bg-primary/20 rounded-2xl transition-all group">
                          <Check size={20} className="text-primary group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex items-center bg-background/80 backdrop-blur-xl p-2 rounded-[32px] border border-text/5 shadow-2xl gap-3"
                  >
                    <div className="flex flex-col px-4 border-r border-text/5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-text/20 mb-0.5">Editing</span>
                      <h4 className="text-[10px] font-bold text-text truncate max-w-[200px]">
                        {placingProduct?.name || items.find(it => it.id === selectedItemId)?.type || 'Object'}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 pr-4">
                      <button onClick={(e) => { e.stopPropagation(); const id = placingProduct ? 'placing' : selectedItemId; if (id && id !== 'placing') setItems(prev => prev.map(f => f.id === id ? { ...f, rotation: ((f.rotation || 0) + 45) % 360 } : f)); }} className="w-12 h-12 bg-text/5 text-text rounded-2xl flex items-center justify-center hover:bg-text/10 transition-all border border-text/5">
                        <RotateCw size={18} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (placingProduct) setPlacingProduct(null); else if (selectedItemId) { setItems(items.filter(it => it.id !== selectedItemId)); setSelectedItemId(null); } }} className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/10">
                        <Trash2 size={18} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (placingProduct) setPlacingProduct(null); else setSelectedItemId(null); }} className="w-12 h-12 bg-text border border-text text-background rounded-2xl flex items-center justify-center hover:scale-105 transition-all">
                        <Check size={18} />
                      </button>
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>

          {placingProduct && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-highlight text-background px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
              <MousePointer2 size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                Click floor to place {placingProduct.name}
              </span>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {isBillOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBillOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="relative w-full max-w-2xl bg-background rounded-[48px] shadow-[0_50px_100px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col max-h-[85vh] border border-text/5"
            >
              <div className="p-6 lg:p-10 border-b border-text/5 flex items-center justify-between bg-background">
                <div>
                  <h3 className="text-xl lg:text-2xl font-serif text-text">Your Curated Bill</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-[0.2em] text-text/30 px-2 lg:px-3 py-1 bg-text/5 rounded-full">
                      Project: {roomData.projectTitle}
                    </span>
                    <span className="text-[7px] lg:text-[8px] font-black uppercase tracking-[0.2em] text-text/30 px-2 lg:px-3 py-1 bg-text/5 rounded-full">
                      {items.length} Products
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsBillOpen(false)}
                  className="p-3 lg:p-4 hover:bg-text/5 rounded-full transition-all hover:rotate-90 group"
                >
                  <X size={20} className="lg:w-6 lg:h-6 text-text/20 group-hover:text-text" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-4 lg:space-y-6 custom-scrollbar bg-background/50">
                {items.length === 0 ? (
                  <div className="py-16 lg:py-24 text-center space-y-4">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-text/5 rounded-full flex items-center justify-center mx-auto">
                      <Plus size={24} className="lg:w-8 lg:h-8 text-text/10" />
                    </div>
                    <div>
                      <p className="text-base lg:text-lg font-serif text-text/40">Your receipt is empty</p>
                      <p className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-text/20 mt-1">Add items from the library to build your project</p>
                    </div>
                  </div>
                ) : (
                  items.map((item) => {
                    const product = PRODUCTS.find(p => p.name === item.type);
                    return (
                      <div key={item.id} className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 p-5 lg:p-6 rounded-[28px] lg:rounded-[32px] bg-background border border-text/5 shadow-sm hover:shadow-xl hover:shadow-text/[0.02] transition-all group">
                        <div className="hidden lg:block w-24 h-24 bg-secondary/30 rounded-[24px] overflow-hidden p-4 group-hover:scale-105 transition-transform duration-500">
                          <img src={product?.image} className="w-full h-full object-contain" alt={item.type} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between lg:block">
                            <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-text/30">{product?.category}</span>
                            <span className="lg:hidden text-lg font-bold tracking-tighter text-text">₹{product?.price}</span>
                          </div>
                          <h4 className="text-base lg:text-lg font-serif leading-tight text-text">{item.type}</h4>
                          <div className="flex items-center gap-3 pt-1">
                            <span className="text-[8px] lg:text-[9px] font-bold text-text/40">ID: {item.id}</span>
                            <div className="w-1 h-1 rounded-full bg-text/10" />
                            <span className="text-[8px] lg:text-[9px] font-bold text-text/40">Status: In Scene</span>
                          </div>
                        </div>
                        <div className="hidden lg:block text-right">
                          <span className="text-xl font-bold tracking-tighter text-text">₹{product?.price}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-6 lg:p-10 bg-background border-t border-text/5">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-8 lg:mb-10 px-2 lg:px-4 gap-4">
                  <div className="space-y-1">
                    <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] text-text/20 block">Statement Total</span>
                    <span className="text-[7px] font-bold text-[#1AA06D] uppercase tracking-widest opacity-80">Inclusive of all taxes</span>
                  </div>
                  <span className="text-2xl lg:text-3xl font-bold tracking-tighter text-text">
                    ₹{items.reduce((acc, it) => acc + (PRODUCTS.find((p) => p.name === it.type)?.price || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col-reverse lg:flex-row gap-3 lg:gap-4">
                  <button
                    onClick={() => setIsBillOpen(false)}
                    className="w-full lg:flex-1 py-5 lg:py-6 rounded-[20px] lg:rounded-[24px] border border-text/10 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] hover:bg-text/5 transition-all text-text/40 hover:text-text"
                  >
                    Back to Design
                  </button>
                  <button
                    onClick={() => {
                      toast.success("Design catalog added to cart!");
                      setIsBillOpen(false);
                    }}
                    className="w-full lg:flex-[1.5] py-5 lg:py-6 rounded-[20px] lg:rounded-[24px] bg-highlight text-background text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-highlight/20 flex items-center justify-center gap-3"
                  >
                    <Plus size={16} />
                    Checkout All
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SaveConfirmationModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onSave={handleSaveAndExit}
        onDiscard={handleDiscardAndExit}
        description="Leaving will discard your unsaved changes. Would you like to save your project first?"
      />
    </div>
  );
};

export default BlueprintDesigner;
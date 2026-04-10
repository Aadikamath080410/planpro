import React, { useState, useRef, useEffect } from 'react';
import {
  X, QrCode, Camera, Loader2, Info, MousePointer2, Box,
  Plus, Trash2
} from 'lucide-react';
import { Product } from '../types';
import { PRODUCTS } from '../data/mockData';
import ARScene3D from './ARScene3D';
import Scene3D from './Scene3D';

interface PlacedItem {
  instanceId: string;
  product: Product;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface ARPreviewModalProps {
  product: Product;
  onClose: () => void;
  initialViewMode?: 'inspect' | 'live';
}

const ARPreviewModal: React.FC<ARPreviewModalProps> = ({ product, onClose, initialViewMode = 'inspect' }) => {
  const [viewMode, setViewMode] = useState<'inspect' | 'live'>(initialViewMode);
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([
    { instanceId: 'init', product, x: 50, y: 50, scale: 1, rotation: 0 }
  ]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>('init');
  const [showStudioOnMobile, setShowStudioOnMobile] = useState(false);

  const arUrl = `${window.location.protocol}//${window.location.host}/ar?id=${product.id}`;

  const updateItem = (id: string, updates: Partial<PlacedItem>) => {
    setPlacedItems(items => items.map(item =>
      item.instanceId === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    setPlacedItems(items => items.filter(i => i.instanceId !== id));
    if (selectedInstanceId === id) setSelectedInstanceId(null);
  };

  const selectedItem = placedItems.find(i => i.instanceId === selectedInstanceId);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-12">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose} />

      <div className="relative w-full h-full max-w-6xl max-h-[850px] bg-white rounded-[40px] md:rounded-[60px] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-500">

        {/* Left Panel: Viewport */}
        <div className="flex-1 bg-[#F5F5F3] relative overflow-hidden">

          {viewMode === 'inspect' ? (
            /* 3D Model Inspect View */
            <div className="w-full h-full relative">
              <Scene3D modelUrl={product.model} textureUrl={product.texture} />

              {/* Interaction hint */}
              <div className="absolute bottom-10 left-0 right-0 flex justify-center pointer-events-none">
                <div className="flex items-center gap-3 py-2 px-5 bg-white/60 backdrop-blur-md rounded-full border border-black/5 shadow-sm">
                  <MousePointer2 size={13} className="text-black/40" strokeWidth={2.5} />
                  <span className="text-[10px] font-black text-black/40 uppercase tracking-[0.2em]">Drag to Orbit · Scroll to Zoom</span>
                </div>
              </div>

              {/* Subtle scanline */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/5 to-transparent pointer-events-none" />
            </div>
          ) : (
            /* Live AR: QR Code Center */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 p-10">
              {/* Label */}
              <div className="text-center space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30">Scan to View in Your Space</p>
                <p className="text-xs text-black/40 font-medium max-w-xs text-center leading-relaxed">
                  Point your phone camera at this QR code to open the live AR experience.
                </p>
              </div>

              {/* QR Code Card */}
              <div className="relative">
                <div className="w-56 h-56 md:w-72 md:h-72 bg-white rounded-[36px] shadow-2xl border border-black/[0.04] flex items-center justify-center p-5 relative overflow-hidden">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(arUrl)}&margin=8&color=000000&bgcolor=ffffff`}
                    alt="AR QR Code"
                    className="w-full h-full object-contain rounded-2xl"
                  />
                  {/* Subtle inner shadow */}
                  <div className="absolute inset-0 rounded-[36px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] pointer-events-none" />
                </div>

                {/* Corner accent marks */}
                {['top-3 left-3 border-t-2 border-l-2 rounded-tl-xl', 'top-3 right-3 border-t-2 border-r-2 rounded-tr-xl', 'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-xl', 'bottom-3 right-3 border-b-2 border-r-2 rounded-br-xl'].map((cls, i) => (
                  <div key={i} className={`absolute ${cls} w-7 h-7 border-black/20 pointer-events-none`} />
                ))}
              </div>

              {/* AR URL display */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white/70 backdrop-blur-sm rounded-full border border-black/5 shadow-sm max-w-xs">
                <QrCode size={13} className="text-black/30 flex-shrink-0" />
                <p className="text-[10px] text-black/40 font-medium truncate">{arUrl}</p>
              </div>
            </div>
          )}

          {/* Tab switcher */}
          <div className="absolute top-6 left-6 z-[150]">
            <div className="flex bg-white/85 backdrop-blur-md p-1.5 rounded-full border border-black/5 shadow-sm gap-1">
              <button
                onClick={() => setViewMode('inspect')}
                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === 'inspect' ? 'bg-black text-white shadow-lg' : 'text-black/30 hover:text-black'}`}
              >
                <Box size={11} /> Inspect
              </button>
              <button
                onClick={() => setViewMode('live')}
                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === 'live' ? 'bg-black text-white shadow-lg' : 'text-black/30 hover:text-black'}`}
              >
                <QrCode size={11} /> AR Live
              </button>
            </div>
          </div>

          {/* Mobile: expand panel toggle */}
          <button
            onClick={() => setShowStudioOnMobile(!showStudioOnMobile)}
            className="absolute top-6 right-6 z-[150] md:hidden p-3 rounded-full bg-black text-white shadow-xl flex items-center gap-1.5"
          >
            {showStudioOnMobile ? <X size={16} /> : <Plus size={16} />}
            <span className="text-[9px] font-bold uppercase tracking-widest pr-0.5">
              {showStudioOnMobile ? 'Close' : 'Info'}
            </span>
          </button>
        </div>

        {/* Right Panel: Studio Controls */}
        <div className={`w-full md:w-[380px] flex flex-col bg-white z-[200] border-l border-black/5 absolute inset-y-0 right-0 md:relative transition-transform duration-500 ease-in-out ${showStudioOnMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>

          {/* Header */}
          <div className="p-10 pb-6 flex justify-between items-start flex-shrink-0">
            <div className="space-y-1">
              <h3 className="text-3xl font-serif">Spatial Studio</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">AR Preview System</p>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-full hover:bg-black/5 transition-all active:scale-90">
              <X size={20} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10 space-y-10">

            {/* Viewing product */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">Viewing</h4>
              <div className="p-4 bg-[#F5F5F3] rounded-[24px] border border-black/5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex-shrink-0 shadow-sm">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-black truncate">{product.name}</p>
                  <p className="text-[10px] text-black/40 font-medium mt-0.5">{product.category}</p>
                  <p className="text-sm font-black text-black mt-1">₹{product.price.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="space-y-5">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">How It Works</h4>
              <div className="space-y-5">
                {[
                  { step: 1, title: 'Inspect in 3D', desc: 'Orbit, zoom and examine your product from every angle using the Inspect view.' },
                  { step: 2, title: 'Scan QR Code', desc: 'Switch to AR Live and scan the QR code with your phone to place the item in your room.' },
                  { step: 3, title: 'Place in Your Space', desc: 'Walk around and see how the piece fits before you buy.' }
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex items-start gap-4 group">
                    <div className="w-7 h-7 rounded-xl bg-black/5 flex items-center justify-center text-[10px] font-black flex-shrink-0 group-hover:bg-black group-hover:text-white transition-all">
                      {step}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[11px] font-black text-black uppercase tracking-tight">{title}</p>
                      <p className="text-[10px] text-black/40 font-medium leading-relaxed mt-1">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dimensions / Details if available */}
            {product.dimensions && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">Dimensions</h4>
                <div className="p-4 bg-[#F5F5F3] rounded-[24px] border border-black/5">
                  <p className="text-xs text-black/60 font-medium">{product.dimensions}</p>
                </div>
              </div>
            )}

            {/* AR URL info */}
            <div className="p-5 bg-[#F5F5F3] rounded-[28px] border border-black/5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-black/5 flex-shrink-0">
                  <Info size={16} className="text-black/40" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-black">AR Link</p>
                  <p className="text-[9px] text-black/40 font-medium mt-1 break-all leading-relaxed">{arUrl}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ARPreviewModal;

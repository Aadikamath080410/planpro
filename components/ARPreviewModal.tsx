import React, { useState, useEffect } from 'react';
import {
  X, QrCode, Box,
  MousePointer2, Plus, Info
} from 'lucide-react';
import { Product } from '../types';
import Scene3D from './Scene3D';

interface ARPreviewModalProps {
  product: Product;
  onClose: () => void;
  initialViewMode?: 'inspect' | 'live' | 'qr';
}

/* ── QR Success Checkmark SVG ──────────────────────────────────────────────
   A green checkmark morphing out of a loading circle once the QR code is ready.
   Uses the circleSuccess + checkMorph keyframes from index.css.
   ──────────────────────────────────────────────────────────────────────── */
const QRSuccessBadge: React.FC = () => (
  <div
    className="absolute -top-3 -right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
    style={{ background: '#0A0C10', border: '2px solid #22c55e', zIndex: 10 }}
  >
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring morphs from loading-circle stroke to green */}
      <circle
        cx="10" cy="10" r="8"
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="50"
        strokeDashoffset="0"
        fill="none"
        style={{ animation: 'circleSuccess 0.5s ease forwards' }}
      />
      {/* Checkmark stroke draws in */}
      <polyline
        points="5.5,10.5 8.5,13.5 14.5,7.5"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{
          strokeDasharray: 50,
          strokeDashoffset: 50,
          animation: 'checkMorph 0.4s ease 0.4s forwards',
        }}
      />
    </svg>
  </div>
);

const ARPreviewModal: React.FC<ARPreviewModalProps> = ({
  product,
  onClose,
  initialViewMode = 'inspect',
}) => {
  const [viewMode, setViewMode] = useState<'inspect' | 'live' | 'qr'>(initialViewMode);
  const [showStudioOnMobile, setShowStudioOnMobile] = useState(false);

  // QR "ready" state — triggers success animation after a simulated generation delay
  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (viewMode === 'live' || viewMode === 'qr') {
      setQrReady(false);
      // Simulate 1.4s generation time, then reveal success animation
      const t = setTimeout(() => setQrReady(true), 1400);
      return () => clearTimeout(t);
    }
  }, [viewMode]);

  // In production, VITE_AR_MODULE_URL points to the separately deployed ARModule (e.g. planpro-ar.vercel.app).
  // Falls back to the current origin so local dev still works without any extra config.
  const arBaseUrl = import.meta.env.VITE_AR_MODULE_URL || `${window.location.protocol}//${window.location.host}`;
  const arUrl = `${arBaseUrl}/ar?id=${product.id}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-8 md:p-14 lg:p-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: 'rgba(10,12,16,0.78)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-[92%] max-w-5xl h-auto max-h-[85vh] rounded-[40px] md:rounded-[56px] overflow-hidden shadow-2xl flex flex-col md:flex-row gpu-accelerated"
        style={{
          background: 'var(--background)',
          border: '1px solid rgba(193,200,228,0.08)',
          animation: 'heroZoomIn 0.45s cubic-bezier(0.25,1,0.5,1) forwards',
        }}
      >

        {/* ── LEFT: Viewport ────────────────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden" style={{ background: 'rgba(20,26,40,0.6)' }}>

          {viewMode === 'inspect' ? (
            /* 3D Model Inspect */
            <div className="w-full h-full relative">
              <Scene3D modelUrl={product.model} textureUrl={product.texture} />

              {/* Orbit hint */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                <div
                  className="flex items-center gap-2.5 py-2 px-5 rounded-full shadow-sm"
                  style={{
                    background: 'rgba(10,12,16,0.72)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(193,200,228,0.08)',
                  }}
                >
                  <MousePointer2 size={12} style={{ color: 'var(--secondary-text)' }} strokeWidth={2.5} />
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.2em]"
                    style={{ color: 'var(--secondary-text)' }}
                  >
                    Drag to Orbit · Scroll to Zoom
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ── QR / AR Live view ── */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 p-10">
              {/* Label */}
              <div className="text-center space-y-1.5">
                <p
                  className="text-[10px] font-black uppercase tracking-[0.3em]"
                  style={{ color: 'var(--secondary-text)' }}
                >
                  Scan to View in Your Space
                </p>
                <p className="text-xs font-medium max-w-xs text-center leading-relaxed" style={{ color: 'rgba(160,170,184,0.55)' }}>
                  Point your phone camera at this QR code to open the live AR experience.
                </p>
              </div>

              {/* QR Code Card */}
              <div className="relative">
                <div
                  className="w-56 h-56 md:w-64 md:h-64 rounded-[32px] shadow-2xl flex items-center justify-center p-4 relative overflow-hidden"
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(193,200,228,0.1)',
                    opacity: qrReady ? 1 : 0.6,
                    transition: 'opacity 0.4s ease',
                  }}
                >
                  {/* Loading shimmer while QR generates */}
                  {!qrReady && (
                    <div
                      className="absolute inset-0 rounded-[32px]"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.2s ease-in-out infinite',
                      }}
                    />
                  )}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(arUrl)}&margin=8&color=000000&bgcolor=ffffff`}
                    alt="AR QR Code"
                    className="w-full h-full object-contain rounded-2xl"
                    style={{ transition: 'filter 0.5s ease', filter: qrReady ? 'none' : 'blur(4px)' }}
                  />
                </div>

                {/* Success badge — morphing checkmark, appears when qrReady */}
                {qrReady && <QRSuccessBadge />}

                {/* Corner accent marks */}
                {[
                  'top-3 left-3 border-t-2 border-l-2 rounded-tl-xl',
                  'top-3 right-3 border-t-2 border-r-2 rounded-tr-xl',
                  'bottom-3 left-3 border-b-2 border-l-2 rounded-bl-xl',
                  'bottom-3 right-3 border-b-2 border-r-2 rounded-br-xl',
                ].map((cls, i) => (
                  <div
                    key={i}
                    className={`absolute ${cls} w-7 h-7 pointer-events-none`}
                    style={{ borderColor: qrReady ? 'rgba(34,197,94,0.5)' : 'rgba(193,200,228,0.2)', transition: 'border-color 0.4s ease' }}
                  />
                ))}
              </div>

              {/* Ready state confirmation text */}
              {qrReady && (
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.3)',
                    color: '#22c55e',
                    animation: 'fadeUp 0.4s cubic-bezier(0.25,1,0.5,1) forwards',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                    <polyline points="4,10 8,14 16,6" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Link Ready — Scan Now
                </div>
              )}

              {/* AR URL display */}
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-sm max-w-xs"
                style={{
                  background: 'rgba(10,12,16,0.7)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(193,200,228,0.08)',
                }}
              >
                <QrCode size={12} style={{ color: 'var(--secondary-text)', flexShrink: 0 }} />
                <p className="text-[10px] font-medium truncate" style={{ color: 'var(--secondary-text)' }}>
                  {arUrl}
                </p>
              </div>
            </div>
          )}

          {/* ── Tab switcher ── */}
          <div className="absolute top-5 left-5" style={{ zIndex: 150 }}>
            <div
              className="flex p-1.5 rounded-full gap-1"
              style={{
                background: 'rgba(10,12,16,0.88)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(193,200,228,0.08)',
              }}
            >
              {[
                { id: 'inspect' as const, icon: <Box size={11} />, label: 'Inspect' },
                { id: 'live' as const, icon: <QrCode size={11} />, label: 'AR Live' },
              ].map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                    viewMode === id
                      ? 'text-background shadow-lg'
                      : 'hover:text-primary'
                  }`}
                  style={
                    viewMode === id
                      ? { background: 'var(--primary)' }
                      : { color: 'var(--secondary-text)' }
                  }
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile expand toggle */}
          <button
            onClick={() => setShowStudioOnMobile(!showStudioOnMobile)}
            className="absolute top-5 right-5 md:hidden p-3 rounded-full shadow-xl flex items-center gap-1.5 touch-target"
            style={{ background: 'var(--primary)', color: 'var(--background)', zIndex: 150 }}
          >
            {showStudioOnMobile ? <X size={15} /> : <Plus size={15} />}
            <span className="text-[9px] font-bold uppercase tracking-widest pr-0.5">
              {showStudioOnMobile ? 'Close' : 'Info'}
            </span>
          </button>
        </div>

        {/* ── RIGHT: Studio Panel ──────────────────────────────────────── */}
        <div
          className={`w-full md:w-[360px] flex flex-col absolute inset-y-0 right-0 md:relative transition-transform duration-500 ease-in-out ${
            showStudioOnMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
          }`}
          style={{
            background: 'var(--background)',
            borderLeft: '1px solid rgba(193,200,228,0.06)',
            zIndex: 200,
          }}
        >
          {/* Panel header */}
          <div className="p-8 pb-5 flex justify-between items-start flex-shrink-0">
            <div className="space-y-1">
              <h3 className="text-2xl font-serif" style={{ color: 'var(--primary)' }}>
                Spatial Studio
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--secondary-text)' }}>
                AR Preview System
              </p>
            </div>
            <button
              onClick={onClose}
              className="touch-target p-2.5 rounded-full hover:bg-primary/10 transition-all active:scale-90"
            >
              <X size={18} style={{ color: 'var(--primary)' }} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 space-y-8">
            {/* Product preview */}
            <div className="space-y-3">
              <h4
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: 'var(--secondary-text)' }}
              >
                Viewing
              </h4>
              <div
                className="p-4 rounded-[20px] flex items-center gap-4"
                style={{ background: 'var(--secondary)', border: '1px solid rgba(193,200,228,0.07)' }}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black truncate" style={{ color: 'var(--text)' }}>
                    {product.name}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--secondary-text)' }}>
                    {product.category}
                  </p>
                  <p className="text-sm font-black mt-1" style={{ color: 'var(--primary)' }}>
                    ₹{product.price.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              <h4
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: 'var(--secondary-text)' }}
              >
                How It Works
              </h4>
              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: 'Inspect in 3D',
                    desc: 'Orbit, zoom and examine your product from every angle using the Inspect view.',
                  },
                  {
                    step: 2,
                    title: 'Scan QR Code',
                    desc: 'Switch to AR Live and scan the QR code with your phone to place the item in your room.',
                  },
                  {
                    step: 3,
                    title: 'Place in Your Space',
                    desc: 'Walk around and see how the piece fits before you buy.',
                  },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex items-start gap-3 group">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black flex-shrink-0 transition-all"
                      style={{ background: 'var(--secondary)', color: 'var(--primary)' }}
                    >
                      {step}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[11px] font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>
                        {title}
                      </p>
                      <p
                        className="text-[10px] font-medium leading-relaxed mt-1"
                        style={{ color: 'var(--secondary-text)' }}
                      >
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dimensions */}
            {(product as any).dimensions && (
              <div className="space-y-3">
                <h4
                  className="text-[10px] font-black uppercase tracking-[0.2em]"
                  style={{ color: 'var(--secondary-text)' }}
                >
                  Dimensions
                </h4>
                <div
                  className="p-4 rounded-[18px]"
                  style={{ background: 'var(--secondary)', border: '1px solid rgba(193,200,228,0.07)' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'var(--secondary-text)' }}>
                    {(product as any).dimensions}
                  </p>
                </div>
              </div>
            )}

            {/* AR URL info */}
            <div
              className="p-4 rounded-[20px]"
              style={{ background: 'var(--secondary)', border: '1px solid rgba(193,200,228,0.07)' }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: 'rgba(193,200,228,0.08)' }}
                >
                  <Info size={14} style={{ color: 'var(--secondary-text)' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text)' }}>
                    AR Link
                  </p>
                  <p
                    className="text-[9px] font-medium mt-1 break-all leading-relaxed"
                    style={{ color: 'var(--secondary-text)' }}
                  >
                    {arUrl}
                  </p>
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
import React, { useEffect, useRef, useState } from "react";
import "@google/model-viewer";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, RotateCcw, ArrowLeft } from "lucide-react";

// Use a constant to bypass strict JSX intrinsic checks for the Web Component
const ModelViewer = "model-viewer" as any;

export default function ARScene({ modelData, initialSelectedIndex = 0, onBack }: any) {
  const mvRef = useRef<any>(null);
  const [status, setStatus] = useState<"finding" | "locked" | "placed">("finding");
  const [inAR, setInAR] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const currentProduct = modelData[selectedIndex];

  // Logic: Mirroring the reference code's rescan
  const handleRescan = () => {
    if (!mvRef.current) return;
    const currentSrc = mvRef.current.src;
    mvRef.current.src = ""; // Flash the source to reset tracking
    setTimeout(() => {
      mvRef.current.src = currentSrc;
      setStatus("finding");
    }, 100);
  };

  useEffect(() => {
    setSelectedIndex(initialSelectedIndex);
  }, [initialSelectedIndex]);

  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;

    const onArStatus = (event: any) => {
      setInAR(event.detail.status === "session-started");
      if (event.detail.status === "not-presenting") {
        setStatus("finding");
      }
    };

    const onHitTest = () => {
      if (status !== "placed") {
        setStatus("locked");
      }
    };

    // When the user taps to place, the model becomes 'stable'
    const onSelect = () => {
        if (status === "locked") {
            setStatus("placed");
        }
    };

    mv.addEventListener("ar-status", onArStatus);
    mv.addEventListener("ar-hit-test-achieved", onHitTest);
    mv.addEventListener("click", onSelect); // model-viewer interprets taps as clicks

    return () => {
      mv.removeEventListener("ar-status", onArStatus);
      mv.removeEventListener("ar-hit-test-achieved", onHitTest);
      mv.removeEventListener("click", onSelect);
    };
  }, [status]);

  return (
    <div className="ar-workspace" style={{ width: "100%", height: "100vh", position: "relative", background: "var(--background)", overflow: "hidden" }}>
      
      {/* 1. Model Viewer Engine */}
      <ModelViewer
        ref={mvRef}
        src={currentProduct.url}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-placement="floor"
        ar-scale="fixed"
        scale={currentProduct.scale ? `${currentProduct.scale} ${currentProduct.scale} ${currentProduct.scale}` : "1 1 1"}
        camera-controls
        touch-action="pan-y"
        environment-image="neutral"
        exposure="1.15"
        shadow-intensity="1.5"
        shadow-softness="1"
        style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
      >
        {/* Launch AR Button Slot */}
        <button slot="ar-button" className="btn-ar-session">
          <Smartphone size={18} />
          <span>Start AR Session</span>
        </button>

        {/* 2. Professional HUD Overlay */}
        <AnimatePresence>
          {inAR && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2000 }}
            >
              {/* Rescan Button */}
              <button 
                onClick={handleRescan}
                className="btn-ar-rescan"
              >
                <RotateCcw size={16} />
                RESCAN FLOOR
              </button>

              {/* Status Instructional Text */}
              {status !== "placed" && (
                <div style={{ position: "fixed", top: "15%", width: "100%", textAlign: "center" }}>
                    <motion.p 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className={`ar-instruction-pill ${status === 'locked' ? 'locked' : ''}`}
                    >
                    {status === "locked" ? "✓ Floor Detected • Tap to place" : "Scanning surface... Move phone slowly"}
                    </motion.p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </ModelViewer>

      {/* Product Information Card */}
      {!inAR && (
          <div className="ar-product-card-overlay">
            <div className="flex items-center gap-4 flex-1">
              <div className="ar-product-img-wrapper">
                <img src={currentProduct.image} alt={currentProduct.name} />
              </div>
              <div>
                <h3 className="ar-product-title">{currentProduct.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="ar-status-dot animate-pulse"></span>
                  <span className="ar-product-subtitle">Ready for Staging</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onBack}
              className="ar-card-back-btn"
            >
              <ArrowLeft size={16} />
              <span>EXIT</span>
            </button>
          </div>
      )}
    </div>
  );
}

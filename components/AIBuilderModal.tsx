
import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, Loader2, Image as ImageIcon, Camera, RefreshCw, Check } from 'lucide-react';
import { Product } from '../types';
import { geminiService } from '../services/geminiService';
import { uploadToAppScript } from '../services/exporter';
import { toast } from 'sonner';
import SaveConfirmationModal from './SaveConfirmationModal';

interface AIBuilderModalProps {
  product: Product | null;
  onClose: () => void;
}

const AIBuilderModal: React.FC<AIBuilderModalProps> = ({ product, onClose }) => {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setShowCamera(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        setResult(null);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const runAIBuilder = async () => {
    if (!image || !product) return;
    setIsLoading(true);
    try {
      const editedRoom = await geminiService.buildRoomWithAI(image, `${product.name} (${product.description})`);
      setResult(editedRoom);
    } catch (error) {
      console.error("AI Builder failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAttempt = () => {
    if (result || image) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handleSaveAndExit = async () => {
    if (result) {
      const id = toast.loading("Saving design to Google Drive...");
      try {
        const resp = await fetch(result);
        const blob = await resp.blob();
        await uploadToAppScript(blob, `AI_Design_${Date.now()}.png`, 'image/png');
        toast.success("Design saved!", { id });
        onClose();
      } catch (err) {
        console.error("Save failed:", err);
        toast.error("Failed to save design", { id });
      }
    } else {
      onClose();
    }
  };

  const handleDiscardAndExit = () => {
    setImage(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleCloseAttempt} />
      <div className="relative bg-background w-[95%] max-w-5xl h-auto max-h-[85vh] rounded-[40px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500 flex flex-col md:flex-row border border-text/5">

        {/* Left Panel: Preview / Viewport */}
        <div className="flex-1 bg-background/50 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="w-full h-full bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          </div>

          {showCamera ? (
            <div className="w-full h-full relative z-10">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
                <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-background border-4 border-highlight/20 flex items-center justify-center shadow-2xl active:scale-90 transition-all">
                  <div className="w-12 h-12 rounded-full border-2 border-highlight" />
                </button>
                <button onClick={stopCamera} className="p-4 rounded-full bg-black/10 backdrop-blur-md text-white hover:bg-black hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>
          ) : !image ? (
            <div className="text-center space-y-6 max-w-sm px-6 relative z-10">
              <div className="w-24 h-24 bg-secondary rounded-[32px] flex items-center justify-center mx-auto border border-text/5 shadow-xl">
                <ImageIcon size={40} className="text-text/10" />
              </div>
              <div className="space-y-2">
                <h4 className="text-xl font-bold tracking-tight text-text">Capture Your Space</h4>
                <p className="text-text/40 text-sm">Upload a photo or use your camera to see how our collection fits in your room.</p>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 bg-highlight text-background rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-xl"
                >
                  <Upload size={16} /> Choose Photo
                </button>
                <button
                  onClick={startCamera}
                  className="w-full py-4 bg-background text-text border border-text/10 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-secondary transition-all shadow-sm"
                >
                  <Camera size={16} /> Use Camera
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </div>
            </div>
          ) : (
            <>
              <img src={result || image} className="w-full h-full object-contain relative z-10" alt="Room preview" />
              <div className="absolute top-6 left-6 flex gap-2 z-20">
                <div className="px-4 py-2 bg-background/80 backdrop-blur-md text-text text-[9px] font-black uppercase tracking-widest rounded-full border border-text/5 shadow-sm">
                  {result ? 'AI Vision Applied' : 'Base Environment'}
                </div>
              </div>
            </>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center text-text gap-6 z-50">
              <div className="relative">
                <div className="absolute -inset-4 bg-primary/20 rounded-full animate-ping opacity-20" />
                <Loader2 className="animate-spin text-primary/40" size={64} strokeWidth={1.5} />
              </div>
              <div className="text-center space-y-2">
                <p className="font-bold text-3xl animate-pulse tracking-tight">Designing Space...</p>
                <p className="text-text/30 text-[10px] font-black uppercase tracking-[0.2em]">Calculating spatial depth & shadows</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Studio Controls */}
        <div className="w-full md:w-[360px] p-10 flex flex-col justify-between bg-secondary z-10 border-l border-text/5">
          <div className="space-y-10">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-text">AI Studio</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text/30 mt-1">Spatial Engine v3.0</p>
              </div>
              <button onClick={handleCloseAttempt} className="p-2.5 rounded-full hover:bg-text/5 transition-all active:scale-90 text-text">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Product Info Card */}
              <div className="p-5 bg-background/50 rounded-[24px] flex items-center gap-4 border border-text/5 shadow-inner">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary shadow-sm flex-shrink-0 border border-text/5">
                  <img src={product?.image} className="w-full h-full object-cover" alt={product?.name} />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[9px] uppercase font-black tracking-widest text-text/30 block mb-0.5">{product?.category}</span>
                  <p className="font-bold text-sm truncate text-text/80">{product?.name}</p>
                </div>
              </div>

              {image && !result && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-5 bg-primary/10 rounded-[24px] border border-primary/10">
                    <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                      <RefreshCw size={12} className="animate-spin-slow" /> Scene Ready
                    </p>
                    <p className="text-[11px] text-text/40 font-medium leading-relaxed">
                      Our neural engine will now map your environment and place the object with physics-accurate lighting.
                    </p>
                  </div>
                  <button
                    onClick={() => { setImage(null); setResult(null); }}
                    className="w-full py-4 border border-text/5 rounded-[20px] text-[10px] font-black uppercase tracking-widest text-text/30 hover:text-text hover:border-text transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} /> Replace Photo
                  </button>
                </div>
              )}

              {result && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-5 bg-accent/10 border border-accent/20 rounded-[24px]">
                    <p className="text-[10px] text-accent font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Check size={12} /> Render Complete
                    </p>
                    <p className="text-[11px] text-text/40 font-medium leading-relaxed">
                      Perspective and ambient occlusion have been optimized for your room's specific lighting profile.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setResult(null)}
                      className="py-4 border border-text/5 rounded-[20px] text-[10px] font-black uppercase tracking-widest text-text/30 hover:text-text hover:border-text transition-all"
                    >
                      Reset View
                    </button>
                    <button
                      onClick={async () => {
                        if (!result) return;
                        const id = toast.loading("Saving design to Google Drive...");
                        try {
                          // Convert base64 result back to blob for the helper
                          const resp = await fetch(result);
                          const blob = await resp.blob();
                          await uploadToAppScript(blob, `AI_Design_${Date.now()}.png`, 'image/png');
                          toast.success("Design saved to Google Drive!", { id });
                        } catch (err) {
                          console.error("Save failed:", err);
                          toast.error("Failed to save design", { id });
                        }
                      }}
                      className="py-4 bg-highlight text-background rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-highlight/10"
                    >
                      Save Design
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 pt-10">
            <button
              onClick={runAIBuilder}
              disabled={!image || isLoading || !product || !!result}
              className="w-full py-5 bg-highlight text-background rounded-[28px] flex items-center justify-center gap-4 hover:scale-[1.01] active:scale-95 disabled:bg-text/5 disabled:text-text/20 disabled:scale-100 transition-all shadow-2xl shadow-highlight/10 group"
            >
              <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">Generate Vision</span>
            </button>
            <div className="flex flex-col items-center gap-1.5 opacity-20">
              <p className="text-[8px] font-black uppercase tracking-[0.4em] text-text">PlanPro Spatial Engine</p>
              <div className="w-12 h-0.5 bg-primary rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
      <SaveConfirmationModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onSave={handleSaveAndExit}
        onDiscard={handleDiscardAndExit}
        description="Leaving will discard your current AI design and clear the session cache. Would you like to save it first?"
      />
    </div >
  );
};

export default AIBuilderModal;

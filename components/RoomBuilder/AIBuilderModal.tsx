
import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, Loader2, Image as ImageIcon, Camera, RefreshCw, Check } from 'lucide-react';
import { Product } from "../../types";
import { geminiService } from "../../services/geminiService";
import { uploadToAppScript } from "../../services/exporter";
import { toast } from 'sonner';

interface AIBuilderModalProps {
  product: Product | null;
  onClose: () => void;
}

const AIBuilderModal: React.FC<AIBuilderModalProps> = ({ product, onClose }) => {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-[#FBFBF9] w-full max-w-5xl h-[85vh] rounded-[40px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500 flex flex-col md:flex-row">

        {/* Left Panel: Preview / Viewport */}
        <div className="flex-1 bg-[#F5F5F3] flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <div className="w-full h-full bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          </div>

          {showCamera ? (
            <div className="w-full h-full relative z-10">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
                <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white border-4 border-black/10 flex items-center justify-center shadow-2xl active:scale-90 transition-all">
                  <div className="w-12 h-12 rounded-full border-2 border-black/20" />
                </button>
                <button onClick={stopCamera} className="p-5 rounded-full bg-black/10 backdrop-blur-md text-white hover:bg-black hover:text-white transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>
          ) : !image ? (
            <div className="text-center space-y-10 max-w-sm px-10 relative z-10">
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 bg-black/[0.02] rounded-[40px] rotate-6 scale-95" />
                <div className="relative w-full h-full bg-white rounded-[40px] flex items-center justify-center border border-black/5 shadow-2xl">
                  <ImageIcon size={48} className="text-black/10" />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-serif text-black leading-tight">Capture <br /><span className="font-light">Your Space</span></h4>
                <p className="text-black/40 text-[11px] font-medium leading-relaxed">Upload a photo or use your camera to see how our collection fits in your room with neural rendering.</p>
              </div>
              <div className="flex flex-col gap-4 pt-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-5 bg-black text-white rounded-[24px] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 hover:bg-black/80 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-black/10"
                >
                  <Upload size={16} /> Choose Photo
                </button>
                <button
                  onClick={startCamera}
                  className="w-full py-5 bg-white text-black border border-black/10 rounded-[24px] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 hover:border-black transition-all shadow-sm"
                >
                  <Camera size={16} /> Use Camera
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
              </div>
            </div>
          ) : (
            <>
              <img src={result || image} className="w-full h-full object-contain relative z-10 p-12" alt="Room preview" />
              <div className="absolute top-8 left-8 flex gap-3 z-20">
                <div className="px-5 py-2 bg-white/90 backdrop-blur-md text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-black/5 shadow-xl">
                  {result ? 'AI Vision Applied' : 'Base Environment'}
                </div>
                {result && (
                   <div className="px-5 py-2 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl">
                      Ultra-HD Neural Render
                   </div>
                )}
              </div>
            </>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-[#FBFBF9]/90 backdrop-blur-xl flex flex-col items-center justify-center text-black gap-8 z-50">
              <div className="relative">
                <div className="absolute -inset-8 bg-black/[0.03] rounded-full animate-ping opacity-20" />
                <Loader2 className="animate-spin text-black/10" size={80} strokeWidth={1} />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black/40" size={24} />
              </div>
              <div className="text-center space-y-3">
                <p className="font-serif text-4xl tracking-tight animate-pulse">Designing Space<span className="font-light">...</span></p>
                <p className="text-black/30 text-[10px] font-black uppercase tracking-[0.4em]">Calculating spatial depth & shadows</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Studio Controls */}
        <div className="w-full md:w-[400px] p-12 flex flex-col justify-between bg-white z-10 border-l border-black/5 shadow-[-20px_0_40px_rgba(0,0,0,0.02)]">
          <div className="space-y-12">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-3xl font-serif leading-tight">AI Studio <br /><span className="font-light">Workspace</span></h3>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-black/20 mt-2">Spatial Engine 3.0</p>
              </div>
              <button onClick={onClose} className="p-3 rounded-full hover:bg-black/5 transition-all active:scale-90 border border-black/[0.03]">
                <X size={20} className="text-black/40" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Product Info Card */}
              <div className="p-6 bg-[#F5F5F3] rounded-[32px] flex items-center gap-5 border border-black/5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shadow-sm flex-shrink-0 border border-black/5">
                  <img src={product?.image} className="w-full h-full object-cover" alt={product?.name} />
                </div>
                <div className="overflow-hidden space-y-1">
                  <span className="text-[9px] uppercase font-black tracking-[0.3em] text-black/20 block">{product?.category}</span>
                  <p className="font-bold text-base truncate text-black/80">{product?.name}</p>
                  <p className="text-[10px] font-medium text-black/30">${product?.price}</p>
                </div>
              </div>

              {image && !result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                  <div className="p-6 bg-black/[0.02] rounded-[32px] border border-black/5 space-y-3">
                    <p className="text-[10px] text-black/60 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Scene Ready
                    </p>
                    <p className="text-[11px] text-black/40 font-medium leading-relaxed">
                      Our neural engine will now map your environment and place the object with physics-accurate lighting.
                    </p>
                  </div>
                  <button
                    onClick={() => { setImage(null); setResult(null); }}
                    className="w-full py-5 border border-black/5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] text-black/30 hover:text-black hover:border-black/20 hover:bg-[#F5F5F3] transition-all flex items-center justify-center gap-3"
                  >
                    <RefreshCw size={14} /> Replace Photo
                  </button>
                </div>
              )}

              {result && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                  <div className="p-6 bg-green-50/50 border border-green-100 rounded-[32px] space-y-3">
                    <p className="text-[10px] text-green-700 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" /> Render Complete
                    </p>
                    <p className="text-[11px] text-green-800/40 font-medium leading-relaxed">
                      Perspective and ambient occlusion have been optimized for your room's specific lighting profile.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setResult(null)}
                      className="py-5 border border-black/5 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] text-black/30 hover:text-black hover:bg-[#F5F5F3] transition-all"
                    >
                      Reset View
                    </button>
                    <button
                      onClick={async () => {
                        if (!result) return;
                        const id = toast.loading("Saving design to Google Drive...");
                        try {
                          const resp = await fetch(result);
                          const blob = await resp.blob();
                          await uploadToAppScript(blob, `AI_Design_${Date.now()}.png`, 'image/png');
                          toast.success("Design saved to Google Drive!", { id });
                        } catch (err) {
                          console.error("Save failed:", err);
                          toast.error("Failed to save design", { id });
                        }
                      }}
                      className="py-5 bg-black text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black/80 transition-all shadow-2xl shadow-black/10"
                    >
                      Save Design
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8 pt-12">
            <button
              onClick={runAIBuilder}
              disabled={!image || isLoading || !product || !!result}
              className="w-full py-6 bg-black text-white rounded-[32px] flex items-center justify-center gap-5 hover:bg-black/80 hover:scale-[1.01] active:scale-95 disabled:bg-black/5 disabled:text-black/10 disabled:scale-100 transition-all shadow-2xl shadow-black/20 group"
            >
              <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[12px] font-black uppercase tracking-[0.4em]">Generate Vision</span>
            </button>
            <div className="flex flex-col items-center gap-2.5">
               <div className="w-16 h-0.5 bg-black/[0.05] rounded-full overflow-hidden">
                  <div className="h-full bg-black/20 w-1/2 animate-[shimmer_2s_infinite]" />
               </div>
              <p className="text-[8px] font-black uppercase tracking-[0.5em] text-black/10 italic">PlanPro Neural Engine v3.0</p>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default AIBuilderModal;

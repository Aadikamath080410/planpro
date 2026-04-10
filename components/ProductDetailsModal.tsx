
import React, { useState, useEffect } from 'react';
import {
  X, Heart, ShoppingBag, Box, Sparkles, Scale, Star, Truck,
  ChevronRight, ChevronLeft, Minus, Plus, Share2, Facebook,
  Twitter, Instagram, CheckCircle2
} from 'lucide-react';
import { Product } from '../types';
import Scene3D from './Scene3D';

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (id: string) => void;
  onToggleWishlist: (id: string) => void;
  isWishlisted: boolean;
  onAR: (p: Product) => void;
  onAI: (p: Product) => void;
  onCompare: (p: Product) => void;
}

type Tab = 'description' | 'additional' | 'review';

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product, onClose, onAddToCart, onToggleWishlist, isWishlisted, onAR, onAI, onCompare
}) => {
  const [selectedImg, setSelectedImg] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>('description');
  const [showStudioMenu, setShowStudioMenu] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [is3DActive, setIs3DActive] = useState(false);

  const gallery = product.images || [product.image];

  useEffect(() => {
    // Stagger controls appearance after entry reveal
    const timer = setTimeout(() => setControlsVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleImgChange = (newIndex: number) => {
    if (newIndex === selectedImg || isSliding) return;
    setIsSliding(true);
    setSelectedImg(newIndex);
    setTimeout(() => setIsSliding(false), 700);
  };

  const nextImg = () => {
    const nextIdx = (selectedImg + 1) % gallery.length;
    handleImgChange(nextIdx);
  };

  const prevImg = () => {
    const prevIdx = (selectedImg - 1 + gallery.length) % gallery.length;
    handleImgChange(prevIdx);
  };

  // Using product.reviews instead of static mock data

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 lg:p-12 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative bg-white w-full max-w-7xl h-full md:h-auto md:max-h-[90vh] md:rounded-[40px] shadow-2xl overflow-y-auto custom-scrollbar flex flex-col animate-in slide-in-from-bottom-12 duration-500">

        {/* Header/Close */}
        <div className="sticky top-0 right-0 p-6 flex justify-end z-50 pointer-events-none">
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-white shadow-xl hover:bg-black hover:text-white transition-all pointer-events-auto active:scale-90"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-6 md:px-16 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

            {/* Left: Gallery with Sliding Animation */}
            <div className="space-y-6 animate-image-reveal">
              <div className="relative aspect-square bg-[#F5F5F3] rounded-[32px] overflow-hidden group shadow-inner">
                {/* Image Container with Sliding Transition */}
                <div className="w-full h-full relative overflow-hidden flex">
                  {gallery.map((img, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 w-full h-full transition-transform duration-700 cubic-bezier(0.22, 1, 0.36, 1)"
                      style={{
                        transform: `translateX(${(i - selectedImg) * 100}%)`,
                        visibility: Math.abs(i - selectedImg) > 1 ? 'hidden' : 'visible'
                      }}
                    >
                      <img
                        src={img}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* Navigation Arrows */}
                <button
                  onClick={prevImg}
                  className={`absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all hover:bg-black hover:text-white active:scale-90 z-20 ${controlsVisible ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImg}
                  className={`absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all hover:bg-black hover:text-white active:scale-90 z-20 ${controlsVisible ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}
                >
                  <ChevronRight size={24} />
                </button>

                {/* Badge */}
                <div className="absolute top-6 left-6 px-4 py-1.5 bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg z-10 transition-opacity" style={{ opacity: is3DActive ? 0 : 1 }}>
                  In Stock
                </div>

                {/* 3D View Over-Layer */}
                {is3DActive && product.model && (
                  <div className="absolute inset-0 z-40 bg-white">
                    <Scene3D modelUrl={product.model} textureUrl={product.texture} />
                  </div>
                )}

                {/* 3D Model Toggle Overlay Button */}
                {product.model && (
                  <button
                    onClick={() => setIs3DActive(!is3DActive)}
                    className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all z-50 shadow-2xl ${is3DActive ? 'bg-black text-white' : 'bg-white/80 backdrop-blur-md text-black hover:bg-black hover:text-white'}`}
                  >
                    {is3DActive ? 'PHOTO VIEW' : 'VIEW IN 3D'}
                  </button>
                )}
              </div>

              {/* Thumbnails Strip */}
              <div className={`flex gap-4 overflow-x-auto no-scrollbar pb-2 transition-all duration-700 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => handleImgChange(i)}
                    className={`w-24 h-24 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all duration-500 ${selectedImg === i ? 'border-black scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Detailed Info */}
            <div className={`space-y-8 transition-all duration-700 delay-300 ${controlsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-black/30 block mb-2">{product.category}</span>
                <h2 className="text-4xl md:text-5xl font-serif leading-tight">{product.name}</h2>

                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill={i < Math.round(product.rating || 0) ? "currentColor" : "none"} />
                    ))}
                    <span className="text-sm font-bold text-black ml-1">{(product.rating || 0).toFixed(1)}</span>
                  </div>
                  <span className="text-sm font-bold text-black/40">({product.reviews?.length || 0} Review{product.reviews?.length !== 1 ? 's' : ''})</span>
                </div>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-bold tracking-tighter">₹{product.price}.00</span>
                <span className="text-xl text-black/20 line-through font-medium">₹1250.00</span>
              </div>

              <p className="text-black/50 leading-relaxed text-sm max-w-lg line-clamp-3">
                {product.description}
              </p>

              {/* Selection Controls */}
              <div className="space-y-6">
                <div className="flex items-center gap-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-black/30">Quantity</span>
                  <div className="flex items-center p-1.5 bg-[#F5F5F3] border border-black/5 rounded-2xl shadow-inner">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:bg-black hover:text-white transition-all active:scale-90 text-black/40 hover:text-white"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-12 text-center font-bold text-sm text-black tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(q => q + 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-sm hover:bg-black hover:text-white transition-all active:scale-90 text-black/40 hover:text-white"
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => onAddToCart(product.id)}
                    className="flex-1 min-w-[140px] py-4 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-black/80 transition-all active:scale-95 shadow-xl shadow-black/10"
                  >
                    Add To Cart
                  </button>
                  <button
                    onClick={() => onAR(product)}
                    className="flex-1 min-w-[140px] py-4 border-2 border-black text-black rounded-2xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-black hover:text-white transition-all active:scale-95 shadow-lg group"
                  >
                    <Box size={18} className="group-hover:rotate-12 transition-transform" /> AR PREVIEW
                  </button>
                  <button
                    onClick={() => onToggleWishlist(product.id)}
                    className={`p-4 rounded-2xl border transition-all active:scale-90 ${isWishlisted ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-black/10 hover:border-black text-black/40'}`}
                  >
                    <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-black/5 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">
                  <span className="text-black/50">SKU :</span> LM-{product.id}00-S
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-black/30">
                  <span className="text-black/50">Tags :</span> Modern, Living, Premium, {product.category}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Tabs & Reviews */}
          <div className="mt-24 border-t border-black/5">
            <div className="flex justify-center border-b border-black/5">
              {(['description', 'additional', 'review'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-12 py-6 text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-black' : 'text-black/30 hover:text-black/60'}`}
                >
                  {tab === 'additional' ? 'Additional Information' : tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-black animate-in fade-in" />}
                </button>
              ))}
            </div>

            <div className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'description' && (
                <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
                  <h4 className="text-xl font-serif mb-4">Product Description</h4>
                  <p className="text-black/60 leading-relaxed min-h-[150px]">{product.description}</p>
                </div>
              )}

              {activeTab === 'additional' && (
                <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
                  <h4 className="text-xl font-serif mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[150px]">
                    <div className="bg-[#FBFBF9] p-6 rounded-2xl border border-black/5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-black/30 block mb-2">Dimensions</span>
                      <p className="font-medium text-black/80">{product.dimensions}</p>
                    </div>
                    <div className="bg-[#FBFBF9] p-6 rounded-2xl border border-black/5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-black/30 block mb-2">Material</span>
                      <p className="font-medium text-black/80">{product.material}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'review' && (
                <div className="space-y-16">
                  {/* Rating Summary */}
                  <div className="flex flex-col md:flex-row gap-12 items-center md:items-start bg-[#FBFBF9] p-10 rounded-[32px]">
                    <div className="text-center md:text-left space-y-2">
                      <div className="text-6xl font-bold tracking-tighter">{(product.rating || 0).toFixed(1)}</div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-black/30">Out of 5</div>
                      <div className="flex justify-center md:justify-start text-amber-400">
                        {[...Array(5)].map((_, i) => <Star key={i} size={18} fill={i < Math.round(product.rating || 0) ? "currentColor" : "none"} />)}
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 pt-2">({product.reviews?.length || 0} Review{product.reviews?.length !== 1 ? 's' : ''})</p>
                    </div>

                    <div className="flex-1 w-full max-w-md space-y-3">
                      {[5, 4, 3, 2, 1].map(num => {
                        const count = product.reviews?.filter(r => Math.round(r.rating) === num).length || 0;
                        const percent = product.reviews?.length ? (count / product.reviews.length) * 100 : 0;
                        return (
                          <div key={num} className="flex items-center gap-4">
                            <span className="text-xs font-bold w-12">{num} Star</span>
                            <div className="flex-1 h-2 bg-black/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review List */}
                  <div className="space-y-12">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xl font-serif">Review List</h4>
                      <div className="flex items-center gap-2 text-xs font-bold text-black/40">
                        Sort by : <span className="text-black uppercase cursor-pointer hover:underline">Newest</span>
                      </div>
                    </div>

                    <div className="space-y-12">
                      {(product.reviews || []).map((rev, index) => (
                        <div key={index} className="space-y-4 animate-fade-up">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                              <div className="w-12 h-12 rounded-full bg-black/5 overflow-hidden flex-shrink-0">
                                <img src={`https://i.pravatar.cc/100?u=${rev.user.replace(' ', '')}`} alt={rev.user} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-bold text-sm">{rev.user}</h5>
                                  <CheckCircle2 size={14} className="text-green-500" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-500 opacity-60">(Verified)</span>
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  <div className="flex text-amber-400">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < Math.round(rev.rating) ? "currentColor" : "none"} />)}
                                  </div>
                                  <span className="text-[10px] font-bold text-black/30">Recent</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-black/60 leading-relaxed max-w-3xl">{rev.comment}</p>
                        </div>
                      ))}
                      {!product.reviews?.length && (
                        <p className="text-sm text-black/50 py-4 italic">No reviews yet. Be the first to review this product!</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Studio Button */}
        <div className={`fixed bottom-12 right-12 z-[110] transition-all duration-1000 delay-500 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          {showStudioMenu && (
            <div className="absolute bottom-16 right-0 w-64 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-black/5 p-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="space-y-2">
                {[
                  { icon: <Box size={18} />, label: 'AR Spatial View', action: onAR },
                  { icon: <Sparkles size={18} />, label: 'AI Room Builder', action: onAI },
                  { icon: <Scale size={18} />, label: 'Market Benchmark', action: onCompare },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { item.action(product); setShowStudioMenu(false); }}
                    className="w-full p-4 rounded-2xl bg-black/5 hover:bg-black hover:text-white transition-all text-left flex items-center gap-3 group"
                  >
                    <span className="transition-transform group-hover:scale-110">{item.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowStudioMenu(!showStudioMenu)}
            className="flex items-center gap-8 bg-white pl-8 pr-2 py-2 rounded-full shadow-[0_15px_40px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] hover:-translate-y-1 transition-all group active:scale-95 border border-black/5"
          >
            <span className="text-sm font-bold tracking-tight text-black">Explore Studio</span>
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white transition-transform group-hover:rotate-12">
              <Sparkles size={18} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;

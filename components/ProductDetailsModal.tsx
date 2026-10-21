
import React, { useState, useEffect } from 'react';
import {
  X, Heart, ShoppingBag, Box, Scale, Star, Truck,
  ChevronRight, ChevronLeft, Minus, Plus, Share2, Facebook,
  Twitter, Instagram, CheckCircle2, Sparkles
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
  onCompare: (p: Product) => void;
}

type Tab = 'description' | 'additional' | 'review';

const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product, onClose, onAddToCart, onToggleWishlist, isWishlisted, onAR, onCompare
}) => {
  const [selectedImg, setSelectedImg] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>('description');
  const [controlsVisible, setControlsVisible] = useState(false);
  const [is3DActive, setIs3DActive] = useState(false);

  const gallery = product.images || [product.image];

  useEffect(() => {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-12 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative bg-background w-[80%] mx-w-5xl h-[90vh] sm:h-auto sm:max-h-[85vh] sm:rounded-[32px] md:rounded-[48px] shadow-2xl overflow-y-auto custom-scrollbar flex flex-col animate-in slide-in-from-bottom-12 duration-500">

        {/* Header/Close */}
        <div className="sticky top-0 right-0 p-6 flex justify-end z-50 pointer-events-none">
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-[var(--card-bg)] shadow-xl hover:bg-primary hover:text-[var(--background)] transition-all pointer-events-auto active:scale-90 border border-[var(--border-light)]"
          >
            <X size={24} />
          </button>
        </div>

        <div className="px-4 sm:px-6 md:px-12 pb-8 sm:pb-10 md:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-12">

            {/* Left: Gallery */}
            <div className="space-y-6 animate-image-reveal">
              <div className="relative aspect-square bg-primary/5 rounded-[32px] overflow-hidden group shadow-inner">
                <div className="w-full h-full relative overflow-hidden flex">
                  {gallery.map((img, i) => (
                    <div
                      key={i}
                      className="absolute inset-0 w-full h-full transition-transform duration-700 cubic-bezier(0.22, 1, 0.36, 1)"
                      style={{
                        transform: `translateX(${(i - selectedImg) * 90}%)`,
                        visibility: Math.abs(i - selectedImg) > 1 ? 'hidden' : 'visible'
                      }}
                    >
                      <img src={img} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>

                <button
                  onClick={prevImg}
                  className={`absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-secondary/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all hover:bg-highlight hover:text-background active:scale-90 z-20 ${controlsVisible ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImg}
                  className={`absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-secondary/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all hover:bg-highlight hover:text-background active:scale-90 z-20 ${controlsVisible ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}
                >
                  <ChevronRight size={24} />
                </button>

                <div className="absolute top-6 left-6 px-4 py-1.5 bg-accent text-body text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg z-10 transition-opacity" style={{ opacity: is3DActive ? 0 : 1 }}>
                  In Stock
                </div>

                {is3DActive && product.model && (
                  <div className="absolute inset-0 z-40 bg-background">
                    <Scene3D modelUrl={product.model} textureUrl={product.texture} />
                  </div>
                )}

                {product.model && (
                  <button
                    onClick={() => setIs3DActive(!is3DActive)}
                    className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all z-50 shadow-2xl ${is3DActive ? 'bg-primary text-text' : 'bg-background/80 backdrop-blur-md text-text hover:bg-highlight hover:text-background'}`}
                  >
                    {is3DActive ? 'PHOTO VIEW' : 'VIEW IN 3D'}
                  </button>
                )}
              </div>

              <div className={`flex gap-4 overflow-x-auto no-scrollbar pb-2 transition-all duration-700 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => handleImgChange(i)}
                    className={`w-24 h-24 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all duration-500 ${selectedImg === i ? 'border-primary scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Info */}
            <div className={`space-y-8 transition-all duration-700 delay-300 ${controlsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary/50 block">{product.category}</span>
                  {product.arEnabled && (
                    <span className="badge-ar product-badge flex items-center gap-1.5 animate-badge-pop">
                      <Box size={12} /> AR READY
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl md:text-5xl font-serif leading-tight text-primary">{product.name}</h2>
                <div className="flex items-center gap-6 mt-4">
                  <div className="flex items-center gap-1 text-[var(--color-warm-secondary)]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill={i < Math.round(product.rating || 0) ? "currentColor" : "none"} />
                    ))}
                    <span className="text-sm font-bold text-text ml-1">{(product.rating || 0).toFixed(1)}</span>
                  </div>
                  <span className="text-sm font-bold text-text/40">({product.reviews?.length || 0} Review{product.reviews?.length !== 1 ? 's' : ''})</span>
                </div>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-3xl font-bold tracking-tighter text-text">₹{product.price.toLocaleString()}</span>
                {product.oldPrice && <span className="text-lg text-text/20 line-through font-medium">₹{product.oldPrice.toLocaleString()}</span>}
              </div>

              <p className="text-text/50 leading-relaxed text-[13px] max-w-lg">
                {product.description}
              </p>

              <div className="space-y-6">
                <div className="flex items-center gap-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text/30">Quantity</span>
                  <div className="flex items-center p-1.5 bg-background border border-text/5 rounded-2xl shadow-inner">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary shadow-sm hover:bg-text hover:text-secondary transition-all active:scale-90 text-text/40"><Minus size={16} /></button>
                    <span className="w-12 text-center font-bold text-sm text-body tabular-nums">{quantity}</span>
                    <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary shadow-sm hover:bg-text hover:text-secondary transition-all active:scale-90 text-text/40"><Plus size={16} /></button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <button onClick={() => onAddToCart(product.id)} className="flex-1 min-w-[120px] sm:min-w-[140px] py-3 sm:py-4 bg-primary text-[var(--background)] rounded-2xl font-bold uppercase tracking-widest text-[10px] sm:text-[11px] flex items-center justify-center gap-2 sm:gap-3 hover:brightness-110 hover:translate-y-[-2px] transition-all active:scale-95 shadow-xl shadow-primary/20">
                    Add To Cart
                  </button>
                  <button onClick={() => onAR(product)} className={`flex-1 min-w-[120px] sm:min-w-[140px] py-3 sm:py-4 border-2 border-primary text-primary rounded-2xl font-bold uppercase tracking-widest text-[10px] sm:text-[11px] flex items-center justify-center gap-2 sm:gap-3 hover:bg-primary hover:text-[var(--background)] transition-all active:scale-95 shadow-lg group ${product.arEnabled ? 'btn-ar-special' : ''}`}>
                    <Box size={18} className="group-hover:rotate-12 transition-transform" /> AR PREVIEW
                  </button>
                  <button onClick={() => onToggleWishlist(product.id)} className={`p-4 rounded-2xl border transition-all active:scale-90 ${isWishlisted ? 'bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-[var(--card-bg)] border-[var(--border-light)] hover:border-primary text-[var(--text-muted)]'}`}>
                    <Heart size={20} fill={isWishlisted ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-primary/10 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30">
                  <span className="text-primary/50">SKU :</span> LM-{product.id}00-S
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30">
                  <span className="text-primary/50">Tags :</span> Modern, Living, Premium, {product.category}
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-24 border-t border-primary/10">
            <div className="flex flex-wrap justify-center border-b border-primary/10">
              {(['description', 'additional', 'review'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-8 md:px-12 py-4 sm:py-6 text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all relative ${activeTab === tab ? 'text-primary' : 'text-primary/30 hover:text-primary/60'}`}
                >
                  {tab === 'additional' ? 'Additional Information' : tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary animate-in fade-in" />}
                </button>
              ))}
            </div>

            <div className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'description' && (
                <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
                  <h4 className="text-xl font-serif mb-4 text-primary">Product Description</h4>
                  <p className="text-body/60 leading-relaxed min-h-[150px]">{product.description}</p>
                </div>
              )}

              {activeTab === 'additional' && (
                <div className="space-y-6 animate-fade-up max-w-3xl mx-auto">
                  <h4 className="text-xl font-serif mb-4 text-primary">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[150px]">
                    <div className="bg-background p-6 rounded-2xl border border-primary/10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary/30 block mb-2">Dimensions</span>
                      <p className="font-medium text-body/80">{product.dimensions}</p>
                    </div>
                    <div className="bg-background p-6 rounded-2xl border border-primary/10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary/30 block mb-2">Material</span>
                      <p className="font-medium text-body/80">{product.material}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'review' && (
                <div className="space-y-16">
                  <div className="flex flex-col md:flex-row gap-12 items-center md:items-start bg-background p-10 rounded-[32px] border border-primary/5">
                    <div className="text-center md:text-left space-y-2">
                      <div className="text-6xl font-bold tracking-tighter text-primary">{(product.rating || 0).toFixed(1)}</div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary/30">Out of 5</div>
                      <div className="flex justify-center md:justify-start text-primary">
                        {[...Array(5)].map((_, i) => <Star key={i} size={18} fill={i < Math.round(product.rating || 0) ? "currentColor" : "none"} />)}
                      </div>
                    </div>
                    <div className="flex-1 w-full max-w-md space-y-3">
                      {[5, 4, 3, 2, 1].map(num => {
                        const count = product.reviews?.filter(r => Math.round(r.rating) === num).length || 0;
                        const percent = product.reviews?.length ? (count / product.reviews.length) * 100 : 0;
                        return (
                          <div key={num} className="flex items-center gap-4">
                            <span className="text-xs font-bold w-12 text-body/60">{num} Star</span>
                            <div className="flex-1 h-2 bg-primary/5 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-12">
                    <h4 className="text-xl font-serif text-primary">Review List</h4>
                    <div className="space-y-12">
                      {(product.reviews || []).map((rev, index) => (
                        <div key={index} className="space-y-4 animate-fade-up">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-full bg-black/5 overflow-hidden flex-shrink-0">
                              <img src={`https://i.pravatar.cc/100?u=${rev.user.replace(' ', '')}`} alt={rev.user} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-sm text-body">{rev.user}</h5>
                                <CheckCircle2 size={14} className="text-accent" />
                              </div>
                              <div className="flex text-primary mt-1">
                                {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < Math.round(rev.rating) ? "currentColor" : "none"} />)}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-body/60 leading-relaxed max-w-3xl">{rev.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating AI Price Comparison Button */}
        <div className={`fixed bottom-6 right-4 sm:bottom-12 sm:right-12 z-[110] transition-all duration-1000 delay-500 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <button
            onClick={() => onCompare(product)}
            className="flex items-center gap-3 sm:gap-8 bg-primary pl-4 sm:pl-8 pr-2 py-2 rounded-full shadow-[0_15px_40px_rgba(139,86,51,0.3)] hover:shadow-primary/40 hover:-translate-y-1 transition-all group active:scale-95 border border-primary/20"
          >
            <span className="text-xs sm:text-sm font-bold tracking-tight text-[var(--background)]">AI Price Comparison</span>
            <div className="w-10 h-10 rounded-full bg-[var(--background)] flex items-center justify-center text-primary transition-transform group-hover:rotate-12 shadow-inner">
              <Scale size={18} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
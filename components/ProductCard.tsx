import React, { useState, useRef } from 'react';
import { Box, Sparkles, Scale, Heart, ShoppingCart } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAR: (p: Product) => void;
  onCompare: (p: Product) => void;
  onAddToCart: (id: string) => void;
  onToggleWishlist: (id: string) => void;
  onViewDetails: (p: Product) => void;
  isWishlisted: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, onAR, onCompare, onAddToCart, onToggleWishlist, onViewDetails, isWishlisted 
}) => {
  return (
    <div
      className="product-card-new group"
      onClick={() => onViewDetails(product)}
    >
      <div className="card-image-new">
        <img
          src={product.image}
          alt={product.name}
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 transition-transform duration-500 group-hover:translate-x-1">
          {product.arEnabled && (
            <div className="badge-new badge-ar-new text-[8px] py-1 px-3">AR AVAILABLE</div>
          )}
          {product.priceMatch && (
            <div className="badge-new badge-match-new text-[8px] py-1 px-3">PRICE MATCHED</div>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-5 flex flex-col flex-1 gap-1.5 sm:gap-2">
        <div className="flex justify-between items-center">
          <span className="card-category text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[var(--color-warm-secondary)] opacity-80">{product.category}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
            className={`transition-all duration-300 hover:scale-125 p-1 ${isWishlisted ? 'text-red-500' : 'text-[var(--text-muted)] hover:text-red-400'}`}
          >
            <Heart size={16} className="sm:w-[18px] sm:h-[18px]" fill={isWishlisted ? "currentColor" : "none"} />
          </button>
        </div>

        <h3 className="text-sm sm:text-base font-bold text-primary line-clamp-1 group-hover:text-[var(--color-warm-secondary)] transition-colors">
          {product.name}
        </h3>

        <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
          <span className="price-current text-lg sm:text-xl font-black text-[var(--color-warm-secondary)]">₹{product.price.toLocaleString()}</span>
          {product.savings && (
            <>
              <span className="text-xs sm:text-sm text-[var(--text-muted)] line-through">₹{(product.price * (1 + product.savings/100)).toLocaleString()}</span>
              <span className="ml-auto text-[10px] sm:text-[11px] font-black text-[var(--success)] animate-pulse">↓ {product.savings}%</span>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2.5 mt-3 sm:mt-4">
          <div className="flex gap-2 sm:gap-2.5">
            <button
              onClick={(e) => { e.stopPropagation(); onAR(product); }}
              className="flex-1 h-11 bg-[var(--primary)] text-white rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm shadow-primary/10"
            >
              <Box size={14} /> <span>AR</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCompare(product); }}
              className="flex-1 h-11 bg-primary/5 text-primary border border-primary/20 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/10 active:scale-95 transition-all text-[9px] sm:text-[10px] font-black uppercase tracking-widest"
              title="Compare price with Amazon, IKEA, Flipkart & Urban Ladder"
            >
              <Scale size={14} /> <span>COMPARE</span>
            </button>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product.id); }}
            className="w-full h-12 bg-transparent border-2 border-primary text-primary rounded-xl flex items-center justify-center gap-2.5 hover:bg-primary/5 active:scale-95 transition-all text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] shadow-sm shadow-primary/5"
          >
            <ShoppingCart size={16} /> <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
import React from 'react';
import { Heart, ArrowRight, ShoppingCart, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types';
import { PRODUCTS } from '../data/mockData';
import ProductCard from './ProductCard';

interface WishlistViewProps {
    wishlist: string[];
    onToggleWishlist: (id: string) => void;
    onAddToCart: (id: string) => void;
    onViewDetails: (p: Product) => void;
    onAR: (p: Product) => void;
    onAI: (p: Product) => void;
    onCompare: (p: Product) => void;
    onSmartCompare: () => void;
    onContinueShopping: () => void;
}

const WishlistView: React.FC<WishlistViewProps> = ({
    wishlist, onToggleWishlist, onAddToCart, onViewDetails, onAR, onAI, onCompare, onSmartCompare, onContinueShopping
}) => {
    const wishlistedProducts = PRODUCTS.filter(p => wishlist.includes(p.id));

    if (wishlist.length === 0) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center space-y-8">
                <div className="w-24 h-24 bg-[var(--card-bg)] border border-[var(--border-light)] rounded-full flex items-center justify-center animate-pulse">
                    <Heart size={40} className="text-primary/20" />
                </div>
                <div className="space-y-4">
                    <h2 className="text-3xl md:text-5xl font-serif tracking-tight text-[var(--text)] uppercase">Your wishlist is empty</h2>
                    <p className="text-[var(--text-muted)] text-sm max-w-xs mx-auto">Save the pieces you love to build your dream collection later.</p>
                </div>
                <button
                    onClick={onContinueShopping}
                    className="px-10 py-5 bg-primary text-[var(--background)] rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                >
                    Explore Collection <ArrowRight size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 space-y-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--border-light)] pb-4 sm:pb-6 gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl sm:text-3xl font-serif tracking-tight text-[var(--text)]">Your Wishlist</h2>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em]">Saved Items for later</p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                    <button
                        onClick={onSmartCompare}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-primary text-[var(--background)] rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-primary/10 active:scale-95 group"
                    >
                        <Sparkles size={14} className="group-hover:rotate-12 transition-transform" /> <span className="hidden sm:inline">AI Smart</span> Compare
                    </button>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.3em] whitespace-nowrap">{wishlist.length} Items</span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                <AnimatePresence mode="popLayout">
                    {wishlistedProducts.map((product) => (
                        <motion.div
                            key={product.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                        >
                            <ProductCard
                                product={product}
                                isWishlisted={true}
                                onToggleWishlist={onToggleWishlist}
                                onAddToCart={onAddToCart}
                                onViewDetails={onViewDetails}
                                onAR={onAR}
                                onAI={onAI}
                                onCompare={onCompare}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            <div className="flex justify-center pt-12">
                <button
                    onClick={onContinueShopping}
                    className="px-8 py-4 border border-text/10 rounded-2xl font-bold text-xs uppercase tracking-widest hover:border-text transition-all flex items-center gap-2"
                >
                    Continue Shopping <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default WishlistView;

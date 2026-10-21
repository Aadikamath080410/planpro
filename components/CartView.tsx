import React from 'react';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types';
import { PRODUCTS } from '../data/mockData';

interface CartViewProps {
    cart: { id: string; qty: number }[];
    onUpdateQty: (id: string, delta: number) => void;
    onRemove: (id: string) => void;
    onCheckout: () => void;
    onContinueShopping: () => void;
}

const CartView: React.FC<CartViewProps> = ({
    cart, onUpdateQty, onRemove, onCheckout, onContinueShopping
}) => {
    const cartItems = cart.map(item => {
        const product = PRODUCTS.find(p => p.id === item.id);
        return { ...product, qty: item.qty } as Product & { qty: number };
    });

    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const shipping = subtotal > 1000 ? 0 : 50;
    const total = subtotal + shipping;

    if (cart.length === 0) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center space-y-8">
                <div className="w-24 h-24 bg-[var(--card-bg)] border border-[var(--border-light)] rounded-full flex items-center justify-center animate-pulse">
                    <ShoppingBag size={40} className="text-primary/20" />
                </div>
                <div className="space-y-4">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase text-primary">Your collection is empty</h2>
                    <p className="text-[var(--text-muted)] text-sm max-w-xs mx-auto">Build your perfect space by adding pieces to your collection.</p>
                </div>
                <button
                    onClick={onContinueShopping}
                    className="px-10 py-5 bg-primary text-[var(--background)] rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                >
                    Start Exploring <ArrowRight size={16} />
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-12">
                {/* Cart Items List */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-primary/10 pb-4 sm:pb-6 gap-2">
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tighter uppercase text-primary">Your Collection</h2>
                        <span className="text-xs font-bold text-primary/40 uppercase tracking-widest">{cart.length} Items</span>
                    </div>

                    <div className="space-y-6">
                        <AnimatePresence mode="popLayout">
                            {cartItems.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-[var(--card-bg)] rounded-[32px] border border-[var(--border-light)] hover:shadow-primary/5 hover:-translate-y-1 transition-all group"
                                >
                                    <div className="w-full sm:w-32 aspect-square rounded-2xl overflow-hidden bg-[var(--background)]">
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    </div>

                                    <div className="flex-1 space-y-1 text-center sm:text-left">
                                        <span className="text-[10px] font-bold text-text/30 uppercase tracking-widest">{item.category}</span>
                                        <h4 className="text-xl font-serif text-text">{item.name}</h4>
                                        <p className="text-sm text-text/40 line-clamp-1">{item.dimensions} • {item.material}</p>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1 bg-background p-1 rounded-xl">
                                            <button
                                                onClick={() => onUpdateQty(item.id, -1)}
                                                className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-30 text-body"
                                                disabled={item.qty <= 1}
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="w-8 text-center font-bold text-sm text-body">{item.qty}</span>
                                            <button
                                                onClick={() => onUpdateQty(item.id, 1)}
                                                className="p-2 hover:bg-secondary rounded-lg transition-colors text-body"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>

                                        <div className="text-right min-w-[80px]">
                                            <p className="font-bold text-lg text-text">₹{item.price * item.qty}</p>
                                            <p className="text-[10px] text-text/30 font-bold uppercase tracking-tighter">₹{item.price} / unit</p>
                                        </div>

                                        <button
                                            onClick={() => onRemove(item.id)}
                                            className="p-3 text-primary/20 hover:text-red-500 hover:bg-red-900/40 rounded-full transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={onContinueShopping}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/40 hover:text-primary transition-colors group"
                    >
                        <ChevronRight size={16} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Continue Shopping
                    </button>
                </div>

                {/* Summary Sidebar */}
                <div className="lg:col-span-4">
                    <div className="bg-[var(--card-bg)] rounded-[24px] sm:rounded-[32px] lg:rounded-[40px] p-6 sm:p-8 md:p-10 border border-[var(--border-light)] shadow-2xl sticky top-24 lg:top-32 space-y-6 sm:space-y-8">
                        <h3 className="text-xl sm:text-2xl font-bold tracking-tighter uppercase text-[var(--text)]">Summary</h3>

                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-muted)] font-bold uppercase tracking-widest">Subtotal</span>
                                <span className="font-bold text-[var(--text)]">₹{subtotal}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-muted)] font-bold uppercase tracking-widest">Shipping</span>
                                <span className="font-bold text-[var(--text)]">{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                            </div>
                            <div className="pt-4 border-t border-[var(--border-light)] flex justify-between items-end">
                                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Total</span>
                                <span className="text-4xl font-bold tracking-tighter text-primary">₹{total}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={onCheckout}
                                className="w-full py-5 bg-primary text-[var(--background)] rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group"
                            >
                                Proceed to Checkout <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                            <p className="text-[9px] text-center text-primary/30 font-bold uppercase tracking-widest">
                                Secure checkout powered by PlanPro Pay
                            </p>
                        </div>

                        <div className="bg-[var(--background)] p-6 rounded-3xl space-y-3 border border-[var(--border-light)]">
                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-primary">PlanPro Membership</h5>
                            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">Members get free shipping on all orders and early access to new collections.</p>
                            <button className="text-[10px] font-bold uppercase tracking-widest underline underline-offset-4 text-primary">Learn More</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartView;

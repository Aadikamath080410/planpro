import React, { useState } from 'react';
import {
    Lock, CreditCard, ChevronRight, ArrowLeft, Plus,
    Check, Eye, EyeOff, ShoppingBag, Truck, ClipboardCheck,
    ChevronDown, ChevronUp, QrCode, Smartphone, Building2, Wallet, Banknote
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../types';
import { PRODUCTS } from '../data/mockData';

interface CheckoutPageProps {
    cart: { id: string; qty: number }[];
    onBack: () => void;
    onConfirm: () => void;
}

const CheckoutPage: React.FC<CheckoutPageProps> = ({ cart, onBack, onConfirm }) => {
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'other'>('card');
    const [selectedCard, setSelectedCard] = useState(0);
    const [showCVV, setShowCVV] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [selectedPaymentType, setSelectedPaymentType] = useState<'upi' | 'netbanking' | 'wallet' | 'cod'>('upi');
    const [cardNumber, setCardNumber] = useState('');
    const [detectedNetwork, setDetectedNetwork] = useState<'visa' | 'mastercard' | 'rupay' | null>(null);

    // Form states
    const [cardholderName, setCardholderName] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [cvv, setCvv] = useState('');
    const [paypalEmail, setPaypalEmail] = useState('');
    const [upiId, setUpiId] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Detect card network based on card number
    const detectCardNetwork = (value: string): 'visa' | 'mastercard' | 'rupay' | null => {
        const num = value.replace(/\D/g, '');

        if (/^4[0-9]{15}$/.test(num)) return 'visa';
        if (/^5[1-5][0-9]{14}$/.test(num)) return 'mastercard';
        // RuPay: 15 or 16 digits starting with 60, 65, 81, 82, 508, 353, 356
        if (/^(60|65|81|82|508|353|356)[0-9]{13,14}$/.test(num)) return 'rupay';

        return null;
    };

    // Format card number with spaces every 4 digits
    const formatCardNumber = (value: string): string => {
        return value
            .replace(/\D/g, '') // Remove non-digits
            .slice(0, 16) // Limit to 16 digits
            .replace(/(.{4})/g, '$1 ') // Add space every 4 digits
            .trim(); // Remove trailing space
    };

    // Handle card number input
    const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCardNumber(e.target.value);
        setCardNumber(formatted);
        const network = detectCardNetwork(formatted);
        setDetectedNetwork(network);
    };

    const cartItems = cart.map(item => {
        const product = PRODUCTS.find(p => p.id === item.id);
        return { ...product, qty: item.qty } as Product & { qty: number };
    });

    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const shipping = subtotal > 1000 ? 0 : 50;
    const total = subtotal + shipping;

    const toggleItem = (id: string) => {
        setExpandedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Validation functions
    const validateCardPayment = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!cardNumber.trim()) {
            newErrors.cardNumber = 'Card number is required';
        } else {
            const cleanCardNumber = cardNumber.replace(/\s/g, '').length;
            if (detectedNetwork === 'rupay') {
                // RuPay accepts both 15 and 16 digits
                if (cleanCardNumber !== 15 && cleanCardNumber !== 16) {
                    newErrors.cardNumber = 'RuPay card must be 15 or 16 digits';
                }
            } else {
                // Visa and Mastercard require exactly 16 digits
                if (cleanCardNumber !== 16) {
                    newErrors.cardNumber = 'Card number must be 16 digits';
                }
            }
        }

        if (!cardholderName.trim()) {
            newErrors.cardholderName = 'Cardholder name is required';
        }

        if (!expirationDate.trim()) {
            newErrors.expirationDate = 'Expiration date is required';
        } else {
            const dateRegex = /^(0[1-9]|1[0-2])\/\d{2,4}$/;
            if (!dateRegex.test(expirationDate)) {
                newErrors.expirationDate = 'Format must be MM/YY or MM/YYYY';
            } else {
                const [month, year] = expirationDate.split('/');
                const currentYear = new Date().getFullYear();
                const currentMonth = new Date().getMonth() + 1;
                const expYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);

                if (expYear < currentYear || (expYear === currentYear && parseInt(month) < currentMonth)) {
                    newErrors.expirationDate = 'Card has expired';
                }
            }
        }

        if (!cvv.trim()) {
            newErrors.cvv = 'CVV is required';
        } else if (!/^\d{3,4}$/.test(cvv)) {
            newErrors.cvv = 'CVV must be 3-4 digits';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validatePayPalPayment = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!paypalEmail.trim()) {
            newErrors.paypalEmail = 'PayPal email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail)) {
            newErrors.paypalEmail = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateOtherPayment = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (selectedPaymentType === 'upi') {
            if (!upiId.trim()) {
                newErrors.upiId = 'UPI ID is required';
            } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]{3,}$/.test(upiId)) {
                newErrors.upiId = 'Please enter a valid UPI ID (e.g., yourname@bankname)';
            }
        } else if (selectedPaymentType === 'netbanking') {
            if (!selectedBank) {
                newErrors.selectedBank = 'Please select a bank';
            }
        } else if (selectedPaymentType === 'wallet') {
            if (!selectedWallet) {
                newErrors.selectedWallet = 'Please select a wallet';
            }
        }
        // COD has no specific validation needed

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirmOrder = () => {
        let isValid = false;

        if (paymentMethod === 'card') {
            isValid = validateCardPayment();
        } else if (paymentMethod === 'paypal') {
            isValid = validatePayPalPayment();
        } else if (paymentMethod === 'other') {
            isValid = validateOtherPayment();
        }

        if (isValid) {
            setErrors({});
            onConfirm();
        }
    };

    const cards = [
        { id: 0, type: 'Mastercard', last4: '4323', color: 'bg-secondary', textColor: 'text-text' },
        { id: 1, type: 'Visa', last4: '5442', color: 'bg-[var(--color-warm-primary)]/10', textColor: 'text-[var(--color-warm-secondary)]' },
    ];

    return (
        <div className="min-h-screen bg-background pt-12 sm:pt-16 md:pt-24 pb-12 sm:pb-20">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 sm:gap-8 items-start">

                    {/* Left Column: Payment Details */}
                    <div className="lg:col-span-7 bg-secondary rounded-[24px] sm:rounded-[32px] md:rounded-[40px] p-5 sm:p-8 md:p-12 border border-text/5 shadow-sm space-y-6 sm:space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-highlight rounded-xl flex items-center justify-center text-background">
                                    <CreditCard size={18} />
                                </div>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tighter uppercase text-text">Payment details</h2>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 text-primary/40">
                                <Lock size={14} />
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Card is secure</p>
                                    <p className="text-[8px] font-medium opacity-60 text-primary/30">Your data is protected</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-4 sm:gap-8 border-b border-primary/10 pb-4 overflow-x-auto no-scrollbar">
                            {['Card', 'Paypal', 'Other'].map((tab) => {
                                const id = tab.toLowerCase().split(' ')[0] as any;
                                const isActive = paymentMethod === id;
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setPaymentMethod(id)}
                                        className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${isActive ? 'text-primary' : 'text-primary/30 hover:text-primary'}`}
                                    >
                                        {tab}
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-primary"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 sm:gap-10">
                            {/* Card Network Indicators - Only show for card payment */}
                            {paymentMethod === 'card' && (
                                <div className="sm:col-span-5 space-y-3">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30 mb-4">Detected Network</p>
                                    {/* VISA */}
                                    <motion.div
                                        animate={{
                                            boxShadow: detectedNetwork === 'visa'
                                                ? '0 0 20px rgba(26, 86, 219, 0.4), 0 0 40px rgba(26, 86, 219, 0.2)'
                                                : 'none',
                                        }}
                                        transition={{ duration: 0.3 }}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all ${detectedNetwork === 'visa'
                                                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                                                : 'border-text/10 bg-background/40'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${detectedNetwork === 'visa'
                                                    ? 'text-blue-600 bg-blue-100'
                                                    : 'bg-text/10 text-text/40'
                                                }`}>
                                                V
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-xs font-bold uppercase tracking-wider transition-colors ${detectedNetwork === 'visa'
                                                        ? 'text-blue-600'
                                                        : 'text-text/40'
                                                    }`}>
                                                    VISA
                                                </p>
                                            </div>
                                            {detectedNetwork === 'visa' && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white bg-blue-600"
                                                >
                                                    <Check size={12} />
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>

                                    {/* MASTERCARD */}
                                    <motion.div
                                        animate={{
                                            boxShadow: detectedNetwork === 'mastercard'
                                                ? '0 0 20px rgba(255, 95, 0, 0.4), 0 0 40px rgba(255, 95, 0, 0.2)'
                                                : 'none',
                                        }}
                                        transition={{ duration: 0.3 }}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all ${detectedNetwork === 'mastercard'
                                                ? 'border-orange-600 bg-orange-50 ring-2 ring-orange-200'
                                                : 'border-text/10 bg-background/40'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center gap-1 transition-all ${detectedNetwork === 'mastercard'
                                                    ? 'bg-orange-100'
                                                    : 'bg-text/10'
                                                }`}>
                                                <div className={`w-2.5 h-2.5 rounded-full ${detectedNetwork === 'mastercard'
                                                        ? 'bg-red-600'
                                                        : 'bg-text/20'
                                                    }`} />
                                                <div className={`w-2.5 h-2.5 rounded-full ${detectedNetwork === 'mastercard'
                                                        ? 'bg-orange-500'
                                                        : 'bg-text/20'
                                                    } -ml-1`} />
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-xs font-bold uppercase tracking-wider transition-colors ${detectedNetwork === 'mastercard'
                                                        ? 'text-orange-600'
                                                        : 'text-text/40'
                                                    }`}>
                                                    Mastercard
                                                </p>
                                            </div>
                                            {detectedNetwork === 'mastercard' && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white bg-orange-600"
                                                >
                                                    <Check size={12} />
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>

                                    {/* RUPAY */}
                                    <motion.div
                                        animate={{
                                            boxShadow: detectedNetwork === 'rupay'
                                                ? '0 0 20px rgba(0, 102, 178, 0.4), 0 0 40px rgba(0, 102, 178, 0.2)'
                                                : 'none',
                                        }}
                                        transition={{ duration: 0.3 }}
                                        className={`w-full p-4 rounded-2xl border-2 transition-all ${detectedNetwork === 'rupay'
                                                ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-200'
                                                : 'border-text/10 bg-background/40'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all ${detectedNetwork === 'rupay'
                                                    ? 'text-blue-700 bg-blue-100'
                                                    : 'bg-text/10 text-text/40'
                                                }`}>
                                                ₹
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-xs font-bold uppercase tracking-wider transition-colors ${detectedNetwork === 'rupay'
                                                        ? 'text-blue-700'
                                                        : 'text-text/40'
                                                    }`}>
                                                    RuPay
                                                </p>
                                            </div>
                                            {detectedNetwork === 'rupay' && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white bg-blue-700"
                                                >
                                                    <Check size={12} />
                                                </motion.div>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>
                            )}

                            {/* Form - Dynamic based on payment method */}
                            <div className={`${paymentMethod === 'card' ? 'sm:col-span-7' : 'sm:col-span-12'} space-y-6`}>
                                {/* CARD PAYMENT FORM */}
                                {paymentMethod === 'card' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Card Number</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={cardNumber}
                                                    onChange={handleCardNumberChange}
                                                    placeholder="0000 0000 0000 0000"
                                                    maxLength={19}
                                                    className={`w-full px-6 py-4 bg-background border-2 rounded-2xl text-sm font-medium text-text focus:outline-none transition-all pr-16 ${errors.cardNumber
                                                            ? 'border-red-500 ring-2 ring-red-500/20'
                                                            : detectedNetwork
                                                                ? 'border-primary ring-1 ring-primary/30'
                                                                : 'border-text/10 focus:ring-2 focus:ring-primary/10'
                                                        }`}
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out">
                                                    {detectedNetwork === 'visa' && (
                                                        <motion.div
                                                            key="visa"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="flex items-center gap-1"
                                                        >
                                                            <div className="text-[10px] font-bold text-blue-600">VISA</div>
                                                        </motion.div>
                                                    )}
                                                    {detectedNetwork === 'mastercard' && (
                                                        <motion.div
                                                            key="mastercard"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="flex items-center gap-0.5"
                                                        >
                                                            <div className="w-4 h-4 rounded-full bg-[#EB001B]" />
                                                            <div className="w-4 h-4 rounded-full bg-[#F79E1B] -ml-1.5" />
                                                        </motion.div>
                                                    )}
                                                    {detectedNetwork === 'rupay' && (
                                                        <motion.div
                                                            key="rupay"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="text-[10px] font-bold text-[#0066B2]"
                                                        >
                                                            RuPay
                                                        </motion.div>
                                                    )}
                                                    {!detectedNetwork && (
                                                        <motion.div
                                                            key="default"
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="text-primary/20"
                                                        >
                                                            <CreditCard size={18} />
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </div>
                                            {errors.cardNumber && <p className="text-xs text-red-500 font-medium">{errors.cardNumber}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Name</label>
                                            <input
                                                type="text"
                                                value={cardholderName}
                                                onChange={(e) => setCardholderName(e.target.value)}
                                                placeholder="Your Name"
                                                className={`w-full px-6 py-4 bg-background/40 border rounded-2xl text-sm font-medium text-text placeholder-text/30 focus:outline-none transition-all ${errors.cardholderName
                                                        ? 'border-red-500 ring-2 ring-red-500/20'
                                                        : 'border-primary/5 focus:ring-2 ring-primary/10'
                                                    }`}
                                            />
                                            {errors.cardholderName && <p className="text-xs text-red-500 font-medium">{errors.cardholderName}</p>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Expiration date</label>
                                                <input
                                                    type="text"
                                                    value={expirationDate}
                                                    onChange={(e) => setExpirationDate(e.target.value)}
                                                    placeholder="MM / YYYY"
                                                    className={`w-full px-6 py-4 bg-background/40 border rounded-2xl text-sm font-medium text-text placeholder-text/30 focus:outline-none transition-all ${errors.expirationDate
                                                            ? 'border-red-500 ring-2 ring-red-500/20'
                                                            : 'border-primary/5 focus:ring-2 ring-primary/10'
                                                        }`}
                                                />
                                                {errors.expirationDate && <p className="text-xs text-red-500 font-medium">{errors.expirationDate}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/30">CVV</label>
                                                <div className="relative">
                                                    <input
                                                        type={showCVV ? "text" : "password"}
                                                        value={cvv}
                                                        onChange={(e) => setCvv(e.target.value)}
                                                        placeholder={showCVV ? "000" : "••••"}
                                                        className={`w-full px-6 py-4 bg-background/40 border rounded-2xl text-sm font-medium text-text placeholder-text/30 focus:outline-none transition-all ${errors.cvv
                                                                ? 'border-red-500 ring-2 ring-red-500/20'
                                                                : 'border-primary/5 focus:ring-2 ring-primary/10'
                                                            }`}
                                                    />
                                                    <button
                                                        onClick={() => setShowCVV(!showCVV)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/20 hover:text-primary transition-colors"
                                                    >
                                                        {showCVV ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                                {errors.cvv && <p className="text-xs text-red-500 font-medium">{errors.cvv}</p>}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-primary" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Save this card for faster payments</span>
                                            </label>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center gap-6 pt-6">
                                            <button
                                                onClick={handleConfirmOrder}
                                                className="w-full sm:w-auto px-10 py-4 bg-highlight text-background rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-highlight/10"
                                            >
                                                Confirm order
                                            </button>
                                            <button
                                                onClick={onBack}
                                                className="text-[10px] font-bold uppercase tracking-widest text-primary/30 hover:text-primary transition-colors"
                                            >
                                                Cancel and Return
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* PAYPAL PAYMENT FORM */}
                                {paymentMethod === 'paypal' && (
                                    <>
                                        <div className="space-y-6 pt-4">
                                            <div className="text-center space-y-4">
                                                <div className="w-16 h-16 mx-auto bg-[#003087] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                                                    PP
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-text mb-2">Pay with PayPal</h3>
                                                    <p className="text-xs text-body/60">Fast, secure, and trusted by millions worldwide</p>
                                                </div>
                                            </div>

                                            <button className="w-full bg-[#003087] hover:bg-[#002147] text-white py-4 rounded-2xl font-bold uppercase text-sm tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                                                <Wallet size={18} />
                                                Pay with PayPal
                                            </button>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Or enter your PayPal email</label>
                                                <input
                                                    type="email"
                                                    value={paypalEmail}
                                                    onChange={(e) => setPaypalEmail(e.target.value)}
                                                    placeholder="your.email@paypal.com"
                                                    className={`w-full px-6 py-4 border rounded-2xl text-sm font-medium text-text placeholder-primary/20 focus:outline-none transition-all ${errors.paypalEmail
                                                            ? 'bg-background border-red-500 ring-2 ring-red-500/20'
                                                            : 'bg-background border-text/10 focus:ring-2 ring-primary/10'
                                                        }`}
                                                />
                                                {errors.paypalEmail && <p className="text-xs text-red-500 font-medium">{errors.paypalEmail}</p>}
                                            </div>

                                            <button className="w-full border-2 border-[#FDB71A] hover:bg-[#FDB71A]/5 text-[#FDB71A] py-4 rounded-2xl font-bold uppercase text-sm tracking-[0.2em] transition-all">
                                                PayPal Credit (EMI Available)
                                            </button>

                                            <div className="bg-secondary rounded-2xl p-4 space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Redirect Notice</p>
                                                <p className="text-[11px] text-body/60 leading-relaxed">You will be redirected to PayPal to complete your purchase safely. Your payment details are never shared with us.</p>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center gap-6 pt-6">
                                                <button
                                                    onClick={handleConfirmOrder}
                                                    className="w-full sm:w-auto px-10 py-4 bg-highlight text-background rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-highlight/10"
                                                >
                                                    Proceed to PayPal
                                                </button>
                                                <button
                                                    onClick={onBack}
                                                    className="text-[10px] font-bold uppercase tracking-widest text-primary/30 hover:text-primary transition-colors"
                                                >
                                                    Cancel and Return
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* OTHER PAYMENT FORM */}
                                {paymentMethod === 'other' && (
                                    <>
                                        <div className="space-y-2 mb-6">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Select Payment Method</label>
                                            <div className="grid grid-cols-4 gap-3">
                                                {[
                                                    { id: 'upi', icon: Smartphone, label: 'UPI' },
                                                    { id: 'netbanking', icon: Building2, label: 'NetBanking' },
                                                    { id: 'wallet', icon: Wallet, label: 'Wallets' },
                                                    { id: 'cod', icon: Banknote, label: 'Cash on Delivery' },
                                                ].map((method) => (
                                                    <button
                                                        key={method.id}
                                                        onClick={() => setSelectedPaymentType(method.id as any)}
                                                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all ${selectedPaymentType === method.id
                                                                ? 'bg-primary text-background ring-2 ring-primary ring-offset-4'
                                                                : 'bg-background/40 text-primary/40 hover:text-primary hover:bg-background/60'
                                                            }`}
                                                    >
                                                        <method.icon size={20} />
                                                        <span className="text-[9px] font-bold uppercase tracking-widest">{method.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* UPI */}
                                        {selectedPaymentType === 'upi' && (
                                            <div className="space-y-4">
                                                <div className="bg-secondary rounded-2xl p-6 space-y-4">
                                                    <h4 className="font-bold text-text uppercase tracking-wider">UPI Payment</h4>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-primary/30">UPI ID / VPA</label>
                                                        <input
                                                            type="text"
                                                            value={upiId}
                                                            onChange={(e) => setUpiId(e.target.value)}
                                                            placeholder="yourname@bankname"
                                                            className={`w-full px-6 py-4 border rounded-2xl text-sm font-medium text-text placeholder-primary/20 focus:outline-none transition-all ${errors.upiId
                                                                    ? 'bg-background border-red-500 ring-2 ring-red-500/20'
                                                                    : 'bg-background border-text/10 focus:ring-2 ring-primary/10'
                                                                }`}
                                                        />
                                                        {errors.upiId && <p className="text-xs text-red-500 font-medium">{errors.upiId}</p>}
                                                    </div>
                                                    <div className="flex gap-3">
                                                        <button className="flex-1 px-6 py-4 border-2 border-primary text-primary rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-primary/5 transition-all">
                                                            Verify
                                                        </button>
                                                        <button className="flex-1 px-6 py-4 bg-primary/10 text-primary rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-primary/20 transition-all flex items-center justify-center gap-2">
                                                            <QrCode size={14} /> Generate QR
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* NetBanking */}
                                        {selectedPaymentType === 'netbanking' && (
                                            <div className="space-y-4">
                                                <div className="bg-secondary rounded-2xl p-6 space-y-4">
                                                    <h4 className="font-bold text-text uppercase tracking-wider">Select Your Bank</h4>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {['SBI', 'HDFC', 'ICICI', 'Axis', 'IDBI', 'BOB'].map((bank) => (
                                                            <button
                                                                key={bank}
                                                                onClick={() => setSelectedBank(bank)}
                                                                className={`p-4 rounded-2xl transition-all font-bold text-[11px] uppercase tracking-wider ${selectedBank === bank
                                                                        ? 'bg-primary text-background border-2 border-primary'
                                                                        : 'bg-background border-2 border-primary/20 text-primary hover:border-primary hover:bg-primary/5'
                                                                    }`}
                                                            >
                                                                {bank}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="space-y-2 pt-4 border-t border-primary/10">
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Select Other Bank</label>
                                                        <select
                                                            value={selectedBank}
                                                            onChange={(e) => setSelectedBank(e.target.value)}
                                                            className={`w-full px-6 py-4 border rounded-2xl text-sm font-medium text-text focus:outline-none transition-all ${errors.selectedBank
                                                                    ? 'bg-background border-red-500 ring-2 ring-red-500/20'
                                                                    : 'bg-background border-text/10 focus:ring-2 ring-primary/10'
                                                                }`}
                                                        >
                                                            <option value="">Choose a bank...</option>
                                                            <option value="Punjab National Bank">Punjab National Bank</option>
                                                            <option value="Union Bank of India">Union Bank of India</option>
                                                            <option value="Indian Overseas Bank">Indian Overseas Bank</option>
                                                            <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                                                            <option value="Yes Bank">Yes Bank</option>
                                                            <option value="ICICI Bank">ICICI Bank</option>
                                                            <option value="More banks">More banks...</option>
                                                        </select>
                                                        {errors.selectedBank && <p className="text-xs text-red-500 font-medium">{errors.selectedBank}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Wallets */}
                                        {selectedPaymentType === 'wallet' && (
                                            <div className="space-y-4">
                                                <div className="bg-secondary rounded-2xl p-6 space-y-4">
                                                    <h4 className="font-bold text-text uppercase tracking-wider">Digital Wallets</h4>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        {[
                                                            { name: 'PhonePe', color: 'bg-purple-600' },
                                                            { name: 'Amazon Pay', color: 'bg-[#FF9900]' },
                                                            { name: 'Google Pay', color: 'bg-blue-500' },
                                                        ].map((wallet) => (
                                                            <button
                                                                key={wallet.name}
                                                                onClick={() => setSelectedWallet(wallet.name)}
                                                                className={`p-4 rounded-2xl transition-all font-bold text-[11px] uppercase tracking-wider text-white ${selectedWallet === wallet.name
                                                                        ? `${wallet.color} ring-2 ring-offset-2 ring-white`
                                                                        : `${wallet.color} opacity-70 hover:opacity-100`
                                                                    }`}
                                                            >
                                                                {wallet.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-body/60 text-center pt-2">Get OTP or Link your wallet account</p>
                                                    {errors.selectedWallet && <p className="text-xs text-red-500 font-medium text-center">{errors.selectedWallet}</p>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Cash on Delivery */}
                                        {selectedPaymentType === 'cod' && (
                                            <div className="space-y-4">
                                                <div className="bg-secondary rounded-2xl p-6 space-y-4">
                                                    <h4 className="font-bold text-text uppercase tracking-wider">Cash on Delivery</h4>
                                                    <div className="space-y-4 bg-background/40 p-4 rounded-xl border border-primary/10">
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-background flex-shrink-0 mt-1">
                                                                <Check size={12} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-text">Pay when you receive</p>
                                                                <p className="text-[11px] text-body/60">You'll pay the delivery person when your order arrives</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-background flex-shrink-0 mt-1">
                                                                <Check size={12} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-text">Secure & Convenient</p>
                                                                <p className="text-[11px] text-body/60">No payment details needed now. Pay via cash or card at delivery</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3">
                                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-background flex-shrink-0 mt-1">
                                                                <Check size={12} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-text">Delivery in 3-5 business days</p>
                                                                <p className="text-[11px] text-body/60">Standard delivery timeline applies</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex flex-col sm:flex-row items-center gap-6 pt-6">
                                            <button
                                                onClick={handleConfirmOrder}
                                                className="w-full sm:w-auto px-10 py-4 bg-highlight text-background rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-highlight/10"
                                            >
                                                Confirm order
                                            </button>
                                            <button
                                                onClick={onBack}
                                                className="text-[10px] font-bold uppercase tracking-widest text-primary/30 hover:text-primary transition-colors"
                                            >
                                                Cancel and Return
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary */}
                    <div className="lg:col-span-5 space-y-8 w-full">
                        <div className="bg-background rounded-[24px] sm:rounded-[32px] md:rounded-[40px] p-5 sm:p-8 md:p-10 border border-text/5 space-y-6 sm:space-y-8">
                            <h3 className="text-2xl sm:text-3xl font-bold tracking-tighter uppercase text-text">Order summary</h3>

                            {/* Stepper */}
                            <div className="flex items-center justify-between px-2">
                                {[
                                    { icon: Truck, label: 'Shipping', step: 1, color: 'bg-secondary' },
                                    { icon: CreditCard, label: 'Payment', step: 2, color: 'bg-primary' },
                                    { icon: ClipboardCheck, label: 'Review', step: 3, color: 'bg-[var(--color-warm-tertiary)]/20' },
                                ].map((s) => (
                                    <div key={s.step} className="flex flex-col items-center gap-2">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.step === 2 ? 'bg-primary' : 'bg-background'} shadow-sm`}>
                                            <s.icon size={18} className={s.step === 2 ? 'text-white' : 'text-primary/20'} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[8px] font-bold text-primary/20 uppercase tracking-tighter">Step {s.step}</p>
                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${s.step === 2 ? 'text-primary' : 'text-primary/30'}`}>{s.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Item List */}
                            <div className="space-y-4">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="bg-background/40 rounded-2xl overflow-hidden shadow-sm border border-primary/5">
                                        <button
                                            onClick={() => toggleItem(item.id)}
                                            className="w-full p-5 flex items-center justify-between hover:bg-primary/5 transition-colors text-body"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-background">
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                </div>
                                                <span className="text-sm font-bold tracking-tight text-primary">{item.name}</span>
                                            </div>
                                            {expandedItems.includes(item.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>

                                        <AnimatePresence>
                                            {expandedItems.includes(item.id) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-5 pt-0 space-y-3 border-t border-primary/10 mt-2">
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-body/40 font-medium">{item.name} (x{item.qty})</span>
                                                            <span className="font-bold text-body">₹{item.price * item.qty}</span>
                                                        </div>
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-body/40 font-medium">Estimated shipping</span>
                                                            <span className="font-bold text-body">₹0.00</span>
                                                        </div>
                                                        <div className="flex justify-between text-[11px]">
                                                            <span className="text-body/40 font-medium">Discount</span>
                                                            <span className="font-bold text-body">₹0.00</span>
                                                        </div>
                                                        <div className="pt-2 border-t border-primary/10 flex justify-between text-sm">
                                                            <span className="font-bold text-body">Total</span>
                                                            <span className="font-bold text-body">₹{item.price * item.qty}</span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 border-t border-text/20 flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-text/30 uppercase tracking-widest">Total Amount:</p>
                                    <h4 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tighter text-highlight">₹{total}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-bold text-primary/20 uppercase tracking-widest">Including taxes</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/40 hover:text-primary transition-all group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Collection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
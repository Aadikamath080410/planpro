import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, HelpCircle, AlertTriangle, CheckCircle } from 'lucide-react';

interface CustomDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => void;
    title: string;
    description: string;
    type?: 'warning' | 'error' | 'success' | 'confirm';
    confirmLabel?: string;
    cancelLabel?: string;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    type = 'confirm',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel'
}) => {
    const icons = {
        warning: <AlertTriangle className="text-amber-500" size={32} />,
        error: <AlertCircle className="text-red-500" size={32} />,
        success: <CheckCircle className="text-emerald-500" size={32} />,
        confirm: <HelpCircle className="text-primary" size={32} />
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-background rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.15)] overflow-hidden border border-text/5 p-10 text-center space-y-6"
                    >
                        <div className="flex justify-center">
                            <div className={`p-6 rounded-[32px] ${
                                type === 'error' ? 'bg-red-500/10' : 
                                type === 'warning' ? 'bg-amber-500/10' : 
                                type === 'success' ? 'bg-emerald-500/10' : 'bg-primary/10'
                            }`}>
                                {icons[type]}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-serif text-text tracking-tight">{title}</h3>
                            <p className="text-sm text-text/40 leading-relaxed">{description}</p>
                        </div>

                        <div className="flex gap-4 pt-4">
                            {type === 'confirm' || type === 'warning' ? (
                                <>
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-4 bg-secondary/50 text-text/60 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-secondary transition-all"
                                    >
                                        {cancelLabel}
                                    </button>
                                    <button
                                        onClick={() => {
                                            onConfirm?.();
                                            onClose();
                                        }}
                                        className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-background shadow-xl transition-all hover:scale-[1.02] active:scale-95 ${
                                            type === 'warning' ? 'bg-red-500 shadow-red-500/20' : 'bg-highlight shadow-highlight/20'
                                        }`}
                                    >
                                        {confirmLabel}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-highlight text-background rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-highlight/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Understood
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CustomDialog;

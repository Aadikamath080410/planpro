
import React from 'react';
import { X, Save, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SaveConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
  title?: string;
  description?: string;
}

const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDiscard,
  title = "Save Design?",
  description = "You have unsaved changes. Would you like to save your work before leaving?"
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-background w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-text/5 p-8 space-y-8"
          >
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <AlertTriangle size={24} />
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-text/5 rounded-full transition-colors text-text/40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-text">{title}</h3>
              <p className="text-text/40 text-sm leading-relaxed">
                {description}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={onSave}
                className="w-full py-4 bg-primary text-background rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/10"
              >
                <Save size={16} /> Save Design
              </button>
              <button
                onClick={onDiscard}
                className="w-full py-4 bg-secondary text-text/60 border border-text/5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-text/5 hover:text-text transition-all"
              >
                <Trash2 size={16} /> Discard Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SaveConfirmationModal;

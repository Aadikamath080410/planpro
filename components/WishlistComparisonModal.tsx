
import React, { useState } from 'react';
import { X, Search, Heart, SlidersHorizontal, Loader2, TrendingUp, Star, ShieldCheck } from 'lucide-react';
import { Product } from '../types';
import { PRODUCTS } from '../data/mockData';
import { comparisonService } from '../services/comparisonService';

interface WishlistComparisonModalProps {
  wishlistIds: string[];
  onClose: () => void;
  onViewProduct: (product: Product) => void;
}

const WishlistComparisonModal: React.FC<WishlistComparisonModalProps> = ({ wishlistIds, onClose, onViewProduct }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [intent, setIntent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setIntent(null);
    try {
      const data = await comparisonService.getIntraComparison(wishlistIds, query);

      if (!data || !data.rawOutput) {
        setError('No output received from comparison engine.');
        return;
      }

      const lines = data.rawOutput.split('\n');
      const rankedItems: any[] = [];
      
      let parsingRanked = false;
      for (const line of lines) {
        if (line.includes('Ranked Products:')) {
          parsingRanked = true;
          continue;
        }
        if (parsingRanked && line.trim() && /^\d+\./.test(line)) {
          // Format is "1. ID | Name | ₹Price | ⭐ Rating | score=Value"
          const parts = line.split('|').map((p: string) => p.trim());
          const idPart = parts[0].replace(/^\d+\.\s+/, '');
          const namePart = parts[1];
          const pricePart = parts[2];
          const ratingPart = parts[3];
          const scorePart = parts[4]?.split('=')[1];

          // Find full product info from mock data using ID
          const fullProduct = PRODUCTS.find(p => p.id === idPart);
          
          rankedItems.push({
            id: idPart,
            name: namePart,
            price: pricePart,
            rating: ratingPart,
            score: scorePart || '0',
            product: fullProduct
          });
        }
      }
      
      if (rankedItems.length === 0) {
        // Not an error — just no strong matches. Show soft message.
        setResults([]);
      } else {
        setResults(rankedItems);
      }
      
      try {
        const intentStart = data.rawOutput.indexOf('Detected Intent:');
        const intentEnd = data.rawOutput.indexOf('Ranked Products:');
        if (intentStart !== -1 && intentEnd !== -1) {
          const intentJson = data.rawOutput.substring(intentStart + 16, intentEnd).trim();
          setIntent(JSON.parse(intentJson));
        }
      } catch (e) {
        console.error("Failed to parse intent JSON", e);
      }

    } catch (err: any) {
      console.error('Intra comparison failed:', err);
      const msg = err?.response?.data?.details || err?.message || 'Comparison engine error.';
      setError(`Analysis failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--background)] w-[95%] max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-8 pb-4 bg-[var(--card-bg)] border-b border-[var(--border-light)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-3xl font-serif text-[var(--text)]">Intelligent Comparison</h3>
            <p className="text-[var(--text-muted)] text-sm">Compare items in your wishlist based on custom criteria.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--primary)]/5 text-[var(--text)] transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-6">
          <div className="max-w-3xl mx-auto space-y-10">
            
            {/* Input Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">Search Intent</label>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[9px] font-bold">
                  <Star size={10} fill="currentColor" /> {wishlistIds.length} Wishlist Items
                </div>
              </div>
              
              <form onSubmit={handleCompare} className="relative group">
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., 'Find a comfortable gaming chair under 40000'"
                  className="w-full bg-[var(--card-bg)] border border-[var(--border-light)] rounded-[24px] py-6 px-8 pr-32 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all text-sm font-medium shadow-sm group-hover:shadow-md text-[var(--text)]"
                />
                <button 
                  disabled={loading || !query.trim()}
                  type="submit"
                  className="absolute right-3 top-2 bottom-2 px-8 bg-[var(--primary)] text-[var(--background)] rounded-[18px] text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--primary)]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--primary)]/20"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Analyze'}
                </button>
              </form>
            </section>

            {/* Results Section */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
                <p className="text-sm font-medium text-[var(--text-muted)]">Our AI engine is processing your intent...</p>
              </div>
            ) : error ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-400">
                  <X size={28} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-lg text-red-600">Analysis Failed</h4>
                  <p className="text-sm text-black/40 max-w-sm mx-auto">{error}</p>
                </div>
                <button onClick={() => { setError(null); setResults([]); }} className="px-6 py-2 border border-black/10 rounded-full text-[10px] font-bold uppercase tracking-widest hover:border-black transition-all">Try Again</button>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {intent && (
                  <div className="p-6 bg-[var(--card-bg)] border border-[var(--border-light)] rounded-[32px] space-y-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={18} className="text-[var(--primary)]" />
                      <h5 className="text-[10px] font-black uppercase tracking-wider text-[var(--text)]">Detected Intent Analysis</h5>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {Object.entries(intent).map(([key, value]: [string, any]) => (
                        value && value !== 'NA' && value !== 'recommend' && (
                          <div key={key} className="space-y-0.5">
                            <p className="text-[8px] font-black text-[var(--text-muted)] uppercase">{key}</p>
                            <p className="text-xs font-bold text-[var(--primary)] capitalize">
                              {typeof value === 'object' 
                                ? JSON.stringify(value) 
                                : String(value).replace(/_/g, ' ')}
                            </p>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] flex items-center gap-2">
                    <TrendingUp size={14} /> AI Score Rankings
                  </h5>
                  <div className="grid grid-cols-1 gap-6">
                    {results.map((res, i) => (
                      <div 
                        key={i} 
                        className="group bg-[var(--card-bg)] rounded-[32px] border border-[var(--border-light)] hover:border-[var(--primary)]/30 hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden flex flex-col"
                        onClick={() => res.product && onViewProduct(res.product)}
                      >
                        <div className="p-8 flex flex-col md:flex-row gap-8 items-start">
                          <div className="relative flex-shrink-0">
                            <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-[var(--text)] text-[var(--background)] flex items-center justify-center text-sm font-black z-10 shadow-xl">
                              #{i+1}
                            </div>
                            <div className="w-40 h-40 rounded-[24px] overflow-hidden bg-[var(--secondary)]/50 border border-[var(--border-light)]">
                              {res.product?.image ? (
                                <img src={res.product.image} alt={res.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]/20"><Heart size={48} /></div>
                              )}
                            </div>
                          </div>
  
                          <div className="flex-1 space-y-6">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-1 block">{res.product?.category}</span>
                                <h4 className="text-2xl font-serif text-[var(--text)]">{res.name}</h4>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-black tracking-tighter text-[var(--text)]">{res.price}</p>
                                <p className="text-[10px] font-bold text-green-600 uppercase">Best Match</p>
                              </div>
                            </div>
  
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-6 border-y border-[var(--border-light)]">
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">AI Relevance</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-[var(--primary)]">{res.score}</span>
                                  <div className="flex-1 h-1 bg-[var(--text)]/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-[var(--primary)]" style={{ width: `${Math.min(100, (parseFloat(res.score) / 20) * 100)}%` }} />
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">User Rating</p>
                                <div className="flex items-center gap-1.5 font-bold text-sm text-[var(--text)]">
                                  <Star size={14} fill="#FFC107" className="text-[#FFC107]" /> {res.rating.replace('⭐', '').trim()}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Material</p>
                                <p className="text-xs font-bold text-[var(--text)]/60 truncate">{res.product?.material || 'Premium'}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-[var(--text-muted)] uppercase tracking-widest">Dimensions</p>
                                <p className="text-[11px] font-bold text-[var(--text)]/60 leading-relaxed">{res.product?.dimensions || 'Custom'}</p>
                              </div>
                            </div>
  
                            <p className="text-sm text-[var(--text-muted)] leading-relaxed line-clamp-2">
                              {res.product?.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-6">
                <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center mx-auto text-[var(--primary)]">
                  <SlidersHorizontal size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-lg text-[var(--text)]">Personalized Recommender</h4>
                  <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">Tell us what you're looking for, and we'll rank your wishlist items using AI logic.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-[var(--secondary)] border-t border-[var(--border-light)] flex items-center justify-between">
           <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">© PlanPro Intelligence Engine v2.0</p>
           <div className="flex items-center gap-4">
              <button onClick={onClose} className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">Discard</button>
              <button 
                onClick={() => { setResults([]); setQuery(''); setIntent(null); }} 
                className="px-6 py-2 bg-[var(--text)] text-[var(--background)] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--primary)] transition-all shadow-lg"
              >
                Reset Search
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default WishlistComparisonModal;

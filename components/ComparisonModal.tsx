import React, { useState, useEffect, useMemo } from 'react';
import { X, Scale, ExternalLink, ChevronDown, CheckCircle2, TrendingDown, Sparkles, RefreshCw } from 'lucide-react';
import { Product } from '../types';
import { PRODUCTS } from '../data/mockData';
import { comparisonService } from '../services/comparisonService';
import * as PricingCard from './ui/pricing-card';
import { Button } from './ui/button';

interface ComparisonModalProps {
  product: Product;
  onClose: () => void;
  onSelectProduct?: (product: Product) => void;
}

/* ── Neural Pulse Loader ──────────────────────────────────────────────────── */
const NeuralPulseLoader: React.FC<{ productImage: string }> = ({ productImage }) => (
  <div className="py-24 sm:py-32 flex flex-col items-center justify-center gap-6 sm:gap-8">
    <div
      className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-[28px] overflow-hidden shadow-2xl animate-pulse"
      style={{ border: '1px solid rgba(193,200,228,0.15)' }}
    >
      <img
        src={productImage}
        alt="Scanning"
        className="w-full h-full object-cover"
        style={{ filter: 'brightness(0.65) saturate(0.7)' }}
      />
      <div className="absolute inset-0 flex flex-col justify-around px-4 py-3 pointer-events-none">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="neural-line h-px w-full rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(163, 123, 71,${0.5 + i * 0.08}), transparent)`,
              animationDelay: `${i * 0.3}s`,
              boxShadow: '0 0 6px rgba(163, 123, 71,0.4)',
            }}
          />
        ))}
      </div>
      <div
        className="absolute inset-0 rounded-[28px] pointer-events-none"
        style={{ border: '1px solid rgba(163, 123, 71,0.3)', boxShadow: 'inset 0 0 24px rgba(163, 123, 71,0.08)' }}
      />
    </div>

    <div className="text-center space-y-2">
      <p
        className="text-xs font-black uppercase tracking-[0.3em]"
        style={{ color: 'var(--primary)' }}
      >
        Benchmarking Retail Intelligence
      </p>
      <div className="flex items-center justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              background: 'var(--primary)',
              animationDelay: `${i * 0.2}s`,
              boxShadow: '0 0 6px rgba(139, 86, 51, 0.4)',
            }}
          />
        ))}
      </div>
      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
        Querying market catalogues across Amazon, IKEA, Flipkart &amp; Urban Ladder…
      </p>
    </div>
  </div>
);

const ComparisonModal: React.FC<ComparisonModalProps> = ({ product, onClose, onSelectProduct }) => {
  const [loading, setLoading] = useState(true);
  const [localData, setLocalData] = useState<any | null>(null);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setCardsVisible(false);

      try {
        const localResult = await comparisonService.getInterComparison(product.id);
        if (isCancelled) return;

        if (localResult?.results && Object.keys(localResult.results).length > 0) {
          setLocalData({ results: localResult.results });
        } else if (localResult?.rawOutput) {
          const start = localResult.rawOutput.indexOf('JSON_START');
          const end = localResult.rawOutput.indexOf('JSON_END');
          if (start !== -1 && end !== -1) {
            const jsonStr = localResult.rawOutput.substring(start + 10, end).trim();
            setLocalData(JSON.parse(jsonStr));
          }
        }
      } catch (err) {
        console.error('Market comparison lookup failed:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setTimeout(() => setCardsVisible(true), 80);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [product]);

  // Extract top competitor cards
  const competitorCards = useMemo(() => {
    if (!localData?.results) return [];
    return Object.entries(localData.results)
      .flatMap(([site, matches]: [string, any]) =>
        (Array.isArray(matches) ? matches : []).slice(0, 1).map((m: any) => ({ ...m, site }))
      )
      .filter((m: any) => m && m.name)
      .sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0));
  }, [localData]);

  // Financial intelligence calculation
  const stats = useMemo(() => {
    if (competitorCards.length === 0) return null;
    const prices = competitorCards.map((c: any) => c.price).filter((p: any) => typeof p === 'number' && p > 0);
    if (prices.length === 0) return null;

    const avgPrice = Math.round(prices.reduce((sum: number, val: number) => sum + val, 0) / prices.length);
    const lowestCompetitor = Math.min(...prices);
    const highestCompetitor = Math.max(...prices);
    const savingsVsAvg = avgPrice > product.price ? avgPrice - product.price : 0;
    const savingsPercent = avgPrice > 0 ? Math.round((savingsVsAvg / avgPrice) * 100) : 0;
    const topMatch = competitorCards[0];

    return {
      avgPrice,
      lowestCompetitor,
      highestCompetitor,
      savingsVsAvg,
      savingsPercent,
      topMatchSite: topMatch?.site || 'Competitors',
      topSimilarity: Math.round((topMatch?.similarity || 0) * 100)
    };
  }, [competitorCards, product]);

  const handleProductChange = (newProduct: Product) => {
    setIsDropdownOpen(false);
    if (onSelectProduct) {
      onSelectProduct(newProduct);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 md:p-10 lg:p-12 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-md transition-all duration-500 bg-black/60"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-6xl my-auto max-h-[92vh] rounded-[24px] sm:rounded-[36px] overflow-hidden shadow-[0_32px_128px_-16px_rgba(0,0,0,0.6)] flex flex-col z-10"
        style={{
          background: 'var(--background)',
          border: '1px solid rgba(193,200,228,0.12)',
          animation: 'heroZoomIn 0.35s cubic-bezier(0.25,1,0.5,1) forwards',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 sm:top-7 sm:right-7 p-2.5 sm:p-3 rounded-full transition-all duration-300 z-50 hover:scale-110 active:scale-95 shadow-md"
          style={{ background: 'var(--secondary)', border: '1px solid var(--border-light)' }}
          aria-label="Close Comparison"
        >
          <X size={18} className="hover:rotate-90 transition-transform duration-300" style={{ color: 'var(--text)' }} />
        </button>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {/* Header Section */}
          <div
            className="p-5 sm:p-8 md:p-10 pb-6 sm:pb-8"
            style={{
              background: 'var(--background)',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm"
                style={{
                  background: 'rgba(139, 86, 51, 0.1)',
                  border: '1px solid rgba(139, 86, 51, 0.25)',
                  color: 'var(--primary)',
                }}
              >
                <Scale size={13} /> Real-Time Price Comparison
              </div>

              {/* Product Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all hover:border-primary/50"
                  style={{
                    background: 'var(--secondary)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text)',
                  }}
                >
                  <span className="text-[10px] uppercase font-bold text-primary/70">Change Item:</span>
                  <span className="font-bold truncate max-w-[140px] sm:max-w-[200px]">{product.name}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-72 sm:w-80 max-h-72 overflow-y-auto rounded-2xl shadow-2xl p-2 z-[130] animate-in fade-in duration-200"
                    style={{
                      background: 'var(--background)',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Select catalog piece to compare:</p>
                    <div className="space-y-1">
                      {PRODUCTS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleProductChange(p)}
                          className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
                            p.id === product.id ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-primary/5 text-[var(--text)]'
                          }`}
                        >
                          <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate font-medium">{p.name}</p>
                            <p className="text-[10px] text-primary font-bold">₹{p.price.toLocaleString()}</p>
                          </div>
                          {p.id === product.id && <CheckCircle2 size={14} className="text-primary flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-serif" style={{ color: 'var(--text)' }}>
                  Market Price &amp; Quality Benchmark
                </h3>
                <p className="text-sm mt-2 max-w-2xl leading-relaxed text-[var(--text-secondary)]">
                  Side-by-side verification comparing PlanPro's <strong className="text-[var(--text)]">{product.name}</strong> against verified retail listings from Amazon, IKEA, Flipkart, and Urban Ladder.
                </p>
              </div>

              {/* PlanPro Highlight Box */}
              <div
                className="flex items-center gap-4 p-3.5 sm:p-4 rounded-2xl shrink-0 shadow-sm"
                style={{
                  background: 'var(--secondary)',
                  border: '1px solid var(--border-light)',
                }}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shadow-sm"
                />
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-primary">PlanPro Exclusive</span>
                  <div className="text-xl sm:text-2xl font-black text-primary font-serif">₹{product.price.toLocaleString()}</div>
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">Verified Direct Artisan Pricing</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Banner */}
            {!loading && stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[var(--border-light)]/60">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="text-[9px] uppercase font-bold text-primary/80 tracking-wider">Avg Market Price</span>
                  <p className="text-base sm:text-lg font-bold text-[var(--text)] mt-0.5">₹{stats.avgPrice.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <span className="text-[9px] uppercase font-bold text-green-600 tracking-wider flex items-center gap-1">
                    <TrendingDown size={11} /> You Save
                  </span>
                  <p className="text-base sm:text-lg font-black text-green-600 mt-0.5">
                    {stats.savingsVsAvg > 0 ? `₹${stats.savingsVsAvg.toLocaleString()} (${stats.savingsPercent}%)` : 'Best Value'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="text-[9px] uppercase font-bold text-primary/80 tracking-wider">Top Match Retailer</span>
                  <p className="text-base sm:text-lg font-bold text-[var(--text)] mt-0.5">{stats.topMatchSite}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <span className="text-[9px] uppercase font-bold text-primary/80 tracking-wider">Confidence Score</span>
                  <p className="text-base sm:text-lg font-black text-primary mt-0.5">{stats.topSimilarity}% Match</p>
                </div>
              </div>
            )}
          </div>

          {/* Modal Content */}
          <div className="p-5 sm:p-8 md:p-10 pt-6 sm:pt-8 flex-1">
            {loading ? (
              <NeuralPulseLoader productImage={product.image} />
            ) : competitorCards.length > 0 ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Cross-Retailer Matches ({competitorCards.length} retailers detected)
                  </h4>
                  <span className="text-xs text-[var(--text-secondary)]">Algorithm: Multi-attribute cosine &amp; dimension fuzzy index</span>
                </div>

                {/* Benchmark Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {competitorCards.map((m: any, idx: number) => {
                    const priceDiff = m.price ? m.price - product.price : 0;
                    return (
                      <PricingCard.Card
                        key={`${m.site}-${idx}`}
                        className={`flex flex-col rounded-[24px] sm:rounded-[28px] overflow-hidden group transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)] ${
                          cardsVisible ? 'animate-spring-reveal opacity-100' : 'opacity-0'
                        }`}
                        style={{
                          background: 'var(--secondary)',
                          border: '1px solid var(--border-light)',
                          animationDelay: `${idx * 80}ms`,
                        }}
                      >
                        {/* Image & Retailer Badge */}
                        <PricingCard.Header
                          className="p-0 border-0 h-[170px] relative overflow-hidden"
                          style={{ background: 'var(--background)' }}
                        >
                          <img
                            src={
                              m.imageUrl ||
                              'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&q=80&w=600'
                            }
                            alt={m.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div
                            className="absolute top-3 left-3 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md"
                            style={{
                              background: 'rgba(255, 255, 255, 0.92)',
                              backdropFilter: 'blur(10px)',
                              border: '1px solid var(--border-light)',
                            }}
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{
                                background:
                                  m.site === 'IKEA'
                                    ? '#EAB308'
                                    : m.site === 'Amazon'
                                    ? '#F97316'
                                    : m.site === 'Flipkart'
                                    ? '#3B82F6'
                                    : 'var(--primary)',
                              }}
                            />
                            <span
                              className="text-[10px] font-black uppercase tracking-wider text-black"
                            >
                              {m.site}
                            </span>
                          </div>
                        </PricingCard.Header>

                        <PricingCard.Body className="p-4 sm:p-5 flex flex-col flex-1">
                          <div className="mb-3 flex-shrink-0">
                            <h4
                              className="text-xs sm:text-sm font-semibold line-clamp-2 leading-snug min-h-[36px] transition-colors group-hover:text-primary"
                              style={{ color: 'var(--text)' }}
                              title={m.name}
                            >
                              {m.name || `${m.site} Alternative`}
                            </h4>
                          </div>

                          <div className="mb-4">
                            <p className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)] mb-0.5">
                              Market Retail Price
                            </p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl sm:text-2xl font-serif font-black text-primary">
                                {m.price ? `₹${m.price.toLocaleString()}` : 'Check Site'}
                              </span>
                            </div>
                            {priceDiff !== 0 && (
                              <p className={`text-[10px] font-bold mt-1 ${priceDiff > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                {priceDiff > 0 ? `+₹${priceDiff.toLocaleString()} higher than PlanPro` : `-₹${Math.abs(priceDiff).toLocaleString()} lower`}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2.5 mb-5 flex-1">
                            <div className="flex flex-col gap-0.5 py-1.5 border-b border-[var(--border-light)]/40">
                              <span className="text-[9px] font-black uppercase tracking-wider text-primary/60">Dimensions</span>
                              <span className="text-[11px] font-medium truncate text-[var(--text)]">{m.dimension || 'Standard Catalog'}</span>
                            </div>

                            {/* Similarity / Confidence */}
                            <div className="py-1.5 border-b border-[var(--border-light)]/40">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-primary/60">Match Confidence</span>
                                <span className="text-[11px] font-bold text-primary">
                                  {(m.similarity * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full overflow-hidden bg-primary/10">
                                <div
                                  className="h-full rounded-full transition-all duration-1000 bg-primary"
                                  style={{
                                    width: `${Math.min(100, Math.max(10, (m.similarity * 100)))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {m.productUrl ? (
                            <Button
                              onClick={() => window.open(m.productUrl, '_blank', 'noopener,noreferrer')}
                              className="w-full h-10 rounded-xl font-bold text-xs gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-sm"
                              style={{
                                background: 'var(--primary)',
                                color: '#ffffff',
                              }}
                            >
                              <span>View on {m.site}</span>
                              <ExternalLink size={13} />
                            </Button>
                          ) : (
                            <Button
                              disabled
                              className="w-full h-10 rounded-xl font-bold text-xs opacity-60 cursor-not-allowed"
                            >
                              Listing Verified
                            </Button>
                          )}
                        </PricingCard.Body>
                      </PricingCard.Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Informative Empty State */
              <div className="py-16 text-center max-w-md mx-auto space-y-5">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Scale size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-serif font-bold text-[var(--text)]">Unique Artisan Craft</h4>
                  <p className="text-sm mt-2 text-[var(--text-secondary)] leading-relaxed">
                    This handcrafted design is exclusive to PlanPro with bespoke materials. No direct commercial replica was found on major mass-market retailers.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Compare another piece:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {PRODUCTS.slice(0, 3).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleProductChange(p)}
                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonModal;

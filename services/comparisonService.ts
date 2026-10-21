import axios from 'axios';
import { Product } from '../types';
import { PRODUCTS } from '../data/mockData';
import precomputedComparisonsData from '../data/precomputedComparisons.json';

// Use VITE_BACKEND_URL in production (set this env var on Vercel/Railway to your Express backend URL).
// Falls back to localhost:5000 for local development.
const API_BASE_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/comparison`;

const precomputedComparisons = precomputedComparisonsData as Record<string, any>;

export const comparisonService = {
  /**
   * Run inter-site comparison using backend API with automatic seamless fallback to precomputed engine data
   */
  async getInterComparison(productId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/inter/${productId}`, { timeout: 2500 });
      if (response.data && (response.data.results || response.data.rawOutput)) {
        return response.data;
      }
    } catch (error) {
      console.warn('Backend comparison service unreachable or failed, using local benchmark data:', error);
    }

    // Seamless fallback to precomputed engine data
    const localMatches = precomputedComparisons[productId];
    if (localMatches) {
      return {
        productId,
        type: 'inter-site',
        results: localMatches,
        rawOutput: `JSON_START\n${JSON.stringify({ results: localMatches })}\nJSON_END`
      };
    }

    // If ID not found directly, try finding by subcategory/category match
    const currentProd = PRODUCTS.find(p => p.id === productId);
    if (currentProd) {
      const similarInCat = PRODUCTS.find(p => p.category === currentProd.category && precomputedComparisons[p.id]);
      if (similarInCat && precomputedComparisons[similarInCat.id]) {
        return {
          productId,
          type: 'inter-site',
          results: precomputedComparisons[similarInCat.id],
          rawOutput: `JSON_START\n${JSON.stringify({ results: precomputedComparisons[similarInCat.id] })}\nJSON_END`
        };
      }
    }

    return {
      productId,
      type: 'inter-site',
      results: {},
      rawOutput: `JSON_START\n{"results":{}}\nJSON_END`
    };
  },

  /**
   * Run intra-site comparison using Python script via backend with intelligent client-side fallback
   */
  async getIntraComparison(wishlistIds: string[], query: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/intra`, {
        wishlistIds,
        query
      }, { timeout: 4000 });

      if (response.data && response.data.rawOutput) {
        return response.data;
      }
    } catch (error) {
      console.warn('Backend intra comparison failed or offline, running local heuristic analysis:', error);
    }

    // Client-side fallback ranking
    const items = PRODUCTS.filter(p => wishlistIds.includes(p.id));
    const lowerQuery = query.toLowerCase();

    // Score items based on query match
    const scored = items.map(p => {
      let score = 0.5;
      const text = `${p.name} ${p.category} ${p.subcategory} ${p.description || ''} ${p.material || ''}`.toLowerCase();
      
      const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);
      for (const w of words) {
        if (text.includes(w)) score += 0.25;
      }

      if (lowerQuery.includes('cheap') || lowerQuery.includes('budget') || lowerQuery.includes('affordable') || lowerQuery.includes('lowest')) {
        score += (20000 - p.price) / 20000;
      } else if (lowerQuery.includes('luxury') || lowerQuery.includes('premium') || lowerQuery.includes('expensive')) {
        score += p.price / 30000;
      }

      if (lowerQuery.includes('rating') || lowerQuery.includes('best') || lowerQuery.includes('quality')) {
        score += (p.rating || 4.5) / 5;
      }

      return { p, score: Math.min(1.0, Math.max(0.1, score)) };
    });

    scored.sort((a, b) => b.score - a.score);

    let output = `Detected Intent: {"query": "${query}", "intent": "custom_criteria"}\n\nRanked Products:\n`;
    scored.forEach((s, idx) => {
      output += `${idx + 1}. ${s.p.id} | ${s.p.name} | ₹${s.p.price.toLocaleString()} | ⭐ ${s.p.rating || 4.8} | score=${s.score.toFixed(2)}\n`;
    });

    return {
      query,
      rawOutput: output,
      type: 'intra-site'
    };
  }
};

import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or current directory
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

export const env = {
    PORT: process.env.PORT || 5000,
    SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
    HORIZON_NET_URL: process.env.VITE_AI_SERVER_URL || 'http://localhost:8000/predict',
    isDev: process.env.NODE_ENV !== 'production',
};

if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.warn('Warning: Supabase credentials missing from environment.');
}

import { Router } from 'express';
import { exec } from 'child_process';
import path from 'path';

const router = Router();

// Path to the comparison engine scripts.
// In dev (ts-node-dev): __dirname is backend/modules/comparison/ → 3 levels up to project root.
// In production (compiled JS): __dirname is backend/dist/modules/comparison/ → 4 levels up.
// We detect the compiled build by checking for the 'dist' segment in __dirname.
const ROOT_OFFSET = __dirname.includes('dist') ? '../../../../' : '../../../';
const COMPARE_ENGINE_DIR = path.resolve(__dirname, ROOT_OFFSET, 'real_compare/real_compare');

/**
 * @route GET /api/comparison/inter/:productId
 * @desc Run inter-site comparison for a given product ID
 */
router.get('/inter/:productId', (req, res) => {
  const { productId } = req.params;
  
  // Use the new JSON output mode
  const command = `node planpro_engine.js --json-output --id "${productId}"`;
  
  exec(command, { cwd: COMPARE_ENGINE_DIR, env: { ...process.env, NODE_ENV: 'production' } }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing inter comparison: ${error}`);
      return res.status(500).json({ error: 'Failed to run comparison engine', details: stderr });
    }
    
    res.json({ 
      productId,
      rawOutput: stdout,
      type: 'inter-site'
    });
  });
});

/**
 * @route POST /api/comparison/intra
 * @desc Run intra-site comparison for a wishlist and query
 */
router.post('/intra', (req, res) => {
  const { wishlistIds, query } = req.body;
  
  if (!wishlistIds || !query) {
    return res.status(400).json({ error: 'wishlistIds and query are required' });
  }
  
  const wishlistStr = wishlistIds.join(',');
  
  // Use python3 on Linux containers (production); fall back to python on Windows (local dev)
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const escapedQuery = query.replace(/"/g, '\\"');
  const command = `${pythonCmd} intra_RC.py --ids "${wishlistStr}" --query "${escapedQuery}"`;
  
  exec(command, { 
    cwd: COMPARE_ENGINE_DIR, 
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    timeout: 30000
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing intra comparison: ${error}`);
      console.error(`stderr: ${stderr}`);
      return res.status(500).json({ error: 'Failed to run intra-site engine', details: stderr });
    }
    
    res.json({ 
      query,
      rawOutput: stdout,
      type: 'intra-site'
    });
  });
});

export default router;

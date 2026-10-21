# PlanPro AR Furniture Backend

Modular Node.js/TypeScript backend for the PlanPro AR Furniture application.

## Structure

- `config/`: Application configuration (Supabase, environment variables).
- `modules/`: Feature-based modules (Room, AR, Ecommerce, AI).
- `stores/`: Data access layer (Supabase wrappers).
- `utils/`: Shared utilities and adapters.
- `middlewares/`: Express middlewares.

## Running Locally

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Integration

- **HorizonNet:** Connects to the AI inference server (Python) via `HORIZON_NET_URL`.
- **Supabase:** Stores room metadata, users, etc.
- **Google Drive:** Handled via external automation (Google Apps Script).

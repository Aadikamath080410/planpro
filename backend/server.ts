import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const PORT = env.PORT;

app.listen(PORT, () => {
    logger.info(`Backend server running on port ${PORT}`);
    logger.info(`Environment: ${env.isDev ? 'development' : 'production'}`);
});

import { env } from './env';

export const horizonNetConfig = {
    url: env.HORIZON_NET_URL,
    timeout: 60000, // 60 seconds as inference can be slow
};

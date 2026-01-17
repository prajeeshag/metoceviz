import { pino } from 'pino';

const isProduction = false;


export const logger = pino({
    level: isProduction ? 'info' : 'debug',
});

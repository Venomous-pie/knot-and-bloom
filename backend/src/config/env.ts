import dotenv from 'dotenv';

export function resolveEnvFile(): string {
    const env = (process.env.NODE_ENV || '').toLowerCase();
    if (env === 'development') return '.env.development';
    if (env === 'staging') return '.env.staging';
    return '.env';
}

export function loadEnv(): void {
    dotenv.config({ path: resolveEnvFile() });
}
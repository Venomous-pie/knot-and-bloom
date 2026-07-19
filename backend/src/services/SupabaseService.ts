import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

class SupabaseService {
    private static instance: SupabaseService;
    private supabase: SupabaseClient;

    private constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://aws-1-ap-south-1.pooler.supabase.com';
        // Provide a dummy JWT-like key to prevent the client from throwing on init if not configured
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'dummy.dummy.dummy';
        
        if (supabaseKey === 'dummy.dummy.dummy') {
            console.warn('Supabase URL or Key is missing. Realtime broadcasts will fail. Please add SUPABASE_SERVICE_ROLE_KEY to your .env');
        }
        
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    public static getInstance(): SupabaseService {
        if (!SupabaseService.instance) {
            SupabaseService.instance = new SupabaseService();
        }
        return SupabaseService.instance;
    }

    /**
     * Broadcast an event to a specific channel (room)
     */
    public async emitToRoom(room: string, event: string, payload: any) {
        try {
            const channel = this.supabase.channel(room);
            await channel.send({
                type: 'broadcast',
                event: event,
                payload: payload
            });
            console.log(`[SupabaseService] Broadcasted '${event}' to room '${room}'`);
        } catch (error) {
            console.error(`[SupabaseService] Error broadcasting to room ${room}:`, error);
        }
    }

    /**
     * Broadcast an event to the global channel
     */
    public async emit(event: string, payload: any) {
        try {
            const channel = this.supabase.channel('global');
            await channel.send({
                type: 'broadcast',
                event: event,
                payload: payload
            });
            console.log(`[SupabaseService] Broadcasted global event '${event}'`);
        } catch (error) {
            console.error(`[SupabaseService] Error broadcasting global event:`, error);
        }
    }
}

export const supabaseService = SupabaseService.getInstance();

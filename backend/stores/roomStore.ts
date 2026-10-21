import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';

export const roomStore = {
    async createRoom(userId: string, layout: any) {
        const { data, error } = await supabase
            .from('room_layouts')
            .insert([
                {
                    id: uuidv4(),
                    user_id: userId,
                    layout,
                    created_at: new Date().toISOString(),
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getRoom(roomId: string) {
        const { data, error } = await supabase
            .from('room_layouts')
            .select('*')
            .eq('id', roomId)
            .single();

        if (error) throw error;
        return data;
    },

    async updateRoom(roomId: string, layout: any) {
        const { data, error } = await supabase
            .from('room_layouts')
            .update({ layout })
            .eq('id', roomId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },
};

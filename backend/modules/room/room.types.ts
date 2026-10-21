export interface FurnitureItem {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    rotation: number;
    scale: { x: number; y: number; z: number };
    metadata?: any;
}

export interface RoomLayout {
    id: string;
    user_id: string;
    dimensions: {
        width: number;
        height: number;
        depth: number;
    };
    furniture: FurnitureItem[];
    image_url?: string;
    model_url?: string;
    created_at: string;
}

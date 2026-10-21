/**
 * Adapts raw HorizonNet output to the standardized RoomLayout schema used by Blueprint and AR modules.
 */
export function adaptHorizonOutput(raw: any) {
    // Never expose raw HorizonNet output to frontend.
    // We map the raw response to our internal format here.
    return {
        dimensions: raw.room_dimensions || { width: 0, height: 0, depth: 0 },
        walls: raw.walls || [],
        furniture: [], // Start with empty furniture list
    };
}

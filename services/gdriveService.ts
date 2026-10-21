
import { toast } from 'sonner';

const APPSCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;

export interface GDriveFile {
    id: string;
    name: string;
    mimeType: string;
    url: string;
    dateCreated: string;
    size: number;
    type: string;
}

export const gdriveService = {
    async listFiles(type: '3d' | 'preview' | 'ai' | 'all' = 'all'): Promise<GDriveFile[]> {
        if (!APPSCRIPT_URL) {
            console.error("APPSCRIPT_URL missing");
            return [];
        }

        try {
            const response = await fetch(`${APPSCRIPT_URL}?type=${type}`, {
                method: 'GET',
                mode: 'cors', // AppScript supports CORS for GET
            });
            const result = await response.json();
            if (result.status === 'success') {
                return result.files;
            } else {
                console.error("Drive list error:", result.message);
                return [];
            }
        } catch (err) {
            console.error("Failed to fetch GDrive files:", err);
            return [];
        }
    }
};

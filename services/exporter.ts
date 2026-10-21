import * as THREE from 'three';
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { toast } from 'sonner';

export function exportSceneToGLB(scene: THREE.Object3D, filename = "PlanPro-Export.glb"): Promise<void> {
    const APPSCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;

    return new Promise((resolve, reject) => {
        const exporter = new GLTFExporter();
        const options = {
            binary: true,
            trs: false,
            onlyVisible: true,
            truncateDrawRange: true,
            embedImages: true,
        };

        console.log("Starting GLTF Export for scene:", scene.name || "Unnamed Scene");

        exporter.parse(
            scene,
            async (result) => {
                try {
                    let output: ArrayBuffer | string;
                    if (result instanceof ArrayBuffer) {
                        output = result;
                    } else {
                        output = JSON.stringify(result);
                    }

                    const blob = new Blob([output], { type: "model/gltf-binary" });
                    console.log(`GLB Export successful. Size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

                    // 1. Download locally
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    console.log("Local download triggered.");

                    // 2. Upload to AppScript if URL is present
                    if (APPSCRIPT_URL) {
                        toast.info(`Uploading 3D Model (${(blob.size / 1024 / 1024).toFixed(1)}MB)...`);
                        await uploadToAppScript(blob, filename, 'model/gltf-binary');
                        console.log("Upload to AppScript complete.");
                    } else {
                        console.warn("VITE_APPSCRIPT_URL missing, skipping cloud upload.");
                    }

                    resolve();
                } catch (err) {
                    console.error("Error during post-export processing:", err);
                    reject(err);
                }
            },
            (err) => {
                console.error("GLTF Export error:", err);
                toast.error("3D Export failed. Check console for details.");
                reject(err);
            },
            options
        );
    });
}

export async function uploadToAppScript(blob: Blob, filename: string, mimeType: string): Promise<void> {
    const APPSCRIPT_URL = import.meta.env.VITE_APPSCRIPT_URL;

    if (!APPSCRIPT_URL) {
        console.error("VITE_APPSCRIPT_URL is not defined in environment variables.");
        return;
    }

    if (blob.size > 50 * 1024 * 1024) {
        const error = `File size (${(blob.size / 1024 / 1024).toFixed(1)}MB) exceeds 50MB limit for Apps Script.`;
        console.error(error);
        toast.error(error);
        throw new Error(error);
    }

    console.log(`Starting upload: ${filename} (${(blob.size / 1024 / 1024).toFixed(2)} MB) to ${APPSCRIPT_URL}`);

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const base64 = reader.result as string;

                // Using mode: 'no-cors' for Google App Script
                const response = await fetch(APPSCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        filename: filename,
                        mimeType: mimeType,
                        file: base64
                    })
                });

                console.log(`Upload signal sent for ${filename}.`);
                resolve();
            } catch (err) {
                console.error(`Fetch error during upload of ${filename}:`, err);
                reject(err);
            }
        };
        reader.onerror = () => {
            console.error(`FileReader error for ${filename}`);
            reject(new Error("FileReader failed"));
        };
        reader.readAsDataURL(blob);
    });
}

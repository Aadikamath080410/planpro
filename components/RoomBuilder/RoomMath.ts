
import * as THREE from 'three';
import { RoomShape, RoomData, BlueprintItem } from '../../types';

export const getShapePoints = (shape: RoomShape, dims: { length: number; width: number; notchL?: number; notchW?: number }) => {
    const { length: L = 6, width: W = 6, notchL = 2, notchW = 2 } = dims || {};
    const hL = L / 2;
    const hW = W / 2;
    const sW = notchW / 2;
    const headY = hW - notchL;

    switch (shape) {
        case 'L_SHAPE':
            return [
                [-hL, -hW], [hL, -hW], [hL, hW - notchW], 
                [hL - notchL, hW - notchW], [hL - notchL, hW], [-hL, hW]
            ];
        case 'T_SHAPE':
            return [
                [-sW, -hW], [sW, -hW], [sW, headY], [hL, headY], 
                [hL, hW], [-hL, hW], [-hL, headY], [-sW, headY]
            ];
        case 'HEXAGON':
            const hexPts: [number, number][] = [];
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
                hexPts.push([Math.cos(angle) * hL, Math.sin(angle) * hL]);
            }
            return hexPts;
        default: // SQUARE / RECTANGLE
            return [
                [-hL, -hW], [hL, -hW], [hL, hW], [-hL, hW]
            ];
    }
};

export const calculatePolygonArea = (points: [number, number][]) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        area += (p1[0] * p2[1]) - (p2[0] * p1[1]);
    }
    return Math.abs(area) / 2;
};

export const calculateRoomArea = (roomData: RoomData) => {
    if (!roomData) return 0;
    const points = getShapePoints(roomData.shape, roomData.dimensions);
    return calculatePolygonArea(points as [number, number][]);
};

export const calculateFurnitureArea = (furnitureList: BlueprintItem[]) => {
    if (!furnitureList || !Array.isArray(furnitureList)) return 0;
    return furnitureList.reduce((total, item) => {
        const w = item.dimensions?.width || 1;
        const d = item.dimensions?.depth || 1;
        return total + (w * d);
    }, 0);
};

export const isPointInRoom = (x: number, z: number, points: any[]) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const pi = points[i];
    const pj = points[j];
    
    // Handle various point formats
    let xi, zi, xj, zj;
    
    if (Array.isArray(pi)) {
        [xi, zi] = pi;
    } else if (pi instanceof THREE.Vector2) {
        xi = pi.x;
        zi = pi.y;
    } else if (pi.pos instanceof THREE.Vector2) {
        xi = pi.pos.x;
        zi = pi.pos.y;
    } else {
        xi = pi.x ?? pi.pos?.x ?? 0;
        zi = pi.z ?? pi.y ?? pi.pos?.y ?? 0;
    }

    if (Array.isArray(pj)) {
        [xj, zj] = pj;
    } else if (pj instanceof THREE.Vector2) {
        xj = pj.x;
        zj = pj.y;
    } else if (pj.pos instanceof THREE.Vector2) {
        xj = pj.pos.x;
        zj = pj.pos.y;
    } else {
        xj = pj.x ?? pj.pos?.x ?? 0;
        zj = pj.z ?? pj.y ?? pj.pos?.y ?? 0;
    }
    
    const intersect = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

export const checkPlacementValidity = (
    pos: [number, number, number], 
    dims: { width: number; depth: number }, 
    rotation: number, 
    furnitureList: BlueprintItem[], 
    roomPoints: any[], 
    ignoreIndex: number = -1,
    ignoreId: string | null = null
) => {
    const w = dims?.width || 1;
    const d = dims?.depth || 1;
    const halfW = w / 2;
    const halfD = d / 2;
    
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    const localCorners = [
        { x: -halfW, z: -halfD },
        { x: halfW, z: -halfD },
        { x: halfW, z: halfD },
        { x: -halfW, z: halfD },
    ];
    
    const corners = localCorners.map(c => ({
        x: pos[0] + (c.x * cos - c.z * sin),
        z: pos[2] + (c.x * sin + c.z * cos)
    }));
    
    // 1. Boundary check
    const isInside = corners.every(c => isPointInRoom(c.x, c.z, roomPoints));
    if (!isInside) return { valid: false, reason: 'OUTSIDE' };
    
    // 2. Furniture collision check
    const safetyBuffer = 0.15; // Minimum gap in meters
    const isHittingOther = furnitureList.some((other, i) => {
        // Skip self
        if (ignoreId && other.id === ignoreId) return false;
        if (i === ignoreIndex) return false;
        
        // Use position from item
        const otherPos = other.position || [other.x, 0, other.y];
        
        // Use actual dimensions if available
        const otherW = other.dimensions?.width || 0.8;
        const otherD = other.dimensions?.depth || 0.8;
        
        const dx = Math.abs(pos[0] - otherPos[0]);
        const dz = Math.abs(pos[2] - otherPos[2]);
        
        // Collision if horizontal distance is less than combined half-widths + buffer
        return dx < (w + otherW) / 2 + safetyBuffer && dz < (d + otherD) / 2 + safetyBuffer;
    });
    
    if (isHittingOther) return { valid: false, reason: 'COLLISION' };
    
    return { valid: true };
};

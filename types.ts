
export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  image: string;
  images: string[];
  description: string;
  dimensions: string;
  material: string;
  rating: number;
  reviews?: { user: string; rating: number; comment: string }[];
  model?: string;
  texture?: string;
}

export interface ComparisonResult {
  competitor: string;
  productName: string;
  price: string;
  url: string;
  keyDifference: string;
}

export interface BlueprintItem {
  id: string;
  name?: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  price?: number;
  model?: string;
  texture?: string;
  color?: string;
  position?: [number, number, number];
  dimensions?: {
    width: number;
    depth: number;
    height: number;
    centerX: number;
    centerZ: number;
  };
}

export type RoomShape = 'SQUARE' | 'L_SHAPE' | 'T_SHAPE' | 'HEXAGON';

export interface RoomOpening {
  type: 'DOOR' | 'WINDOW';
  wallIndex: number;
  offset: number; // 0 to 1
}

export interface RoomData {
  shape: RoomShape;
  dimensions: {
    length: number;
    width: number;
    notchL?: number;
    notchW?: number;
  };
  openings: RoomOpening[];
  wallColor: string;
  floorTexture: 'plain' | 'wood' | 'tiles';
  projectTitle: string;
  panoramaUrl?: string;
}

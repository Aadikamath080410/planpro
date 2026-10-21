
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
  oldPrice?: number;
  reviews?: { user: string; rating: number; comment: string; date?: string; }[];
  model: string;
  scale?: number;
  texture?: string;
  productUrl?: string;
  arEnabled?: boolean;
  priceMatch?: boolean;
  savings?: number;
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
  type: string;
  x: number;
  y: number;
  rotation: number;
  model?: string;
  position?: [number, number, number];
  color?: string;
  texture?: string;
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
  id?: string;
  type: 'DOOR' | 'WINDOW';
  wallIndex: number;
  offset: number; // 0 to 1
}

export interface ComparisonResult {
  competitor: string;
  productName: string;
  price: string;
  url: string;
  keyDifference: string;
}
export interface RoomData {
  shape: RoomShape;
  dimensions: {
    length: number;
    width: number;
    ceilingHeight?: number;
    notchL?: number;
    notchW?: number;
    frontWall?: number;
    backWall?: number;
    leftWall?: number;
    rightWall?: number;
  };
  openings: RoomOpening[];
  wallColor: string;
  wallTexture: 'plain' | 'brick' | 'concrete' | 'plaster';
  floorTexture: 'plain' | 'wood' | 'tiles';
  units?: 'METERS' | 'FEET';
  projectTitle: string;
  panoramaUrl?: string;
}

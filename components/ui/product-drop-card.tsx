import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card"; 
import { Button } from "./button"; 
import { ExternalLink, ShoppingCart } from "lucide-react";

export interface DropItem {
  time?: string;
  name: string;
  collection?: string;
  imageSrc?: string;
  price?: number;
  similarity?: number;
  site?: string;
  productUrl?: string;
  dimension?: string;
  brand?: string;
}

export interface ProductDropCardProps {
  title: string;
  subtitle: string;
  items: DropItem[];
}

export const ProductDropCard = ({
  title,
  subtitle,
  items,
}: ProductDropCardProps) => {
  if(!items || items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="px-2">
        <h3 className="text-[22px] font-bold tracking-tight text-black mb-1">{title}</h3>
        <p className="text-black/40 text-sm">{subtitle}</p>
      </div>
      
      <div className="space-y-3">
        {items.map((item, index) => (
          <div 
            key={index}
            className="flex items-center gap-4 p-4 bg-white border border-black/5 rounded-[24px] hover:shadow-lg hover:border-black/10 transition-all group"
          >
            {/* Product Image */}
            <div 
              className="relative w-16 h-16 rounded-full overflow-hidden bg-black/5 cursor-pointer"
              onClick={() => item.productUrl && window.open(item.productUrl, '_blank')}
            >
              <img
                src={item.imageSrc || 'https://via.placeholder.com/400x300?text=No+Image'}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=100&h=100'; }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 bg-black/5 rounded-md text-[9px] font-bold uppercase tracking-wider text-black/60">
                  {item.site}
                </span>
                {item.similarity && (
                  <span className="text-[10px] font-medium text-green-600">
                    {(item.similarity * 100).toFixed(0)}% match
                  </span>
                )}
              </div>
              <h4 
                className="font-bold text-black text-[15px] truncate cursor-pointer hover:underline underline-offset-2"
                onClick={() => item.productUrl && window.open(item.productUrl, '_blank')}
              >
                {item.name}
              </h4>
              <p className="text-[11px] text-black/40 truncate">
                {item.brand ? `${item.brand} • ` : ''}{item.dimension || "Standard Size"}
              </p>
            </div>

            {/* Price & Action */}
            <div className="flex items-center gap-4 pl-4 border-l border-black/5">
              <div className="text-right">
                <p className="text-[16px] font-bold text-black leading-none mb-1">
                  ₹{item.price?.toLocaleString()}
                </p>
                <p className="text-[10px] font-medium text-black/30 uppercase tracking-tighter">
                  Lowest Price
                </p>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full bg-black text-white hover:bg-black/80 hover:text-white border-none shadow-md transition-transform active:scale-95"
                onClick={() => item.productUrl && window.open(item.productUrl, '_blank')}
              >
                <ExternalLink size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

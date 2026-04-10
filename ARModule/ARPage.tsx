import React, { useEffect, useState, Suspense } from "react";
const MultiARScene = React.lazy(() => import("./MultiARScene"));
import "./ar.css";
import ErrorBoundary from "./ErrorBoundary";
import { PRODUCTS } from "../data/mockData";

const ARPage: React.FC = () => {
  const [initialProductId, setInitialProductId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      setInitialProductId(id);
    }
  }, []);

  // Ensure we only attempt to render AR components in the browser
  if (typeof window === "undefined") return null;

  // Prepare model data for all products in the catalogue
  const modelData = PRODUCTS.map(p => ({
    id: p.id,
    name: p.name,
    url: p.model,
    texture: p.texture,
    image: p.image
  })).filter(m => m.url); // Only products with models

  const initialIndex = initialProductId 
    ? modelData.findIndex(m => m.id === initialProductId) 
    : 0;

  return (
    <div className="ar-page-container">
      <ErrorBoundary>
        <Suspense fallback={<div className="loading-ar">Loading AR Workspace...</div>}>
          <MultiARScene 
            modelData={modelData} 
            initialSelectedIndex={initialIndex >= 0 ? initialIndex : 0} 
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default ARPage;
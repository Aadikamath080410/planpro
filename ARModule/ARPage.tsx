import React, { useEffect, useState, Suspense } from "react";
const ARScene = React.lazy(() => import("./ARScene"));
import "./ar.css";
import ErrorBoundary from "./ErrorBoundary";
import { PRODUCTS } from "../data/mockData";
import { ArrowLeft } from "lucide-react";

interface ARPageProps {
  onBack?: () => void;
}

const ARPage: React.FC<ARPageProps> = ({ onBack }) => {
  // 1. Get the ID immediately before rendering (don't wait for useEffect)
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialProductId = params.get("id");

  if (typeof window === "undefined") return null;

  const modelData = PRODUCTS.map(p => ({
    id: p.id,
    name: p.name,
    url: p.model,
    image: p.image
  })).filter(m => m.url);

  // 2. Find index immediately
  const initialIndex = initialProductId 
    ? modelData.findIndex(m => String(m.id) === String(initialProductId)) 
    : 0;

  // 3. Debugging: If this is -1, the 'id' in the URL doesn't match your mockData
  console.log("URL ID:", initialProductId, "Matched Index:", initialIndex);

  return (
    <div className="ar-page-container relative">
      <ErrorBoundary>
        <Suspense fallback={<div className="loading-ar">Initializing Workspace...</div>}>
          <ARScene 
            modelData={modelData} 
            key={initialProductId} 
            initialSelectedIndex={initialIndex >= 0 ? initialIndex : 0} 
            onBack={onBack}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

export default ARPage;

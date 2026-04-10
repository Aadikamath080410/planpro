import React, { useEffect } from "react";

interface Props {
  model: string;
}

const ARScene: React.FC<Props> = ({ model }) => {

  useEffect(() => {
    import("@google/model-viewer/dist/model-viewer.min.js");
  }, []);

  if (!model) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        Loading 3D model...
      </div>
    );
  }

  return (
    <model-viewer
      src={model}
      ar
      ar-modes="webxr scene-viewer quick-look"
      ar-placement="floor"
      camera-controls
      auto-rotate
      shadow-intensity="1"
      style={{
        width: "100%",
        height: "80vh",
        background: "#eaeaea"
      }}
    >
      <button slot="ar-button">
        View in your room
      </button>
    </model-viewer>
  );
};

export default ARScene;
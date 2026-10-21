import React, { useState, Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { XR, ARButton, createXRStore, useXR, Interactive } from "@react-three/xr";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";


function Model({ url, position, index, draggable, onPointerDown, onPointerMove, onPointerUp, onLoadSize }: { url: string; position: THREE.Vector3; index?: number; draggable?: boolean; onPointerDown?: (e: any, i?: number)=>void; onPointerMove?: (e: any, i?: number)=>void; onPointerUp?: (e: any, i?: number)=>void; onLoadSize?: (i:number, size:THREE.Vector3)=>void }) {
  const ref = React.useRef<THREE.Group | null>(null);
  const reportedRef = React.useRef(false);

  // defensive read of the glTF result
  const gltf: any = useGLTF(url);
  const scene = gltf?.scene ?? (Array.isArray(gltf) ? gltf[0]?.scene : undefined);

  if (!scene) return null;

  // Ensure the loaded scene's internal position is reset so the wrapper group's position controls placement
  scene.position.set(0, 0, 0);

  // compute bounding box and report size once
  React.useEffect(() => {
    if (reportedRef.current) return;
    try {
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (onLoadSize && typeof index === 'number') {
        onLoadSize(index, size);
        reportedRef.current = true;
      }
    } catch (err) {
      // ignore errors measuring
    }
  }, [scene, index, onLoadSize]);

  return (
    <group
      ref={ref}
      position={position}
      onPointerDown={(e) => {
        if (!draggable) return;
        e.stopPropagation();
        // Attempt to capture pointer so move events continue
        try { (e.target as any)?.setPointerCapture?.(e.pointerId); } catch {}
        onPointerDown?.(e, index);
      }}
      onPointerMove={(e) => {
        if (!draggable) return;
        e.stopPropagation();
        onPointerMove?.(e, index);
      }}
      onPointerUp={(e) => {
        if (!draggable) return;
        e.stopPropagation();
        try { (e.target as any)?.releasePointerCapture?.(e.pointerId); } catch {}
        onPointerUp?.(e, index);
      }}
    >
      <primitive object={scene} scale={0.8} />
    </group>
  );
}

function Scene({ models, placed, selectedIndex, onDragStart, onDragMove, onDragEnd, onLoadSize, onPlaceAt }: { models: string[]; placed: { url: string; position: THREE.Vector3 }[]; selectedIndex: number; onDragStart: (i:number, e:any)=>void; onDragMove: (i:number, e:any)=>void; onDragEnd: (i:number, e:any)=>void; onLoadSize: (i:number, size:THREE.Vector3)=>void; onPlaceAt: (pos:THREE.Vector3)=>void }) {
  const preview = placed.length === 0 && models && models.length > 0;
  const { gl } = useThree();
  const { session } = useXR();

  // Setup hit-test based dragging when an XR session is active
  React.useEffect(() => {
    if (!gl || !gl.xr) return;
    const xrSession = gl.xr.getSession();
    if (!xrSession) return;

    let hitTestSource: any = null;
    let refSpace: any = null;
    let viewerSpace: any = null;

    let mounted = true;

    Promise.all([
      xrSession.requestReferenceSpace('viewer').then((s:any) => { viewerSpace = s; return viewerSpace; }),
      xrSession.requestReferenceSpace('local').then((s:any) => { refSpace = s; return refSpace; })
    ]).then(() => {
      if (!mounted) return;
      if (viewerSpace) {
        xrSession.requestHitTestSource({ space: viewerSpace }).then((src:any) => { hitTestSource = src; }).catch(() => {});
      }
    }).catch(() => {});

    const onSelectStart = (ev: any) => {
      try {
        const frame = ev.frame as XRFrame;
        if (!frame || !hitTestSource || !refSpace) return;
        const results = frame.getHitTestResults(hitTestSource);
        if (results.length > 0) {
          const pose = results[0].getPose(refSpace);
          if (pose) {
            const pos = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
            // choose nearest placed object
            let minDist = Infinity; let nearest = -1;
            placed.forEach((p, idx) => {
              const d = p.position.distanceTo(pos);
              if (d < minDist) { minDist = d; nearest = idx; }
            });
            const selectionThreshold = 0.8; // meters
            if (nearest !== -1 && minDist < selectionThreshold) {
              // start dragging the nearest object
              onDragStart(nearest, { point: pos });
            } else {
              // not near an existing object => place selected model at hit position
              onPlaceAt(pos);
            }
          }
        }
      } catch (err) {
        // ignore
      }
    };

    xrSession.addEventListener('selectstart', onSelectStart);
    const onSelectEnd = (ev: any) => {
      try {
        // simply end any drag in parent by calling onDragEnd with nearest index
        const frame = ev.frame as XRFrame;
        if (!frame || !hitTestSource || !refSpace) return;
        const results = frame.getHitTestResults(hitTestSource);
        if (results.length > 0) {
          const pose = results[0].getPose(refSpace);
          if (pose) {
            const pos = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
            let minDist = Infinity; let nearest = -1;
            placed.forEach((p, idx) => {
              const d = p.position.distanceTo(pos);
              if (d < minDist) { minDist = d; nearest = idx; }
            });
            if (nearest !== -1) onDragEnd(nearest, {});
          }
        }
      } catch (err) {}
    };
    xrSession.addEventListener('selectend', onSelectEnd);

    let rafHandle: any = null;
    const onXRFrame = (time: any, xrFrame: XRFrame) => {
      try {
        // if any object is being dragged, update its position from hit test
        // find dragging index by comparing last known placed positions (we use parent state via closure)
        // We will search for an object where onDragStart was called earlier by parent stored draggingIndex; parent maintains draggingIndex state
        // Instead of reading parent's draggingIndex directly, call get placed and compute if any object was marked as moving by proximity.
        // Simpler: always perform hit test and if a dragging index exists in parent (we detect via placed array changes), parent has set draggingIndex via onDragStart
        // We'll rely on onDragStart having been called to set draggingIndex in parent; here we'll call hitTest and if parent has an active drag (we detect via comparing previous placed vs current?), to keep code simple we'll always update all placed positions for which distance to hit point is < 2 and let parent handle index match.
        if (!xrFrame || !hitTestSource || !refSpace) {
          xrSession.requestAnimationFrame(onXRFrame);
          return;
        }

        const results = xrFrame.getHitTestResults(hitTestSource);
        if (results.length > 0) {
          const pose = results[0].getPose(refSpace);
          if (pose) {
            const pos = new THREE.Vector3(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
            // call onDragMove for any placed object that is currently closest to the camera pointer
            // find nearest placed object to this hit point within threshold and call onDragMove
            let minDist = Infinity; let nearest = -1;
            placed.forEach((p, idx) => {
              const d = p.position.distanceTo(pos);
              if (d < minDist) { minDist = d; nearest = idx; }
            });
            if (nearest !== -1 && minDist < 2.0) {
              onDragMove(nearest, { point: pos });
            }
          }
        }
      } catch (err) {
        // ignore per-frame errors
      }
      rafHandle = xrSession.requestAnimationFrame(onXRFrame);
    };

    rafHandle = xrSession.requestAnimationFrame(onXRFrame);

    return () => {
      mounted = false;
      try { xrSession.removeEventListener('selectstart', onSelectStart); } catch {}
      try { xrSession.removeEventListener('selectend', onSelectEnd); } catch {}
      try { if (hitTestSource) hitTestSource.cancel(); } catch {}
      try { if (rafHandle) xrSession.cancelAnimationFrame?.(rafHandle); } catch {}
    };
  }, [gl, placed, onDragStart, onDragMove, onPlaceAt]);

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} />

      {preview && (
        // If multiple models are available, show a side-by-side preview
        models.length > 1 ? (
          models.map((m, i) => {
            const center = (models.length - 1) / 2;
            const spacing = 0.6;
            const x = (i - center) * spacing;
            return <Model key={m} url={m} index={i} onLoadSize={onLoadSize} position={new THREE.Vector3(x, 0, 0)} />;
          })
        ) : (
          <Model url={models[selectedIndex]} index={selectedIndex} onLoadSize={onLoadSize} position={new THREE.Vector3(0, 0, 0)} />
        )
      )}

      {placed.map((obj, i) => {
        const modelIndex = models.indexOf(obj.url);
        return (
          <Model key={`placed-${i}`} url={obj.url} position={obj.position} index={modelIndex >= 0 ? modelIndex : undefined} draggable={true} onLoadSize={onLoadSize} onPointerDown={(e:any, idx?:number)=>onDragStart(i, e)} onPointerMove={(e:any, idx?:number)=>onDragMove(i, e)} onPointerUp={(e:any, idx?:number)=>onDragEnd(i, e)} />
        );
      })}
    </>
  );
}

export default function MultiARScene({ modelData, initialSelectedIndex = 0 }: { modelData: any[]; initialSelectedIndex?: number }) {

  const models = modelData.map(m => m.url);

  // debug log for incoming models
  // eslint-disable-next-line no-console
  console.log("MultiARScene active:", modelData.length, "models");

  const [placed, setPlaced] = useState<{ url: string; position: THREE.Vector3 }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [sizes, setSizes] = useState<(THREE.Vector3 | null)[]>(() => models.map(() => null));

  const [xrPresent, setXrPresent] = useState<boolean | null>(null);
  const [xrSupported, setXrSupported] = useState<boolean | null>(null);
  const [secureContext, setSecureContext] = useState<boolean>(false);
  const [arStatus, setArStatus] = useState<'none' | 'scanning' | 'locked'>('none');

  // create a single XR store instance
  const store = createXRStore();

  const tryEnterAR = async () => {
    console.log('Attempting to enter AR...');
    try {
      if ((store as any)?.enterAR) {
        (store as any).enterAR();
        return;
      }
      const xr = (navigator as any).xr;
      if (xr && xr.requestSession) {
        await xr.requestSession('immersive-ar', { requiredFeatures: ['local-floor', 'hit-test'] });
      }
    } catch (err) {
      console.error('Error entering AR:', err);
    }
  };

  // reset sizes when models list changes
  useEffect(() => {
    setSizes(models.map(() => null));
  }, [models]);

  useEffect(() => {
    if (initialSelectedIndex < modelData.length) {
      setSelectedIndex(initialSelectedIndex);
    }
  }, [initialSelectedIndex, modelData.length]);

  const onLoadSize = (index: number, size: THREE.Vector3) => {
    setSizes(prev => {
      const copy = prev.slice();
      copy[index] = size;
      return copy;
    });
  };

  const handlePlaceAt = (pos: THREE.Vector3) => {
    const model = models[selectedIndex];
    setPlaced(prev => [...prev, { url: model, position: pos.clone() }]);
    setArStatus('locked');
  };

  const rescanFloor = () => {
     setPlaced([]);
     setArStatus('scanning');
  };

  useEffect(() => {
    const hasXr = typeof navigator !== "undefined" && "xr" in navigator;
    setXrPresent(hasXr);
    setSecureContext(typeof window !== "undefined" && !!window.isSecureContext);

    if (hasXr && (navigator as any).xr && (navigator as any).xr.isSessionSupported) {
      (navigator as any).xr.isSessionSupported("immersive-ar").then((supported: boolean) => {
        setXrSupported(supported);
      }).catch((err: any) => {
        console.warn("isSessionSupported error:", err);
        setXrSupported(false);
      });
    } else {
      setXrSupported(false);
    }
  }, []);

  if (xrPresent === false) {
    return (
      <div className="ar-error-notice">
        <h3>WebXR Not Detected</h3>
        <p>Please open this page on a modern mobile device (Android with Chrome or iOS with WebXR viewer) to use AR features.</p>
      </div>
    );
  }

  if (xrSupported === false) {
    return (
      <div className="ar-error-notice">
        <h3>AR Not Supported</h3>
        <p>Your device/browser does not support 'immersive-ar' sessions.</p>
        {!secureContext && <p className="secure-warn">Note: AR requires a secure HTTPS connection.</p>}
      </div>
    );
  }

  const handlePlace = () => {
    const margin = 0.15;
    const defaultWidth = 0.8;

    const getWidthForUrl = (url: string) => {
      const idx = models.indexOf(url);
      if (idx === -1) return defaultWidth;
      const s = sizes[idx];
      return s ? Math.max(0.1, s.x) : defaultWidth;
    };

    const model = models[selectedIndex];
    let maxRight = -Infinity;
    for (const p of placed) {
      const w = getWidthForUrl(p.url);
      const right = p.position.x + w / 2;
      if (right > maxRight) maxRight = right;
    }

    const newWidth = getWidthForUrl(model);
    const x = (maxRight === -Infinity) ? 0 : (maxRight + newWidth / 2 + margin);
    const pos = new THREE.Vector3(x, 0, -1.2);
    setPlaced((prev) => [...prev, { url: model, position: pos }]);
  };

  const onDragStart = (i: number, e: any) => {
    setDraggingIndex(i);
  };

  const onDragMove = (i: number, e: any) => {
    if (draggingIndex !== i) return;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    if (e.ray) {
      e.ray.intersectPlane(plane, point);
      if (point) {
        setPlaced(prev => prev.map((p, idx) => idx === i ? { ...p, position: point.clone() } : p));
      }
    }
  };

  const onDragEnd = (i: number, e: any) => {
    setDraggingIndex(null);
  };

  return (
    <div className="ar-workspace" style={{ width: "100vw", height: "100vh", position: 'relative', background: '#f8f9fa' }}>
      
      {/* Top HUD */}
      <div className="ar-hud-top" style={{ position: 'absolute', top: 20, left: 20, right: 20, zIndex: 3000, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
        <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto' }}>
            <button
                onClick={handlePlace}
                className="ar-btn-primary"
                style={{
                  padding: "12px 24px",
                  background: "rgba(0,0,0,0.85)",
                  color: "white",
                  borderRadius: "30px",
                  border: 'none',
                  fontWeight: 600,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                  cursor: 'pointer'
                }}
            >
                ✨ PLACE OBJECT
            </button>
            {placed.length > 0 && (
                <button
                    onClick={() => setPlaced([])}
                    className="ar-btn-secondary"
                    style={{
                      padding: "12px 18px",
                      background: "rgba(255,255,255,0.9)",
                      color: "#333",
                      borderRadius: "30px",
                      border: 'none',
                      fontWeight: 600,
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                      cursor: 'pointer'
                    }}
                >
                    RESET
                </button>
            )}
        </div>

        <div style={{ pointerEvents: 'auto' }}>
            {xrSupported && secureContext && (
                <div className="xr-btn-container">
                    <ARButton store={store} />
                </div>
            )}
        </div>
      </div>

      {/* Status Overlay */}
      {arStatus === 'scanning' && (
          <div style={{ position: 'fixed', top: '25%', width: '100%', textAlign: 'center', zIndex: 2500, pointerEvents: 'none' }}>
              <p style={{ background: 'rgba(0,0,0,0.7)', color: 'white', display: 'inline-block', padding: '10px 20px', borderRadius: '20px', fontSize: '14px' }}>
                  Scanning floor... move phone slowly.
              </p>
          </div>
      )}

      {/* Rescan Button (Floating Top Right in AR) */}
      {secureContext && xrSupported && (
          <button 
            onClick={rescanFloor} 
            style={{ position: 'fixed', top: 80, right: 20, zIndex: 3000, padding: '10px 15px', borderRadius: '8px', background: 'rgba(255,255,255,0.8)', border: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 5 }}
          >
              🔄 RESCAN
          </button>
      )}

      {/* Catalogue Slider */}
      <div 
        className="ar-catalogue-slider"
        style={{ 
            position: 'fixed', 
            left: 0, 
            right: 0, 
            bottom: 40, 
            zIndex: 3000, 
            padding: '15px 10px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
            pointerEvents: 'auto'
        }}
      >
        <div className="slider-track" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
          {modelData.map((m, i) => {
            const active = i === selectedIndex;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedIndex(i)}
                className={`ar-catalogue-item ${active ? 'active' : ''}`}
                style={{
                  minWidth: 80,
                  height: 80,
                  borderRadius: 18,
                  background: active ? '#fff' : 'rgba(255,255,255,0.2)',
                  border: active ? '3px solid #3b82f6' : '3px solid white',
                  cursor: 'pointer',
                  backgroundImage: `url(${m.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  boxShadow: active ? '0 8px 25px rgba(59,130,246,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                  flexShrink: 0
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Main 3D Canvas */}
      <Canvas 
        shadows
        camera={{ position: [0, 1.2, 2.5], fov: 45 }} 
        style={{ touchAction: 'none', background: '#f0f2f5' } as React.CSSProperties}
      >
        <XR store={store}>
          <Suspense fallback={null}>
            <Scene 
                models={models} 
                placed={placed} 
                selectedIndex={selectedIndex} 
                onDragStart={onDragStart} 
                onDragMove={onDragMove} 
                onDragEnd={onDragEnd} 
                onLoadSize={onLoadSize} 
                onPlaceAt={handlePlaceAt} 
            />
          </Suspense>
        </XR>
        <OrbitControls 
            enableRotate={draggingIndex === null} 
            enablePan={draggingIndex === null} 
            enableZoom={draggingIndex === null} 
            makeDefault 
        />
        <gridHelper args={[10, 20, 0xcccccc, 0xeeeeee]} position={[0, -0.01, 0]} />
        
      </Canvas>
    </div>
  );
}

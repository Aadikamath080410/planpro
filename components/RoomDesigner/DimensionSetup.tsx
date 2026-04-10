import React, { useState, useMemo, useEffect } from 'react';
import { toFeetInches, toMeters, formatArea } from '../../services/UnitUtils';
import { calculateRoomArea } from './RoomMath';
import { RoomData } from '../../types';
import './customized.css';

interface DimensionSetupProps {
    data: RoomData;
    onUpdate: (data: Partial<RoomData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function DimensionSetup({ data, onUpdate, onNext, onBack }: DimensionSetupProps) {
    const [activeWall, setActiveWall] = useState<string | null>(null);
    const useMetric = data.units !== 'FEET';

    const setUseMetric = (isMetric: boolean) => {
        onUpdate({ units: isMetric ? 'METERS' : 'FEET' });
    };

    // Initialize default dimensions if they are missing
    useEffect(() => {
        if (!data.dimensions?.notchL || !data.dimensions?.notchW) {
            onUpdate({
                dimensions: {
                    length: data.dimensions?.length || 6,
                    width: data.dimensions?.width || 4,
                    ceilingHeight: data.dimensions?.ceilingHeight || 3,
                    notchL: 2,
                    notchW: 2
                }
            });
        }
    }, [data.dimensions, onUpdate]);

    const handleUpdate = (key: string, value: number) => {
        onUpdate({ 
            ...data, 
            dimensions: { ...data.dimensions, [key]: parseFloat(value.toString()) || 0 } 
        });
    };

    const labels = useMemo(() => {
        if (data.shape === 'L_SHAPE') return { nL: "Recess Length", nW: "Recess Width" };
        if (data.shape === 'T_SHAPE') return { nL: "Top Bar Height", nW: "Stem Width" };
        return { nL: "Notch L", nW: "Notch W" };
    }, [data.shape]);

    // Helper to determine if we show notch inputs
    const showNotches = data.shape === 'L_SHAPE' || data.shape === 'T_SHAPE';

    return (
        <div className="setup-container">
            <div className="setup-card">
                <h2>Step 2: Define Dimensions</h2>

                <div className="setup-layout">
                    <div className="inputs-section">
                        <div className="unit-toggle">
                            <button className={useMetric ? 'active' : ''} onClick={() => setUseMetric(true)}>Metric (m)</button>
                            <button className={!useMetric ? 'active' : ''} onClick={() => setUseMetric(false)}>Imperial (ft/in)</button>
                        </div>

                        <div className="inputs-grid">
                            <DimensionInput
                                label="Total Length"
                                val={data.dimensions?.length || 0}
                                isMetric={useMetric}
                                onUpdate={(v) => handleUpdate('length', v)}
                                onHover={() => setActiveWall('length')}
                            />

                            {/* Only show Total Width if it's NOT a regular Hexagon */}
                            {data.shape !== 'HEXAGON' && (
                                <DimensionInput
                                    label="Total Width"
                                    val={data.dimensions?.width || 0}
                                    isMetric={useMetric}
                                    onUpdate={(v) => handleUpdate('width', v)}
                                    onHover={() => setActiveWall('width')}
                                />
                            )}

                            <DimensionInput
                                label="Ceiling Height"
                                val={data.dimensions?.ceilingHeight || 0}
                                isMetric={useMetric}
                                onUpdate={(v) => handleUpdate('ceilingHeight', v)}
                                onHover={() => setActiveWall('none')}
                            />

                            {/* Show Notches ONLY for L and T shapes */}
                            {showNotches && (
                                <>
                                    <DimensionInput
                                        label={labels.nL}
                                        val={data.dimensions?.notchL || 0}
                                        isMetric={useMetric}
                                        onUpdate={(v) => handleUpdate('notchL', v)}
                                        onHover={() => setActiveWall('notchL')}
                                    />
                                    <DimensionInput
                                        label={labels.nW}
                                        val={data.dimensions?.notchW || 0}
                                        isMetric={useMetric}
                                        onUpdate={(v) => handleUpdate('notchW', v)}
                                        onHover={() => setActiveWall('notchW')}
                                    />
                                </>
                            )}
                        </div>

                        <div className="setup-actions">
                            <button className="btn-secondary" onClick={onBack}>Back</button>
                            <button className="btn-primary" onClick={onNext}>Next: Place Openings</button>
                        </div>
                    </div>

                    <div className="preview-section-container">
                        <div className="carpet-area-badge setup-badge">
                            <span className="label">Carpet Area</span>
                            <span className="value">{formatArea(calculateRoomArea(data), useMetric ? 'METRIC' : 'IMPERIAL')}</span>
                        </div>
                        <div className="preview-section">
                            <ShapePreview
                                shape={data.shape}
                                dims={data.dimensions || {}}
                                activeWall={activeWall}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface DimensionInputProps {
    label: string;
    val: number;
    isMetric: boolean;
    onUpdate: (v: number) => void;
    onHover: () => void;
}

function DimensionInput({ label, val, isMetric, onUpdate, onHover }: DimensionInputProps) {
    const { feet, inches } = toFeetInches(val || 0);

    const handleMetricChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = parseFloat(e.target.value);
        if (value < 0) value = 0;
        if (value > 30) value = 30; // reasonable max for a room
        onUpdate(value || 0);
    };

    const handleImperialChange = (f: number | string, i: number | string) => {
        let fVal = parseFloat(f.toString()) || 0;
        let iVal = parseFloat(i.toString()) || 0;
        if (fVal < 0) fVal = 0;
        if (iVal < 0) iVal = 0;
        if (iVal > 11) iVal = 11; // inches max at 11
        onUpdate(toMeters(fVal, iVal));
    };

    return (
        <div className="input-group" onMouseEnter={onHover} onMouseLeave={() => {}}>
            <label>{label}</label>
            <div className="input-with-unit">
                {isMetric ? (
                    <div className="unit-wrapper">
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="30"
                            value={val}
                            onChange={handleMetricChange}
                        />
                        <span className="unit-label">m</span>
                    </div>
                ) : (
                    <div className="imperial-inputs">
                        <div className="unit-wrapper">
                            <input
                                type="number"
                                placeholder="ft"
                                min="0"
                                value={feet}
                                onChange={(e) => handleImperialChange(e.target.value, inches)}
                            />
                            <span className="unit-label">ft</span>
                        </div>
                        <div className="unit-wrapper">
                            <input
                                type="number"
                                placeholder="in"
                                min="0"
                                max="11"
                                value={inches}
                                onChange={(e) => handleImperialChange(feet, e.target.value)}
                            />
                            <span className="unit-label">in</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ShapePreview({ shape, dims, activeWall }: { shape: string, dims: any, activeWall: string | null }) {
    const { length: L = 6, width: W = 6, notchL = 2, notchW = 2 } = dims || {};
    const centerX = 50;
    const centerY = 50;
    const size = 35; 

    const getPoints = () => {
        if (shape === 'SQUARE') {
            return [
                { x: centerX - size, y: centerY - size, id: 'length' },
                { x: centerX + size, y: centerY - size, id: 'width' },
                { x: centerX + size, y: centerY + size, id: 'length' },
                { x: centerX - size, y: centerY + size, id: 'width' }
            ];
        }
        if (shape === 'L_SHAPE') {
            const nL = (notchL / (L || 1)) * (size * 2);
            const nW = (notchW / (W || 1)) * (size * 2);
            return [
                { x: centerX - size, y: centerY - size, id: 'length' },
                { x: centerX + size, y: centerY - size, id: 'width' },
                { x: centerX + size, y: centerY + size - nW, id: 'notchL' }, // Changed to notchL
                { x: centerX + size - nL, y: centerY + size - nW, id: 'notchW' }, // Changed to notchW
                { x: centerX + size - nL, y: centerY + size, id: 'length' }, 
                { x: centerX - size, y: centerY + size, id: 'width' }  // Changed from length to width (Left Vertical)
            ];
        }
        if (shape === 'T_SHAPE') {
            const headH = (notchL / (W || 1)) * (size * 2);
            const stemW = (notchW / (L || 1)) * (size * 2);
            const halfStem = stemW / 2;

            return [
                { x: centerX - halfStem, y: centerY + size, id: 'notchW' }, // Bottom Stem -> Stem Width
                { x: centerX + halfStem, y: centerY + size, id: 'width' },  // Stem Right Vertical -> Total Width
                { x: centerX + halfStem, y: centerY - size + headH, id: 'length' }, // Top Bar Under-side Right -> Total Length
                { x: centerX + size, y: centerY - size + headH, id: 'notchL' },     // Top Bar End Cap Right -> Top Bar Height
                { x: centerX + size, y: centerY - size, id: 'length' },            // Top Edge -> Total Length
                { x: centerX - size, y: centerY - size, id: 'notchL' },            // Top Bar End Cap Left -> Top Bar Height
                { x: centerX - size, y: centerY - size + headH, id: 'length' },    // Top Bar Under-side Left -> Total Length
                { x: centerX - halfStem, y: centerY - size + headH, id: 'width' }  // Stem Left Vertical -> Total Width
            ];
        }
        if (shape === 'HEXAGON') {
            const pts = [];
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
                pts.push({
                    x: centerX + Math.cos(angle) * size,
                    y: centerY + Math.sin(angle) * size,
                    id: 'length'
                });
            }
            return pts;
        }
        return [];
    };

    const pts = getPoints();

    return (
        <svg viewBox="0 0 100 100" className="shape-svg">
            <polygon
                points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                fill="#f8fafc"
                stroke="#cbd5e1"
                strokeWidth="1"
            />
            {pts.map((p, i) => {
                const nextP = pts[(i + 1) % pts.length];
                const isHighlit = activeWall === p.id;
                return (
                    <line
                        key={i}
                        x1={p.x} y1={p.y} x2={nextP.x} y2={nextP.y}
                        stroke={isHighlit ? "#3b82f6" : "#475569"}
                        strokeWidth={isHighlit ? "3" : "1.5"}
                    />
                );
            })}
        </svg>
    );
}

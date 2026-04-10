import React, { useState } from 'react';
import './customized.css'; 
import DesignerRoom from '../DesignerRoom'; 
import { calculateRoomArea } from './RoomMath';
import { formatArea } from '../../services/UnitUtils';
import { RoomData, RoomOpening } from '../../types';

interface OpeningsSetupProps {
    data: RoomData;
    onUpdate: (data: Partial<RoomData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function OpeningsSetup({ data, onUpdate, onNext, onBack }: OpeningsSetupProps) {
    const { openings = [] } = data;
    const [selectedType, setSelectedType] = useState<'DOOR' | 'WINDOW'>('DOOR');

    const handleWallClick = (index: number) => {
        if (selectedType === 'DOOR' && (openings || []).some(o => o.type === 'DOOR')) {
            alert("Only one door is allowed per room.");
            return;
        }

        const remainingOpenings = (openings || []).filter(o => o.wallIndex !== index);

        const newOpening: RoomOpening = {
            id: Date.now().toString(),
            type: selectedType,
            wallIndex: index,
            offset: 0.5
        };

        onUpdate({ openings: [...remainingOpenings, newOpening] });
    };

    const updateOffset = (id: string, val: string) => {
        const updated = (openings || []).map(o => o.id === id ? { ...o, offset: parseFloat(val) } : o);
        onUpdate({ openings: updated });
    };

    const removeOpening = (id: string) => {
        onUpdate({ openings: (openings || []).filter(o => o.id !== id) });
    };

    // Shared openings list renderer
    const renderOpeningsList = () => (
        <>
            <h3>Adjust Positions</h3>
            {(!openings || openings.length === 0) && <p className="hint-text">No openings placed yet.</p>}
            {(openings || []).map(o => (
                <div key={o.id} className="offset-control">
                    <div className="offset-label">
                        <span>{o.type === 'WINDOW' ? '🪟 WIN' : '🚪 DOOR'} (W{o.wallIndex + 1})</span>
                        <button className="offset-remove-btn" onClick={() => removeOpening(o.id || '')}>×</button>
                    </div>
                    <input
                        type="range" min="0.1" max="0.9" step="0.01"
                        value={o.offset}
                        className="offset-slider"
                        onChange={(e) => updateOffset(o.id || '', e.target.value)}
                    />
                </div>
            ))}
        </>
    );

    return (
        <div className="setup-container">
            <div className="setup-card">
                <div className="setup-header">
                    <h2>Step 3: Door & Window Placement</h2>
                    <p className="hint-text">Click a wall in the 3D view to place an opening. Use sliders to adjust position.</p>
                </div>

                <div className="openings-interface">
                    {/* Left panel: tools + openings list (desktop only shows list here) */}
                    <div className="opening-tools">
                        <div className="tool-selector">
                            <button
                                className={`tool-btn ${selectedType === 'DOOR' ? 'active-door' : ''}`}
                                onClick={() => setSelectedType('DOOR')}
                            >
                                🚪 Add Door
                            </button>
                            <button
                                className={`tool-btn ${selectedType === 'WINDOW' ? 'active-win' : ''}`}
                                onClick={() => setSelectedType('WINDOW')}
                            >
                                🪟 Add Window
                            </button>
                        </div>

                        {/* Desktop: openings list visible here */}
                        <div className="placed-list openings-scroll-list desktop-only-list">
                            {renderOpeningsList()}
                        </div>
                    </div>

                    {/* Right panel / Mobile: 3D Canvas preview */}
                    <div className="preview-section-container openings-preview">
                        <div className="carpet-area-badge setup-badge">
                            <span className="label">Carpet Area</span>
                            <span className="value">{formatArea(calculateRoomArea(data), (data as any).units === 'METERS' ? 'METRIC' : 'IMPERIAL')}</span>
                        </div>
                        <div className="map-container" style={{ 
                            background: '#111', 
                            overflow: 'hidden',
                            width: '100%',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                        }}>
                            <DesignerRoom
                                roomData={data}
                                items={[]}
                                setItems={() => {}}
                                isPlacementMode={true}
                                onWallClick={handleWallClick}
                                viewMode="3D"
                            />
                        </div>
                    </div>

                    {/* Mobile: openings list shown AFTER canvas, scrollable */}
                    <div className="mobile-only-list openings-scroll-list">
                        {renderOpeningsList()}
                    </div>
                </div>

                {/* Buttons BELOW the canvas */}
                <div className="setup-actions">
                    <button className="btn-secondary" onClick={onBack}>Back</button>
                    <button className="btn-primary" onClick={onNext}>Finalize Design</button>
                </div>
            </div>
        </div>
    );
}

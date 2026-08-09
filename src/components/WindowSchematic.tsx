"use strict";

import React from 'react';

interface WindowSchematicProps {
    trackType: "2-track" | "3-track" | "openable" | string;
    configuration: "all-glass" | "glass-mosquito" | string;
    sections?: number;
    className?: string;
}

export default function WindowSchematic({ trackType, configuration, sections = 2, className = "" }: WindowSchematicProps) {
    // Canvas Logic
    const width = 400;
    const height = 300;
    const padding = 20;

    // Frame Dimensions
    const frameW = width - (padding * 2);
    const frameH = height - (padding * 2);

    // Track Logic
    // 2-track = 2 rails
    // 3-track = 3 rails
    const numTracks = trackType === "3-track" ? 3 : (trackType === "openable" ? 1 : 2);

    let panels = [];

    if (trackType === "openable") {
        const n = Math.max(1, sections);
        const wRatio = 1 / n;
        for (let i = 0; i < n; i++) {
            // If configuration is "glass-mosquito", visually show alternate or just glass if it's identical identical pieces (user said calculations are identical). We will just color them as glass for schematic simplicity or mixed.
            // Let's just draw them as side-by-side openable shutters.
            panels.push({ type: 'openable', track: 0, offset: i * wRatio, widthRatio: wRatio });
        }
    } else if (trackType === "2-track") {
        if (configuration === "all-glass") {
            panels = [
                { type: 'glass', track: 0, offset: 0, widthRatio: 0.52 }, // Left 
                { type: 'glass', track: 1, offset: 0.48, widthRatio: 0.52 } // Right
            ];
        } else {
            panels = [
                { type: 'glass', track: 0, offset: 0, widthRatio: 0.52 },
                { type: 'mosquito', track: 1, offset: 0.48, widthRatio: 0.52 }
            ];
        }
    } else {
        // 3-track
        if (configuration === "all-glass") {
            panels = [
                { type: 'glass', track: 0, offset: 0, widthRatio: 0.35 },
                { type: 'glass', track: 1, offset: 0.32, widthRatio: 0.35 },
                { type: 'glass', track: 2, offset: 0.64, widthRatio: 0.36 }
            ];
        } else {
            // A 3-track glass+mosquito window has 3 rails, but only 2 glass
            // openings are visible from outside, each ~50% width — the mosquito
            // shutter rides the innermost rail and sits BEHIND one of the glass
            // shutters when closed. It's drawn as an overlapping layer below,
            // not a third full-width panel.
            panels = [
                { type: 'glass', track: 1, offset: 0, widthRatio: 0.52 },
                { type: 'glass', track: 2, offset: 0.48, widthRatio: 0.52 }
            ];
        }
    }

    const hasMosquitoOverlay = trackType === "3-track" && configuration === "glass-mosquito";

    const trackHeight = frameH / numTracks;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className={`w-full h-auto bg-slate-50 border border-slate-200 rounded ${className}`}>
            {/* Definitions for patterns */}
            <defs>
                <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                    <rect width="4" height="8" transform="translate(0,0)" fill="#e2e8f0" opacity="0.5" />
                </pattern>
                <pattern id="meshPattern" patternUnits="userSpaceOnUse" width="6" height="6">
                    <path d="M 0 6 L 6 0 M -1 1 L 1 -1 M 5 7 L 7 5" stroke="#64748b" strokeWidth="0.5" />
                </pattern>
                <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#eff6ff" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.4" />
                </linearGradient>
            </defs>

            {/* Main Outer Frame */}
            <rect
                x={padding}
                y={padding}
                width={frameW}
                height={frameH}
                fill="none"
                stroke="#334155"
                strokeWidth="4"
                rx="2"
            />

            {/* Tracks (Horizontal Lines top/bottom) */}
            {Array.from({ length: numTracks }).map((_, i) => (
                <g key={`track-${i}`}>
                    {/* Top Track Line */}
                    <line
                        x1={padding}
                        y1={padding + (i * 4) + 4}
                        x2={width - padding}
                        y2={padding + (i * 4) + 4}
                        stroke="#94a3b8"
                        strokeWidth="1"
                    />
                    {/* Bottom Track Line */}
                    <line
                        x1={padding}
                        y1={height - padding - (i * 4) - 4}
                        x2={width - padding}
                        y2={height - padding - (i * 4) - 4}
                        stroke="#94a3b8"
                        strokeWidth="1"
                    />
                </g>
            ))}

            {/* Mosquito net track — sits behind the first glass panel on a 3-track
                glass+mosquito window. Drawn slightly larger so a mesh-patterned
                edge peeks out around the glass panel drawn on top of it. */}
            {hasMosquitoOverlay && (() => {
                const panelY = padding + 6;
                const panelH = frameH - 12;
                const panelX = padding + (frameW * 0);
                const panelW = frameW * 0.52;
                const inset = 6;
                return (
                    <g>
                        <rect
                            x={panelX - inset}
                            y={panelY - inset}
                            width={panelW + inset * 2}
                            height={panelH + inset * 2}
                            fill="url(#meshPattern)"
                            stroke="#475569"
                            strokeWidth="2"
                            strokeDasharray="4 3"
                            rx="1"
                            opacity="0.9"
                        />
                        <text
                            x={panelX - inset + 8}
                            y={panelY - inset + 14}
                            fontSize="9"
                            fill="#475569"
                            fontWeight="bold"
                            opacity="0.9"
                        >
                            MESH (behind)
                        </text>
                    </g>
                );
            })()}

            {/* Panels (Shutters) */}
            {panels.map((panel, idx) => {
                const isOpenableSystem = trackType === "openable";
                // If openable, don't overlap, distribute evenly. Give 2px gap for mullion styling
                const overlapFactor = isOpenableSystem ? 0 : 0.04;
                
                const panelW = isOpenableSystem 
                    ? (frameW / sections) - 2
                    : frameW * panel.widthRatio;
                    
                const panelX = isOpenableSystem 
                    ? padding + (idx * (frameW / sections)) + 1
                    : padding + (frameW * panel.offset);
                
                const panelY = padding + 6; // Inside frame
                const panelH = frameH - 12;

                const isMosquito = panel.type === 'mosquito';

                return (
                    <g key={`panel-${idx}`}>
                        <rect
                            x={panelX}
                            y={panelY}
                            width={panelW}
                            height={panelH}
                            fill={isMosquito ? "url(#meshPattern)" : "url(#glassGradient)"}
                            stroke={isMosquito ? "#475569" : "#3b82f6"}
                            strokeWidth="2"
                            rx="1"
                        />
                        {/* Frame for the shutter */}
                        <rect
                            x={panelX + 4}
                            y={panelY + 4}
                            width={panelW - 8}
                            height={panelH - 8}
                            fill="none"
                            stroke={isMosquito ? "#cbd5e1" : "#bfdbfe"}
                            strokeWidth="1"
                            opacity="0.5"
                        />
                        {/* Direction/Hinge Symbol */}
                        {!isOpenableSystem ? (
                            <path
                                d={`M ${panelX + panelW - 20} ${panelY + panelH / 2} l -6 -4 v 8 z`}
                                fill={isMosquito ? "#64748b" : "#60a5fa"}
                                opacity="0.6"
                            />
                        ) : (
                            <path 
                                d={`M ${panelX + 4} ${panelY + 4} L ${panelX + panelW - 4} ${panelY + panelH / 2} L ${panelX + 4} ${panelY + panelH - 4}`}
                                fill="none"
                                stroke="#94a3b8" 
                                strokeWidth="1"
                                strokeDasharray="3 3"
                                opacity="0.6"
                            />
                        )}
                        {/* Config Label */}
                        <text
                            x={panelX + (panelW / 2)}
                            y={panelY + panelH - 10}
                            textAnchor="middle"
                            fontSize="10"
                            fill={isMosquito ? "#475569" : "#3b82f6"}
                            fontWeight="bold"
                            opacity="0.8"
                        >
                            {isOpenableSystem && configuration === "glass-mosquito" ? "G+M" : (isMosquito ? "MESH" : "GLASS")}
                        </text>
                    </g>
                );
            })}

            {/* Dimensions Label (Placeholders) */}
            <text x={width / 2} y={height + 15} textAnchor="middle" fontSize="12" fill="#64748b">Width</text>
            <text x={10} y={height / 2} textAnchor="middle" writingMode="tb" fontSize="12" fill="#64748b">Height</text>

        </svg>
    );
}

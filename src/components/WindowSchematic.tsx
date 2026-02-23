"use strict";

import React from 'react';

interface WindowSchematicProps {
    trackType: "2-track" | "3-track";
    configuration: "all-glass" | "glass-mosquito";
    className?: string;
}

export default function WindowSchematic({ trackType, configuration, className = "" }: WindowSchematicProps) {
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
    const numTracks = trackType === "3-track" ? 3 : 2;

    // Panel Logic
    // 2-track All Glass -> 2 Glass Panels
    // 2-track Glass+Mosq -> 1 Glass + 1 Mosq (Technically 2 panels usually)
    // 3-track All Glass -> 3 Glass Panels
    // 3-track Glass+Mosq -> 2 Glass + 1 Mosq

    let panels = [];

    if (trackType === "2-track") {
        if (configuration === "all-glass") {
            // 2 Glass Panels
            panels = [
                { type: 'glass', track: 0, offset: 0, widthRatio: 0.52 }, // Left 
                { type: 'glass', track: 1, offset: 0.48, widthRatio: 0.52 } // Right
            ];
        } else {
            // 2-track with mosquito usually implies one sash is mosquito? 
            // Or maybe it's just 2 panels (Glass + Mesh). Let's assume 1 Glass 1 Mesh for visualization if selected
            // But standard 2-track windows are usually 2 glass sliders.
            // If user selects "Glass + Mosquito" on 2-track, it might mean separate mesh track or 1 glass 1 mesh.
            // Let's visualize as 1 Glass 1 Mesh for clarity.
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
            // 2 Glass + 1 Mosquito
            panels = [
                { type: 'mosquito', track: 0, offset: 0, widthRatio: 0.48 }, // Mesh usually on inside or outside depending on region. Let's put first.
                { type: 'glass', track: 1, offset: 0, widthRatio: 0.52 },
                { type: 'glass', track: 2, offset: 0.48, widthRatio: 0.52 }
            ];
        }
    }

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

            {/* Panels (Shutters) */}
            {panels.map((panel, idx) => {
                const panelW = frameW * panel.widthRatio;
                // Offset calculation needs to align with visual tracks
                // We'll simulate depth by indenting y slightly for inner tracks
                // Track 0 = Outer, Track N = Inner (Visual layering)

                // Usually tracks are distinct. Let's simplify:
                // We just draw the rects overlapping slightly in X.
                // Their Z-index (order) determines visibility.

                const panelX = padding + (frameW * panel.offset);
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
                        {/* Direction Arrow (Symbolic) */}
                        <path
                            d={`M ${panelX + panelW - 20} ${panelY + panelH / 2} l -6 -4 v 8 z`}
                            fill={isMosquito ? "#64748b" : "#60a5fa"}
                            opacity="0.6"
                        />
                        {/* Config Label */}
                        <text
                            x={panelX + (panelW / 2)}
                            y={(isMosquito ? 1 / 5 : 1) * (panelY + panelH - 10)}
                            textAnchor="middle"
                            fontSize="10"
                            fill={isMosquito ? "#475569" : "#3b82f6"}
                            fontWeight="bold"
                            opacity="0.8"
                        >
                            {isMosquito ? "MESH" : "GLASS"}
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

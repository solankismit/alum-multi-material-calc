"use strict";

import React from 'react';

interface WindowSchematicProps {
    trackType: "2-track" | "3-track" | "openable" | string;
    configuration: "all-glass" | "glass-mosquito" | string;
    sections?: number;
    className?: string;
    /** When provided, draws a dimension line + "<value> mm" label above the frame. */
    widthMm?: number;
    /** When provided, draws a dimension line + "<value> mm" label to the left of the frame. */
    heightMm?: number;
}

type Panel = { type: string; track: number; offset: number; widthRatio: number };

export default function WindowSchematic({ trackType, configuration, sections = 2, className = "", widthMm, heightMm }: WindowSchematicProps) {
    // Canvas Logic — frame/panel drawing below is unchanged; it's wrapped in a
    // translated <g> so a gutter can be reserved for dimension lines without
    // touching any of this layout math.
    const width = 400;
    const height = 300;
    const padding = 20;
    const dimGutter = 34;
    const canvasW = width + dimGutter;
    const canvasH = height + dimGutter;

    // Frame Dimensions
    const frameW = width - (padding * 2);
    const frameH = height - (padding * 2);

    // Track Logic
    // 2-track = 2 rails
    // 3-track = 3 rails
    const numTracks = trackType === "3-track" ? 3 : (trackType === "openable" ? 1 : 2);
    const isSliding = trackType === "2-track" || trackType === "3-track";

    let panels: Panel[] = [];

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

    // Top-view (plan) panels — one entry per physical track, including the
    // mosquito shutter that the front elevation hides behind a glass panel.
    // Works for any track count (2 or 3), not just 3-track.
    const topPanels: Panel[] = isSliding
        ? (hasMosquitoOverlay
            ? [...panels, { type: 'mosquito', track: 0, offset: 0, widthRatio: 0.52 }]
            : panels
          ).slice().sort((a, b) => a.track - b.track)
        : [];

    const topViewRowH = 40;
    const topViewTitleH = 20;
    const topViewPadding = 8;
    const topViewH = topViewTitleH + numTracks * topViewRowH + topViewPadding * 2;

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
        <svg viewBox={`0 0 ${canvasW} ${canvasH}`} className="w-full h-auto bg-surface-muted border border-border rounded">
            {/* Definitions for patterns/gradients — fixed, realistic material colors
                (aluminium silver, sky-tinted glass, grey insect mesh) rather than
                theme-neutral tones, since these represent real physical materials. */}
            <defs>
                <linearGradient id="aluminumFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f1f5f9" />
                    <stop offset="30%" stopColor="#94a3b8" />
                    <stop offset="55%" stopColor="#cbd5e1" />
                    <stop offset="80%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
                <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.85" />
                    <stop offset="45%" stopColor="#7dd3fc" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.75" />
                </linearGradient>
                <pattern id="meshWeave" patternUnits="userSpaceOnUse" width="6" height="6">
                    <rect width="6" height="6" fill="#94a3b8" opacity="0.45" />
                    <path d="M 0 6 L 6 0 M -1 1 L 1 -1 M 5 7 L 7 5" stroke="#334155" strokeWidth="0.6" />
                </pattern>
                {/* Fine woven-net crosshatch for mesh shutters in the monochrome top view */}
                <pattern id="netPattern" patternUnits="userSpaceOnUse" width="4" height="4">
                    <path d="M0,0 L4,4 M4,0 L0,4" stroke="var(--color-text)" strokeWidth="0.5" opacity="0.55" />
                </pattern>
            </defs>

            <g transform={`translate(${dimGutter}, ${dimGutter})`}>
            {/* Main Outer Frame */}
            <rect
                x={padding}
                y={padding}
                width={frameW}
                height={frameH}
                fill="none"
                stroke="url(#aluminumFrame)"
                strokeWidth="6"
                rx="2"
            />

            {/* Mitred corner joints — the diagonal cut where two frame
                extrusions meet at 45°, on all four corners. */}
            {[
                [padding, padding, 1, 1],
                [width - padding, padding, -1, 1],
                [padding, height - padding, 1, -1],
                [width - padding, height - padding, -1, -1],
            ].map(([cx, cy, sx, sy], i) => (
                <line
                    key={`corner-${i}`}
                    x1={cx + sx * 7} y1={cy}
                    x2={cx} y2={cy + sy * 7}
                    stroke="#475569"
                    strokeWidth="1.2"
                    opacity="0.8"
                />
            ))}

            {/* Weep holes — drainage notches along the outer bottom rail,
                standard on aluminium sliding sections to let water out. */}
            {Array.from({ length: 4 }).map((_, i) => {
                const wx = padding + frameW * ((i + 1) / 5);
                return (
                    <rect
                        key={`weep-${i}`}
                        x={wx - 3}
                        y={height - padding - 3}
                        width="6"
                        height="6"
                        fill="var(--color-surface, #fff)"
                        stroke="#334155"
                        strokeWidth="0.8"
                    />
                );
            })}

            {/* Tracks (Horizontal Lines top/bottom) */}
            {Array.from({ length: numTracks }).map((_, i) => (
                <g key={`track-${i}`}>
                    {/* Top Track Line */}
                    <line
                        x1={padding}
                        y1={padding + (i * 4) + 4}
                        x2={width - padding}
                        y2={padding + (i * 4) + 4}
                        stroke="var(--color-border-strong)"
                        strokeWidth="1"
                    />
                    {/* Bottom Track Line */}
                    <line
                        x1={padding}
                        y1={height - padding - (i * 4) - 4}
                        x2={width - padding}
                        y2={height - padding - (i * 4) - 4}
                        stroke="var(--color-border-strong)"
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
                            fill="url(#meshWeave)"
                            stroke="#334155"
                            strokeWidth="2"
                            strokeDasharray="4 3"
                            rx="1"
                            opacity="0.9"
                        />
                        <text
                            x={panelX - inset + 8}
                            y={panelY - inset + 14}
                            fontSize="9"
                            fill="#334155"
                            fontWeight="bold"
                            opacity="0.9"
                        >
                            MESH (behind)
                        </text>
                    </g>
                );
            })()}

            {/* Panels (Shutters) — geometry computed once, then drawn in two
                passes: all panel bodies first, then all hardware (hinges,
                handles, interlock) on top. Sliding shutters overlap at the
                interlock by design; drawing hardware in its own pass after
                every body means a shutter's handle is never painted over by
                the next shutter's body. */}
            {(() => {
                const isOpenableSystem = trackType === "openable";
                const panelY = padding + 6;
                const panelH = frameH - 12;
                const frameCenterX = padding + frameW / 2;

                const geoms = panels.map((panel, idx) => {
                    const panelW = isOpenableSystem
                        ? (frameW / sections) - 2
                        : frameW * panel.widthRatio;
                    const panelX = isOpenableSystem
                        ? padding + (idx * (frameW / sections)) + 1
                        : padding + (frameW * panel.offset);
                    const isMosquito = panel.type === 'mosquito';
                    // Real casement pairs hinge on the outer jamb and handle/lock at
                    // the shared centre mullion — so which edge is which flips
                    // depending on which half of the frame this panel sits in.
                    const isLeftOfCenter = (panelX + panelW / 2) < frameCenterX;
                    return { panel, idx, panelX, panelW, panelY, panelH, isMosquito, isLeftOfCenter };
                });

                return (
                    <>
                        {/* Pass 1 — shutter bodies */}
                        {geoms.map(({ idx, panelX, panelW, isMosquito }) => (
                            <g key={`panel-body-${idx}`}>
                                <rect
                                    x={panelX}
                                    y={panelY}
                                    width={panelW}
                                    height={panelH}
                                    fill={isMosquito ? "url(#meshWeave)" : "url(#glassGradient)"}
                                    stroke={isMosquito ? "#334155" : "#0284c7"}
                                    strokeWidth="2"
                                    rx="1"
                                />
                                {/* Glass shine streak — a diagonal highlight so glass panels read as glass, not flat blue. */}
                                {!isMosquito && (
                                    <polygon
                                        points={`${panelX + panelW * 0.12},${panelY} ${panelX + panelW * 0.32},${panelY} ${panelX + panelW * 0.1},${panelY + panelH} ${panelX},${panelY + panelH}`}
                                        fill="#ffffff"
                                        opacity="0.25"
                                    />
                                )}
                                {/* Frame for the shutter */}
                                <rect
                                    x={panelX + 4}
                                    y={panelY + 4}
                                    width={panelW - 8}
                                    height={panelH - 8}
                                    fill="none"
                                    stroke={isMosquito ? "#475569" : "url(#aluminumFrame)"}
                                    strokeWidth="1.5"
                                    opacity="0.85"
                                />
                                {/* Roller wheels — visible through the bottom rail on a sliding shutter */}
                                {!isOpenableSystem && (
                                    <>
                                        <circle cx={panelX + 10} cy={panelY + panelH - 5} r="2.6" fill="#64748b" stroke="#1e293b" strokeWidth="0.6" />
                                        <circle cx={panelX + panelW - 10} cy={panelY + panelH - 5} r="2.6" fill="#64748b" stroke="#1e293b" strokeWidth="0.6" />
                                    </>
                                )}
                                {/* Config Label */}
                                <text
                                    x={panelX + (panelW / 2)}
                                    y={panelY + panelH - 10}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill={isMosquito ? "#334155" : "#0369a1"}
                                    fontWeight="bold"
                                    opacity="0.9"
                                >
                                    {isOpenableSystem && configuration === "glass-mosquito" ? "G+M" : (isMosquito ? "MESH" : "GLASS")}
                                </text>
                            </g>
                        ))}

                        {/* Pass 2 — hardware, drawn last so it always stays on top
                            of every shutter body, including the overlap zone. */}
                        {geoms.map(({ idx, panelX, panelW, isMosquito, isLeftOfCenter }) => {
                            // Sliding: hinge/handle stay on each shutter's own trailing
                            // edge (existing convention). Openable: hinge on the outer
                            // jamb, handle on the centre mullion side — opposite edges.
                            const hingeOnLeft = isOpenableSystem ? isLeftOfCenter : false;
                            const handleX = isOpenableSystem
                                ? (isLeftOfCenter ? panelX + panelW - 13 : panelX + 13)
                                : panelX + panelW - 13;
                            const handleCy = panelY + panelH / 2;

                            return (
                                <g key={`panel-hw-${idx}`}>
                                    {/* Direction/Hinge Symbol */}
                                    {!isOpenableSystem ? (
                                        <path
                                            d={`M ${panelX + panelW - 20} ${panelY + panelH / 2} l -6 -4 v 8 z`}
                                            fill={isMosquito ? "#334155" : "#0369a1"}
                                            opacity="0.7"
                                        />
                                    ) : (
                                        <>
                                            <path
                                                d={hingeOnLeft
                                                    ? `M ${panelX + 4} ${panelY + 4} L ${panelX + panelW - 4} ${panelY + panelH / 2} L ${panelX + 4} ${panelY + panelH - 4}`
                                                    : `M ${panelX + panelW - 4} ${panelY + 4} L ${panelX + 4} ${panelY + panelH / 2} L ${panelX + panelW - 4} ${panelY + panelH - 4}`}
                                                fill="none"
                                                stroke="var(--color-border-strong)"
                                                strokeWidth="1"
                                                strokeDasharray="3 3"
                                                opacity="0.6"
                                            />
                                            {/* Hinge leaves on the outer (jamb) edge */}
                                            {[0.22, 0.78].map((f, hi) => (
                                                <rect
                                                    key={`hinge-${idx}-${hi}`}
                                                    x={(hingeOnLeft ? panelX + 1 : panelX + panelW - 6)}
                                                    y={panelY + panelH * f - 5}
                                                    width="5"
                                                    height="10"
                                                    rx="1"
                                                    fill="url(#aluminumFrame)"
                                                    stroke="#1e293b"
                                                    strokeWidth="0.6"
                                                />
                                            ))}
                                        </>
                                    )}
                                    {/* Handle hardware — a small lever/knob mounted on the
                                        shutter's operable edge, mid-height, like a real
                                        window fitting. */}
                                    {isMosquito ? (
                                        <circle cx={handleX} cy={handleCy} r="3.5" fill="#475569" stroke="#1e293b" strokeWidth="0.6" />
                                    ) : (
                                        <g>
                                            <rect x={handleX - 3.5} y={handleCy - 14} width="7" height="28" rx="3" fill="url(#aluminumFrame)" stroke="#1e293b" strokeWidth="0.8" />
                                            <circle cx={handleX} cy={handleCy - 10} r="1.3" fill="#1e293b" />
                                            <circle cx={handleX} cy={handleCy + 10} r="1.3" fill="#1e293b" />
                                        </g>
                                    )}
                                </g>
                            );
                        })}

                        {/* Interlock (meeting) stiles — where two sliding shutters
                            overlap and lock together, shown as a darker double bar
                            so it doesn't read as a stray seam. */}
                        {!isOpenableSystem && geoms.length > 1 && (() => {
                            const sorted = [...geoms].sort((a, b) => a.panelX - b.panelX);
                            return sorted.slice(0, -1).map((g, i) => {
                                const next = sorted[i + 1];
                                const overlapStart = next.panelX;
                                const overlapEnd = g.panelX + g.panelW;
                                const ix = (overlapStart + overlapEnd) / 2;
                                return (
                                    <line
                                        key={`interlock-${i}`}
                                        x1={ix} y1={panelY + 2}
                                        x2={ix} y2={panelY + panelH - 2}
                                        stroke="#1e293b"
                                        strokeWidth="2.5"
                                        opacity="0.55"
                                    />
                                );
                            });
                        })()}
                    </>
                );
            })()}
            </g>

            {/* Width dimension line — reserved top gutter */}
            {widthMm !== undefined && widthMm > 0 && (
                <g>
                    <line x1={dimGutter + padding} y1={dimGutter - 8} x2={dimGutter + width - padding} y2={dimGutter - 8} stroke="var(--color-text)" strokeWidth="1" />
                    <line x1={dimGutter + padding} y1={dimGutter - 12} x2={dimGutter + padding} y2={dimGutter - 4} stroke="var(--color-text)" strokeWidth="1" />
                    <line x1={dimGutter + width - padding} y1={dimGutter - 12} x2={dimGutter + width - padding} y2={dimGutter - 4} stroke="var(--color-text)" strokeWidth="1" />
                    <text x={dimGutter + width / 2} y={dimGutter - 16} textAnchor="middle" fontSize="11" fill="var(--color-text)" fontWeight="600">
                        {Math.round(widthMm)} mm
                    </text>
                </g>
            )}

            {/* Height dimension line — reserved left gutter */}
            {heightMm !== undefined && heightMm > 0 && (
                <g>
                    <line x1={dimGutter - 8} y1={dimGutter + padding} x2={dimGutter - 8} y2={dimGutter + height - padding} stroke="var(--color-text)" strokeWidth="1" />
                    <line x1={dimGutter - 12} y1={dimGutter + padding} x2={dimGutter - 4} y2={dimGutter + padding} stroke="var(--color-text)" strokeWidth="1" />
                    <line x1={dimGutter - 12} y1={dimGutter + height - padding} x2={dimGutter - 4} y2={dimGutter + height - padding} stroke="var(--color-text)" strokeWidth="1" />
                    <text
                        x={16}
                        y={dimGutter + height / 2}
                        textAnchor="middle"
                        fontSize="11"
                        fill="var(--color-text)"
                        fontWeight="600"
                        transform={`rotate(-90 16 ${dimGutter + height / 2})`}
                    >
                        {Math.round(heightMm)} mm
                    </text>
                </g>
            )}
        </svg>

        {/* Top (plan) view — looking down at the tracks from above. Each track
            is a single straight rail line; the shutter riding that rail is a
            double-outlined rectangle sitting on the line at its resting
            position. Dynamic for any sliding track count (2-track or
            3-track); not applicable to openable windows, which don't have
            parallel sliding rails. */}
        {isSliding && (
            <svg viewBox={`0 0 ${canvasW} ${topViewH}`} className="w-full h-auto bg-surface-muted border border-border rounded">
                <text x={canvasW / 2} y={13} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--color-text-muted)" letterSpacing="0.5">
                    TOP VIEW — {numTracks} TRACK{numTracks > 1 ? "S" : ""} (LOOKING DOWN)
                </text>
                <g transform={`translate(${dimGutter}, ${topViewTitleH})`}>
                    {Array.from({ length: numTracks }).map((_, i) => {
                        const panel = topPanels.find(p => p.track === i);
                        const ratio = panel?.widthRatio ?? (1 / numTracks);
                        const offset = panel?.offset ?? 0;
                        const isMesh = panel?.type === 'mosquito';
                        const rowY = i * topViewRowH;
                        const lineY = rowY + topViewRowH / 2;
                        const shutterW = frameW * ratio;
                        const shutterX = padding + frameW * offset;
                        const rectH = topViewRowH - 24;
                        // Approximate mm width from the same ratio used to draw the
                        // panel above — this schematic is proportional, not to
                        // scale, consistent with the front elevation.
                        const mmWidth = widthMm ? Math.round(ratio * widthMm) : undefined;

                        return (
                            <g key={`toprow-${i}`}>
                                {/* Track rail — a single line the shutter slides along */}
                                <line x1={padding} y1={lineY} x2={width - padding} y2={lineY} stroke="var(--color-text)" strokeWidth="2" />
                                {/* Shutter, viewed from above — double outline so it reads
                                    as a distinct panel riding the rail, not just a tick mark */}
                                <rect
                                    x={shutterX}
                                    y={lineY - rectH / 2}
                                    width={shutterW}
                                    height={rectH}
                                    fill="var(--color-surface)"
                                    stroke="var(--color-text)"
                                    strokeWidth="1.5"
                                />
                                <rect
                                    x={shutterX + 3}
                                    y={lineY - rectH / 2 + 3}
                                    width={Math.max(0, shutterW - 6)}
                                    height={Math.max(0, rectH - 6)}
                                    fill={isMesh ? "url(#netPattern)" : "none"}
                                    stroke="var(--color-text)"
                                    strokeWidth="1"
                                />
                                <text
                                    x={shutterX + shutterW / 2}
                                    y={lineY - rectH / 2 - 5}
                                    textAnchor="middle"
                                    fontSize="9"
                                    fontWeight="700"
                                    fill="var(--color-text-muted)"
                                >
                                    Track {i + 1} · {isMesh ? "Mesh" : "Glass"}{mmWidth ? ` · ${mmWidth}mm` : ""}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
        )}
        </div>
    );
}

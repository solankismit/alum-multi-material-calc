"use client";

import { Button } from "@/components/ui/Button";
import { UNIT_LABELS, DIMENSION_UNITS, type LengthUnit } from "@/utils/units";

/**
 * Measurement-unit picker.
 *
 * Extracted from WindowForm, where it was a private component duplicated in
 * spirit across four places. `units` narrows the choices per context — stock
 * bar lengths have no use for inch+dora, and the sub-inch deduction constants
 * have no use for feet.
 */
export default function UnitToggle({
    unitMode,
    onChange,
    units = DIMENSION_UNITS,
    fullWidth,
    label = "Unit:",
    compact,
}: {
    unitMode: LengthUnit;
    onChange: (u: LengthUnit) => void;
    units?: LengthUnit[];
    fullWidth?: boolean;
    label?: string;
    /** Slimmer styling for inline use inside a dense form card. */
    compact?: boolean;
}) {
    if (compact) {
        return (
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Measurement unit">
                {label && <span className="text-[11px] font-medium text-text-muted">{label}</span>}
                {units.map((u) => (
                    <button
                        key={u}
                        type="button"
                        role="radio"
                        aria-checked={unitMode === u}
                        onClick={() => onChange(u)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${unitMode === u
                            ? "bg-text text-text-inverse border-text"
                            : "bg-surface text-text-muted border-border hover:bg-surface-muted"
                            }`}
                    >
                        {UNIT_LABELS[u]}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div
            className={`flex items-center gap-3 bg-surface p-1.5 rounded-lg border border-border shadow-sm ${fullWidth ? "w-full justify-between" : ""}`}
        >
            {label && <span className="text-xs font-semibold uppercase text-text-muted px-2">{label}</span>}
            <div className="flex gap-1" role="radiogroup" aria-label="Measurement unit">
                {units.map((u) => (
                    <Button
                        key={u}
                        type="button"
                        size="sm"
                        role="radio"
                        aria-checked={unitMode === u}
                        variant={unitMode === u ? "primary" : "ghost"}
                        onClick={() => onChange(u)}
                        className={fullWidth ? "h-9 flex-1" : "h-8 px-3"}
                    >
                        {UNIT_LABELS[u]}
                    </Button>
                ))}
            </div>
        </div>
    );
}

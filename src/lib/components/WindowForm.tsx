import { useState, useEffect } from "react";
import { Calculator, RotateCcw, Plus, Trash2, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { feetToMm, mmToFeet } from "@/utils/formatters";
import {
  validateSectionDimensions,
  validateDimension,
} from "@/utils/dimensionValidation";
import { DEFAULT_KERF_WIDTH_MM } from "@/utils/stockOptimization";
import type { WindowInput, WindowSection, WindowDimension, SectionWithConfigs } from "@/types";
import { uiStyles } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import { useToast } from "@/components/ui/Toast";
import WindowSchematic from "@/components/WindowSchematic";
import StockSettings from "@/components/StockSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

interface WindowFormProps {
  onCalculate: (input: WindowInput) => void;
  onReset: () => void;
  initialValues?: WindowInput;
  allSections?: SectionWithConfigs[];
}

const KERF_STORAGE_KEY = "alum_kerf_width_mm";

function KerfControl({ kerfWidthMm, onChange, fullWidth }: { kerfWidthMm: number; onChange: (v: number) => void; fullWidth?: boolean }) {
  return (
    <div className={`flex items-center gap-2 bg-surface p-1.5 rounded-lg border border-border shadow-sm ${fullWidth ? "w-full justify-between" : ""}`}>
      <Label htmlFor="kerf-width" className="text-xs font-semibold uppercase text-text-muted px-1 mb-0">Kerf (mm):</Label>
      <Input
        id="kerf-width"
        type="number"
        step="0.5"
        min="0"
        value={kerfWidthMm}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={fullWidth ? "h-9 w-24 text-center px-1" : "h-8 w-16 text-center px-1"}
        title="Saw blade kerf width — material lost per cut"
      />
    </div>
  );
}

function UnitToggle({ unitMode, onChange, fullWidth }: { unitMode: "mm" | "ft"; onChange: (u: "mm" | "ft") => void; fullWidth?: boolean }) {
  return (
    <div className={`flex items-center gap-3 bg-surface p-1.5 rounded-lg border border-border shadow-sm ${fullWidth ? "w-full justify-between" : ""}`}>
      <span className="text-xs font-semibold uppercase text-text-muted px-2">Unit:</span>
      <div className="flex gap-1" role="radiogroup" aria-label="Measurement unit">
        {(["mm", "ft"] as const).map((u) => (
          <Button
            key={u}
            type="button"
            size="sm"
            role="radio"
            aria-checked={unitMode === u}
            variant={unitMode === u ? "primary" : "ghost"}
            onClick={() => onChange(u)}
            className={fullWidth ? "h-9 flex-1" : "h-8 px-4"}
          >
            {u}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function WindowForm({ onCalculate, onReset, initialValues, allSections }: WindowFormProps) {
  const { toast } = useToast();
  const [unitMode, setUnitMode] = useState<"mm" | "ft">("mm");
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const [kerfWidthMm, setKerfWidthMm] = useState<number>(
    initialValues?.kerfWidthMm ?? DEFAULT_KERF_WIDTH_MM
  );

  // Load the last-used kerf width from localStorage (only when not restoring a saved worksheet)
  useEffect(() => {
    if (initialValues?.kerfWidthMm !== undefined) return;
    const stored = localStorage.getItem(KERF_STORAGE_KEY);
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed > 0) setKerfWidthMm(parsed);
    }
  }, [initialValues?.kerfWidthMm]);

  const handleKerfChange = (value: number) => {
    setKerfWidthMm(value);
    localStorage.setItem(KERF_STORAGE_KEY, String(value));
  };

  const defaultSectionTypeId = allSections && allSections.length > 0 ? allSections[0].id : undefined;

  const [sections, setSections] = useState<WindowSection[]>(
    initialValues?.sections || [
      {
        id: `section-${crypto.randomUUID()}`,
        name: "Section 1",
        sectionTypeId: defaultSectionTypeId,
        dimensions: [
          {
            id: `dim-${crypto.randomUUID()}`,
            height: null,
            width: null,
            quantity: null,
          },
        ],
        trackType: "2-track",
        configuration: "all-glass",
        hasTrackRail: true,
        stockMap: {},
      },
    ]);
  const [errors, setErrors] = useState<{
    [sectionId: string]: {
      [dimId: string]: {
        height?: string;
        width?: string;
        quantity?: string;
      };
    };
  }>({});
  // Store raw input values for feet mode to allow free typing
  const [rawInputs, setRawInputs] = useState<{
    [sectionId: string]: {
      [dimId: string]: {
        height?: string;
        width?: string;
      };
    };
  }>({});

  const handleUnitToggle = (newUnit: "mm" | "ft") => {
    setUnitMode(newUnit);
  };

  // Auto-select the first section type if none is selected
  useEffect(() => {
    if (allSections && allSections.length > 0) {
      setSections((prev) =>
        prev.map((s) => {
          if (!s.sectionTypeId) {
            return { ...s, sectionTypeId: allSections[0].id };
          }
          return s;
        })
      );
    }
  }, [allSections]);

  const addSection = () => {
    const newSection: WindowSection = {
      id: `section-${crypto.randomUUID()}`,
      name: `Section ${sections.length + 1}`,
      sectionTypeId: defaultSectionTypeId,
      dimensions: [
        {
          id: `dim-${crypto.randomUUID()}`,
          height: null,
          width: null,
          quantity: null,
        },
      ],
      trackType: "2-track",
      configuration: "all-glass",
      hasTrackRail: true,
      stockMap: {},
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    if (sections.length > 1) {
      setSections(sections.filter((s) => s.id !== sectionId));
    }
  };

  const updateSection = (
    sectionId: string,
    updates: Partial<WindowSection>
  ) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
  };

  // Openable panel count is a property of the whole Section, not of each
  // individual dimension row — every row shares the same panel count so the
  // section's diagram/panel count can never end up mixed (e.g. some rows at
  // 1 panel, others at 2).
  const updateSectionPanelCount = (sectionId: string, count: number | null) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, dimensions: s.dimensions.map((d) => ({ ...d, sections: count })) }
          : s
      )
    );
  };

  const removeDimension = (sectionId: string, dimensionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
            ...s,
            dimensions: s.dimensions.filter((d) => d.id !== dimensionId),
          }
          : s
      )
    );
    // Clear errors for removed dimension
    const newErrors = { ...errors };
    if (newErrors[sectionId]?.[dimensionId]) {
      delete newErrors[sectionId][dimensionId];
      setErrors(newErrors);
    }
  };

  const updateDimension = (
    sectionId: string,
    dimensionId: string,
    updates: Partial<WindowDimension>
  ) => {
    setSections((prevSections) => {
      const updatedSections = prevSections.map((s) =>
        s.id === sectionId
          ? {
            ...s,
            dimensions: s.dimensions.map((d) =>
              d.id === dimensionId ? { ...d, ...updates } : d
            ),
          }
          : s
      );

      // After updating, check if we need to add a new dimension
      const section = updatedSections.find((s) => s.id === sectionId);
      if (section) {
        const updatedDim = section.dimensions.find((d) => d.id === dimensionId);
        if (updatedDim) {
          const lastDim = section.dimensions[section.dimensions.length - 1];
          if (lastDim.id === dimensionId) {
            const anyFieldHasValue =
              (updatedDim.height !== null && updatedDim.height !== 0) ||
              (updatedDim.width !== null && updatedDim.width !== 0) ||
              (updatedDim.quantity !== null && updatedDim.quantity !== 0);

            if (anyFieldHasValue) {
              // Check if there's already an empty dimension
              const hasEmptyDimension = section.dimensions.some(
                (d) =>
                  d.height === null && d.width === null && d.quantity === null
              );

              if (!hasEmptyDimension) {
                // Add new empty dimension immediately — inherits the
                // section's shared panel count for openable systems.
                return updatedSections.map((s) =>
                  s.id === sectionId
                    ? {
                      ...s,
                      dimensions: [
                        ...s.dimensions,
                        {
                          id: `dim-${crypto.randomUUID()}`,
                          height: null,
                          width: null,
                          quantity: null,
                          sections: s.dimensions[0]?.sections,
                        },
                      ],
                    }
                    : s
                );
              }
            }
          }
        }
      }

      return updatedSections;
    });
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    let isValid = true;

    sections.forEach((section) => {
      if (section.dimensions.length === 0) {
        isValid = false;
        if (!newErrors[section.id]) {
          newErrors[section.id] = {};
        }
        // Section-level error could be shown separately
      }

      // Use the new validation module
      const validationResult = validateSectionDimensions(
        section.dimensions,
        unitMode
      );

      if (!validationResult.isValid) {
        isValid = false;
        newErrors[section.id] = validationResult.errors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast("Please fix the dimension validation errors in red.", "error");
      return;
    }

    const filteredSections = sections
      .map((section) => ({
        ...section,
        dimensions: section.dimensions.filter(
          (dim) =>
            !(
              dim.height === null &&
              dim.width === null &&
              dim.quantity === null
            )
        ),
      }))
      .filter((section) => section.dimensions.length > 0);

    if (filteredSections.length === 0) {
      toast("Please add at least one valid dimension before calculating.", "error");
      return;
    }

    // Check if every section has a sectionTypeId and a stockMap has at least one stock selected
    for (const section of filteredSections) {
      if (!section.sectionTypeId) {
        toast(`Please select a System Profile for ${section.name}.`, "error");
        return;
      }
      if (!section.stockMap || Object.keys(section.stockMap).length === 0) {
        toast(`Please configure Stock Settings for ${section.name}.`, "error");
        return;
      }
    }

    onCalculate({ sections: filteredSections, kerfWidthMm });
  };

  const handleReset = () => {
    setSections([
      {
        id: `section-${crypto.randomUUID()}`,
        name: "Section 1",
        sectionTypeId: defaultSectionTypeId,
        dimensions: [
          {
            id: `dim-${crypto.randomUUID()}`,
            height: null,
            width: null,
            quantity: null,
          },
        ],
        trackType: "3-track",
        configuration: "glass-mosquito",
        hasTrackRail: true,
      },
    ]);
    onReset();
  };

  return (
    <Card className="border-0 shadow-lg sm:border sm:border-border">
      <CardHeader className="pb-4 border-b border-border mb-6 bg-surface-muted/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-2xl font-semibold text-text">
            Window Specifications
          </CardTitle>

          {/* Desktop: both pills inline. Mobile: collapsed into one compact
              chip that expands on tap, so the first dimension field is still
              visible without scrolling past two full-height toolbar pills. */}
          <div className="hidden sm:flex items-center gap-3">
            <KerfControl kerfWidthMm={kerfWidthMm} onChange={handleKerfChange} />
            <UnitToggle unitMode={unitMode} onChange={handleUnitToggle} />
          </div>
          <div className="sm:hidden w-full">
            <button
              type="button"
              onClick={() => setSettingsExpanded((v) => !v)}
              aria-expanded={settingsExpanded}
              aria-controls="calc-settings-panel"
              className="flex items-center gap-1.5 text-xs font-semibold text-text-muted bg-surface px-3 py-1.5 rounded-lg border border-border shadow-sm"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Kerf {kerfWidthMm}mm · {unitMode}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${settingsExpanded ? "rotate-180" : ""}`} />
            </button>
            {settingsExpanded && (
              <div id="calc-settings-panel" className="mt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                <KerfControl kerfWidthMm={kerfWidthMm} onChange={handleKerfChange} fullWidth />
                <UnitToggle unitMode={unitMode} onChange={handleUnitToggle} fullWidth />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {sections.map((section, index) => {
            const selectedSystem = allSections?.find((s) => s.id === section.sectionTypeId);
            const availableConfigs = selectedSystem?.configurations || [];
            const has2Track = availableConfigs.some((c) => c.trackType === "2-track");
            const has3Track = availableConfigs.some((c) => c.trackType === "3-track");
            const isSystemOpenable = selectedSystem?.systemType === "openable";
            // Panel count is shared by every dimension row in the section —
            // read from the first row as the section's single source of truth.
            const sectionPanelCount = section.dimensions[0]?.sections ?? null;

            const isAllGlassValid = availableConfigs.some((c) => c.trackType === section.trackType && c.configuration === "all-glass") || isSystemOpenable;
            const isGlassMosquitoValid = availableConfigs.some((c) => c.trackType === section.trackType && c.configuration === "glass-mosquito") || isSystemOpenable;


            return (
              <div
                key={section.id}
                className="relative p-3 sm:p-6 bg-surface border border-border rounded-xl shadow-sm transition-all hover:shadow-md hover:border-border-strong group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 rounded-l-xl group-hover:bg-slate-400 transition-colors" />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pl-2">
                  <div className="flex-1 w-full sm:w-auto min-w-[200px]">
                    <Input
                      label="Section Name (Optional)"
                      value={section.name}
                      onChange={(e) =>
                        updateSection(section.id, { name: e.target.value })
                      }
                      id={`sectionName-${section.id}`}
                      labelClassName="text-text-muted font-medium text-xs mb-1 block leading-none"
                      placeholder="e.g. Living Room Window"
                      className="font-medium"
                    />
                  </div>

                  <div className="w-full sm:w-auto flex items-end gap-2">
                    <div className="flex-1 sm:w-64">
                      <Label className="text-text-muted font-medium text-xs mb-1 block">System Profile</Label>
                      <Select
                        value={section.sectionTypeId || ""}
                        onValueChange={(val) => updateSection(section.id, { sectionTypeId: val })}
                        disabled={!allSections || allSections.length === 0}
                      >
                        <SelectTrigger className="border-border bg-surface-muted">
                          <SelectValue placeholder="Select system..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allSections?.map((sys) => (
                            <SelectItem key={sys.id} value={sys.id}>
                              {sys.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {(!allSections || allSections.length === 0) && (
                        <p className="text-xs text-warning mt-1">No systems configured yet — add one in Admin.</p>
                      )}
                    </div>
                    {sections.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(section.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-surface-muted border border-border rounded-lg p-3 mb-4 sm:mb-6 pl-4 gap-3">
                  <div>
                    <h4 className="font-medium text-text text-sm">Stock Configuration</h4>
                    <p className="text-xs text-text-muted">Assign specific stock sizes for this section.</p>
                  </div>
                  <StockSettings
                    selectedOptions={section.stockMap || {}}
                    onSelectionChange={(options) => updateSection(section.id, { stockMap: options })}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 pl-2">
                  <div className="space-y-6">
                    {!isSystemOpenable && (
                      <div className="space-y-3">
                        <Label className="text-text-muted font-medium">Track Type</Label>
                        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Track type">
                          <Button
                            type="button"
                            variant="outline"
                            role="radio"
                            aria-checked={section.trackType === "2-track"}
                            onClick={() => {
                              updateSection(section.id, {
                                trackType: "2-track",
                                configuration: "all-glass",
                              });
                            }}
                            className={`${uiStyles.selectableButton.base} ${section.trackType === "2-track"
                              ? uiStyles.selectableButton.active
                              : uiStyles.selectableButton.inactive
                              }`}
                            disabled={!has2Track}
                          >
                            2-Track
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            role="radio"
                            aria-checked={section.trackType === "3-track"}
                            onClick={() =>
                              updateSection(section.id, { trackType: "3-track", configuration: "glass-mosquito" })
                            }
                            className={`${uiStyles.selectableButton.base} ${section.trackType === "3-track"
                              ? uiStyles.selectableButton.active
                              : uiStyles.selectableButton.inactive
                              }`}
                            disabled={!has3Track}
                          >
                            3-Track
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <Label className="text-text-muted font-medium">Configuration</Label>
                      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Configuration">
                        <Button
                          type="button"
                          variant="outline"
                          role="radio"
                          aria-checked={section.configuration === "all-glass"}
                          onClick={() =>
                            updateSection(section.id, { configuration: "all-glass" })
                          }
                          className={`${uiStyles.selectableButton.base} justify-start ${section.configuration === "all-glass"
                            ? uiStyles.selectableButton.active
                            : uiStyles.selectableButton.inactive
                            }`}
                          disabled={!isAllGlassValid}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full mr-3 ${section.configuration === "all-glass" ? "bg-primary" : "bg-transparent"}`} />
                          All Glass
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          role="radio"
                          aria-checked={section.configuration === "glass-mosquito"}
                          onClick={() => {
                            updateSection(section.id, {
                              configuration: "glass-mosquito",
                            });
                          }}
                          disabled={!isGlassMosquitoValid}
                          className={`${uiStyles.selectableButton.base} justify-start ${section.configuration === "glass-mosquito"
                            ? uiStyles.selectableButton.active
                            : uiStyles.selectableButton.inactive
                            }`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full mr-3 ${section.configuration === "glass-mosquito" ? "bg-primary" : "bg-transparent"}`} />
                          Glass + Mosquito
                          {!isGlassMosquitoValid && (
                            <span className="ml-auto text-xs text-text-muted font-normal">
                              (Not available)
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>

                    {section.configuration === "glass-mosquito" && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <Label className="text-text-muted font-medium">Mosquito Mesh Grade</Label>
                        <Select
                          value={section.mosquitoMeshGrade || "304 SS"}
                          onValueChange={(val) => updateSection(section.id, { mosquitoMeshGrade: val })}
                        >
                          <SelectTrigger className="border-border">
                            <SelectValue placeholder="Select Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="304 SS">304 SS</SelectItem>
                            <SelectItem value="316 SS">316 SS</SelectItem>
                            <SelectItem value="Fiber">Fiber</SelectItem>
                            <SelectItem value="Aluminum">Aluminum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {!isSystemOpenable && (
                      <div className="flex items-center gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-text-muted cursor-pointer">
                          <Checkbox
                            checked={section.hasTrackRail ?? true}
                            onCheckedChange={(checked) => updateSection(section.id, { hasTrackRail: checked === true })}
                          />
                          Include Track Rail
                        </label>
                      </div>
                    )}

                    {isSystemOpenable && (
                      <div className="space-y-2">
                        <Label className="text-text-muted font-medium">Number of Panels</Label>
                        <p className="text-xs text-text-muted -mt-1">Applies to every dimension row in this section.</p>
                        <Input
                          type="number"
                          min="1"
                          placeholder="e.g. 2"
                          value={sectionPanelCount === null || sectionPanelCount === undefined ? "" : sectionPanelCount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "") {
                              updateSectionPanelCount(section.id, null);
                              return;
                            }
                            const num = Number(value);
                            if (!isNaN(num)) updateSectionPanelCount(section.id, num);
                          }}
                          className="max-w-[120px]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col space-y-3">
                    <Label className="text-text-muted font-medium">Visualization</Label>
                    <div className="flex-1 bg-surface-muted rounded-lg border border-border flex items-center justify-center p-4">
                      <WindowSchematic
                        trackType={isSystemOpenable ? "openable" : section.trackType}
                        configuration={section.configuration}
                        sections={isSystemOpenable ? (sectionPanelCount || 2) : undefined}
                        className="max-h-[220px] shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-text-muted">Shows track &amp; configuration — not drawn to the dimensions below.</p>
                  </div>
                </div>

                <div className="space-y-3 pl-2">
                  <Label className="text-text-muted font-medium">Dimensions</Label>
                  {/* Persistent column headers — every row needs a visible label,
                      not just the first (that was a real bug: rows 2+ had no
                      indication of which field or unit they were). */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 sm:gap-3 text-xs font-medium text-text-muted px-0.5">
                    <div>Height ({unitMode})</div>
                    <div>Width ({unitMode})</div>
                    <div>Qty</div>
                    {section.dimensions.length > 1 && <div className="w-9" aria-hidden="true" />}
                  </div>
                  <div className="space-y-3">
                    {section.dimensions.map((dimension) => (
                      <div
                        key={dimension.id}
                        className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 sm:gap-3 items-start animate-in fade-in slide-in-from-top-1 duration-200"
                      >
                        <div>
                          <Input
                            type="number"
                            step={unitMode === "ft" ? "0.01" : "0.1"}
                            placeholder="Height"
                            value={
                              unitMode === "ft"
                                ? rawInputs[section.id]?.[dimension.id]?.height ??
                                (dimension.height === null
                                  ? ""
                                  : mmToFeet(dimension.height))
                                : dimension.height === null
                                  ? ""
                                  : dimension.height
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              // Handler logic reused from original
                              if (value === "") {
                                setRawInputs(prev => {
                                  const next = { ...prev };
                                  delete next[section.id]?.[dimension.id]?.height;
                                  return next;
                                });
                                updateDimension(section.id, dimension.id, { height: null });
                                // Clear error
                                if (errors[section.id]?.[dimension.id]?.height) {
                                  const nextErrors = { ...errors };
                                  delete nextErrors[section.id][dimension.id].height;
                                  setErrors(nextErrors);
                                }
                                return;
                              }
                              if (unitMode === "ft") {
                                setRawInputs(prev => ({
                                  ...prev,
                                  [section.id]: {
                                    ...prev[section.id],
                                    [dimension.id]: {
                                      ...prev[section.id]?.[dimension.id],
                                      height: value
                                    }
                                  }
                                }));
                              }
                              const num = Number(value);
                              if (!isNaN(num)) {
                                updateDimension(section.id, dimension.id, {
                                  height: unitMode === "ft" ? feetToMm(num) : num
                                });
                              }
                              // Clear error
                              if (errors[section.id]?.[dimension.id]?.height) {
                                const nextErrors = { ...errors };
                                delete nextErrors[section.id][dimension.id].height;
                                setErrors(nextErrors);
                              }
                            }}
                            onBlur={() => {
                              if (unitMode === "ft") {
                                setRawInputs(prev => {
                                  const next = { ...prev };
                                  delete next[section.id]?.[dimension.id]?.height;
                                  return next;
                                });
                              }
                              const res = validateDimension(dimension, unitMode);
                              if (!res.isValid) {
                                setErrors(prev => ({
                                  ...prev,
                                  [section.id]: {
                                    ...prev[section.id],
                                    [dimension.id]: {
                                      ...prev[section.id]?.[dimension.id],
                                      ...res.errors
                                    }
                                  }
                                }));
                              } else {
                                // Clear errors
                                setErrors(prev => {
                                  const next = { ...prev };
                                  if (next[section.id]?.[dimension.id]) {
                                    delete next[section.id][dimension.id].height;
                                    if (Object.keys(next[section.id][dimension.id]).length === 0) {
                                      delete next[section.id][dimension.id];
                                    }
                                  }
                                  return next;
                                });
                              }
                            }}
                            error={errors[section.id]?.[dimension.id]?.height}
                          />
                        </div>

                        <div>
                          <Input
                            type="number"
                            step={unitMode === "ft" ? "0.01" : "0.1"}
                            placeholder="Width"
                            value={
                              unitMode === "ft"
                                ? rawInputs[section.id]?.[dimension.id]?.width ??
                                (dimension.width === null
                                  ? ""
                                  : mmToFeet(dimension.width))
                                : dimension.width === null
                                  ? ""
                                  : dimension.width
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                setRawInputs(prev => {
                                  const next = { ...prev };
                                  delete next[section.id]?.[dimension.id]?.width;
                                  return next;
                                });
                                updateDimension(section.id, dimension.id, { width: null });
                                if (errors[section.id]?.[dimension.id]?.width) {
                                  const nextErrors = { ...errors };
                                  delete nextErrors[section.id][dimension.id].width;
                                  setErrors(nextErrors);
                                }
                                return;
                              }
                              if (unitMode === "ft") {
                                setRawInputs(prev => ({
                                  ...prev,
                                  [section.id]: {
                                    ...prev[section.id],
                                    [dimension.id]: {
                                      ...prev[section.id]?.[dimension.id],
                                      width: value
                                    }
                                  }
                                }));
                              }
                              const num = Number(value);
                              if (!isNaN(num)) {
                                updateDimension(section.id, dimension.id, {
                                  width: unitMode === "ft" ? feetToMm(num) : num
                                });
                              }
                              if (errors[section.id]?.[dimension.id]?.width) {
                                const nextErrors = { ...errors };
                                delete nextErrors[section.id][dimension.id].width;
                                setErrors(nextErrors);
                              }
                            }}
                            onBlur={() => {
                              if (unitMode === "ft") {
                                setRawInputs(prev => {
                                  const next = { ...prev };
                                  delete next[section.id]?.[dimension.id]?.width;
                                  return next;
                                });
                              }
                              const res = validateDimension(dimension, unitMode);
                              if (!res.isValid) {
                                setErrors(prev => ({
                                  ...prev,
                                  [section.id]: {
                                    ...prev[section.id],
                                    [dimension.id]: {
                                      ...prev[section.id]?.[dimension.id],
                                      ...res.errors
                                    }
                                  }
                                }));
                              } else {
                                setErrors(prev => {
                                  const next = { ...prev };
                                  if (next[section.id]?.[dimension.id]) {
                                    delete next[section.id][dimension.id].width;
                                    if (Object.keys(next[section.id][dimension.id]).length === 0) {
                                      delete next[section.id][dimension.id];
                                    }
                                  }
                                  return next;
                                });
                              }
                            }}
                            error={errors[section.id]?.[dimension.id]?.width}
                          />
                        </div>

                        <div>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="Qty"
                            value={dimension.quantity === null ? "" : dimension.quantity}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                updateDimension(section.id, dimension.id, { quantity: null });
                                return;
                              }
                              const num = Number(value);
                              if (!isNaN(num)) updateDimension(section.id, dimension.id, { quantity: num });
                            }}
                            className="text-center"
                          />
                        </div>
                        {section.dimensions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDimension(section.id, dimension.id)}
                            className="shrink-0 text-text-muted hover:text-danger hover:bg-danger-surface self-center"
                            aria-label="Remove dimension"
                            title="Remove Dimension"
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            onClick={addSection}
            className="w-full border-dashed border-2 py-6 text-text-muted hover:text-text hover:border-border-strong hover:bg-surface-muted"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Another Section
          </Button>

          <div className="flex gap-4 pt-4 border-t border-border">
            <Button
              type="submit"
              size="lg"
              className="flex-1 shadow-md hover:shadow-lg transition-all"
            >
              <Calculator className="w-5 h-5 mr-2" />
              Calculate Materials
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleReset}
              className="min-w-[140px]"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card >
  );
}

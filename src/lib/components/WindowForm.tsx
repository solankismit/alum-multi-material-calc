import { useState, useEffect } from "react";
import { Calculator, RotateCcw, Plus, Trash2, X } from "lucide-react";
import { feetToMm, mmToFeet } from "@/utils/formatters";
import {
  validateSectionDimensions,
  validateDimension,
} from "@/utils/dimensionValidation";
import type { WindowInput, WindowSection, WindowDimension, SectionWithConfigs } from "@/types";
import { uiStyles } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
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

export default function WindowForm({ onCalculate, onReset, initialValues, allSections }: WindowFormProps) {
  const [unitMode, setUnitMode] = useState<"mm" | "ft">("mm");

  const defaultSectionTypeId = allSections && allSections.length > 0 ? allSections[0].id : undefined;

  const [sections, setSections] = useState<WindowSection[]>(
    initialValues?.sections || [
      {
        id: `section-${Date.now()}`,
        name: "Section 1",
        sectionTypeId: defaultSectionTypeId,
        dimensions: [
          {
            id: `dim-${Date.now()}`,
            height: null,
            width: null,
            quantity: null,
          },
        ],
        trackType: "2-track",
        configuration: "all-glass",
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
      id: `section-${Date.now()}`,
      name: `Section ${sections.length + 1}`,
      sectionTypeId: defaultSectionTypeId,
      dimensions: [
        {
          id: `dim-${Date.now()}`,
          height: null,
          width: null,
          quantity: null,
        },
      ],
      trackType: "2-track",
      configuration: "all-glass",
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
                // Add new empty dimension immediately
                return updatedSections.map((s) =>
                  s.id === sectionId
                    ? {
                      ...s,
                      dimensions: [
                        ...s.dimensions,
                        {
                          id: `dim-${Date.now()}-${Math.random()}`,
                          height: null,
                          width: null,
                          quantity: null,
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
      alert("Please fix the dimension validation errors in red.");
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
      alert("Please add at least one valid dimension before calculating.");
      return;
    }

    // Check if every section has a sectionTypeId and a stockMap has at least one stock selected
    for (const section of filteredSections) {
      if (!section.sectionTypeId) {
        alert(`Please select a System Profile for ${section.name}.`);
        return;
      }
      if (!section.stockMap || Object.keys(section.stockMap).length === 0) {
        alert(`Please configure Stock Settings for ${section.name}.`);
        return;
      }
    }

    onCalculate({ sections: filteredSections });
  };

  const handleReset = () => {
    setSections([
      {
        id: `section-${Date.now()}`,
        name: "Section 1",
        sectionTypeId: defaultSectionTypeId,
        dimensions: [
          {
            id: `dim-${Date.now()}`,
            height: null,
            width: null,
            quantity: null,
          },
        ],
        trackType: "3-track",
        configuration: "glass-mosquito",
      },
    ]);
    onReset();
  };

  return (
    <Card className="border-0 shadow-lg sm:border sm:border-slate-200">
      <CardHeader className="pb-4 border-b border-slate-100 mb-6 bg-slate-50/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-2xl font-semibold text-slate-800">
            Window Specifications
          </CardTitle>

          <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold uppercase text-slate-500 px-2">Unit:</span>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={unitMode === "mm" ? "primary" : "ghost"}
                onClick={() => handleUnitToggle("mm")}
                className={`h-8 px-4 ${unitMode === "mm" ? "bg-slate-800" : "text-slate-600 hover:text-slate-900"}`}
              >
                mm
              </Button>
              <Button
                type="button"
                size="sm"
                variant={unitMode === "ft" ? "primary" : "ghost"}
                onClick={() => handleUnitToggle("ft")}
                className={`h-8 px-4 ${unitMode === "ft" ? "bg-slate-800" : "text-slate-600 hover:text-slate-900"}`}
              >
                ft
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {sections.map((section, index) => {
            const selectedSystem = allSections?.find((s) => s.id === section.sectionTypeId);
            const availableConfigs = selectedSystem?.configurations || [];
            const has2Track = availableConfigs.some((c: any) => c.trackType === "2-track");
            const has3Track = availableConfigs.some((c: any) => c.trackType === "3-track");

            const isAllGlassValid = availableConfigs.some((c: any) => c.trackType === section.trackType && c.configuration === "all-glass");
            const isGlassMosquitoValid = availableConfigs.some((c: any) => c.trackType === section.trackType && c.configuration === "glass-mosquito");


            return (
              <div
                key={section.id}
                className="relative p-6 bg-white border border-slate-200 rounded-xl shadow-sm transition-all hover:shadow-md hover:border-slate-300 group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 rounded-l-xl group-hover:bg-slate-400 transition-colors" />

                <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pl-2">
                  <div className="flex-1 w-full sm:w-auto min-w-[200px]">
                    <Input
                      label="Section Name (Optional)"
                      value={section.name}
                      onChange={(e) =>
                        updateSection(section.id, { name: e.target.value })
                      }
                      id="sectionName"
                      labelClassName="text-slate-600 font-medium text-xs mb-1 block leading-none"
                      placeholder="e.g. Living Room Window"
                      className=" font-medium border-0 border-b rounded-none border-slate-200  px-0 focus:ring-0 focus:border-slate-800 transition-colors bg-transparent placeholder:text-slate-400"
                    />
                  </div>

                  <div className="w-full sm:w-64">
                    <Label className="text-slate-600 font-medium text-xs mb-1 block">System Profile</Label>
                    <Select
                      value={section.sectionTypeId || ""}
                      onValueChange={(val) => updateSection(section.id, { sectionTypeId: val })}
                      disabled={!allSections || allSections.length === 0}
                    >
                      <SelectTrigger className="border-slate-200 bg-slate-50">
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
                  </div>
                  {sections.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSection(section.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 pl-4">
                  <div>
                    <h4 className="font-medium text-slate-800 text-sm">Stock Configuration</h4>
                    <p className="text-xs text-slate-500">Assign specific stock sizes for this section.</p>
                  </div>
                  <StockSettings
                    selectedOptions={section.stockMap || {}}
                    onSelectionChange={(options) => updateSection(section.id, { stockMap: options })}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6 pl-2">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-slate-600 font-medium">Track Type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant="outline"
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

                    <div className="space-y-3">
                      <Label className="text-slate-600 font-medium">Configuration</Label>
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            updateSection(section.id, { configuration: "all-glass" })
                          }
                          className={`${uiStyles.selectableButton.base} justify-start ${section.configuration === "all-glass"
                            ? uiStyles.selectableButton.active
                            : uiStyles.selectableButton.inactive
                            }`}
                          disabled={!isAllGlassValid}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full mr-3 ${section.configuration === "all-glass" ? "bg-indigo-600" : "bg-transparent"}`} />
                          All Glass
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
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
                          <div className={`w-2.5 h-2.5 rounded-full mr-3 ${section.configuration === "glass-mosquito" ? "bg-indigo-600" : "bg-transparent"}`} />
                          Glass + Mosquito
                          {!isGlassMosquitoValid && (
                            <span className="ml-auto text-xs text-slate-400 font-normal">
                              (Not available)
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>

                    {section.configuration === "glass-mosquito" && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <Label className="text-slate-600 font-medium">Mosquito Mesh Grade</Label>
                        <Select
                          value={section.mosquitoMeshGrade || "304 SS"}
                          onValueChange={(val) => updateSection(section.id, { mosquitoMeshGrade: val })}
                        >
                          <SelectTrigger className="border-slate-200">
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
                  </div>

                  <div className="flex flex-col space-y-3">
                    <Label className="text-slate-600 font-medium">Visualization</Label>
                    <div className="flex-1 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center p-4">
                      <WindowSchematic
                        trackType={section.trackType}
                        configuration={section.configuration}
                        className="max-h-[220px] shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pl-2">
                  <Label className="text-slate-600 font-medium">Dimensions</Label>
                  <div className="space-y-3">
                    {section.dimensions.map((dimension, idx) => (
                      <div
                        key={dimension.id}
                        className="grid grid-cols-12 gap-3 items-start animate-in fade-in slide-in-from-top-1 duration-200"
                      >
                        <div className="col-span-4 sm:col-span-4 md:col-span-4">
                          <Input
                            label={idx === 0 ? `Height (${unitMode})` : undefined}
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

                        <div className="col-span-4 sm:col-span-4 md:col-span-4">
                          <Input
                            label={idx === 0 ? `Width (${unitMode})` : undefined}
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

                        <div className="col-span-4 sm:col-span-4 md:col-span-4 flex items-end gap-1">
                          <div className="flex-1">
                            <Input
                              label={idx === 0 ? "Qty" : undefined}
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
                            <button
                              type="button"
                              onClick={() => removeDimension(section.id, dimension.id)}
                              className={`p-2 shrink-0 text-slate-400 hover:text-red-600 transition-colors ${idx === 0 ? "mb-1" : ""}`}
                              title="Remove Dimension"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
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
            className="w-full border-dashed border-2 py-6 text-slate-500 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Another Section
          </Button>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <Button
              type="submit"
              size="lg"
              className="flex-1 bg-slate-800 hover:bg-slate-900 text-white shadow-md hover:shadow-lg transition-all"
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

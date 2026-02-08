import { useState } from "react";
import { Calculator, RotateCcw, Plus, Trash2, X } from "lucide-react";
import { feetToMm, mmToFeet } from "@/utils/formatters";
import {
  validateSectionDimensions,
  validateDimension,
} from "@/utils/dimensionValidation";
import type { WindowInput, WindowSection, WindowDimension } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

interface WindowFormProps {
  onCalculate: (input: WindowInput) => void;
  onReset: () => void;
  initialValues?: WindowInput;
}

export default function WindowForm({ onCalculate, onReset, initialValues }: WindowFormProps) {
  const [unitMode, setUnitMode] = useState<"mm" | "ft">("mm");
  const [sections, setSections] = useState<WindowSection[]>(
    initialValues?.sections || [
      {
        id: `section-${Date.now()}`,
        name: "Section 1",
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

  const addSection = () => {
    const newSection: WindowSection = {
      id: `section-${Date.now()}`,
      name: `Section ${sections.length + 1}`,
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
    if (validate()) {
      // Filter out completely blank dimensions before calculating
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
        .filter((section) => section.dimensions.length > 0); // Remove sections with no valid dimensions

      onCalculate({ sections: filteredSections });
    }
  };

  const handleReset = () => {
    setSections([
      {
        id: `section-${Date.now()}`,
        name: "Section 1",
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
          {sections.map((section, index) => (
            <div
              key={section.id}
              className="relative p-6 bg-white border border-slate-200 rounded-xl shadow-sm transition-all hover:shadow-md hover:border-slate-300 group"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 rounded-l-xl group-hover:bg-slate-400 transition-colors" />

              <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pl-2">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    label="Section Name"
                    value={section.name}
                    onChange={(e) =>
                      updateSection(section.id, { name: e.target.value })
                    }
                    placeholder="e.g. Living Room Window"
                    className="text-lg font-medium border-0 border-b border-slate-200 rounded-none px-0 focus:ring-0 focus:border-slate-800 transition-colors bg-transparent placeholder:text-slate-400"
                  />
                </div>
                {sections.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection(section.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6 pl-2">
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
                      className={`h-12 border-2 ${section.trackType === "2-track"
                          ? "border-slate-800 bg-slate-50 text-slate-900 ring-0"
                          : "border-slate-100 text-slate-500 hover:border-slate-300"
                        }`}
                    >
                      2-Track
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        updateSection(section.id, { trackType: "3-track" })
                      }
                      className={`h-12 border-2 ${section.trackType === "3-track"
                          ? "border-slate-800 bg-slate-50 text-slate-900 ring-0"
                          : "border-slate-100 text-slate-500 hover:border-slate-300"
                        }`}
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
                      className={`justify-start border-2 ${section.configuration === "all-glass"
                          ? "border-slate-800 bg-slate-50 text-slate-900 ring-0"
                          : "border-slate-100 text-slate-500 hover:border-slate-300"
                        }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-3 opacity-0 data-[active=true]:opacity-100" data-active={section.configuration === "all-glass"} />
                      All Glass
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (section.trackType === "2-track") {
                          updateSection(section.id, {
                            trackType: "2-track",
                            configuration: "all-glass",
                          });
                        } else {
                          updateSection(section.id, {
                            configuration: "glass-mosquito",
                          });
                        }
                      }}
                      disabled={section.trackType === "2-track"}
                      className={`justify-start border-2 ${section.configuration === "glass-mosquito"
                          ? "border-slate-800 bg-slate-50 text-slate-900 ring-0"
                          : "border-slate-100 text-slate-500 hover:border-slate-300"
                        } ${section.trackType === "2-track" ? "opacity-50 cursor-not-allowed bg-slate-50" : ""}`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-800 mr-3 opacity-0 data-[active=true]:opacity-100" data-active={section.configuration === "glass-mosquito"} />
                      Glass + Mosquito
                      {section.trackType === "2-track" && (
                        <span className="ml-auto text-xs text-slate-400 font-normal">
                          (Not available)
                        </span>
                      )}
                    </Button>
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
                      <div className="col-span-5 sm:col-span-5">
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

                      <div className="col-span-5 sm:col-span-5">
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

                      <div className="col-span-2 sm:col-span-2 relative">
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
                        {section.dimensions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDimension(section.id, dimension.id)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full p-2 text-slate-400 hover:text-red-600 transition-colors"
                            title="Remove Dimension"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

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
    </Card>
  );
}

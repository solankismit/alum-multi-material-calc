import { useState } from "react";
import { Calculator, RotateCcw, Plus, Trash2, X } from "lucide-react";
import { feetToMm, mmToFeet } from "@/utils/formatters";
import {
  validateSectionDimensions,
  validateDimension,
} from "@/utils/dimensionValidation";
import type { WindowInput, WindowSection, WindowDimension } from "@/types";

interface WindowFormProps {
  onCalculate: (input: WindowInput) => void;
  onReset: () => void;
}

export default function WindowForm({ onCalculate, onReset }: WindowFormProps) {
  const [unitMode, setUnitMode] = useState<"mm" | "ft">("mm");
  const [sections, setSections] = useState<WindowSection[]>([
    {
      id: "section-1",
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
        id: "section-1",
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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-slate-800 mb-6">
        Window Specifications
      </h2>

      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          Measurement Unit:
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleUnitToggle("mm")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${unitMode === "mm"
              ? "bg-slate-700 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
          >
            mm
          </button>
          <button
            type="button"
            onClick={() => handleUnitToggle("ft")}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${unitMode === "ft"
              ? "bg-slate-700 text-white"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
          >
            ft
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {sections.map((section) => (
          <div
            key={section.id}
            className="border-2 border-slate-200 rounded-lg p-4 space-y-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <input
                  type="text"
                  value={section.name}
                  onChange={(e) =>
                    updateSection(section.id, { name: e.target.value })
                  }
                  className="text-lg font-semibold text-slate-800 bg-transparent border-b-2 border-slate-300 focus:border-slate-600 outline-none px-1"
                  placeholder="Section Name"
                />
              </div>
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSection(section.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove Section"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Track Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateSection(section.id, {
                        trackType: "2-track",
                        configuration: "all-glass",
                      });
                    }}
                    className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${section.trackType === "2-track"
                      ? "border-slate-600 bg-slate-50 text-slate-900 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                  >
                    2-Track
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSection(section.id, { trackType: "3-track" })
                    }
                    className={`px-3 py-2 rounded-lg border-2 transition-all text-sm ${section.trackType === "3-track"
                      ? "border-slate-600 bg-slate-50 text-slate-900 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                  >
                    3-Track
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Configuration
                </label>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateSection(section.id, { configuration: "all-glass" })
                    }
                    className={`w-full px-3 py-2 rounded-lg border-2 transition-all text-left text-sm ${section.configuration === "all-glass"
                      ? "border-slate-600 bg-slate-50 text-slate-900 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                  >
                    All Glass
                  </button>
                  <button
                    type="button"
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
                    className={`w-full px-3 py-2 rounded-lg border-2 transition-all text-left text-sm ${section.configuration === "glass-mosquito"
                      ? "border-slate-600 bg-slate-50 text-slate-900 font-semibold"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      } ${section.trackType === "2-track"
                        ? "opacity-50 cursor-not-allowed bg-slate-100"
                        : ""
                      }`}
                  >
                    Glass + Mosquito
                    {section.trackType === "2-track" && (
                      <span className="text-xs text-slate-500 block mt-0.5">
                        (Not available)
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Dimensions
              </label>

              {section.dimensions.map((dimension) => (
                <div
                  key={dimension.id}
                  className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center gap-2"
                >
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Height ({unitMode.toUpperCase()})
                      </label>
                      <input
                        type="number"
                        step={unitMode === "ft" ? "0.01" : "0.1"}
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
                          if (value === "") {
                            // Clear raw input
                            setRawInputs((prev) => {
                              const newInputs = { ...prev };
                              if (newInputs[section.id]?.[dimension.id]) {
                                delete newInputs[section.id][dimension.id]
                                  .height;
                              }
                              return newInputs;
                            });
                            updateDimension(section.id, dimension.id, {
                              height: null,
                            });
                            // Clear error when user clears
                            if (errors[section.id]?.[dimension.id]?.height) {
                              const newErrors = { ...errors };
                              if (newErrors[section.id]?.[dimension.id]) {
                                delete newErrors[section.id][dimension.id]
                                  .height;
                              }
                              setErrors(newErrors);
                            }
                            return;
                          }
                          // In feet mode, store raw input for free typing
                          if (unitMode === "ft") {
                            setRawInputs((prev) => ({
                              ...prev,
                              [section.id]: {
                                ...prev[section.id],
                                [dimension.id]: {
                                  ...prev[section.id]?.[dimension.id],
                                  height: value,
                                },
                              },
                            }));
                          }
                          const numValue = Number(value);
                          if (!isNaN(numValue)) {
                            const mmValue =
                              unitMode === "ft" ? feetToMm(numValue) : numValue;
                            updateDimension(section.id, dimension.id, {
                              height: mmValue,
                            });
                          }
                          // Clear error when user starts typing
                          if (errors[section.id]?.[dimension.id]?.height) {
                            const newErrors = { ...errors };
                            if (newErrors[section.id]?.[dimension.id]) {
                              delete newErrors[section.id][dimension.id].height;
                            }
                            setErrors(newErrors);
                          }
                        }}
                        onBlur={() => {
                          // Clear raw input on blur to show formatted value
                          if (unitMode === "ft") {
                            setRawInputs((prev) => {
                              const newInputs = { ...prev };
                              if (newInputs[section.id]?.[dimension.id]) {
                                delete newInputs[section.id][dimension.id]
                                  .height;
                              }
                              return newInputs;
                            });
                          }
                          // Validate on blur
                          const validationResult = validateDimension(
                            dimension,
                            unitMode
                          );
                          if (!validationResult.isValid) {
                            setErrors((prev) => ({
                              ...prev,
                              [section.id]: {
                                ...prev[section.id],
                                [dimension.id]: validationResult.errors,
                              },
                            }));
                          } else {
                            // Clear errors if valid
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              if (newErrors[section.id]?.[dimension.id]) {
                                delete newErrors[section.id][dimension.id]
                                  .height;
                                if (
                                  Object.keys(
                                    newErrors[section.id][dimension.id]
                                  ).length === 0
                                ) {
                                  delete newErrors[section.id][dimension.id];
                                }
                              }
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent ${errors[section.id]?.[dimension.id]?.height
                          ? "border-red-300"
                          : "border-slate-300"
                          }`}
                      />
                      {errors[section.id]?.[dimension.id]?.height && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors[section.id][dimension.id].height}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Width ({unitMode.toUpperCase()})
                      </label>
                      <input
                        type="number"
                        step={unitMode === "ft" ? "0.01" : "0.1"}
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
                            // Clear raw input
                            setRawInputs((prev) => {
                              const newInputs = { ...prev };
                              if (newInputs[section.id]?.[dimension.id]) {
                                delete newInputs[section.id][dimension.id]
                                  .width;
                              }
                              return newInputs;
                            });
                            updateDimension(section.id, dimension.id, {
                              width: null,
                            });
                            // Clear error when user clears
                            if (errors[section.id]?.[dimension.id]?.width) {
                              const newErrors = { ...errors };
                              if (newErrors[section.id]?.[dimension.id]) {
                                delete newErrors[section.id][dimension.id]
                                  .width;
                              }
                              setErrors(newErrors);
                            }
                            return;
                          }
                          // In feet mode, store raw input for free typing
                          if (unitMode === "ft") {
                            setRawInputs((prev) => ({
                              ...prev,
                              [section.id]: {
                                ...prev[section.id],
                                [dimension.id]: {
                                  ...prev[section.id]?.[dimension.id],
                                  width: value,
                                },
                              },
                            }));
                          }
                          const numValue = Number(value);
                          if (!isNaN(numValue)) {
                            const mmValue =
                              unitMode === "ft" ? feetToMm(numValue) : numValue;
                            updateDimension(section.id, dimension.id, {
                              width: mmValue,
                            });
                          }
                          // Clear error when user starts typing
                          if (errors[section.id]?.[dimension.id]?.width) {
                            const newErrors = { ...errors };
                            if (newErrors[section.id]?.[dimension.id]) {
                              delete newErrors[section.id][dimension.id].width;
                            }
                            setErrors(newErrors);
                          }
                        }}
                        onBlur={() => {
                          // Clear raw input on blur to show formatted value
                          if (unitMode === "ft") {
                            setRawInputs((prev) => {
                              const newInputs = { ...prev };
                              if (newInputs[section.id]?.[dimension.id]) {
                                delete newInputs[section.id][dimension.id]
                                  .width;
                              }
                              return newInputs;
                            });
                          }
                          // Validate on blur
                          const validationResult = validateDimension(
                            dimension,
                            unitMode
                          );
                          if (!validationResult.isValid) {
                            setErrors((prev) => ({
                              ...prev,
                              [section.id]: {
                                ...prev[section.id],
                                [dimension.id]: {
                                  ...prev[section.id]?.[dimension.id],
                                  ...validationResult.errors,
                                },
                              },
                            }));
                          } else {
                            // Clear errors if valid
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              if (newErrors[section.id]?.[dimension.id]) {
                                delete newErrors[section.id][dimension.id]
                                  .width;
                                if (
                                  Object.keys(
                                    newErrors[section.id][dimension.id]
                                  ).length === 0
                                ) {
                                  delete newErrors[section.id][dimension.id];
                                }
                              }
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent ${errors[section.id]?.[dimension.id]?.width
                          ? "border-red-300"
                          : "border-slate-300"
                          }`}
                      />
                      {errors[section.id]?.[dimension.id]?.width && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors[section.id][dimension.id].width}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={
                          dimension.quantity === null ? "" : dimension.quantity
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string for clearing
                          if (value === "") {
                            updateDimension(section.id, dimension.id, {
                              quantity: null,
                            });
                            // Clear error when user clears
                            if (errors[section.id]?.[dimension.id]?.quantity) {
                              const newErrors = { ...errors };
                              if (newErrors[section.id]?.[dimension.id]) {
                                delete newErrors[section.id][dimension.id]
                                  .quantity;
                              }
                              setErrors(newErrors);
                            }
                            return;
                          }
                          const numValue = Number(value);
                          if (!isNaN(numValue)) {
                            updateDimension(section.id, dimension.id, {
                              quantity: numValue,
                            });
                            // Clear error when user starts typing
                            if (errors[section.id]?.[dimension.id]?.quantity) {
                              const newErrors = { ...errors };
                              if (newErrors[section.id]?.[dimension.id]) {
                                delete newErrors[section.id][dimension.id]
                                  .quantity;
                              }
                              setErrors(newErrors);
                            }
                          }
                        }}
                        onBlur={() => {
                          // Validate on blur using validation module
                          const validationResult = validateDimension(
                            dimension,
                            unitMode
                          );
                          if (!validationResult.isValid) {
                            setErrors((prev) => ({
                              ...prev,
                              [section.id]: {
                                ...prev[section.id],
                                [dimension.id]: {
                                  ...prev[section.id]?.[dimension.id],
                                  ...validationResult.errors,
                                },
                              },
                            }));
                          } else {
                            // Clear errors if valid
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              if (newErrors[section.id]?.[dimension.id]) {
                                delete newErrors[section.id][dimension.id]
                                  .quantity;
                                if (
                                  Object.keys(
                                    newErrors[section.id][dimension.id]
                                  ).length === 0
                                ) {
                                  delete newErrors[section.id][dimension.id];
                                }
                              }
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent ${errors[section.id]?.[dimension.id]?.quantity
                          ? "border-red-300"
                          : "border-slate-300"
                          }`}
                      />
                      {errors[section.id]?.[dimension.id]?.quantity && (
                        <p className="mt-1 text-xs text-red-600">
                          {errors[section.id][dimension.id].quantity}
                        </p>
                      )}
                    </div>
                  </div>

                  {section.dimensions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDimension(section.id, dimension.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                      title="Remove Dimension"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addSection}
          className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-slate-400 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Section
        </button>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-slate-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            Calculate
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 rounded-lg font-semibold border-2 border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            Reset
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-600">
          <span className="font-semibold">Section Type:</span> 27mm Domal
        </p>
        <p className="text-sm text-slate-600 mt-1">
          <span className="font-semibold">Available Stock:</span> 12ft, 15ft,
          16ft
        </p>
      </div>
    </div>
  );
}

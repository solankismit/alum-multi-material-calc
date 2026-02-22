"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Settings, Plus, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { StockOption, MaterialStockMap } from "@/types";

interface StockSettingsProps {
    selectedOptions: MaterialStockMap;
    onSelectionChange: (options: MaterialStockMap) => void;
}

const DEFAULT_STOCKS: StockOption[] = [
    { length: 3657.6, lengthFeet: 12, name: "12ft" },
    { length: 4572, lengthFeet: 15, name: "15ft" },
];

export default function StockSettings({
    selectedOptions,
    onSelectionChange,
}: StockSettingsProps) {
    const materialCategories = [
        { id: "frameWidth", label: "Frame (Widths)" },
        { id: "frameHeight", label: "Frame (Heights)" },
        { id: "shutterGlass", label: "Shutter (Glass)" },
        { id: "shutterMosquito", label: "Shutter (Mosquito)" },
        { id: "interlock", label: "Interlock" },
        { id: "trackRail", label: "Track Rail" },
    ];

    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(materialCategories[0].id);

    // Global stocks configured by user
    const [availableOptions, setAvailableOptions] = useState<StockOption[]>([]);
    const [newStockInput, setNewStockInput] = useState("");
    const [newStockUnit, setNewStockUnit] = useState<"ft" | "mm">("ft");

    useEffect(() => {
        const stored = localStorage.getItem("alum_global_stocks");
        if (stored) {
            try {
                setAvailableOptions(JSON.parse(stored));
            } catch (e) {
                setAvailableOptions(DEFAULT_STOCKS);
            }
        } else {
            setAvailableOptions(DEFAULT_STOCKS);
            localStorage.setItem("alum_global_stocks", JSON.stringify(DEFAULT_STOCKS));
        }
    }, []);

    // Initialize all selections to available options if completely empty
    useEffect(() => {
        if (availableOptions.length > 0 && Object.keys(selectedOptions).length === 0) {
            // Give parent the initial default state
            const initialMap: MaterialStockMap = {};
            materialCategories.forEach(c => initialMap[c.id] = [...availableOptions]);
            onSelectionChange(initialMap);
        }
    }, [availableOptions, selectedOptions, onSelectionChange]);


    const saveGlobalStocks = (newStocks: StockOption[]) => {
        const sorted = [...newStocks].sort((a, b) => b.length - a.length);
        setAvailableOptions(sorted);
        localStorage.setItem("alum_global_stocks", JSON.stringify(sorted));
    };

    const handleAddStock = () => {
        const val = parseFloat(newStockInput);
        if (isNaN(val) || val <= 0) return;

        let length = 0;
        let lengthFeet = 0;

        if (newStockUnit === "ft") {
            lengthFeet = val;
            length = val * 304.8;
        } else {
            length = val;
            lengthFeet = val / 304.8;
        }

        const newOption: StockOption = {
            length,
            lengthFeet,
            name: `${val}${newStockUnit}`,
        };

        // Check if exists
        if (!availableOptions.find(o => Math.abs(o.length - length) < 1)) {
            const nextStocks = [...availableOptions, newOption];
            saveGlobalStocks(nextStocks);
        }
        setNewStockInput("");
    };

    const handleRemoveGlobalStock = (length: number) => {
        const nextStocks = availableOptions.filter(o => o.length !== length);
        saveGlobalStocks(nextStocks);

        // Also remove from all selected tabs
        const nextSelected = { ...selectedOptions };
        let changed = false;
        Object.keys(nextSelected).forEach(cat => {
            const filtered = nextSelected[cat].filter(o => o.length !== length);
            if (filtered.length !== nextSelected[cat].length) {
                nextSelected[cat] = filtered;
                changed = true;
            }
        });

        if (changed) {
            onSelectionChange(nextSelected);
        }
    };

    const handleToggle = (category: string, option: StockOption, checked: boolean) => {
        const currentCategoryOptions = selectedOptions[category] || [];
        let newCategoryOptions;

        if (checked) {
            if (!currentCategoryOptions.find((o) => o.length === option.length)) {
                newCategoryOptions = [...currentCategoryOptions, option];
            } else {
                newCategoryOptions = currentCategoryOptions;
            }
        } else {
            newCategoryOptions = currentCategoryOptions.filter((o) => o.length !== option.length);
        }

        onSelectionChange({
            ...selectedOptions,
            [category]: newCategoryOptions
        });
    };

    const handleSelectAll = (category: string) => {
        onSelectionChange({
            ...selectedOptions,
            [category]: [...availableOptions]
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50">
                    <Settings className="w-4 h-4" />
                    Stock Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="text-xl text-slate-800">Per-Material Stock Settings</DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Assign specific stock lengths to different material components for precise optimization.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 -mx-6 px-6">
                    {/* Global Stocks Manager */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                        <Label className="text-sm font-semibold text-slate-800 mb-2 block">Available Global Stocks</Label>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {availableOptions.map(opt => (
                                <div key={opt.length} className="flex items-center gap-2 bg-white border border-slate-200 pl-3 pr-2 py-1.5 rounded-full text-sm shadow-sm text-slate-700">
                                    <span className="font-medium">{opt.name}</span>
                                    <button
                                        type="button"
                                        className="text-slate-400 hover:text-red-500"
                                        onClick={() => handleRemoveGlobalStock(opt.length)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 max-w-sm">
                            <Input
                                placeholder="Add length..."
                                type="number"
                                value={newStockInput}
                                onChange={(e) => setNewStockInput(e.target.value)}
                                className="h-9"
                            />
                            <select
                                value={newStockUnit}
                                onChange={(e) => setNewStockUnit(e.target.value as any)}
                                className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700"
                            >
                                <option value="ft">ft</option>
                                <option value="mm">mm</option>
                            </select>
                            <Button size="sm" onClick={handleAddStock} className="h-9 shrink-0" variant="secondary">
                                <Plus className="w-4 h-4 mr-1" /> Add
                            </Button>
                        </div>
                    </div>

                    <div className="flex gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-2">
                        {materialCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${activeTab === cat.id
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-slate-800">
                                {materialCategories.find(c => c.id === activeTab)?.label}
                            </h4>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                onClick={() => handleSelectAll(activeTab)}
                            >
                                Select All
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                            {availableOptions.map((option) => {
                                const currentCategoryOptions = selectedOptions[activeTab] || [];
                                const isSelected = !!currentCategoryOptions.find(
                                    (o) => o.length === option.length
                                );
                                return (
                                    <div
                                        key={option.length}
                                        className="flex items-center space-x-3 bg-white p-3 rounded-md shadow-sm border border-slate-200"
                                    >
                                        <Checkbox
                                            id={`stock-${activeTab}-${option.length}`}
                                            checked={isSelected}
                                            onCheckedChange={(checked) =>
                                                handleToggle(activeTab, option, checked as boolean)
                                            }
                                        />
                                        <Label
                                            htmlFor={`stock-${activeTab}-${option.length}`}
                                            className="text-sm cursor-pointer flex-1 font-medium text-slate-700"
                                        >
                                            {option.name || `${option.lengthFeet.toFixed(2)}ft (${Math.round(option.length)}mm)`}
                                        </Label>
                                    </div>
                                );
                            })}
                        </div>

                        {(!selectedOptions[activeTab] || selectedOptions[activeTab].length === 0) && (
                            <p className="text-sm text-red-500 font-medium">
                                Warning: Please select at least one stock length for {materialCategories.find(c => c.id === activeTab)?.label} to calculate requirements.
                            </p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

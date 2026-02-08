"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Settings } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/Dialog";
import { Label } from "@/components/ui/Label";
import { StockOption } from "@/types";

interface StockSettingsProps {
    availableOptions: StockOption[];
    selectedOptions: StockOption[];
    onSelectionChange: (options: StockOption[]) => void;
}

export default function StockSettings({
    availableOptions,
    selectedOptions,
    onSelectionChange,
}: StockSettingsProps) {
    const [open, setOpen] = useState(false);

    // If no available options (e.g. still loading), don't render or render empty
    if (availableOptions.length === 0) return null;

    const handleToggle = (option: StockOption, checked: boolean) => {
        let newSelection;
        if (checked) {
            // Add if not present
            if (!selectedOptions.find((o) => o.length === option.length)) {
                newSelection = [...selectedOptions, option];
            } else {
                newSelection = selectedOptions;
            }
        } else {
            // Remove
            newSelection = selectedOptions.filter((o) => o.length !== option.length);
        }
        onSelectionChange(newSelection);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Stock Settings
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Stock Length Settings</DialogTitle>
                    <DialogDescription>
                        Select the stock lengths available for optimization. The calculator
                        will prioritize larger stocks to minimize wastage.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        {availableOptions.map((option) => {
                            const isSelected = !!selectedOptions.find(
                                (o) => o.length === option.length
                            );
                            return (
                                <div
                                    key={option.length}
                                    className="flex items-center space-x-2"
                                >
                                    <Checkbox
                                        id={`stock-${option.length}`}
                                        checked={isSelected}
                                        onCheckedChange={(checked) =>
                                            handleToggle(option, checked as boolean)
                                        }
                                    />
                                    <Label htmlFor={`stock-${option.length}`}>
                                        {option.name || `${option.lengthFeet}ft (${option.length}mm)`}
                                    </Label>
                                </div>
                            );
                        })}
                    </div>
                    {selectedOptions.length === 0 && (
                        <p className="text-sm text-red-500">
                            Please select at least one stock length.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

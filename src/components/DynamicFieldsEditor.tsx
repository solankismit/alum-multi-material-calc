import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import type { CustomFieldDefinitionData } from "@/utils/customFields";
import type { ItemSpecDetails } from "@/utils/quotationPricing";

interface DynamicFieldsEditorProps {
    definitions: CustomFieldDefinitionData[];
    values: ItemSpecDetails | undefined;
    onChange: (updates: ItemSpecDetails) => void;
    className?: string;
    inputClassName?: string;
}

/** Renders one input per active field definition — Input for TEXT, Textarea
 * for TEXTAREA, Select for SELECT — shared by ManualSectionForm.tsx and
 * QuotationBuilder.tsx's section-type defaults/per-item override panels so
 * the type-to-input mapping lives in exactly one place. */
export default function DynamicFieldsEditor({
    definitions,
    values,
    onChange,
    className = "grid grid-cols-2 md:grid-cols-3 gap-2",
    inputClassName = "h-8 text-xs",
}: DynamicFieldsEditorProps) {
    const activeDefinitions = definitions.filter((d) => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder);

    if (activeDefinitions.length === 0) return null;

    return (
        <div className={className}>
            {activeDefinitions.map((def) => {
                const value = values?.[def.key] ?? "";
                const isWide = def.type === "TEXTAREA";
                return (
                    <div key={def.key} className={isWide ? "col-span-2 md:col-span-3" : undefined}>
                        <Label className="text-[11px] mb-0.5 leading-tight">{def.label}</Label>
                        {def.type === "TEXTAREA" ? (
                            <Textarea
                                className={`min-h-0 ${inputClassName}`}
                                value={value}
                                onChange={(e) => onChange({ [def.key]: e.target.value })}
                            />
                        ) : def.type === "SELECT" ? (
                            <Select value={value || undefined} onValueChange={(next) => onChange({ [def.key]: next })}>
                                <SelectTrigger className={inputClassName}>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {def.options.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                className={inputClassName}
                                value={value}
                                onChange={(e) => onChange({ [def.key]: e.target.value })}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

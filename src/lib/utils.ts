import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const uiStyles = {
    card: "bg-white border border-slate-200 rounded-xl shadow-sm",
    cardHover: "transition-all hover:shadow-md hover:border-slate-300",
    selectableButton: {
        base: "border-2 transition-all duration-200",
        active: "border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm",
        inactive: "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50",
    }
}

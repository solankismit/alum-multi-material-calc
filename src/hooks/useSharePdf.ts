"use client";

import { useEffect, useState, type RefObject } from "react";
import { generatePdfFile } from "@/utils/generatePdfBlob";

/**
 * Generates the shareable PDF once, on mount, from the element a ref points
 * at — the same generatePdfFile used everywhere a document gets turned into
 * a PDF — and hands back the resulting File. This is the only place PDF
 * generation happens; WhatsAppShareButton itself stays a dumb "given a file,
 * share it or hide" component and does no generation of its own.
 *
 * Takes a ref rather than an element id: an id string only resolves via a
 * `document.getElementById` lookup (fragile if the id is ever duplicated or
 * renamed), where a ref points at the exact node React already mounted.
 */
export function useSharePdf(ref: RefObject<HTMLElement | null>, filename: string): File | null {
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        let cancelled = false;
        generatePdfFile(element, filename)
            .then((f) => {
                if (!cancelled) setFile(f);
            })
            .catch((err) => {
                console.error("PDF generation for WhatsApp share failed:", err);
            });
        return () => {
            cancelled = true;
        };
    }, [ref, filename]);

    return file;
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { generatePdfFile } from "@/utils/generatePdfBlob";

interface WhatsAppShareButtonProps {
    /** Pre-filled message text — used as the share caption on supported browsers,
     * or as the WhatsApp message body on the text-only fallback. */
    message: string;
    /** Client/recipient phone number, any format — digits are extracted automatically.
     * Only used by the text-only fallback (the Web Share API has no "recipient" concept;
     * the user picks the chat themselves in the OS share sheet). */
    phone?: string | null;
    /** id of the DOM element to render into the shared PDF. */
    elementId: string;
    /** Filename for the generated PDF. */
    filename: string;
    label?: string;
    className?: string;
}

function extractDigits(phone?: string | null): string {
    if (!phone) return "";
    // wa.me expects a full international number with no leading zero/plus/spaces.
    // A bare 10-digit Indian mobile number is assumed to need the country code.
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `91${digits}`;
    return digits.replace(/^0+/, "");
}

/** A small WhatsApp brand mark — lucide-react has no brand icon set, so this is
 * an inline SVG rather than pulling in an icon library for one glyph. */
function WhatsAppIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.129-.606.148-.15.297-.347.446-.52.15-.174.198-.298.298-.497.099-.198.05-.371-.05-.52-.099-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.075-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.059 3.146 4.995 4.286 2.937 1.14 2.937.76 3.469.71.53-.05 1.759-.72 2.006-1.413.247-.694.247-1.29.173-1.413-.075-.124-.272-.198-.57-.347M12.05 22c-1.71 0-3.386-.46-4.85-1.33l-.348-.207-3.61.947.966-3.518-.227-.361A9.95 9.95 0 0 1 2.05 12C2.05 6.5 6.55 2 12.05 2s10 4.5 10 10-4.5 10-10 10m8.408-18.408A11.815 11.815 0 0 0 12.05.163C5.61.163.163 5.611.163 12.05c0 2.14.564 4.14 1.632 5.926L.05 23.837l5.965-1.677a11.9 11.9 0 0 0 6.035 1.64h.005c6.44 0 11.888-5.447 11.888-11.887a11.82 11.82 0 0 0-3.485-8.32" />
        </svg>
    );
}

function buildWaUrl(message: string, phone?: string | null) {
    const digits = extractDigits(phone);
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Shares the rendered document as an actual PDF via the Web Share API (which
 * puts WhatsApp in the OS share sheet with the file pre-attached) on browsers
 * that support sharing files — mainly Chrome on Android and recent desktop
 * Chrome/Edge. Safari and Firefox don't support file sharing, so those fall
 * back to opening WhatsApp with just a pre-filled text message — the PDF
 * still needs to be saved (Print / Save PDF) and attached by hand there.
 */
export default function WhatsAppShareButton({ message, phone, elementId, filename, label = "Share on WhatsApp", className = "" }: WhatsAppShareButtonProps) {
    const [sharing, setSharing] = useState(false);

    const handleShare = async () => {
        // PDF generation below is async, and by the time it resolves the browser
        // may no longer treat this as "triggered by a user gesture" — a fallback
        // window.open() at that point gets silently popup-blocked. Opening a
        // blank tab synchronously, here, inside the click handler, preserves
        // that gesture; its location gets pointed at the real URL once ready.
        const fallbackTab = window.open("", "_blank");

        setSharing(true);
        try {
            const file = await generatePdfFile(elementId, filename);
            const canShareFile = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

            if (canShareFile && navigator.share) {
                fallbackTab?.close();
                await navigator.share({ files: [file], text: message });
                return;
            }

            // Fallback: hand the user the PDF directly, then point the
            // pre-opened tab at WhatsApp with the message text pre-filled so
            // they only have to attach the file.
            const blobUrl = URL.createObjectURL(file);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(blobUrl);
            if (fallbackTab) fallbackTab.location.href = buildWaUrl(message, phone);
        } catch (err) {
            // AbortError means the user cancelled the OS share sheet — not a real failure.
            if ((err as Error)?.name !== "AbortError") {
                console.error("WhatsApp share failed:", err);
                if (fallbackTab) fallbackTab.location.href = buildWaUrl(message, phone);
            } else {
                fallbackTab?.close();
            }
        } finally {
            setSharing(false);
        }
    };

    return (
        <Button
            type="button"
            onClick={handleShare}
            variant="outline"
            isLoading={sharing}
            className={`border-slate-300 text-[#25D366] hover:bg-[#25D366]/10 ${className}`}
        >
            {!sharing && <WhatsAppIcon className="w-4 h-4 mr-2" />}
            {sharing ? "Preparing PDF..." : label}
        </Button>
    );
}

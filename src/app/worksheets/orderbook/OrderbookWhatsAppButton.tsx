"use client";

import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import { usePrintableShareFile } from "./PrintableWithShare";

export default function OrderbookWhatsAppButton({ message }: { message: string }) {
    const file = usePrintableShareFile();
    return <WhatsAppShareButton file={file} message={message} />;
}

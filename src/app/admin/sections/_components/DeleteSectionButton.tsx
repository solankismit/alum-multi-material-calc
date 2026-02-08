"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface DeleteSectionButtonProps {
    sectionId: string;
    sectionName: string;
}

export default function DeleteSectionButton({ sectionId, sectionName }: DeleteSectionButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${sectionName}"? This cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/sections/${sectionId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error("Failed to delete section");
            }

            router.refresh();
        } catch (error) {
            console.error(error);
            alert("Failed to delete section");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span className="sr-only">Delete</span>
        </Button>
    );
}

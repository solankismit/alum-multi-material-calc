"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "./ui/Button";

export default function LogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
            });
            router.refresh();
            router.push("/login");
        } catch (error) {
            console.error("Logout failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            isLoading={loading}
            className="text-gray-600 hover:text-red-600"
        >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
        </Button>
    );
}

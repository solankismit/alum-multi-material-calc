import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProfileForm } from "./ProfileForm";

export default async function SettingsPage() {
    const session = await verifySession();
    const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true, company: true },
    });

    if (!user) return redirect("/login");

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Settings</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal and company details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProfileForm
                            initialName={user.name || ""}
                            initialCompany={user.company || ""}
                            email={user.email}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

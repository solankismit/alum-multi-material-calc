import { verifySession } from "@/lib/session";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Receipt } from "lucide-react";
import { ProfileForm } from "./ProfileForm";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function SettingsPage() {
    const session = await verifySession();
    const user = await db.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true, company: true, businessAddress: true, businessPhone: true, gstNumber: true },
    });

    if (!user) return redirect("/login");

    return (
        <PageContainer size="narrow">
                <h1 className="text-2xl font-bold mb-6 text-text">Settings</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal and company details.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProfileForm
                            initialName={user.name || ""}
                            initialCompany={user.company || ""}
                            initialBusinessAddress={user.businessAddress || ""}
                            initialBusinessPhone={user.businessPhone || ""}
                            initialGstNumber={user.gstNumber || ""}
                            email={user.email}
                        />
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Quotation Rate Card</CardTitle>
                        <CardDescription>Set your material and labor pricing once, reused on every quotation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/dashboard/rate-card">
                            <Button variant="outline">
                                <Receipt className="w-4 h-4 mr-2" />
                                Manage Rate Card
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
        </PageContainer>
    );
}

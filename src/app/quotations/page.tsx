import Link from "next/link";
import { listQuotations } from "./actions";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ArrowLeft, FileText, Plus } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    SENT: "bg-blue-100 text-blue-700",
    ACCEPTED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
};

export default async function QuotationsListPage() {
    const res = await listQuotations();
    const quotations = res.data;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
                        <p className="text-sm text-slate-500">All quotations you have created.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard">
                            <Button variant="ghost">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Dashboard
                            </Button>
                        </Link>
                        <Link href="/quotations/create">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                New Quotation
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>All Quotations</CardTitle>
                        <CardDescription>{quotations.length} total</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {quotations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No quotations yet</h3>
                                <p className="mt-1 text-sm text-gray-500 max-w-sm">
                                    Create one from a saved worksheet, or start a new one directly.
                                </p>
                                <div className="mt-6">
                                    <Link href="/quotations/create">
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            New Quotation
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-500 border-b">
                                        <tr>
                                            <th className="py-3 px-2 font-medium">Quote No.</th>
                                            <th className="py-3 px-2 font-medium">Client</th>
                                            <th className="py-3 px-2 font-medium">Date</th>
                                            <th className="py-3 px-2 font-medium">Status</th>
                                            <th className="py-3 px-2 font-medium text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quotations.map((q) => (
                                            <tr key={q.id} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-3 px-2">
                                                    <Link href={`/quotations/${q.id}`} className="font-medium text-indigo-600 hover:text-indigo-800">
                                                        {q.quotationNumber || q.id.slice(0, 8)}
                                                    </Link>
                                                </td>
                                                <td className="py-3 px-2 text-gray-700">{q.clientName || "—"}</td>
                                                <td className="py-3 px-2 text-gray-500">{new Date(q.createdAt).toLocaleDateString()}</td>
                                                <td className="py-3 px-2">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[q.status]}`}>{q.status}</span>
                                                </td>
                                                <td className="py-3 px-2 text-right font-medium">{formatCurrency(q.totalAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

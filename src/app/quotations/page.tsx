import Link from "next/link";
import { listQuotations } from "./actions";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { PageContainer } from "@/components/layout/PageContainer";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import QuotationStatusCell from "./QuotationStatusCell";

export default async function QuotationsListPage() {
    const res = await listQuotations();
    const quotations = res.data;

    return (
        <PageContainer contentClassName="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">Quotations</h1>
                    <p className="text-sm text-text-muted">All quotations you have created.</p>
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
                            <FileText className="h-12 w-12 text-text-muted mb-4" />
                            <h3 className="text-lg font-medium text-text">No quotations yet</h3>
                            <p className="mt-1 text-sm text-text-muted max-w-sm">
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
                        <>
                            {/* Mobile card view */}
                            <div className="grid grid-cols-1 gap-3 md:hidden">
                                {quotations.map((q) => (
                                    <Link
                                        key={q.id}
                                        href={`/quotations/${q.id}`}
                                        className="block rounded-xl border border-border bg-surface p-4 hover:border-border-strong"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="font-semibold text-primary">
                                                {q.quotationNumber || q.id.slice(0, 8)}
                                            </span>
                                            <QuotationStatusCell id={q.id} status={q.status} />
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-text-muted">{q.clientName || "—"}</span>
                                            <span className="font-medium text-text">{formatCurrency(q.totalAmount)}</span>
                                        </div>
                                        <div className="text-xs text-text-muted mt-1">
                                            {new Date(q.createdAt).toLocaleDateString()}
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {/* Desktop table view */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Quote No.</TableHead>
                                            <TableHead>Client</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {quotations.map((q) => (
                                            <TableRow key={q.id}>
                                                <TableCell>
                                                    <Link href={`/quotations/${q.id}`} className="font-medium text-primary hover:text-primary-hover">
                                                        {q.quotationNumber || q.id.slice(0, 8)}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{q.clientName || "—"}</TableCell>
                                                <TableCell className="text-text-muted">{new Date(q.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <QuotationStatusCell id={q.id} status={q.status} />
                                                </TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(q.totalAmount)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </PageContainer>
    );
}

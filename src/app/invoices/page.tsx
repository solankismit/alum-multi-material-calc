import Link from "next/link";
import { listInvoices } from "./actions";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { PageContainer } from "@/components/layout/PageContainer";
import { ArrowLeft, Receipt, Plus } from "lucide-react";
import InvoiceStatusCell from "./InvoiceStatusCell";

export default async function InvoicesListPage() {
    const res = await listInvoices();
    const invoices = res.data;

    return (
        <PageContainer contentClassName="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text">Invoices</h1>
                    <p className="text-sm text-text-muted">All invoices you have created.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard">
                        <Button variant="ghost">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Dashboard
                        </Button>
                    </Link>
                    <Link href="/invoices/create">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Invoice
                        </Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Invoices</CardTitle>
                    <CardDescription>{invoices.length} total</CardDescription>
                </CardHeader>
                <CardContent>
                    {invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Receipt className="h-12 w-12 text-text-muted mb-4" />
                            <h3 className="text-lg font-medium text-text">No invoices yet</h3>
                            <p className="mt-1 text-sm text-text-muted max-w-sm">
                                Create one directly, or generate one from an existing quotation.
                            </p>
                            <div className="mt-6">
                                <Link href="/invoices/create">
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Invoice
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Mobile card view */}
                            <div className="grid grid-cols-1 gap-3 md:hidden">
                                {invoices.map((inv) => (
                                    <Link
                                        key={inv.id}
                                        href={`/invoices/${inv.id}`}
                                        className="block rounded-xl border border-border bg-surface p-4 hover:border-border-strong"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="font-semibold text-primary">
                                                {inv.invoiceNumber || "Draft — not yet numbered"}
                                            </span>
                                            <InvoiceStatusCell id={inv.id} status={inv.status} />
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-text-muted">{inv.buyerName || "—"}</span>
                                        </div>
                                        <div className="text-xs text-text-muted mt-1">
                                            {new Date(inv.createdAt).toLocaleDateString()}
                                        </div>
                                    </Link>
                                ))}
                            </div>

                            {/* Desktop table view */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice No.</TableHead>
                                            <TableHead>Buyer</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoices.map((inv) => (
                                            <TableRow key={inv.id}>
                                                <TableCell>
                                                    <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:text-primary-hover">
                                                        {inv.invoiceNumber || <span className="text-text-muted font-normal italic">Draft — not yet numbered</span>}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{inv.buyerName || "—"}</TableCell>
                                                <TableCell className="text-text-muted">{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <InvoiceStatusCell id={inv.id} status={inv.status} />
                                                </TableCell>
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

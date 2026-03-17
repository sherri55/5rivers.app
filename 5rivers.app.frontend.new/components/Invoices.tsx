
import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { InvoiceStatus, Invoice } from '../types';
import { GET_INVOICES } from '../lib/graphql/invoices';
import { mapInvoiceNodeToUi } from '../lib/mapInvoiceToUi';

const PAGE_SIZE = 100;

const Invoices: React.FC = () => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { data, loading, error } = useQuery(GET_INVOICES, {
    variables: { pagination: { limit: PAGE_SIZE, offset: 0 } },
  });
  const invoices = useMemo(() => {
    const list = data?.invoices ?? [];
    return list.map((node: any) => mapInvoiceNodeToUi(node));
  }, [data]);

  const getStatusStyle = (status: InvoiceStatus): string => {
    switch (status) {
      case InvoiceStatus.PAID: return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-primary dark:border-primary/20';
      case InvoiceStatus.OVERDUE: return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';
      case InvoiceStatus.SENT: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
      default: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-navy dark:text-white">Invoice Records</h2>
        {loading && <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>}
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white dark:bg-navy-light border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 hover:bg-slate-50 transition-all">
            <span className="material-symbols-outlined text-sm">filter_list</span> Filter
          </button>
          <button className="px-4 py-2 bg-navy text-white dark:bg-primary dark:text-navy rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-sm">download</span> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-navy-light rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">ID</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Customer</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Date Issued</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Due Date</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Amount</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map(invoice => (
              <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => setSelectedInvoice(invoice)}>
                <td className="px-6 py-4">
                  <span className="font-mono text-sm font-bold text-navy dark:text-white group-hover:text-primary">{invoice.id}</span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-navy dark:text-slate-300">{invoice.customer}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{invoice.date}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{invoice.dueDate}</td>
                <td className="px-6 py-4 font-mono text-sm font-black text-navy dark:text-white">${invoice.amount.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">visibility</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
};

const InvoiceDetailModal: React.FC<{ invoice: Invoice, onClose: () => void }> = ({ invoice, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm">
    <div className="bg-white dark:bg-navy-light w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Invoice Preview: {invoice.id}</h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-white">
        <div className="max-w-xl mx-auto border border-slate-200 p-8 shadow-sm">
          <div className="flex justify-between items-start mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-navy p-1.5 rounded-lg text-primary">
                  <span className="material-symbols-outlined font-bold text-xl">local_shipping</span>
                </div>
                <h1 className="text-xl font-black italic text-navy tracking-tight">5RIVERS LOGISTICS</h1>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
                123 Logistics Way<br />
                Toronto, ON M5V 2L7<br />
                +1 (800) 555-5RIV
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-black text-navy uppercase tracking-tighter mb-2">INVOICE</h2>
              <p className="text-xs font-mono font-bold text-slate-500 uppercase">{invoice.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Billed To</p>
              <p className="text-sm font-bold text-navy">{invoice.customer}</p>
              <p className="text-xs text-slate-500 mt-1">
                456 Corporate Blvd<br />
                Suite 800<br />
                Chicago, IL 60601
              </p>
            </div>
            <div className="text-right space-y-2">
              <div className="flex justify-end gap-4">
                <span className="text-[10px] font-black text-slate-400 uppercase">Issue Date</span>
                <span className="text-xs font-bold text-navy">{invoice.date}</span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="text-[10px] font-black text-slate-400 uppercase">Due Date</span>
                <span className="text-xs font-bold text-navy">{invoice.dueDate}</span>
              </div>
            </div>
          </div>

          <table className="w-full mb-12">
            <thead>
              <tr className="border-y border-navy/10 text-left">
                <th className="py-3 text-[10px] font-black text-slate-500 uppercase">Description</th>
                <th className="py-3 text-[10px] font-black text-slate-500 uppercase text-center">Qty</th>
                <th className="py-3 text-[10px] font-black text-slate-500 uppercase text-right">Rate</th>
                <th className="py-3 text-[10px] font-black text-slate-500 uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-4">
                  <p className="text-xs font-bold text-navy">Fulfillment: {invoice.jobId}</p>
                  <p className="text-[10px] text-slate-500">Standard Freight - Full Truckload (FTL)</p>
                </td>
                <td className="py-4 text-xs font-bold text-navy text-center">1.0</td>
                <td className="py-4 text-xs font-bold text-navy text-right">${invoice.amount.toLocaleString()}</td>
                <td className="py-4 text-xs font-bold text-navy text-right">${invoice.amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-4">
                  <p className="text-xs font-bold text-navy">Fuel Surcharge</p>
                  <p className="text-[10px] text-slate-500">Calculated on standard index rate</p>
                </td>
                <td className="py-4 text-xs font-bold text-navy text-center">1.0</td>
                <td className="py-4 text-xs font-bold text-navy text-right">$120.00</td>
                <td className="py-4 text-xs font-bold text-navy text-right">$120.00</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-48 space-y-3">
              <div className="flex justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Subtotal</span>
                <span className="text-xs font-bold text-navy">${(invoice.amount + 120).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tax (0%)</span>
                <span className="text-xs font-bold text-navy">$0.00</span>
              </div>
              <div className="pt-3 border-t-2 border-navy flex justify-between">
                <span className="text-xs font-black text-navy uppercase">Total Due</span>
                <span className="text-sm font-black text-navy">${(invoice.amount + 120).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
        <button className="flex-1 py-3 bg-navy text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-lg">print</span> Print Invoice
        </button>
        <button className="flex-1 py-3 bg-primary text-navy rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-lg">mail</span> Send to Client
        </button>
      </div>
    </div>
  </div>
);

export default Invoices;

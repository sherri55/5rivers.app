// pages/invoices.tsx
"use client";
import React, { useState, useMemo, useEffect } from "react";
import Head from "next/head";
import { format, addDays } from "date-fns";
import Modal from "react-modal";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import {
  DocumentIcon,
  ViewfinderCircleIcon,
  DocumentArrowDownIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { InvoiceFilters } from "@/components/invoice/InvoiceFilters";
import { InvoiceTable } from "@/components/invoice/InvoiceTable";
import { InvoiceDeleteModal } from "@/components/invoice/InvoiceDeleteModal";
import { InvoiceDetailModal } from "@/components/invoice/InvoiceDetailModal";
import { ToastProvider, Toast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  CREATE_INVOICE,
  DELETE_INVOICE,
  mutateGraphQL,
  fetchGraphQL,
  GET_INVOICES,
  GET_JOBS,
  GET_COMPANIES,
  GET_DISPATCHERS,
  GET_JOBTYPES,
  GET_UNITS,
  GET_INVOICELINES_BY_INVOICE,
  fetchGraphQL as fetchGraphQLInvoiceLine,
  GET_DRIVERS,
} from "../../lib/graphql-client";

// Set up modal for accessibility
Modal.setAppElement("body");

export default function InvoiceManagementPage() {
  const [tabIndex, setTabIndex] = useState(0);
  const [filters, setFilters] = useState({
    start: "",
    end: "",
    dispatcher: "",
    company: "",
    unit: "",
  });
  const [selectedJobs, setSelectedJobs] = useState<Record<string, boolean>>({});
  const [viewInvoice, setViewInvoice] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [invoices, setInvoices] = useState([]);

  const [jobs, setJobs] = useState<any[]>([]);
  const [jobTypes, setJobTypes] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [dispatchers, setDispatchers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [invoiceLines, setInvoiceLines] = useState<any[]>([]);
  const [loadingInvoiceLines, setLoadingInvoiceLines] = useState(false);
  const [errorInvoiceLines, setErrorInvoiceLines] = useState<any>(null);

  const fetchAll = async () => {
    debugger;
    setLoading(true);
    try {
      const [
        jobsRes,
        jobTypesRes,
        driversRes,
        dispatchersRes,
        companiesRes,
        unitsRes,
        invoicesRes,
      ] = await Promise.all([
        fetchGraphQL(GET_JOBS),
        fetchGraphQL(GET_JOBTYPES),
        fetchGraphQL(GET_DRIVERS),
        fetchGraphQL(GET_DISPATCHERS),
        fetchGraphQL(GET_COMPANIES),
        fetchGraphQL(GET_UNITS),
        fetchGraphQL(GET_INVOICES),
      ]);
      setJobs(jobsRes?.jobs || []);
      setJobTypes(jobTypesRes?.jobTypes || []);
      setDrivers(driversRes?.drivers || []);
      setDispatchers(dispatchersRes?.dispatchers || []);
      setCompanies(companiesRes?.companies || []);
      setUnits(unitsRes?.units || []);
      setInvoices(invoicesRes?.invoices || []);
    } catch (e: any) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (viewInvoice && viewInvoice.invoiceId) {
      setLoadingInvoiceLines(true);
      fetchGraphQLInvoiceLine(GET_INVOICELINES_BY_INVOICE, {
        invoiceId: viewInvoice.invoiceId,
      })
        .then((res) => setInvoiceLines(res?.invoiceLinesByInvoice || []))
        .catch((e) => setErrorInvoiceLines(e))
        .finally(() => setLoadingInvoiceLines(false));
    }
  }, [viewInvoice]);

  // Filter jobs by date, dispatcher, company, unit
  const filteredJobs = useMemo(() => {
    return jobs
      .filter((job: any) => {
        const d = new Date(job.dateOfJob);
        const after = filters.start ? d >= new Date(filters.start) : true;
        const before = filters.end
          ? d <= addDays(new Date(filters.end), 1)
          : true;
        const byDisp = filters.dispatcher
          ? job.dispatcherId === filters.dispatcher
          : true;
        const jt = jobTypes.find((jt: any) => jt.jobTypeId === job.jobTypeId);
        const byComp = filters.company
          ? jt?.companyId === filters.company
          : true;
        const byUnit = filters.unit ? job.unitId === filters.unit : true;
        return after && before && byDisp && byComp && byUnit;
      })
      .sort(
        (a: any, b: any) =>
          new Date(a.dateOfJob).getTime() - new Date(b.dateOfJob).getTime()
      );
  }, [jobs, jobTypes, filters]);

  if (loading) return <LoadingSpinner />;

  // Map to rows for InvoiceTable
  const jobRows = filteredJobs.map((job: any) => ({
    jobId: job.jobId,
    dateOfJob: job.dateOfJob,
    unitName: units.find((unit: any) => unit.unitId === job.unitId)?.name || "",
    driverName:
      drivers.find((dr: any) => dr.driverId === job.driverId)?.name || "",
    dispatchType:
      jobTypes.find((jt: any) => jt.jobTypeId === job.jobTypeId)
        ?.dispatchType || "",
    dispatcher:
      dispatchers.find((ds: any) => ds.dispatcherId === job.dispatcherId)
        ?.name || "",
    location: (() => {
      const jobType = jobTypes.find(
        (jt: any) => jt.jobTypeId === job.jobTypeId
      );
      if (jobType) {
        return jobType.startLocation + " → " + jobType.endLocation;
      }
      return "";
    })(),
    amount: job.jobGrossAmount,
  }));

  // Toggle row selection
  const toggleSelect = (id: string) =>
    setSelectedJobs((prev) => ({ ...prev, [id]: !prev[id] }));
  const generateDisabled = !Object.values(selectedJobs).some((v) => v === true);

  // Create invoice and (TODO) trigger PDF
  const handleGenerate = async () => {
    const selected = filteredJobs.filter((j: any) => selectedJobs[j.jobId]);
    if (selected.length === 0) {
      Toast.error("No jobs selected");
      return;
    }
    const sub = selected.reduce(
      (sum: number, j: any) => sum + j.jobGrossAmount,
      0
    );
    const pct = 5;
    const comm = sub * 0.05;
    const hst = sub * 0.13;
    const tot = sub + hst - comm;

    await mutateGraphQL(CREATE_INVOICE, {
      input: {
        invoiceNumber: `INV-${Date.now()}`,
        subTotal: sub,
        dispatchPercent: pct,
        comm,
        hst,
        total: tot,
      },
    });
    // TODO: generate PDF via jsPDF & autoTable
  };

  // Confirm deletion
  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await mutateGraphQL(DELETE_INVOICE, { invoiceId: deleteId });
    }
    setDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Head>
        <title>Invoice Management</title>
      </Head>
      <ToastProvider />
      <div className="container mx-auto p-6">
        <PageHeader title="Invoice Management" icon={<DocumentIcon />} />

        <Tabs selectedIndex={tabIndex} onSelect={(index) => setTabIndex(index)}>
          <TabList className="flex border-b border-gray-200 mb-4">
            <Tab
              className={`px-4 py-2 ${
                tabIndex === 0
                  ? "border-b-2 border-indigo-500 text-indigo-600"
                  : "text-gray-500"
              }`}
            >
              Generate
            </Tab>
            <Tab
              className={`px-4 py-2 ${
                tabIndex === 1
                  ? "border-b-2 border-indigo-500 text-indigo-600"
                  : "text-gray-500"
              }`}
            >
              View
            </Tab>
          </TabList>

          <TabPanel>
            <Card className="mb-6">
              <InvoiceFilters
                filters={filters}
                setFilters={setFilters}
                dispatchers={dispatchers}
                companies={companies}
                units={units}
              />
            </Card>

            <Card className="mb-6 overflow-auto">
              <InvoiceTable
                jobs={jobRows}
                selected={selectedJobs}
                toggleSelect={toggleSelect}
                generateDisabled={generateDisabled}
                onGenerate={handleGenerate}
              />
            </Card>
          </TabPanel>

          <TabPanel>
            <Card className="overflow-auto">
              <Table
                headers={[
                  "#",
                  "Invoice #",
                  "Date",
                  "Unit",
                  "Driver",
                  "Dispatcher",
                  "Location",
                  "Subtotal",
                  "Total",
                  "Actions",
                ]}
                isLoading={false}
                emptyState={
                  <EmptyState
                    title="No invoices found"
                    description="Generate an invoice first"
                    icon={undefined}
                  />
                }
              >
                {invoices.map((inv: any, idx: number) => {
                  // Find unit, driver, dispatcher, and location for this invoice (if available)
                  let unitName = "";
                  let driverName = "";
                  let dispatcherName = "";
                  let location = "";
                  if (inv.jobs && inv.jobs.length > 0) {
                    // Use first job for display
                    const job = jobs.find((j: any) => j.jobId === inv.jobs[0]);
                    unitName = job?.unitName || "";
                    driverName = job?.driverName || "";
                    if (job?.dispatcherId) {
                      const dispatcher = dispatchers.find(
                        (d: any) => d.dispatcherId === job.dispatcherId
                      );
                      dispatcherName = dispatcher?.name || "";
                    }
                    if (job?.jobTypeId) {
                      const jobType = jobTypes.find(
                        (jt: any) => jt.jobTypeId === job.jobTypeId
                      );
                      if (jobType) {
                        if (jobType.startLocation && jobType.endLocation) {
                          location = `${jobType.startLocation} → ${jobType.endLocation}`;
                        } else if (jobType.startLocation) {
                          location = jobType.startLocation;
                        } else if (jobType.endLocation) {
                          location = jobType.endLocation;
                        }
                      }
                    }
                  }
                  return (
                    <tr key={inv.invoiceId} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2">
                        {inv.createdAt &&
                        !isNaN(new Date(inv.createdAt).getTime())
                          ? format(new Date(inv.createdAt), "MMM dd, yyyy")
                          : "N/A"}
                      </td>
                      <td className="px-4 py-2">{unitName}</td>
                      <td className="px-4 py-2">{driverName}</td>
                      <td className="px-4 py-2">{dispatcherName}</td>
                      <td className="px-4 py-2">{location}</td>
                      <td className="px-4 py-2">${inv.subTotal.toFixed(2)}</td>
                      <td className="px-4 py-2">${inv.total.toFixed(2)}</td>
                      <td className="px-4 py-2 flex space-x-2">
                        <Button size="sm" onClick={() => setViewInvoice(inv)}>
                          <ViewfinderCircleIcon className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            /* TODO: regenerate PDF */
                          }}
                        >
                          <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setDeleteId(inv.invoiceId)}
                          variant="danger"
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </Table>
            </Card>
          </TabPanel>
        </Tabs>
      </div>

      <InvoiceDetailModal
        invoice={viewInvoice}
        isOpen={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        invoiceLines={invoiceLines}
        loadingInvoiceLines={loadingInvoiceLines}
        errorInvoiceLines={errorInvoiceLines}
      />

      <InvoiceDeleteModal
        invoiceNumber={deleteId}
        isOpen={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

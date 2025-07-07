import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Neo4jService } from '../database/neo4j';
import CalculationService from './calculationService';

// Initialize pdfMake with fonts
(pdfMake as any).vfs = pdfFonts.vfs;

interface JobData {
  id: string;
  jobDate: string;
  startTime?: string;
  endTime?: string;
  loads?: number;
  weight?: number[]; // Changed from string to number array
  ticketIds?: string[];
  driver?: { name: string };
  unit?: { name: string };
  jobType?: {
    title: string;
    rateOfJob: number;
    dispatchType: string;
    startLocation?: string;
    endLocation?: string;
    company?: { name: string };
  };
  calculatedAmount?: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  billedTo: string;
  billedEmail: string;
  dispatcher: {
    name: string;
    commissionPercent: number;
  };
  jobs: Array<{
    job: JobData;
    amount: number;
  }>;
  calculations: {
    subTotal: number;
    commission: number;
    hst: number;
    total: number;
  };
}

export class PDFService {
  private neo4jService: Neo4jService;

  constructor() {
    this.neo4jService = new Neo4jService();
  }

  async generateInvoicePDF(invoiceId: string): Promise<Buffer> {
    try {
      // Fetch invoice data
      const invoiceData = await this.getInvoiceData(invoiceId);
      
      if (!invoiceData) {
        throw new Error('Invoice not found');
      }

      // Create PDF document definition
      const docDefinition = this.createPDFDefinition(invoiceData);
      
      // Generate PDF
      return new Promise<Buffer>((resolve, reject) => {
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        pdfDocGenerator.getBuffer((buffer: Buffer) => {
          resolve(buffer);
        });
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  private async getInvoiceData(invoiceId: string): Promise<InvoiceData | null> {
    const query = `
      MATCH (i:Invoice {id: $invoiceId})-[:BILLED_BY]->(d:Dispatcher)
      OPTIONAL MATCH (i)<-[rel:INVOICED_IN]-(j:Job)-[:OF_TYPE]->(jt:JobType)
      OPTIONAL MATCH (jt)-[:BELONGS_TO]->(c:Company)
      OPTIONAL MATCH (j)-[:ASSIGNED_TO]->(dr:Driver)
      OPTIONAL MATCH (j)-[:USES_UNIT]->(u:Unit)
      RETURN i, d, 
             collect({
               job: j,
               jobType: jt,
               driver: dr,
               unit: u,
               company: c,
               amount: rel.amount
             }) as jobs
    `;

    const result = await this.neo4jService.runQuery(query, { invoiceId });
    
    if (result.length === 0) {
      return null;
    }

    const record = result[0];
    const invoice = record.i.properties;
    const dispatcher = record.d.properties;
    
    const jobs = record.jobs.filter((j: any) => j.job).map((j: any) => ({
      job: {
        ...j.job.properties,
        driver: j.driver?.properties,
        unit: j.unit?.properties,
        jobType: {
          ...j.jobType?.properties,
          company: j.company?.properties
        }
      },
      amount: j.amount
    }));

    // Calculate correct amounts for each job to ensure consistency
    // Import validation service
    const { JobAmountValidationService } = await import('./jobAmountValidationService');
    const validationService = new JobAmountValidationService();
    
    for (const jobEntry of jobs) {
      try {
        // Validate and fix the job amount if needed
        const validation = await validationService.validateAndFixJobAmount(jobEntry.job.id);
        
        if (validation.wasFixed) {
          console.warn(`⚠️ Fixed job amount discrepancy for job ${jobEntry.job.id}: $${validation.currentAmount} → $${validation.calculatedAmount}`);
        }
        
        // Always use the calculated amount for consistency
        jobEntry.job.calculatedAmount = validation.calculatedAmount;
      } catch (error) {
        console.warn(`Error validating amount for job ${jobEntry.job.id}:`, error);
        // Fall back to calculated amount directly
        try {
          const calculatedAmount = await CalculationService.calculateJobAmount(jobEntry.job.id);
          jobEntry.job.calculatedAmount = calculatedAmount;
        } catch (calcError) {
          console.warn(`Error calculating amount for job ${jobEntry.job.id}:`, calcError);
          jobEntry.job.calculatedAmount = jobEntry.amount || 0;
        }
      }
    }
    
    await validationService.close();

    // Calculate invoice totals
    const calculations = await CalculationService.getInvoiceCalculations(invoiceId);

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      billedTo: invoice.billedTo,
      billedEmail: invoice.billedEmail,
      dispatcher: {
        name: dispatcher.name,
        commissionPercent: dispatcher.commissionPercent
      },
      jobs,
      calculations
    };
  }

  private createPDFDefinition(invoiceData: InvoiceData): any {
    // Helper function to parse dates
    const parseDate = (dateString: string): string => {
      try {
        return new Date(dateString).toLocaleDateString();
      } catch {
        return dateString;
      }
    };

    // Helper function to parse ticket IDs
    const parseTicketIds = (ticketIds: any): string => {
      if (!ticketIds) return '';
      if (Array.isArray(ticketIds)) {
        return ticketIds.join(', ');
      }
      if (typeof ticketIds === 'string') {
        try {
          const parsed = JSON.parse(ticketIds);
          return Array.isArray(parsed) ? parsed.join(', ') : ticketIds;
        } catch {
          return ticketIds;
        }
      }
      return String(ticketIds);
    };

    // Helper function to calculate value for HRS/TON/LOADS column
    const calculateValue = (job: JobData): string => {
      const dispatchType = job.jobType?.dispatchType?.toLowerCase();
      
      if (dispatchType === 'hourly') {
        if (job.startTime && job.endTime) {
          const [sh, sm] = job.startTime.split(':').map(Number);
          const [eh, em] = job.endTime.split(':').map(Number);
          const start = sh * 60 + sm;
          let end = eh * 60 + em;
          if (end < start) end += 24 * 60; // Handle overnight jobs
          const hours = (end - start) / 60;
          return hours.toFixed(2);
        }
        return '';
      } else if (dispatchType === 'tonnage') {
        if (job.weight && Array.isArray(job.weight)) {
          const totalWeight = job.weight.reduce((sum: number, w: number) => sum + (parseFloat(String(w)) || 0), 0);
          return totalWeight.toFixed(2);
        } else if (job.weight) {
          // Legacy format handling for backward compatibility
          let weights: number[] = [];
          const weightValue = job.weight as any; // Type assertion for legacy compatibility
          if (typeof weightValue === 'string') {
            // Try to parse as JSON array first
            if (weightValue.trim().startsWith('[') && weightValue.trim().endsWith(']')) {
              try {
                const weightsArray = JSON.parse(weightValue);
                if (Array.isArray(weightsArray)) {
                  weights = weightsArray.map((w: any) => parseFloat(w) || 0);
                }
              } catch {
                // Fall back to space-separated parsing
                weights = weightValue.split(' ').map((w: string) => parseFloat(w.trim()) || 0).filter((w: number) => !isNaN(w));
              }
            } else {
              // Split by spaces and parse
              weights = weightValue.split(' ').map((w: string) => parseFloat(w.trim()) || 0).filter((w: number) => !isNaN(w));
            }
          }
          const totalWeight = weights.reduce((sum: number, w: number) => sum + w, 0);
          return totalWeight.toFixed(2);
        }
        return '';
      } else if (dispatchType === 'load' || dispatchType === 'loads') {
        return job.loads?.toString() || '';
      } else if (dispatchType === 'fixed') {
        return '1';
      }
      return '';
    };

    // Group jobs by month/year
    const jobsByMonth = invoiceData.jobs.reduce((groups, jobEntry) => {
      const jobDate = new Date(jobEntry.job.jobDate);
      const monthYear = jobDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(jobEntry);
      return groups;
    }, {} as Record<string, typeof invoiceData.jobs>);

    // Sort months chronologically
    const sortedMonths = Object.keys(jobsByMonth).sort((a, b) => {
      const dateA = new Date(a + ' 1'); // Add day to make it a valid date
      const dateB = new Date(b + ' 1');
      return dateA.getTime() - dateB.getTime();
    });

    // Table header
    const tableHeader = [
      { text: 'Date', style: 'tableHeaderCell' },
      { text: 'Unit', style: 'tableHeaderCell' },
      { text: 'Driver', style: 'tableHeaderCell' },
      { text: 'Customer', style: 'tableHeaderCell' },
      { text: 'Job Description', style: 'tableHeaderCell' },
      { text: 'Tickets', style: 'tableHeaderCell' },
      { text: 'HRS/TON/LOADS', style: 'tableHeaderCell' },
      { text: 'Rate', style: 'tableHeaderCell' },
      { text: 'Amount', style: 'tableHeaderCell' },
    ];

    // Generate table rows grouped by month
    const tableRows: any[] = [];
    
    sortedMonths.forEach((monthName, monthIndex) => {
      const monthJobs = jobsByMonth[monthName];
      
      // Add month header row
      tableRows.push([
        {
          text: monthName,
          style: 'monthHeaderCell',
          colSpan: 9,
          alignment: 'left'
        },
        {}, {}, {}, {}, {}, {}, {}, {}
      ]);

      // Add job rows for this month
      monthJobs.forEach((jobEntry) => {
        const job = jobEntry.job;
        tableRows.push([
          { text: parseDate(job.jobDate), style: 'tableCell' },
          { text: job.unit?.name || '', style: 'tableCell' },
          { text: job.driver?.name || '', style: 'tableCell' },
          { text: job.jobType?.company?.name || '', style: 'tableCell' },
          {
            text: job.jobType?.startLocation && job.jobType?.endLocation
              ? `${job.jobType.startLocation} to ${job.jobType.endLocation}`
              : job.jobType?.title || '',
            style: 'tableCell'
          },
          { text: parseTicketIds(job.ticketIds), style: 'tableCell' },
          { text: calculateValue(job), style: 'tableCell' },
          { text: job.jobType?.rateOfJob ? `$${job.jobType.rateOfJob}` : '', style: 'tableCell' },
          { text: `$${(jobEntry.job.calculatedAmount || 0).toFixed(2)}`, style: 'tableCell' },
        ]);
      });
    });

    const content = [
      // Header section
      {
        columns: [
          [
            { text: '5 Rivers Trucking Inc.', style: 'companyName' },
            {
              text: '140 Cherryhill Place\nLondon, Ontario\nN6H4M5\n+1 (437) 679 9350\ninfo@5riverstruckinginc.ca\nHST #760059956',
              style: 'companyInfo',
              margin: [0, 0, 0, 20],
            },
          ],
          [
            { text: 'INVOICE', style: 'invoiceTitle', alignment: 'right' },
            {
              text: `${invoiceData.invoiceNumber}\nInvoice Date: ${parseDate(invoiceData.invoiceDate)}\nBilled To: ${invoiceData.billedTo}\n${invoiceData.billedEmail}`,
              alignment: 'right',
              style: 'invoiceInfo',
              margin: [0, 10, 0, 0],
            },
          ],
        ],
        columnGap: 40,
        margin: [0, 0, 0, 30],
      },
      // Main table
      {
        style: 'mainTable',
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            tableHeader,
            ...tableRows,
            // Summary rows
            [
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              {
                text: 'SUBTOTAL',
                fontSize: 11,
                bold: true,
                color: 'black',
                alignment: 'right',
                border: [false, true, false, false],
                fillColor: null
              },
              {
                text: `$${invoiceData.calculations.subTotal.toFixed(2)}`,
                fontSize: 11,
                color: 'black',
                alignment: 'right',
                border: [false, true, false, false],
                fillColor: null
              },
            ],
            [
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              {
                text: 'HST (13%)',
                fontSize: 11,
                bold: true,
                color: 'black',
                alignment: 'right',
                border: [false, false, false, false],
                fillColor: null
              },
              {
                text: `$${invoiceData.calculations.hst.toFixed(2)}`,
                fontSize: 11,
                color: 'black',
                alignment: 'right',
                border: [false, false, false, false],
                fillColor: null
              },
            ],
            [
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              {
                text: `COMM. (${invoiceData.dispatcher.commissionPercent?.toFixed(1) || '0'}%)`,
                fontSize: 11,
                bold: true,
                color: 'maroon',
                alignment: 'right',
                border: [false, false, false, false],
                fillColor: null
              },
              {
                text: `- $${invoiceData.calculations.commission.toFixed(2)}`,
                fontSize: 11,
                color: 'maroon',
                alignment: 'right',
                border: [false, false, false, false],
                fillColor: null
              },
            ],
            [
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              { text: '', style: 'tableCell', border: [false, false, false, false] },
              {
                text: 'TOTAL',
                fontSize: 12,
                bold: true,
                color: 'black',
                alignment: 'right',
                border: [false, true, false, false],
                fillColor: null
              },
              {
                text: `$${invoiceData.calculations.total.toFixed(2)}`,
                fontSize: 12,
                bold: true,
                color: 'black',
                alignment: 'right',
                border: [false, true, false, false],
                fillColor: null
              },
            ],
          ],
        },
        layout: {
          fillColor: function (rowIndex: number, node: any, columnIndex: number) {
            if (rowIndex === 0) {
              return '#4a5568'; // Header row
            }
            
            const totalRows = node.table.body.length;
            const summaryRowStart = totalRows - 4;
            
            // Check if this is a summary row (last 4 rows)
            if (rowIndex >= summaryRowStart) {
              return null;
            }
            
            // Check if this is a month header row
            const row = node.table.body[rowIndex];
            if (row && row[0] && row[0].style === 'monthHeaderCell') {
              return '#e2e8f0'; // Light gray for month headers
            }
            
            // Alternate row colors for regular job rows
            return rowIndex % 2 === 1 ? '#f7fafc' : null;
          },
          hLineWidth: function (i: number) {
            return i === 1 ? 2 : 0.5;
          },
          vLineWidth: function () {
            return 0.5;
          },
          hLineColor: function (i: number) {
            return i === 1 ? '#222' : '#aaa';
          },
          vLineColor: function () {
            return '#aaa';
          },
          paddingLeft: function () {
            return 6;
          },
          paddingRight: function () {
            return 6;
          },
          paddingTop: function () {
            return 4;
          },
          paddingBottom: function () {
            return 4;
          },
        },
        margin: [0, 0, 0, 30],
      },
    ];

    return {
      pageOrientation: 'landscape' as const,
      pageMargins: [30, 60, 30, 60],
      content,
      styles: {
        companyName: { fontSize: 20, bold: true, margin: [0, 0, 0, 6], color: 'black' },
        companyInfo: { fontSize: 10, margin: [0, 0, 0, 10], color: 'black' },
        invoiceTitle: { fontSize: 18, bold: true, color: 'black', margin: [0, 0, 0, 10] },
        invoiceInfo: { fontSize: 11, margin: [0, 0, 0, 10], color: 'black' },
        mainTable: { margin: [0, 5, 0, 15] },
        tableHeaderCell: {
          bold: true,
          fontSize: 11,
          color: 'white',
          fillColor: '#4a5568',
          alignment: 'center',
        },
        monthHeaderCell: {
          bold: true,
          fontSize: 12,
          color: '#2d3748',
          fillColor: '#e2e8f0',
          alignment: 'left',
          margin: [4, 6, 4, 6],
        },
        tableCell: {
          fontSize: 10,
          color: 'black',
          alignment: 'left',
          margin: [0, 2, 0, 2],
          noWrap: false,
        },
      },
      defaultStyle: {
        fontSize: 10,
        color: 'black'
      }
    };
  }

  async close() {
    await this.neo4jService.close();
  }
}

export default PDFService;

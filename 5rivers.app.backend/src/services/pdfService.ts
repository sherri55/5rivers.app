import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Neo4jService } from '../database/neo4j';
import CalculationService from './calculationService';
import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';

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
  imageUrls?: string;
  images?: string[];
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
      const docDefinition = await this.createPDFDefinition(invoiceData);
      
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

  async getInvoiceData(invoiceId: string): Promise<InvoiceData | null> {
    const query = `
      MATCH (i:Invoice {id: $invoiceId})-[:BILLED_BY]->(d:Dispatcher)
      OPTIONAL MATCH (i)<-[rel:INVOICED_IN]-(j:Job)-[:OF_TYPE]->(jt:JobType)
      OPTIONAL MATCH (c:Company)-[:HAS_JOB_TYPE]->(jt)
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
    
    // Helper function to parse weights like in resolvers
    const parseWeights = (weight: any): number[] => {
      if (!weight) return [];
      
      // Already an array of numbers
      if (Array.isArray(weight)) {
        return weight.map((w: any) => parseFloat(w) || 0).filter((w: number) => !isNaN(w));
      }
      
      // If it's a number
      if (typeof weight === 'number') {
        return [weight];
      }
      
      // If it's a string, parse it
      if (typeof weight === 'string') {
        // Try to parse as JSON array first
        if (weight.trim().startsWith('[') && weight.trim().endsWith(']')) {
          try {
            const parsed = JSON.parse(weight);
            if (Array.isArray(parsed)) {
              return parsed.map((w: any) => parseFloat(w) || 0).filter((w: number) => !isNaN(w));
            }
          } catch {
            // Fall back to space-separated parsing
          }
        }
        
        // Split by spaces and parse each weight
        return weight.split(' ')
          .map((w: string) => parseFloat(w.trim()) || 0)
          .filter((w: number) => !isNaN(w));
      }
      
      // Try to parse as string
      try {
        const numValue = parseFloat(String(weight));
        return isNaN(numValue) ? [] : [numValue];
      } catch (error) {
        console.warn(`Could not parse weight: ${weight}`, error);
        return [];
      }
    };

    const jobs = record.jobs.filter((j: any) => j.job).map((j: any) => {
      const jobData = {
        ...j.job.properties,
        weight: parseWeights(j.job.properties.weight), // Parse weight properly
        loads: j.job.properties.loads?.toNumber ? j.job.properties.loads.toNumber() : (j.job.properties.loads || 0), // Handle Neo4j integer
        ticketIds: j.job.properties.ticketIds || [], // Ensure ticketIds is preserved
        imageUrls: j.job.properties.imageUrls || '',
        images: j.job.properties.images || [],
        driver: j.driver?.properties,
        unit: j.unit?.properties,
        jobType: {
          ...j.jobType?.properties,
          company: j.company?.properties
        }
      };
      
      
      return {
        job: jobData,
        amount: j.amount
      };
    });

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

  private async createPDFDefinition(invoiceData: InvoiceData): Promise<any> {
    // Helper function to parse dates
    const parseDate = (dateString: string): string => {
      try {
        // Handle date-only strings (YYYY-MM-DD) as local dates to prevent timezone shift
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateString.split('-').map(Number);
          return new Date(year, month - 1, day).toLocaleDateString(); // month is 0-indexed
        }
        
        // For full ISO dates, parse normally
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

    // Helper function to get images for a job
    const getJobImages = async (job: JobData): Promise<any[]> => {
      const imageElements: any[] = [];
      
      // Handle both legacy imageUrls and new images array
      const allImages: string[] = [];
      
      // Add images from images array
      if (job.images && Array.isArray(job.images)) {
        allImages.push(...job.images);
      }
      
      // Add images from legacy imageUrls (if it contains URLs)
      if (job.imageUrls && typeof job.imageUrls === 'string' && job.imageUrls.trim()) {
        try {
          // Try to parse as JSON array first
          if (job.imageUrls.trim().startsWith('[') && job.imageUrls.trim().endsWith(']')) {
            const parsed = JSON.parse(job.imageUrls);
            if (Array.isArray(parsed)) {
              allImages.push(...parsed);
            }
          } else {
            // Fallback to comma/space separated
            const legacyUrls = job.imageUrls.split(/[,\s]+/).filter(url => url.trim().length > 0);
            allImages.push(...legacyUrls);
          }
        } catch (error) {
          console.warn(`Error parsing imageUrls for job ${job.id}:`, error);
        }
      }
      
      // Convert URLs to base64 for PDF embedding
      for (let index = 0; index < allImages.length; index++) {
        const imageUrl = allImages[index];
        try {
          let imagePath = '';
          let imageBase64 = '';
          
          // Handle different URL formats
          if (imageUrl.startsWith('http://localhost:4001/uploads/')) {
            // Full URL from localhost
            imagePath = imageUrl.replace('http://localhost:4001/uploads/', '');
            const fullPath = path.join(process.cwd(), 'uploads', imagePath);
            
            if (fs.existsSync(fullPath)) {
              try {
                // Read the image with Jimp 1.x API
                let image = await Jimp.read(fullPath);
                
                // Detailed debugging for image dimensions
                console.log(`📊 Image analysis for: ${fullPath}`);
                console.log(`   Original dimensions: ${image.bitmap.width}w x ${image.bitmap.height}h`);
                
                // Simple width vs height comparison to detect portrait orientation
                const isPortrait = image.bitmap.height > image.bitmap.width;
                console.log(`   Is portrait (height > width): ${isPortrait} (${image.bitmap.height} > ${image.bitmap.width})`);
                
                if (isPortrait) {
                  console.log(`🔄 ROTATING portrait image from ${image.bitmap.width}x${image.bitmap.height}`);
                  // Rotate 90 degrees clockwise and reassign to ensure it's applied
                  image = image.rotate(90);
                  console.log(`   After rotation: ${image.bitmap.width}w x ${image.bitmap.height}h`);
                  console.log(`   New orientation: ${image.bitmap.height > image.bitmap.width ? 'STILL PORTRAIT' : 'NOW LANDSCAPE'}`);
                } else {
                  console.log(`✅ Image is already landscape: ${image.bitmap.width}w x ${image.bitmap.height}h`);
                }
                
                // Get base64 from the (potentially rotated) image - using newer API
                const base64 = await image.getBase64('image/jpeg');
                console.log(`   Base64 generated: ${base64.length} characters`);
                imageBase64 = base64;
              } catch (jimpError) {
                console.warn(`Error processing image with Jimp: ${fullPath}`, jimpError);
                // Fallback to original processing without rotation
                const imageBuffer = fs.readFileSync(fullPath);
                if (imageBuffer.length > 0) {
                  const base64 = imageBuffer.toString('base64');
                  const ext = path.extname(fullPath).toLowerCase();
                  let mimeType = 'image/jpeg';
                  
                  if (ext === '.png') mimeType = 'image/png';
                  else if (ext === '.gif') mimeType = 'image/gif';
                  else if (ext === '.webp') mimeType = 'image/webp';
                  
                  imageBase64 = `data:${mimeType};base64,${base64}`;
                }
              }
            } else {
              console.warn(`Image file not found: ${fullPath}`);
            }
          } else if (imageUrl.startsWith('https://5riverstruckinginc.ca/uploads/')) {
            // Full URL from production domain
            imagePath = imageUrl.replace('https://5riverstruckinginc.ca/uploads/', '');
            const fullPath = path.join(process.cwd(), 'uploads', imagePath);
            
            if (fs.existsSync(fullPath)) {
              try {
                // Read the image with Jimp 1.x API
                let image = await Jimp.read(fullPath);
                
                // Detailed debugging for image dimensions
                console.log(`📊 Image analysis for: ${fullPath}`);
                console.log(`   Original dimensions: ${image.bitmap.width}w x ${image.bitmap.height}h`);
                
                // Simple width vs height comparison to detect portrait orientation
                const isPortrait = image.bitmap.height > image.bitmap.width;
                console.log(`   Is portrait (height > width): ${isPortrait} (${image.bitmap.height} > ${image.bitmap.width})`);
                
                if (isPortrait) {
                  console.log(`🔄 ROTATING portrait image from ${image.bitmap.width}x${image.bitmap.height}`);
                  // Rotate 90 degrees clockwise and reassign to ensure it's applied
                  image = image.rotate(90);
                  console.log(`   After rotation: ${image.bitmap.width}w x ${image.bitmap.height}h`);
                  console.log(`   New orientation: ${image.bitmap.height > image.bitmap.width ? 'STILL PORTRAIT' : 'NOW LANDSCAPE'}`);
                } else {
                  console.log(`✅ Image is already landscape: ${image.bitmap.width}w x ${image.bitmap.height}h`);
                }
                
                // Get base64 from the (potentially rotated) image - using newer API
                const base64 = await image.getBase64('image/jpeg');
                console.log(`   Base64 generated: ${base64.length} characters`);
                imageBase64 = base64;
              } catch (jimpError) {
                console.warn(`Error processing image with Jimp: ${fullPath}`, jimpError);
                // Fallback to original processing without rotation
                const imageBuffer = fs.readFileSync(fullPath);
                if (imageBuffer.length > 0) {
                  const base64 = imageBuffer.toString('base64');
                  const ext = path.extname(fullPath).toLowerCase();
                  let mimeType = 'image/jpeg';
                  
                  if (ext === '.png') mimeType = 'image/png';
                  else if (ext === '.gif') mimeType = 'image/gif';
                  else if (ext === '.webp') mimeType = 'image/webp';
                  
                  imageBase64 = `data:${mimeType};base64,${base64}`;
                }
              }
            } else {
              console.warn(`Image file not found: ${fullPath}`);
            }
          } else if (imageUrl.startsWith('/uploads/')) {
            // Relative path from database
            imagePath = imageUrl.substring(1); // Remove leading slash
            const fullPath = path.join(process.cwd(), imagePath);
            
            if (fs.existsSync(fullPath)) {
              try {
                // Read the image with Jimp 1.x API
                let image = await Jimp.read(fullPath);
                
                // Detailed debugging for image dimensions
                console.log(`📊 Image analysis for: ${fullPath}`);
                console.log(`   Original dimensions: ${image.bitmap.width}w x ${image.bitmap.height}h`);
                
                // Simple width vs height comparison to detect portrait orientation
                const isPortrait = image.bitmap.height > image.bitmap.width;
                console.log(`   Is portrait (height > width): ${isPortrait} (${image.bitmap.height} > ${image.bitmap.width})`);
                
                if (isPortrait) {
                  console.log(`🔄 ROTATING portrait image from ${image.bitmap.width}x${image.bitmap.height}`);
                  // Rotate 90 degrees clockwise and reassign to ensure it's applied
                  image = image.rotate(90);
                  console.log(`   After rotation: ${image.bitmap.width}w x ${image.bitmap.height}h`);
                  console.log(`   New orientation: ${image.bitmap.height > image.bitmap.width ? 'STILL PORTRAIT' : 'NOW LANDSCAPE'}`);
                } else {
                  console.log(`✅ Image is already landscape: ${image.bitmap.width}w x ${image.bitmap.height}h`);
                }
                
                // Get base64 from the (potentially rotated) image - using newer API
                const base64 = await image.getBase64('image/jpeg');
                console.log(`   Base64 generated: ${base64.length} characters`);
                imageBase64 = base64;
              } catch (jimpError) {
                console.warn(`Error processing image with Jimp: ${fullPath}`, jimpError);
                // Fallback to original processing without rotation
                const imageBuffer = fs.readFileSync(fullPath);
                if (imageBuffer.length > 0) {
                  const base64 = imageBuffer.toString('base64');
                  const ext = path.extname(fullPath).toLowerCase();
                  let mimeType = 'image/jpeg';
                  
                  if (ext === '.png') mimeType = 'image/png';
                  else if (ext === '.gif') mimeType = 'image/gif';
                  else if (ext === '.webp') mimeType = 'image/webp';
                  
                  imageBase64 = `data:${mimeType};base64,${base64}`;
                }
              }
            } else {
              console.warn(`Image file not found: ${fullPath}`);
            }
          } else if (imageUrl.startsWith('data:')) {
            // Already base64 encoded - validate it has content
            if (imageUrl.length > 50) { // Basic validation for data URL
              imageBase64 = imageUrl;
            }
          } else {
            console.warn(`Unsupported image URL format: ${imageUrl}`);
          }
          
          // Only add image if we successfully processed it
          if (imageBase64 && imageBase64.length > 0) {
            imageElements.push({
              image: imageBase64,
              fit: [400, 300], // Use fit instead of fixed width/height to maintain aspect ratio
              alignment: 'center',
              margin: [0, 5, 0, 5]
            });
          }
        } catch (error) {
          console.warn(`Error processing image for job ${job.id}:`, error);
        }
      }
      
      return imageElements;
    };

    // Helper function to calculate value for HRS/TON/LOADS column
    const calculateValue = (job: JobData): string => {
      const dispatchType = job.jobType?.dispatchType?.toLowerCase();
      
      
      if (dispatchType === 'hourly') {
        if (job.startTime && job.endTime) {
          // Extract time portion from ISO datetime or handle HH:MM format
          const extractTime = (timeStr: string) => {
            if (timeStr.includes('T')) {
              // ISO format like "2025-08-01T07:00"
              return timeStr.split('T')[1].split('Z')[0]; // Get time part, remove Z if present
            }
            return timeStr; // Already in HH:MM format
          };
          
          const startTimeStr = extractTime(job.startTime);
          const endTimeStr = extractTime(job.endTime);
          
          const [sh, sm] = startTimeStr.split(':').map(Number);
          const [eh, em] = endTimeStr.split(':').map(Number);
          if ([sh, sm, eh, em].some((v) => isNaN(v))) return '';
          const start = sh * 60 + sm;
          let end = eh * 60 + em;
          if (end < start) end += 24 * 60; // Handle overnight jobs
          const hours = (end - start) / 60;
          return isNaN(hours) ? '' : hours.toFixed(2);
        }
        return '';
      } else if (dispatchType === 'tonnage') {
        if (job.weight && Array.isArray(job.weight)) {
          const totalWeight = job.weight.reduce((sum: number, w: number) => {
            const weight = parseFloat(String(w)) || 0;
            return sum + (isNaN(weight) ? 0 : weight);
          }, 0);
          return isNaN(totalWeight) || totalWeight === 0 ? '' : totalWeight.toFixed(2);
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
          const totalWeight = weights.reduce((sum: number, w: number) => sum + (isNaN(w) ? 0 : w), 0);
          return isNaN(totalWeight) || totalWeight === 0 ? '' : totalWeight.toFixed(2);
        }
        return '';
      } else if (dispatchType === 'load' || dispatchType === 'loads') {
        return job.loads != null && !isNaN(Number(job.loads)) ? job.loads.toString() : '';
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

    // Generate table rows grouped by month and collect all images
    const tableRows: any[] = [];
    const allTicketImages: any[] = [];
    
    for (const monthName of sortedMonths) {
      const monthJobs = jobsByMonth[monthName];
      
      // Sort jobs within this month by date (ascending)
      monthJobs.sort((a, b) => {
        const dateA = new Date(a.job.jobDate);
        const dateB = new Date(b.job.jobDate);
        return dateA.getTime() - dateB.getTime();
      });
      
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
      for (const jobEntry of monthJobs) {
        const job = jobEntry.job;
        const jobImages = await getJobImages(job);
        
        // Collect images for later use in tickets section - only if images are valid and processed
        const validImages = jobImages.filter(img => 
          img && 
          img.image && 
          img.image.length > 50 && // Must be longer than a basic data URL header
          img.image.startsWith('data:image/') // Must be a valid image data URL
        );
        if (validImages.length > 0) {
          allTicketImages.push({
            jobDate: parseDate(job.jobDate),
            jobDescription: job.jobType?.startLocation && job.jobType?.endLocation
              ? `${job.jobType.startLocation} to ${job.jobType.endLocation}`
              : job.jobType?.title || '',
            unit: job.unit?.name || '',
            driver: job.driver?.name || '',
            ticketIds: parseTicketIds(job.ticketIds),
            images: validImages
          });
        }
        
        // Main job row (without images)
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
      }
    }

  // Build summary rows: SUBTOTAL, optional COMMISSION, optional AMOUNT (net), HST, TOTAL
    const summaryRows: any[] = [];
    const subTotal = invoiceData.calculations.subTotal || 0;
    const commission = invoiceData.calculations.commission || 0;
    const netAmount = Math.max(0, subTotal - commission);
    const hst = invoiceData.calculations.hst || 0;
    const total = invoiceData.calculations.total || 0;

    // SUBTOTAL
    summaryRows.push([
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: 'SUBTOTAL', fontSize: 11, alignment: 'right', border: [false, false, false, false] },
      { text: `$${subTotal.toFixed(2)}`, fontSize: 11, alignment: 'right', border: [false, false, false, false] },
    ]);

    // COMMISSION (only if > 0)
    if (commission > 0) {
      summaryRows.push([
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
          text: `- $${commission.toFixed(2)}`,
          fontSize: 11,
          color: 'maroon',
          alignment: 'right',
          border: [false, false, false, false],
          fillColor: null
        },
      ]);
    }

    // AMOUNT (net) — only when commission is applied
    if (commission > 0) {
      summaryRows.push([
        { text: '', style: 'tableCell', border: [false, false, false, false] },
        { text: '', style: 'tableCell', border: [false, false, false, false] },
        { text: '', style: 'tableCell', border: [false, false, false, false] },
        { text: '', style: 'tableCell', border: [false, false, false, false] },
        { text: '', style: 'tableCell', border: [false, false, false, false] },
        { text: '', style: 'tableCell', border: [false, false, false, false] },
        { text: '', style: 'tableCell', border: [false, false, false, false] },
        { text: 'AMOUNT', fontSize: 11, alignment: 'right', border: [false, false, false, false] },
        { text: `$${netAmount.toFixed(2)}`, fontSize: 11, alignment: 'right', border: [false, false, false, false] },
      ]);
    }

    // HST
    summaryRows.push([
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: '', style: 'tableCell', border: [false, false, false, false] },
      { text: 'HST', fontSize: 11, alignment: 'right', border: [false, false, false, false] },
      { text: `$${hst.toFixed(2)}`, fontSize: 11, alignment: 'right', border: [false, false, false, false] },
    ]);

    // TOTAL
    summaryRows.push([
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
        text: `$${total.toFixed(2)}`,
        fontSize: 12,
        bold: true,
        color: 'black',
        alignment: 'right',
        border: [false, true, false, false],
        fillColor: null
      },
    ]);

  const content: any[] = [
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
    ];

    // Only render the main job table when there are rows; avoids a lone header
    if (tableRows.length > 0) {
      content.push({
        style: 'mainTable',
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            tableHeader,
            ...tableRows,
          ],
        },
        layout: {
          fillColor: function (rowIndex: number, node: any, columnIndex: number) {
            if (rowIndex === 0) {
              return '#4a5568'; // Header row
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
          paddingLeft: function () { return 6; },
          paddingRight: function () { return 6; },
          paddingTop: function () { return 4; },
          paddingBottom: function () { return 4; },
        },
        margin: [0, 0, 0, 20],
      });
    }

    // Render summary as a separate table (no headerRows), preventing header repetition on new pages
    content.push({
      style: 'mainTable',
      table: {
        headerRows: 0,
        widths: ['auto', 'auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
        body: [
          ...summaryRows,
        ],
      },
      layout: {
        fillColor: function () { return null; },
        hLineWidth: function () { return 0.5; },
        vLineWidth: function () { return 0.5; },
        hLineColor: function () { return '#aaa'; },
        vLineColor: function () { return '#aaa'; },
        paddingLeft: function () { return 6; },
        paddingRight: function () { return 6; },
        paddingTop: function () { return 4; },
        paddingBottom: function () { return 4; },
      },
      margin: [0, tableRows.length > 0 ? 0 : 10, 0, 30],
    });

    // Add tickets section if there are any valid images
    console.log(`Total ticket data entries: ${allTicketImages.length}`);
    
    const validTicketData = allTicketImages.filter(ticketData => 
      ticketData.images && ticketData.images.length > 0
    );
    
    console.log(`Ticket data with images: ${validTicketData.length}`);
    
    if (validTicketData.length > 0) {
      // Check if there are any actual valid images to render
      const totalValidImages = validTicketData.reduce((total, ticketData) => {
        const validImages = ticketData.images.filter(img => 
          img && 
          img.image && 
          img.image.length > 50 && 
          img.image.startsWith('data:image/')
        );
        console.log(`Job ${ticketData.jobDate}: ${ticketData.images.length} total images, ${validImages.length} valid images`);
        return total + validImages.length;
      }, 0);
      
      console.log(`Total valid images for rendering: ${totalValidImages}`);
      
      if (totalValidImages > 0) {
        // Add page break and centered "Tickets" title - title and first image on same page
        // content.push({ text: '', pageBreak: 'before' });
        content.push({
          text: 'Tickets',
          style: 'ticketsTitle',
          alignment: 'center',
          margin: [0, 100, 0, 50] // Reduced margins - title at top, space for first image below
        });

        // Sort ticket images by date (ascending)
        validTicketData.sort((a, b) => {
          const dateA = new Date(a.jobDate);
          const dateB = new Date(b.jobDate);
          return dateA.getTime() - dateB.getTime();
        });

        // Build array of all valid images first
        const allValidImages: any[] = [];
        validTicketData.forEach((ticketData) => {
          const validImages = ticketData.images.filter(img => 
            img && 
            img.image && 
            img.image.length > 50 && 
            img.image.startsWith('data:image/')
          );
          allValidImages.push(...validImages);
        });
        
        console.log(`Final valid images to render: ${allValidImages.length}`);
        
        // Add each image with simple approach - portrait images are now rotated to landscape
        allValidImages.forEach((img, index) => {
          // Add page break before image (except first one, which goes with Tickets title)
          if (index > 0) {
            content.push({ text: '', pageBreak: 'before' });
          }
          
          // Add image with conservative sizing to prevent empty pages
          content.push({
            image: img.image,
            fit: [500, 350], // Conservative fit to prevent layout issues
            alignment: 'center',
            margin: index === 0 ? [0, 20, 0, 50] : [0, 50, 0, 50] // Less top margin for first image after title
          });
        });
      }
    }

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
        ticketsTitle: {
          fontSize: 60,
          bold: true,
          color: '#2d3748',
        },
        ticketJobInfo: {
          fontSize: 12,
          color: '#4a5568',
        },
        ticketDateTitle: {
          fontSize: 20,
          bold: true,
          color: '#2d3748',
        },
        ticketJobSubtitle: {
          fontSize: 14,
          color: '#4a5568',
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

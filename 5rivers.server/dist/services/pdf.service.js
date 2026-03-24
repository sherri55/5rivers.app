"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePDF = generateInvoicePDF;
exports.generateListPDF = generateListPDF;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const connection_1 = require("../db/connection");
// pdfmake v0.3.7 — use require() for CJS compatibility
/* eslint-disable @typescript-eslint/no-var-requires */
const pdfmake = require('pdfmake');
// Load Roboto font files into pdfmake's virtual filesystem
const FONTS_DIR = path_1.default.join(require.resolve('pdfmake'), '..', '..', 'fonts', 'Roboto');
pdfmake.virtualfs.storage['Roboto-Regular.ttf'] = fs_1.default.readFileSync(path_1.default.join(FONTS_DIR, 'Roboto-Regular.ttf'));
pdfmake.virtualfs.storage['Roboto-Medium.ttf'] = fs_1.default.readFileSync(path_1.default.join(FONTS_DIR, 'Roboto-Medium.ttf'));
pdfmake.virtualfs.storage['Roboto-Italic.ttf'] = fs_1.default.readFileSync(path_1.default.join(FONTS_DIR, 'Roboto-Italic.ttf'));
pdfmake.virtualfs.storage['Roboto-MediumItalic.ttf'] = fs_1.default.readFileSync(path_1.default.join(FONTS_DIR, 'Roboto-MediumItalic.ttf'));
pdfmake.setFonts({
    Roboto: {
        normal: 'Roboto-Regular.ttf',
        bold: 'Roboto-Medium.ttf',
        italics: 'Roboto-Italic.ttf',
        bolditalics: 'Roboto-MediumItalic.ttf',
    },
});
pdfmake.setUrlAccessPolicy(() => false);
// ============================================
// Company info (used in invoice header)
// ============================================
const COMPANY = {
    name: '5 Rivers Trucking Inc.',
    address: '140 Cherryhill Place\nLondon, Ontario\nN6H4M5',
    phone: '+1 (437) 679 9350',
    email: 'info@5riverstruckinginc.ca',
    hst: '760059956',
};
// ============================================
// Shared helpers
// ============================================
function parseDate(dateStr) {
    if (!dateStr)
        return '';
    try {
        const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
        if (isNaN(d.getTime()))
            return String(dateStr);
        return d.toLocaleDateString('en-CA', {
            year: 'numeric', month: 'short', day: '2-digit',
            timeZone: 'America/Toronto',
        });
    }
    catch {
        return String(dateStr);
    }
}
function formatCurrency(val) {
    const n = Number(val ?? 0);
    return `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
async function generateBuffer(docDefinition) {
    const pdf = pdfmake.createPdf(docDefinition);
    const pdfKitDoc = await pdf.pdfDocumentPromise;
    return new Promise((resolve, reject) => {
        const chunks = [];
        pdfKitDoc.on('data', (chunk) => chunks.push(chunk));
        pdfKitDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfKitDoc.on('error', reject);
        pdfKitDoc.end();
    });
}
/**
 * Compress an image buffer to JPEG, resize to fit maxDim, return data-URI.
 * Target quality balances readability vs. file size.
 */
async function compressImageToDataUri(content, contentType, maxWidth = 720, maxHeight = 540, quality = 60) {
    try {
        const resized = await (0, sharp_1.default)(content)
            .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality, mozjpeg: true })
            .toBuffer();
        return `data:image/jpeg;base64,${resized.toString('base64')}`;
    }
    catch {
        // Fallback: try raw buffer
        try {
            const b64 = content.toString('base64');
            return `data:${contentType};base64,${b64}`;
        }
        catch {
            return null;
        }
    }
}
async function generateInvoicePDF(invoiceId, organizationId) {
    // Fetch invoice
    const invoiceRows = await (0, connection_1.query)(`SELECT i.*, d.name AS dispatcherName, d.commissionPercent
     FROM Invoices i
     LEFT JOIN Dispatchers d ON i.dispatcherId = d.id
     WHERE i.id = @id AND i.organizationId = @orgId`, { params: { id: invoiceId, orgId: organizationId } });
    if (!invoiceRows?.length)
        throw new Error('Invoice not found');
    const inv = invoiceRows[0];
    // Fetch jobs on this invoice with all related data
    const jobRows = await (0, connection_1.query)(`SELECT ji.jobId, ji.amount AS lineAmount,
            j.jobDate, j.startTime, j.endTime, j.loads, j.weight,
            j.ticketIds, j.amount, j.sourceType,
            dr.name AS driverName,
            u.name AS unitName,
            jt.title AS jobTypeTitle, jt.dispatchType, jt.rateOfJob,
            jt.startLocation, jt.endLocation,
            c.name AS companyName
     FROM JobInvoice ji
     INNER JOIN Jobs j ON j.id = ji.jobId
     LEFT JOIN Drivers dr ON j.driverId = dr.id
     LEFT JOIN Units u ON j.unitId = u.id
     LEFT JOIN JobTypes jt ON j.jobTypeId = jt.id
     LEFT JOIN Companies c ON jt.companyId = c.id
     WHERE ji.invoiceId = @invoiceId AND j.organizationId = @orgId
     ORDER BY j.jobDate ASC`, { params: { invoiceId, orgId: organizationId } });
    const jobs = Array.isArray(jobRows) ? jobRows : [];
    // Fetch all images for these jobs
    const jobIds = jobs.map((j) => j.jobId);
    let imageRows = [];
    if (jobIds.length > 0) {
        // Build IN clause safely (parameterised)
        const placeholders = jobIds.map((_, i) => `@jid${i}`).join(',');
        const imgParams = {};
        jobIds.forEach((id, i) => { imgParams[`jid${i}`] = id; });
        imageRows = await (0, connection_1.query)(`SELECT id AS imageId, jobId, content, contentType
       FROM Images WHERE jobId IN (${placeholders})
       ORDER BY jobId, createdAt`, { params: imgParams });
        if (!Array.isArray(imageRows))
            imageRows = [];
    }
    // Group images by jobId
    const imagesByJob = new Map();
    for (const img of imageRows) {
        const list = imagesByJob.get(img.jobId) ?? [];
        list.push(img);
        imagesByJob.set(img.jobId, list);
    }
    // Calculate totals
    const subtotal = jobs.reduce((s, j) => s + (j.lineAmount ?? 0), 0);
    const commissionPct = inv.commissionPercent ?? 0;
    const commission = commissionPct > 0 ? subtotal * (commissionPct / 100) : 0;
    const netAmount = subtotal - commission;
    const hst = netAmount * 0.13;
    const total = netAmount + hst;
    // ---- Build PDF definition ----
    // Group jobs by month
    const jobsByMonth = {};
    for (const job of jobs) {
        const d = job.jobDate instanceof Date ? job.jobDate : new Date(job.jobDate);
        const key = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'America/Toronto' });
        (jobsByMonth[key] ??= []).push(job);
    }
    const sortedMonths = Object.keys(jobsByMonth).sort((a, b) => new Date(a + ' 1').getTime() - new Date(b + ' 1').getTime());
    // Table header
    const tableHeader = [
        { text: 'Date', style: 'th' },
        { text: 'Unit', style: 'th' },
        { text: 'Driver', style: 'th' },
        { text: 'Customer', style: 'th' },
        { text: 'Job Description', style: 'th' },
        { text: 'Tickets', style: 'th' },
        { text: 'Hrs/Ton/Loads', style: 'th' },
        { text: 'Rate', style: 'th' },
        { text: 'Amount', style: 'th' },
    ];
    const tableBody = [tableHeader];
    for (const monthName of sortedMonths) {
        const monthJobs = jobsByMonth[monthName];
        // Month header row
        tableBody.push([
            { text: monthName, colSpan: 9, style: 'monthHeader' },
            {}, {}, {}, {}, {}, {}, {}, {},
        ]);
        for (const job of monthJobs) {
            const qty = computeQuantity(job);
            tableBody.push([
                { text: parseDate(job.jobDate), style: 'td' },
                { text: job.unitName ?? '', style: 'td' },
                { text: job.driverName ?? '', style: 'td' },
                { text: job.companyName ?? '', style: 'td' },
                {
                    text: job.startLocation && job.endLocation
                        ? `${job.startLocation} → ${job.endLocation}`
                        : job.jobTypeTitle ?? '',
                    style: 'td',
                },
                { text: parseTicketIds(job.ticketIds), style: 'td' },
                { text: qty, style: 'td', alignment: 'center' },
                { text: job.rateOfJob ? formatCurrency(job.rateOfJob) : '', style: 'td', alignment: 'right' },
                { text: formatCurrency(job.lineAmount), style: 'td', alignment: 'right' },
            ]);
        }
    }
    // Summary rows helper
    const emptyCell = (border = false) => ({
        text: '', border: [false, border, false, false],
    });
    const summaryRow = (label, value, opts = {}) => [
        emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(), emptyCell(),
        { text: label, alignment: 'right', fontSize: 10, border: [false, false, false, false], ...opts },
        { text: value, alignment: 'right', fontSize: 10, border: [false, false, false, false], ...opts },
    ];
    const summaryBody = [
        summaryRow('SUBTOTAL', formatCurrency(subtotal)),
    ];
    if (commission > 0) {
        summaryBody.push(summaryRow(`COMM. (${commissionPct}%)`, `- ${formatCurrency(commission)}`, { color: 'maroon', bold: true }));
        summaryBody.push(summaryRow('AMOUNT', formatCurrency(netAmount)));
    }
    summaryBody.push(summaryRow('HST (13%)', formatCurrency(hst)));
    summaryBody.push(summaryRow('TOTAL', formatCurrency(total), {
        bold: true, fontSize: 12, border: [false, true, false, false],
    }));
    // Build content array
    const content = [
        // Header
        {
            columns: [
                [
                    { text: COMPANY.name, style: 'companyName' },
                    {
                        text: `${COMPANY.address}\n${COMPANY.phone}\n${COMPANY.email}\nHST #${COMPANY.hst}`,
                        style: 'companyInfo',
                    },
                ],
                [
                    { text: 'INVOICE', style: 'invoiceTitle', alignment: 'right' },
                    {
                        text: [
                            inv.invoiceNumber, '\n',
                            `Invoice Date: ${parseDate(inv.invoiceDate)}`, '\n',
                            `Billed To: ${inv.billedTo ?? ''}`, '\n',
                            inv.billedEmail ?? '',
                        ].join(''),
                        alignment: 'right', style: 'invoiceInfo',
                    },
                ],
            ],
            columnGap: 40,
            margin: [0, 0, 0, 25],
        },
    ];
    // Jobs table
    if (tableBody.length > 1) {
        content.push({
            table: {
                headerRows: 1,
                widths: ['auto', 'auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
                body: tableBody,
            },
            layout: invoiceTableLayout(),
            margin: [0, 0, 0, 5],
        });
    }
    // Summary table
    content.push({
        table: {
            headerRows: 0,
            widths: ['auto', 'auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
            body: summaryBody,
        },
        layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#bbb',
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 30],
    });
    // Ticket images section
    const allImages = [];
    for (const job of jobs) {
        const imgs = imagesByJob.get(job.jobId) ?? [];
        for (const img of imgs) {
            const dataUri = await compressImageToDataUri(img.content, img.contentType);
            if (dataUri) {
                allImages.push({
                    dataUri,
                    jobDate: parseDate(job.jobDate),
                    description: job.startLocation && job.endLocation
                        ? `${job.startLocation} → ${job.endLocation}`
                        : job.jobTypeTitle ?? '',
                });
            }
        }
    }
    if (allImages.length > 0) {
        content.push({ text: '', pageBreak: 'before' });
        content.push({
            text: 'Tickets',
            fontSize: 36, bold: true, color: '#2d3748', alignment: 'center',
            margin: [0, 10, 0, 20],
        });
        for (let i = 0; i < allImages.length; i++) {
            if (i > 0)
                content.push({ text: '', pageBreak: 'before' });
            const img = allImages[i];
            content.push({
                text: `${img.jobDate}  —  ${img.description}`,
                fontSize: 10, color: '#4a5568', alignment: 'center',
                margin: [0, 0, 0, 8],
            });
            content.push({
                image: img.dataUri,
                fit: [680, 420],
                alignment: 'center',
                margin: [0, 0, 0, 10],
            });
        }
    }
    const docDefinition = {
        pageOrientation: 'landscape',
        pageMargins: [30, 50, 30, 50],
        content,
        styles: {
            companyName: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
            companyInfo: { fontSize: 9, color: '#333', margin: [0, 0, 0, 10] },
            invoiceTitle: { fontSize: 18, bold: true, margin: [0, 0, 0, 8] },
            invoiceInfo: { fontSize: 10, color: '#333', margin: [0, 0, 0, 10] },
            th: { bold: true, fontSize: 9, color: 'white', fillColor: '#4a5568', alignment: 'center', margin: [0, 3, 0, 3] },
            monthHeader: { bold: true, fontSize: 10, color: '#2d3748', fillColor: '#e2e8f0', margin: [4, 4, 4, 4] },
            td: { fontSize: 9, margin: [0, 2, 0, 2] },
        },
        defaultStyle: { fontSize: 9 },
    };
    const buffer = await generateBuffer(docDefinition);
    const safeName = (inv.invoiceNumber ?? 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_');
    return { buffer, filename: `${safeName}.pdf` };
}
async function generateListPDF(title, subtitle, columns, rows, orientation = 'landscape') {
    const headerRow = columns.map((c) => ({
        text: c.label,
        style: 'th',
        alignment: (c.align ?? 'left'),
    }));
    const bodyRows = rows.map((row) => row.map((cell, i) => ({
        text: cell,
        style: 'td',
        alignment: (columns[i]?.align ?? 'left'),
    })));
    const widths = columns.map((c) => c.width ?? 'auto');
    // Make at least one column flexible
    if (!widths.includes('*')) {
        const longestIdx = columns.reduce((best, col, i) => col.label.length > columns[best].label.length ? i : best, 0);
        widths[longestIdx] = '*';
    }
    const content = [
        { text: title, fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
        { text: subtitle, fontSize: 9, color: '#666', margin: [0, 0, 0, 16] },
    ];
    if (bodyRows.length === 0) {
        content.push({ text: 'No data to display.', fontSize: 11, color: '#999', margin: [0, 20, 0, 0] });
    }
    else {
        content.push({
            table: {
                headerRows: 1,
                widths,
                body: [headerRow, ...bodyRows],
            },
            layout: listTableLayout(),
        });
        content.push({
            text: `${rows.length} record${rows.length !== 1 ? 's' : ''}  ·  Generated ${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' })}`,
            fontSize: 8, color: '#999', alignment: 'right', margin: [0, 10, 0, 0],
        });
    }
    const docDefinition = {
        pageOrientation: orientation,
        pageMargins: [30, 40, 30, 40],
        content,
        styles: {
            th: { bold: true, fontSize: 9, color: 'white', fillColor: '#4a5568', margin: [0, 3, 0, 3] },
            td: { fontSize: 9, margin: [0, 2, 0, 2] },
        },
        defaultStyle: { fontSize: 9 },
    };
    return generateBuffer(docDefinition);
}
// ============================================
// Helpers
// ============================================
function parseTicketIds(ticketIds) {
    if (!ticketIds)
        return '';
    try {
        const parsed = JSON.parse(ticketIds);
        return Array.isArray(parsed) ? parsed.join(', ') : ticketIds;
    }
    catch {
        return ticketIds;
    }
}
function computeQuantity(job) {
    const dt = (job.dispatchType ?? '').toLowerCase();
    if (dt === 'hourly' && job.startTime && job.endTime) {
        const extract = (t) => t.includes('T') ? t.split('T')[1].split('Z')[0] : t;
        const [sh, sm] = extract(job.startTime).split(':').map(Number);
        const [eh, em] = extract(job.endTime).split(':').map(Number);
        if ([sh, sm, eh, em].some(isNaN))
            return '';
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins < 0)
            mins += 24 * 60;
        return (mins / 60).toFixed(2);
    }
    if (dt === 'tonnage' && job.weight) {
        try {
            const arr = typeof job.weight === 'string'
                ? (job.weight.startsWith('[') ? JSON.parse(job.weight) : job.weight.split(' ').map(Number))
                : [Number(job.weight)];
            const total = arr.filter((n) => !isNaN(n)).reduce((s, n) => s + n, 0);
            return total > 0 ? total.toFixed(2) : '';
        }
        catch {
            return '';
        }
    }
    if ((dt === 'load' || dt === 'loads') && job.loads != null) {
        return String(job.loads);
    }
    if (dt === 'fixed')
        return '1';
    return '';
}
function invoiceTableLayout() {
    return {
        fillColor: (rowIndex, node) => {
            if (rowIndex === 0)
                return '#4a5568';
            const row = node.table.body[rowIndex];
            if (row?.[0]?.style === 'monthHeader')
                return '#e2e8f0';
            return rowIndex % 2 === 0 ? '#f7fafc' : null;
        },
        hLineWidth: (i) => (i === 1 ? 1.5 : 0.5),
        vLineWidth: () => 0.5,
        hLineColor: (i) => (i === 1 ? '#333' : '#ccc'),
        vLineColor: () => '#ccc',
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 3,
        paddingBottom: () => 3,
    };
}
function listTableLayout() {
    return {
        fillColor: (rowIndex) => {
            if (rowIndex === 0)
                return '#4a5568';
            return rowIndex % 2 === 0 ? '#f7fafc' : null;
        },
        hLineWidth: (i) => (i === 1 ? 1.5 : 0.5),
        vLineWidth: () => 0.3,
        hLineColor: (i) => (i === 1 ? '#333' : '#ddd'),
        vLineColor: () => '#ddd',
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 3,
        paddingBottom: () => 3,
    };
}

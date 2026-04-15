/**
 * OCR Output Parser
 *
 * Converts free-text OCR output from the vision model (gemma-4-e4b) into
 * strongly-typed, machine-parseable structures that the document processor
 * can operate on deterministically.
 */
export type DocumentExtraction = TicketExtraction | PaystubExtraction | UnknownExtraction;
export interface TicketExtraction {
    type: 'ticket';
    date: string | null;
    ticketNumber: string | null;
    company: string | null;
    dispatcher: string | null;
    unit: string | null;
    driver: string | null;
    startTime: string | null;
    endTime: string | null;
    startLocation: string | null;
    endLocation: string | null;
    material: string | null;
}
export interface PaystubLineItem {
    date: string | null;
    amount: number | null;
    ref: string | null;
}
export interface PaystubExtraction {
    type: 'paystub';
    issuedBy: string | null;
    periodFrom: string | null;
    periodTo: string | null;
    lineItems: PaystubLineItem[];
    /** true when ≥50% of lineItems have a non-null date */
    datesReadable: boolean;
}
export interface UnknownExtraction {
    type: 'unknown';
    rawText: string;
}
/**
 * Parse raw OCR text into a typed extraction.
 * Returns an `UnknownExtraction` when the text cannot be identified as
 * a ticket or paystub — the caller should fall through to the LLM.
 */
export declare function parseOCROutput(rawText: string): DocumentExtraction;

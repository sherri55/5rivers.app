/**
 * pipeline.ts — Three-phase Gemini document-processing pipeline.
 *
 * Phase 1 (Parser):    Gemini vision extracts structured JSON from a ticket
 *                      or paystub image. No tools. Single call.
 * Phase 2 (Validator): Gemini with list_* tools validates each entity from
 *                      the parsed data against the system database. Asks the
 *                      user to resolve discrepancies. Cannot create or modify.
 * Phase 3 (Creator):   Gemini with create_* tools (and mark_job_paid_by_date
 *                      for paystubs) creates missing entities and the job,
 *                      asking focused questions for any missing required field.
 *
 * The conversation history carries naturally across phases — only the system
 * prompt and available tool set change. Phase transitions are triggered by
 * either an explicit user confirmation (validating → creating) or by sending
 * a new image (anything → validating, restarting the pipeline).
 */
import { type Message } from './conversation.js';
export interface PipelineImage {
    data: string;
    mimeType: string;
}
export type Phase = 'idle' | 'validating' | 'creating';
export interface PipelineState {
    phase: Phase;
    /** Raw structured extraction returned by the parser (JSON-as-text). */
    parsedData: string;
    /** Original ticket image(s) that started this pipeline. Held until every
     *  create_job call in the creating phase has had the image attached. */
    images: PipelineImage[];
    /** When did this state last change — used for diagnostics / TTL if needed. */
    updatedAt: number;
}
export declare function getPhase(platform: string, userId: string): Phase;
export declare function getState(platform: string, userId: string): PipelineState | undefined;
export declare function setState(platform: string, userId: string, state: Omit<PipelineState, 'updatedAt'>): void;
export declare function clearState(platform: string, userId: string): void;
/** Read the original image(s) buffered for this conversation, if any. Returns
 *  an empty array when no pipeline state exists or no images were buffered. */
export declare function getImages(platform: string, userId: string): PipelineImage[];
/** Read-only tools the Validator agent may call. */
export declare const VALIDATOR_TOOLS: ReadonlySet<string>;
/** Write tools (plus list lookups) the Creator agent may call. */
export declare const CREATOR_TOOLS: ReadonlySet<string>;
export declare function getToolFilterForPhase(phase: Phase): ReadonlySet<string> | undefined;
export declare function parseImage(images: PipelineImage[], userMessage: string): Promise<string>;
export declare function buildValidatorPrompt(easternDate: string): string;
export declare function buildCreatorPrompt(easternDate: string): string;
/**
 * Decide whether a user message in the validating phase is the green light to
 * advance to the creating phase.
 *
 * Two ways to qualify:
 *   (a) The user issues an explicit create directive ("create company", "make
 *       Eleanor", "go ahead and create the job"). This works regardless of
 *       what the assistant said last — the user's intent is unambiguous.
 *   (b) The user sends a plain affirmation (yes/proceed/ok) AND the most
 *       recent assistant message ended with a "Shall I proceed?" invitation
 *       or flagged something as needing creation. This guards against
 *       transitioning when the user is simply saying "yes" to a
 *       disambiguation question like "Did you mean Birnam Aggregates?".
 */
export declare function isCreateConfirmation(userMessage: string, history: Message[]): boolean;
export interface PipelineRouting {
    /** True when the pipeline took ownership of this turn — caller must skip its
     *  default user-message handling and go straight to the agent loop. */
    handled: boolean;
    /** Phase the agent loop should run under. */
    phase: Phase;
    /** Tool filter to pass into provider.chat(). Undefined = no filtering. */
    toolFilter?: ReadonlySet<string>;
}
/**
 * Inspect the current pipeline state and the incoming message, decide which
 * phase to run under, and prepare the conversation accordingly (system prompt,
 * appended messages). Returns the tool filter the agent loop should use.
 *
 * Only invoked for the Gemini provider.
 */
export declare function routePipelineTurn(args: {
    platform: string;
    userId: string;
    userMessage: string;
    images?: PipelineImage[];
    resumingFromConfirmation: boolean;
    easternDate: string;
}): Promise<PipelineRouting>;
/** Human-friendly description of the active phase, for logging / debug. */
export declare function describePhase(phase: Phase): string;

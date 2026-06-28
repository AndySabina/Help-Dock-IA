export type RetrievedChunkVisibility = "public_widget" | "internal_only";

export interface RetrievedDocumentChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  text: string;
  relevanceScore: number;
  visibility: RetrievedChunkVisibility;
}

export interface RagAnswerDecisionInput {
  question: string;
  retrievedChunks: readonly RetrievedDocumentChunk[];
  minimumEvidenceScore: number;
  minimumSupportingChunks: number;
  maxResponseTokens: number;
  estimatedPromptTokens: number;
  estimatedAnswerTokens: number;
}

export interface InternalSourceCitation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  relevanceScore: number;
}

export interface InternalSourceTrace {
  source: "retrieved_document_chunks";
  citations: InternalSourceCitation[];
  publicCitationsAllowed: false;
}

export interface EvidenceSufficiencyDecision {
  sufficient: boolean;
  supportingChunkIds: string[];
  rejectedChunkIds: string[];
}

export interface DocumentationGapCandidate {
  question: string;
  status: "open" | "possibly_resolved" | "resolved_with_evidence";
  reason: "insufficient_evidence" | "answer_budget_exceeded";
  sourceChunkIds: string[];
  linkedTicketId: string | null;
}

export type AnswerBudgetGuard =
  | {
      allowed: true;
      estimatedPromptTokens: number;
      estimatedAnswerTokens: number;
      maxResponseTokens: number;
    }
  | {
      allowed: false;
      estimatedPromptTokens: number;
      estimatedAnswerTokens: number;
      maxResponseTokens: number;
      reason: "estimated_answer_tokens_exceed_limit";
    };

export type RagAnswerDecision =
  | {
      outcome: "answer_allowed";
      evidence: EvidenceSufficiencyDecision;
      internalTrace: InternalSourceTrace;
      budget: AnswerBudgetGuard;
    }
  | {
      outcome: "refusal_with_gap";
      refusal: {
        reason: DocumentationGapCandidate["reason"];
        message: string;
      };
      gapCandidate: DocumentationGapCandidate;
      internalTrace: InternalSourceTrace;
      budget: AnswerBudgetGuard;
    };

const SAFE_REFUSAL_MESSAGE =
  "I do not have enough verified information to answer that. I can help you contact support.";

export function createAnswerBudgetGuard(
  maxResponseTokens: number,
  estimatedPromptTokens: number,
  estimatedAnswerTokens: number
): AnswerBudgetGuard {
  const base = { estimatedPromptTokens, estimatedAnswerTokens, maxResponseTokens };

  return estimatedAnswerTokens <= maxResponseTokens
    ? { allowed: true, ...base }
    : { allowed: false, ...base, reason: "estimated_answer_tokens_exceed_limit" };
}

export function createGapCandidate(input: {
  question: string;
  reason: DocumentationGapCandidate["reason"];
  sourceChunkIds: readonly string[];
  linkedTicketId?: string | null;
}): DocumentationGapCandidate {
  return {
    question: input.question,
    status: "open",
    reason: input.reason,
    sourceChunkIds: [...input.sourceChunkIds],
    linkedTicketId: input.linkedTicketId ?? null
  };
}

export function decideRagAnswer(input: RagAnswerDecisionInput): RagAnswerDecision {
  const budget = createAnswerBudgetGuard(
    input.maxResponseTokens,
    input.estimatedPromptTokens,
    input.estimatedAnswerTokens
  );
  const evidence = decideEvidenceSufficiency(input);

  if (evidence.sufficient && budget.allowed) {
    const internalTrace = createInternalSourceTrace(
      input.retrievedChunks.filter((chunk) => evidence.supportingChunkIds.includes(chunk.chunkId))
    );

    return { outcome: "answer_allowed", evidence, internalTrace, budget };
  }

  const internalTrace = createInternalSourceTrace(publicWidgetChunks(input.retrievedChunks));

  const reason = budget.allowed ? "insufficient_evidence" : "answer_budget_exceeded";

  return {
    outcome: "refusal_with_gap",
    refusal: { reason, message: SAFE_REFUSAL_MESSAGE },
    gapCandidate: createGapCandidate({
      question: input.question,
      reason,
      sourceChunkIds: internalTrace.citations.map((citation) => citation.chunkId)
    }),
    internalTrace,
    budget
  };
}

function decideEvidenceSufficiency(input: RagAnswerDecisionInput): EvidenceSufficiencyDecision {
  const publicChunks = publicWidgetChunks(input.retrievedChunks);
  const supportingChunks = publicChunks.filter(
    (chunk) => chunk.relevanceScore >= input.minimumEvidenceScore
  );

  return {
    sufficient: supportingChunks.length >= input.minimumSupportingChunks,
    supportingChunkIds: supportingChunks.map((chunk) => chunk.chunkId),
    rejectedChunkIds: publicChunks
      .filter((chunk) => chunk.relevanceScore < input.minimumEvidenceScore)
      .map((chunk) => chunk.chunkId)
  };
}

function publicWidgetChunks(chunks: readonly RetrievedDocumentChunk[]): RetrievedDocumentChunk[] {
  return chunks.filter((chunk) => chunk.visibility === "public_widget");
}

function createInternalSourceTrace(chunks: readonly RetrievedDocumentChunk[]): InternalSourceTrace {
  return {
    source: "retrieved_document_chunks",
    citations: chunks.map((chunk) => ({
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      relevanceScore: chunk.relevanceScore
    })),
    publicCitationsAllowed: false
  };
}

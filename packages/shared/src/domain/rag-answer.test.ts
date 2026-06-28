import { describe, expect, it } from "vitest";
import { createAnswerBudgetGuard, createGapCandidate, decideRagAnswer } from "./rag-answer.ts";
import { decideRagAnswer as decideExportedRagAnswer } from "../index.ts";

describe("RAG answer decision contracts", () => {
  it("approves an answer only when retrieved evidence is sufficient and keeps traces internal", () => {
    expect(
      decideRagAnswer({
        question: "How do I reset my password?",
        retrievedChunks: [
          {
            chunkId: "chunk_password_reset",
            documentId: "doc_help",
            documentTitle: "Account help",
            text: "Users can reset passwords from Settings > Security using the reset password action.",
            relevanceScore: 0.92,
            visibility: "public_widget"
          },
          {
            chunkId: "chunk_profile",
            documentId: "doc_help",
            documentTitle: "Account help",
            text: "Profile changes are available from Settings > Profile.",
            relevanceScore: 0.64,
            visibility: "public_widget"
          }
        ],
        minimumEvidenceScore: 0.8,
        minimumSupportingChunks: 1,
        maxResponseTokens: 700,
        estimatedPromptTokens: 410,
        estimatedAnswerTokens: 120
      })
    ).toEqual({
      outcome: "answer_allowed",
      evidence: {
        sufficient: true,
        supportingChunkIds: ["chunk_password_reset"],
        rejectedChunkIds: ["chunk_profile"]
      },
      internalTrace: {
        source: "retrieved_document_chunks",
        citations: [
          {
            chunkId: "chunk_password_reset",
            documentId: "doc_help",
            documentTitle: "Account help",
            relevanceScore: 0.92
          }
        ],
        publicCitationsAllowed: false
      },
      budget: {
        allowed: true,
        estimatedPromptTokens: 410,
        estimatedAnswerTokens: 120,
        maxResponseTokens: 700
      }
    });
  });

  it("refuses safely and proposes a documentation gap when evidence is insufficient", () => {
    expect(
      decideRagAnswer({
        question: "Can I pay by wire transfer?",
        retrievedChunks: [
          {
            chunkId: "chunk_internal_billing",
            documentId: "doc_internal",
            documentTitle: "Internal billing notes",
            text: "Wire transfer details are internal only.",
            relevanceScore: 0.96,
            visibility: "internal_only"
          },
          {
            chunkId: "chunk_billing_intro",
            documentId: "doc_billing",
            documentTitle: "Billing overview",
            text: "Invoices are sent by email after renewal.",
            relevanceScore: 0.42,
            visibility: "public_widget"
          }
        ],
        minimumEvidenceScore: 0.75,
        minimumSupportingChunks: 1,
        maxResponseTokens: 700,
        estimatedPromptTokens: 380,
        estimatedAnswerTokens: 90
      })
    ).toEqual({
      outcome: "refusal_with_gap",
      refusal: {
        reason: "insufficient_evidence",
        message:
          "I do not have enough verified information to answer that. I can help you contact support."
      },
      gapCandidate: {
        question: "Can I pay by wire transfer?",
        status: "open",
        reason: "insufficient_evidence",
        sourceChunkIds: ["chunk_billing_intro"],
        linkedTicketId: null
      },
      internalTrace: {
        source: "retrieved_document_chunks",
        citations: [
          {
            chunkId: "chunk_billing_intro",
            documentId: "doc_billing",
            documentTitle: "Billing overview",
            relevanceScore: 0.42
          }
        ],
        publicCitationsAllowed: false
      },
      budget: {
        allowed: true,
        estimatedPromptTokens: 380,
        estimatedAnswerTokens: 90,
        maxResponseTokens: 700
      }
    });
  });

  it("refuses safely and records a gap when answer token estimates exceed the fixed guard", () => {
    expect(
      decideRagAnswer({
        question: "Explain every support policy in detail.",
        retrievedChunks: [
          {
            chunkId: "chunk_policy",
            documentId: "doc_policy",
            documentTitle: "Support policies",
            text: "Support policy details are documented for password resets, billing, and response times.",
            relevanceScore: 0.91,
            visibility: "public_widget"
          }
        ],
        minimumEvidenceScore: 0.8,
        minimumSupportingChunks: 1,
        maxResponseTokens: 700,
        estimatedPromptTokens: 1_200,
        estimatedAnswerTokens: 900
      }).outcome
    ).toBe("refusal_with_gap");

    expect(createAnswerBudgetGuard(700, 1_200, 900)).toEqual({
      allowed: false,
      estimatedPromptTokens: 1_200,
      estimatedAnswerTokens: 900,
      maxResponseTokens: 700,
      reason: "estimated_answer_tokens_exceed_limit"
    });
  });
});

describe("documentation gap candidate contracts", () => {
  it("links gap candidates to source chunks and future tickets without exposing public citations", () => {
    expect(
      createGapCandidate({
        question: "Do you support SAML?",
        reason: "insufficient_evidence",
        sourceChunkIds: ["chunk_security", "chunk_login"],
        linkedTicketId: "ticket_123"
      })
    ).toEqual({
      question: "Do you support SAML?",
      status: "open",
      reason: "insufficient_evidence",
      sourceChunkIds: ["chunk_security", "chunk_login"],
      linkedTicketId: "ticket_123"
    });
  });

  it("exports RAG decision contracts through the shared package barrel", () => {
    expect(
      decideExportedRagAnswer({
        question: "Unknown policy?",
        retrievedChunks: [],
        minimumEvidenceScore: 0.8,
        minimumSupportingChunks: 1,
        maxResponseTokens: 700,
        estimatedPromptTokens: 100,
        estimatedAnswerTokens: 60
      }).outcome
    ).toBe("refusal_with_gap");
  });
});

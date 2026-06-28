import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  chunkMarkdownDocument,
  createDocumentContentMetadata,
  createDocumentDeletionPlan,
  createDocumentIndexingReadinessSignal,
  findDuplicateChunks,
  findExactDocumentDuplicate,
  validateMarkdownUpload
} from "./document-ingestion.ts";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

describe("Markdown upload-only document contracts", () => {
  it("accepts non-empty .md uploads and emits stable content metadata", () => {
    const content = "# Help\n\nUse HelpDock for customer support.";

    expect(validateMarkdownUpload({ filename: " Help.md ", content })).toEqual({ ok: true });
    expect(createDocumentContentMetadata({ filename: " Help.md ", content })).toEqual({
      filename: "Help.md",
      contentHash: sha256(content),
      byteLength: Buffer.byteLength(content, "utf8")
    });
  });

  it("rejects non-Markdown filenames, blank names, and empty content", () => {
    expect(validateMarkdownUpload({ filename: "help.txt", content: "# Help" })).toEqual({
      ok: false,
      issues: ["document filename must end with .md"]
    });

    expect(validateMarkdownUpload({ filename: "   ", content: "   " })).toEqual({
      ok: false,
      issues: ["document filename is required", "document content is required"]
    });
  });

  it("detects exact duplicate documents by content hash before indexing", () => {
    const contentHash = sha256("# Existing\n\nSame content.");

    expect(
      findExactDocumentDuplicate(contentHash, [
        { documentId: "doc_existing", contentHash },
        { documentId: "doc_other", contentHash: sha256("other") }
      ])
    ).toEqual({ duplicate: true, documentId: "doc_existing", contentHash });

    expect(findExactDocumentDuplicate(sha256("new"), [])).toEqual({ duplicate: false });
  });
});

describe("Markdown chunking and indexing contracts", () => {
  it("creates deterministic chunk ids and hashes from Markdown text", () => {
    const chunks = chunkMarkdownDocument({
      documentId: "doc_help",
      content: "# Title\n\nFirst answer paragraph.\n\nSecond answer paragraph.",
      maxChunkLength: 32
    });

    expect(chunks).toEqual([
      {
        id: `doc_help:chunk:0:${sha256("# Title").slice(0, 12)}`,
        documentId: "doc_help",
        ordinal: 0,
        text: "# Title",
        contentHash: sha256("# Title")
      },
      {
        id: `doc_help:chunk:1:${sha256("First answer paragraph.").slice(0, 12)}`,
        documentId: "doc_help",
        ordinal: 1,
        text: "First answer paragraph.",
        contentHash: sha256("First answer paragraph.")
      },
      {
        id: `doc_help:chunk:2:${sha256("Second answer paragraph.").slice(0, 12)}`,
        documentId: "doc_help",
        ordinal: 2,
        text: "Second answer paragraph.",
        contentHash: sha256("Second answer paragraph.")
      }
    ]);
  });

  it("splits oversized Markdown blocks and detects duplicate chunk hashes", () => {
    const chunks = chunkMarkdownDocument({
      documentId: "doc_help",
      content: "alpha beta gamma delta\n\nalpha beta gamma delta",
      maxChunkLength: 10
    });

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      "alpha beta",
      "gamma",
      "delta",
      "alpha beta",
      "gamma",
      "delta"
    ]);
    const [
      alphaChunk,
      gammaChunk,
      deltaChunk,
      duplicateAlphaChunk,
      duplicateGammaChunk,
      duplicateDeltaChunk
    ] = chunks;

    expect(findDuplicateChunks(chunks)).toEqual([
      { contentHash: sha256("alpha beta"), chunkIds: [alphaChunk!.id, duplicateAlphaChunk!.id] },
      { contentHash: sha256("gamma"), chunkIds: [gammaChunk!.id, duplicateGammaChunk!.id] },
      { contentHash: sha256("delta"), chunkIds: [deltaChunk!.id, duplicateDeltaChunk!.id] }
    ]);
  });

  it("deterministically splits single tokens that exceed the maximum chunk length", () => {
    const longToken = "https://example.com/" + "a".repeat(35);

    const chunks = chunkMarkdownDocument({
      documentId: "doc_help",
      content: `prefix ${longToken} suffix`,
      maxChunkLength: 10
    });
    const repeatedChunks = chunkMarkdownDocument({
      documentId: "doc_help",
      content: `prefix ${longToken} suffix`,
      maxChunkLength: 10
    });

    expect(chunks.map((chunk) => chunk.text)).toEqual([
      "prefix",
      "https://ex",
      "ample.com/",
      "aaaaaaaaaa",
      "aaaaaaaaaa",
      "aaaaaaaaaa",
      "aaaaa",
      "suffix"
    ]);
    expect(chunks.every((chunk) => chunk.text.length <= 10)).toBe(true);
    expect(chunks.map((chunk) => chunk.id)).toEqual(repeatedChunks.map((chunk) => chunk.id));
    expect(chunks.map((chunk) => chunk.contentHash)).toEqual(
      chunks.map((chunk) => sha256(chunk.text))
    );
  });
});

describe("document deletion and readiness contracts", () => {
  it("plans destructive deletion for content, chunks, and embeddings while retaining minimal audit metadata", () => {
    expect(
      createDocumentDeletionPlan({
        documentId: "doc_help",
        chunks: [
          { id: "chunk_1", documentId: "doc_help" },
          { id: "chunk_2", documentId: "doc_help" }
        ],
        embeddings: [{ id: "embedding_1", documentId: "doc_help" }],
        requestedByRole: "manager"
      })
    ).toEqual({
      documentId: "doc_help",
      removeContent: true,
      removeChunkIds: ["chunk_1", "chunk_2"],
      removeEmbeddingIds: ["embedding_1"],
      retainAuditMetadata: { documentId: "doc_help", action: "documents:delete" }
    });
  });

  it("rejects deletion plans that include chunks or embeddings owned by another document", () => {
    expect(() =>
      createDocumentDeletionPlan({
        documentId: "doc_help",
        chunks: [
          { id: "chunk_1", documentId: "doc_help" },
          { id: "chunk_other", documentId: "doc_other" }
        ],
        embeddings: [{ id: "embedding_1", documentId: "doc_help" }],
        requestedByRole: "manager"
      })
    ).toThrow(/chunk_other.*doc_help/u);

    expect(() =>
      createDocumentDeletionPlan({
        documentId: "doc_help",
        chunks: [{ id: "chunk_1", documentId: "doc_help" }],
        embeddings: [
          { id: "embedding_1", documentId: "doc_help" },
          { id: "embedding_other", documentId: "doc_other" }
        ],
        requestedByRole: "manager"
      })
    ).toThrow(/embedding_other.*doc_help/u);
  });

  it("blocks non-manager deletion plans and reports document indexing readiness", () => {
    expect(() =>
      createDocumentDeletionPlan({
        documentId: "doc_help",
        chunks: [],
        embeddings: [],
        requestedByRole: "agent"
      })
    ).toThrow(/manager/i);

    expect(
      createDocumentIndexingReadinessSignal({
        indexedDocumentCount: 1,
        pendingDocumentCount: 0,
        failedDocumentCount: 0
      })
    ).toEqual({ hasIndexedDocuments: true, indexingReady: true });

    expect(
      createDocumentIndexingReadinessSignal({
        indexedDocumentCount: 0,
        pendingDocumentCount: 1,
        failedDocumentCount: 0
      })
    ).toEqual({ hasIndexedDocuments: false, indexingReady: false });
  });
});

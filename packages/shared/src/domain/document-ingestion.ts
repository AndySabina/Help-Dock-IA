import { createHash } from "node:crypto";

import { isActionAllowed, type StaffRole } from "./foundation.ts";

export type MarkdownUploadInput = { filename: string; content: string };
export type DocumentContentMetadata = { filename: string; contentHash: string; byteLength: number };
export type ExistingDocumentHash = { documentId: string; contentHash: string };

export type ExactDocumentDuplicateResult =
  | { duplicate: true; documentId: string; contentHash: string }
  | { duplicate: false };

export type ChunkMarkdownInput = { documentId: string; content: string; maxChunkLength?: number };

export interface MarkdownChunk {
  id: string;
  documentId: string;
  ordinal: number;
  text: string;
  contentHash: string;
}

export type DuplicateChunkGroup = { contentHash: string; chunkIds: string[] };

export type DocumentOwnedRecord = { id: string; documentId: string };

export interface DocumentDeletionInput {
  documentId: string;
  chunks: readonly DocumentOwnedRecord[];
  embeddings: readonly DocumentOwnedRecord[];
  requestedByRole: StaffRole;
}

export interface DocumentDeletionPlan {
  documentId: string;
  removeContent: true;
  removeChunkIds: string[];
  removeEmbeddingIds: string[];
  retainAuditMetadata: { documentId: string; action: "documents:delete" };
}

export type DocumentIndexingReadinessInput = {
  indexedDocumentCount: number;
  pendingDocumentCount: number;
  failedDocumentCount: number;
};

export interface DocumentIndexingReadinessSignal {
  hasIndexedDocuments: boolean;
  indexingReady: boolean;
}

export type MarkdownUploadValidationResult = { ok: true } | { ok: false; issues: string[] };

const DEFAULT_MAX_CHUNK_LENGTH = 1_200;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeFilename(filename: string): string {
  return filename.trim();
}

export function validateMarkdownUpload(input: MarkdownUploadInput): MarkdownUploadValidationResult {
  const filename = normalizeFilename(input.filename);
  const issues: string[] = [];

  if (filename.length === 0) {
    issues.push("document filename is required");
  } else if (!filename.toLowerCase().endsWith(".md")) {
    issues.push("document filename must end with .md");
  }

  if (input.content.trim().length === 0) {
    issues.push("document content is required");
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

export function createDocumentContentMetadata(input: MarkdownUploadInput): DocumentContentMetadata {
  const validation = validateMarkdownUpload(input);

  if (!validation.ok) {
    throw new Error(validation.issues.join("; "));
  }

  return {
    filename: normalizeFilename(input.filename),
    contentHash: sha256(input.content),
    byteLength: Buffer.byteLength(input.content, "utf8")
  };
}

export function findExactDocumentDuplicate(
  contentHash: string,
  existingDocuments: readonly ExistingDocumentHash[]
): ExactDocumentDuplicateResult {
  const duplicate = existingDocuments.find((document) => document.contentHash === contentHash);

  return duplicate
    ? { duplicate: true, documentId: duplicate.documentId, contentHash }
    : { duplicate: false };
}

function splitMarkdownBlock(block: string, maxChunkLength: number): string[] {
  const words = block.split(/\s+/u).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if (word.length > maxChunkLength) {
      if (current.length > 0) {
        chunks.push(current);
        current = "";
      }

      chunks.push(...splitLongToken(word, maxChunkLength));
      continue;
    }

    const candidate = current.length === 0 ? word : `${current} ${word}`;

    if (candidate.length <= maxChunkLength) {
      current = candidate;
      continue;
    }

    if (current.length > 0) {
      chunks.push(current);
    }

    current = word;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function splitLongToken(token: string, maxChunkLength: number): string[] {
  const chunks: string[] = [];

  for (let index = 0; index < token.length; index += maxChunkLength) {
    chunks.push(token.slice(index, index + maxChunkLength));
  }

  return chunks;
}

export function chunkMarkdownDocument(input: ChunkMarkdownInput): MarkdownChunk[] {
  const maxChunkLength = input.maxChunkLength ?? DEFAULT_MAX_CHUNK_LENGTH;

  if (!Number.isSafeInteger(maxChunkLength) || maxChunkLength < 1) {
    throw new Error("maxChunkLength must be a positive integer");
  }

  const blocks = input.content
    .split(/\n{2,}/u)
    .map((block) => block.trim())
    .filter(Boolean);
  const texts = blocks.flatMap((block) => splitMarkdownBlock(block, maxChunkLength));

  return texts.map((text, ordinal) => {
    const contentHash = sha256(text);

    return {
      id: `${input.documentId}:chunk:${ordinal}:${contentHash.slice(0, 12)}`,
      documentId: input.documentId,
      ordinal,
      text,
      contentHash
    };
  });
}

export function findDuplicateChunks(chunks: readonly MarkdownChunk[]): DuplicateChunkGroup[] {
  const chunkIdsByHash = new Map<string, string[]>();

  for (const chunk of chunks) {
    chunkIdsByHash.set(chunk.contentHash, [
      ...(chunkIdsByHash.get(chunk.contentHash) ?? []),
      chunk.id
    ]);
  }

  return [...chunkIdsByHash.entries()]
    .filter(([, chunkIds]) => chunkIds.length > 1)
    .map(([contentHash, chunkIds]) => ({ contentHash, chunkIds }));
}

export function createDocumentDeletionPlan(input: DocumentDeletionInput): DocumentDeletionPlan {
  if (!isActionAllowed(input.requestedByRole, "documents:delete")) {
    throw new Error("Only managers can delete documents");
  }

  assertRecordsBelongToDocument(input.documentId, "chunk", input.chunks);
  assertRecordsBelongToDocument(input.documentId, "embedding", input.embeddings);

  return {
    documentId: input.documentId,
    removeContent: true,
    removeChunkIds: input.chunks.map((chunk) => chunk.id),
    removeEmbeddingIds: input.embeddings.map((embedding) => embedding.id),
    retainAuditMetadata: { documentId: input.documentId, action: "documents:delete" }
  };
}

function assertRecordsBelongToDocument(
  documentId: string,
  recordType: "chunk" | "embedding",
  records: readonly DocumentOwnedRecord[]
): void {
  const mismatchedRecord = records.find((record) => record.documentId !== documentId);

  if (mismatchedRecord) {
    throw new Error(
      `${recordType} ${mismatchedRecord.id} does not belong to document ${documentId}`
    );
  }
}

export function createDocumentIndexingReadinessSignal(
  input: DocumentIndexingReadinessInput
): DocumentIndexingReadinessSignal {
  const hasIndexedDocuments = input.indexedDocumentCount > 0;

  return {
    hasIndexedDocuments,
    indexingReady:
      hasIndexedDocuments && input.pendingDocumentCount === 0 && input.failedDocumentCount === 0
  };
}

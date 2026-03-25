import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  ChevronDown,
  ChevronRight,
  FileText,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  FolderOpen,
  CloudUpload,
  RotateCcw,
  Download,
} from "lucide-react";
import {
  getDocuments,
  createDocument,
  updateDocument,
  getDocumentUploadUrl,
  getDocumentDownloadUrl,
} from "@/services/api";
import type { Document } from "@/types/loan";
import { DocumentStatus } from "@/types/loan";
import {
  MISMO_CATEGORIES,
  getCategoryForType,
  getLabelForType,
  getAllTypesFlat,
} from "./mismoTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentVersion extends Document {
  version: number;
}

interface GroupedCategory {
  categoryId: string;
  categoryLabel: string;
  typeGroups: TypeGroup[];
}

interface TypeGroup {
  typeCode: string;
  typeLabel: string;
  versions: DocumentVersion[];
  latest: DocumentVersion;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusConfig(status: DocumentStatus) {
  switch (status) {
    case DocumentStatus.ACCEPTED:
      return {
        label: "Accepted",
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        className: "bg-green-100 text-green-800 border-green-200",
      };
    case DocumentStatus.REJECTED:
      return {
        label: "Rejected",
        icon: <XCircle className="w-3.5 h-3.5" />,
        className: "bg-red-100 text-red-800 border-red-200",
      };
    case DocumentStatus.REVIEWED:
      return {
        label: "Reviewed",
        icon: <Eye className="w-3.5 h-3.5" />,
        className: "bg-purple-100 text-purple-800 border-purple-200",
      };
    case DocumentStatus.RECEIVED:
      return {
        label: "Received",
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        className: "bg-blue-100 text-blue-800 border-blue-200",
      };
    case DocumentStatus.REQUESTED:
    default:
      return {
        label: "Requested",
        icon: <Clock className="w-3.5 h-3.5" />,
        className: "bg-neutral-100 text-neutral-600 border-neutral-200",
      };
  }
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileType(filename: string): "pdf" | "image" | "other" {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "tiff", "bmp"].includes(ext))
    return "image";
  return "other";
}

function groupDocuments(documents: Document[]): GroupedCategory[] {
  // Group by document_type, assign versions (oldest = v1)
  const byType = new Map<string, Document[]>();
  for (const doc of documents) {
    const arr = byType.get(doc.document_type) ?? [];
    arr.push(doc);
    byType.set(doc.document_type, arr);
  }

  // Sort each group by created_at ascending → assign version numbers
  const typeGroups: TypeGroup[] = [];
  for (const [typeCode, docs] of byType.entries()) {
    const sorted = [...docs].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const versioned: DocumentVersion[] = sorted.map((d, i) => ({
      ...d,
      version: i + 1,
    }));
    typeGroups.push({
      typeCode,
      typeLabel: getLabelForType(typeCode),
      versions: versioned,
      latest: versioned[versioned.length - 1],
    });
  }

  // Group type groups by MISMO category
  const catMap = new Map<string, TypeGroup[]>();
  for (const tg of typeGroups) {
    const cat = getCategoryForType(tg.typeCode);
    const arr = catMap.get(cat.id) ?? [];
    arr.push(tg);
    catMap.set(cat.id, arr);
  }

  const result: GroupedCategory[] = [];
  for (const cat of MISMO_CATEGORIES) {
    const groups = catMap.get(cat.id);
    if (groups && groups.length > 0) {
      result.push({
        categoryId: cat.id,
        categoryLabel: cat.label,
        typeGroups: groups,
      });
    }
  }
  return result;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = statusConfig(status);
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  loanId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function UploadModal({ loanId, onClose, onSuccess }: UploadModalProps) {
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [phase, setPhase] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allTypes = getAllTypesFlat();

  const handleFile = (f: File) => setFile(f);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!docType || !file) return;
    setPhase("uploading");
    setProgress(10);
    setErrorMsg("");

    try {
      // 1. Create the metadata record
      const record = await createDocument(loanId, {
        document_type: docType,
        original_filename: file.name,
      });
      setProgress(30);

      // 2. Get presigned upload URL
      const { upload_url, s3_key } = await getDocumentUploadUrl(
        loanId,
        file.name,
        file.type || "application/octet-stream"
      );
      setProgress(50);

      // 3. Upload file directly to S3
      const uploadResp = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadResp.ok) throw new Error("S3 upload failed");
      setProgress(80);

      // 4. Mark as Received with the s3_key
      await updateDocument(loanId, record.id, {
        s3_key,
        document_status: DocumentStatus.RECEIVED,
      });
      setProgress(100);
      setPhase("success");
      setTimeout(onSuccess, 800);
    } catch (err) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-900 flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-primary-600" />
            Upload Document
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* MISMO Type Selector */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Document Type <span className="text-red-500">*</span>
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              disabled={phase === "uploading" || phase === "success"}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
            >
              <option value="">— Select MISMO document type —</option>
              {MISMO_CATEGORIES.map((cat) => (
                <optgroup key={cat.id} label={cat.label}>
                  {cat.types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Drop Zone */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              File <span className="text-red-500">*</span>
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() =>
                phase !== "uploading" &&
                phase !== "success" &&
                fileInputRef.current?.click()
              }
              className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-primary-500 bg-primary-50"
                  : file
                  ? "border-green-400 bg-green-50"
                  : "border-neutral-300 hover:border-neutral-400 bg-neutral-50"
              } ${phase === "uploading" || phase === "success" ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.tiff,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-neutral-500">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
              ) : (
                <div className="text-neutral-500">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-neutral-400" />
                  <p className="text-sm font-medium">
                    Drop file here or click to browse
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    PDF, JPG, PNG, TIFF, DOC, XLS (max 50 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {phase === "uploading" && (
            <div>
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {phase === "success" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Document uploaded successfully.
            </div>
          )}

          {phase === "error" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={phase === "uploading"}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={
              !docType ||
              !file ||
              phase === "uploading" ||
              phase === "success"
            }
            className="inline-flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {phase === "uploading" ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Document Viewer (right pane) ─────────────────────────────────────────────

interface DocumentViewerProps {
  loanId: string;
  typeGroup: TypeGroup | null;
  selectedVersionId: string | null;
  onSelectVersion: (id: string) => void;
  onStatusChange: (docId: string, newStatus: DocumentStatus) => Promise<void>;
}

function DocumentViewer({
  loanId,
  typeGroup,
  selectedVersionId,
  onSelectVersion,
  onStatusChange,
}: DocumentViewerProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const selectedDoc = typeGroup?.versions.find(
    (v) => v.id === selectedVersionId
  );

  const fetchDownloadUrl = useCallback(async () => {
    if (!selectedDoc?.s3_key) return;
    setLoadingUrl(true);
    setUrlError(null);
    try {
      const { download_url } = await getDocumentDownloadUrl(
        loanId,
        selectedDoc.id
      );
      setDownloadUrl(download_url);
    } catch {
      setUrlError("Could not load preview URL.");
    } finally {
      setLoadingUrl(false);
    }
  }, [loanId, selectedDoc?.id, selectedDoc?.s3_key]);

  // Reset & refetch when selected doc changes
  useEffect(() => {
    setDownloadUrl(null);
    setUrlError(null);
    if (selectedDoc?.s3_key) {
      fetchDownloadUrl();
    }
  }, [selectedDoc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusAction = async (newStatus: DocumentStatus) => {
    if (!selectedDoc) return;
    setUpdatingStatus(true);
    try {
      await onStatusChange(selectedDoc.id, newStatus);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!typeGroup || !selectedDoc) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
          <FolderOpen className="w-7 h-7 text-neutral-400" />
        </div>
        <p className="text-neutral-500 font-medium text-sm">
          Select a document to preview
        </p>
        <p className="text-neutral-400 text-xs mt-1">
          Click any document in the eFolder to view details and preview
        </p>
      </div>
    );
  }

  const fileType = getFileType(selectedDoc.original_filename);
  const cfg = statusConfig(selectedDoc.document_status);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Viewer header */}
      <div className="px-5 py-4 border-b border-neutral-200 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium mb-0.5">
              {getCategoryForType(selectedDoc.document_type).label}
            </p>
            <h3 className="font-semibold text-neutral-900 text-sm leading-snug truncate">
              {getLabelForType(selectedDoc.document_type)}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5 truncate">
              {selectedDoc.original_filename}
            </p>
          </div>
          <StatusBadge status={selectedDoc.document_status} />
        </div>

        {/* Version tabs */}
        {typeGroup.versions.length > 1 && (
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            <span className="text-xs text-neutral-500 mr-1">Version:</span>
            {typeGroup.versions.map((v) => (
              <button
                key={v.id}
                onClick={() => onSelectVersion(v.id)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  v.id === selectedVersionId
                    ? "bg-primary-100 text-primary-800"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                v{v.version}
                {v.id === typeGroup.latest.id && (
                  <span className="ml-1 text-primary-500">★</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden bg-neutral-50 relative">
        {!selectedDoc.s3_key ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Clock className="w-10 h-10 text-neutral-300 mb-3" />
            <p className="text-sm font-medium text-neutral-500">
              No file uploaded yet
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Status: {selectedDoc.document_status}
            </p>
          </div>
        ) : loadingUrl ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : urlError ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-sm text-red-600">{urlError}</p>
            <button
              onClick={fetchDownloadUrl}
              className="mt-3 text-xs text-primary-600 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : downloadUrl ? (
          <>
            {fileType === "pdf" && (
              <iframe
                src={downloadUrl}
                title={selectedDoc.original_filename}
                className="w-full h-full border-0"
              />
            )}
            {fileType === "image" && (
              <div className="flex items-center justify-center h-full p-4">
                <img
                  src={downloadUrl}
                  alt={selectedDoc.original_filename}
                  className="max-w-full max-h-full object-contain shadow-md rounded"
                />
              </div>
            )}
            {fileType === "other" && (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <FileText className="w-12 h-12 text-neutral-300 mb-3" />
                <p className="text-sm text-neutral-600 font-medium">
                  {selectedDoc.original_filename}
                </p>
                <p className="text-xs text-neutral-400 mt-1 mb-4">
                  This file type cannot be previewed inline.
                </p>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </a>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Metadata & actions footer */}
      <div className="px-5 py-4 border-t border-neutral-200 bg-white shrink-0 space-y-4">
        {/* Metadata grid */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {[
            { label: "Uploaded", value: formatDate(selectedDoc.uploaded_at) },
            { label: "Reviewed", value: formatDate(selectedDoc.reviewed_at) },
            { label: "Created", value: formatDate(selectedDoc.created_at) },
            {
              label: "Versions",
              value: `${typeGroup.versions.length} file${typeGroup.versions.length > 1 ? "s" : ""}`,
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-neutral-400 uppercase tracking-wide font-medium">
                {label}
              </dt>
              <dd className="text-neutral-800 font-medium mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Status actions */}
        {selectedDoc.document_status === DocumentStatus.RECEIVED && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 mr-1">Review:</span>
            <button
              onClick={() => handleStatusAction(DocumentStatus.ACCEPTED)}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              onClick={() => handleStatusAction(DocumentStatus.REJECTED)}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
            <button
              onClick={() => handleStatusAction(DocumentStatus.REVIEWED)}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Mark Reviewed
            </button>
          </div>
        )}
        {selectedDoc.document_status === DocumentStatus.REVIEWED && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 mr-1">Decision:</span>
            <button
              onClick={() => handleStatusAction(DocumentStatus.ACCEPTED)}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              onClick={() => handleStatusAction(DocumentStatus.REJECTED)}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        )}
        {selectedDoc.document_status === DocumentStatus.REJECTED && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStatusAction(DocumentStatus.REQUESTED)}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 text-neutral-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Re-request
            </button>
          </div>
        )}

        {updatingStatus && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <div className="w-3 h-3 border border-neutral-400 border-t-transparent rounded-full animate-spin" />
            Updating status…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EFolder Left Pane ────────────────────────────────────────────────────────

interface LeftPaneProps {
  grouped: GroupedCategory[];
  documents: Document[];
  selectedDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onUpload: () => void;
}

function LeftPane({
  grouped,
  documents,
  selectedDocId,
  onSelectDoc,
  onUpload,
}: LeftPaneProps) {
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    () => new Set(grouped.map((g) => g.categoryId))
  );
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  // Auto-expand category when a new doc is uploaded
  useEffect(() => {
    if (grouped.length > 0) {
      setExpandedCats((prev) => {
        const next = new Set(prev);
        grouped.forEach((g) => next.add(g.categoryId));
        return next;
      });
    }
  }, [grouped.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleCat = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleType = (key: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const totalCount = documents.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            eFolder
          </h3>
          <span className="text-xs text-neutral-400 font-medium">
            {totalCount} doc{totalCount !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={onUpload}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="p-6 text-center">
            <FolderOpen className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">
              No documents yet. Upload the first one.
            </p>
          </div>
        ) : (
          <ul className="py-2">
            {grouped.map((cat) => {
              const isExpanded = expandedCats.has(cat.categoryId);
              const catCount = cat.typeGroups.reduce(
                (n, tg) => n + tg.versions.length,
                0
              );
              return (
                <li key={cat.categoryId}>
                  {/* Category row */}
                  <button
                    onClick={() => toggleCat(cat.categoryId)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-neutral-50 transition-colors group"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wide flex-1 truncate">
                      {cat.categoryLabel}
                    </span>
                    <span className="text-xs bg-neutral-100 text-neutral-500 rounded-full px-1.5 py-0.5 font-medium shrink-0">
                      {catCount}
                    </span>
                  </button>

                  {/* Type groups */}
                  {isExpanded && (
                    <ul>
                      {cat.typeGroups.map((tg) => {
                        const typeKey = `${cat.categoryId}:${tg.typeCode}`;
                        const isTypeExpanded = expandedTypes.has(typeKey);
                        const isLatestSelected =
                          tg.latest.id === selectedDocId;
                        const hasMultiple = tg.versions.length > 1;

                        return (
                          <li key={tg.typeCode}>
                            {/* Type row — clicking selects latest unless multi */}
                            <div className="flex items-stretch">
                              <button
                                onClick={() => {
                                  if (hasMultiple) {
                                    toggleType(typeKey);
                                  }
                                  onSelectDoc(tg.latest.id);
                                }}
                                className={`flex-1 flex items-center gap-2 pl-8 pr-2 py-2 text-left transition-colors min-w-0 ${
                                  isLatestSelected && !isTypeExpanded
                                    ? "bg-primary-50"
                                    : "hover:bg-neutral-50"
                                }`}
                              >
                                <FileText
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isLatestSelected
                                      ? "text-primary-500"
                                      : "text-neutral-400"
                                  }`}
                                />
                                <span
                                  className={`text-xs truncate flex-1 ${
                                    isLatestSelected
                                      ? "text-primary-800 font-medium"
                                      : "text-neutral-700"
                                  }`}
                                >
                                  {tg.typeLabel}
                                </span>
                                <StatusBadge
                                  status={tg.latest.document_status}
                                />
                              </button>
                              {/* Version expand toggle */}
                              {hasMultiple && (
                                <button
                                  onClick={() => toggleType(typeKey)}
                                  className="px-2 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 text-xs font-bold transition-colors shrink-0"
                                  title={`${tg.versions.length} versions`}
                                >
                                  {isTypeExpanded ? (
                                    <ChevronDown className="w-3 h-3" />
                                  ) : (
                                    <span className="text-xs leading-none">
                                      v{tg.versions.length}
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Version list */}
                            {hasMultiple && isTypeExpanded && (
                              <ul>
                                {[...tg.versions].reverse().map((v) => (
                                  <li key={v.id}>
                                    <button
                                      onClick={() => onSelectDoc(v.id)}
                                      className={`w-full flex items-center gap-2 pl-12 pr-3 py-1.5 text-left transition-colors ${
                                        v.id === selectedDocId
                                          ? "bg-primary-50 text-primary-800"
                                          : "hover:bg-neutral-50 text-neutral-600"
                                      }`}
                                    >
                                      <span className="text-xs font-medium shrink-0 text-neutral-400">
                                        v{v.version}
                                      </span>
                                      <span className="text-xs truncate flex-1">
                                        {v.original_filename}
                                      </span>
                                      <span className="text-xs text-neutral-400 shrink-0">
                                        {formatDate(
                                          v.uploaded_at ?? v.created_at
                                        )}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Main EFolderSection ──────────────────────────────────────────────────────

export default function EFolderSection({ loanId }: { loanId: string }) {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [splitPos, setSplitPos] = useState(36); // left pane % width
  const [isDragging, setIsDragging] = useState(false);

  // ── Fetch documents ──────────────────────────────────────────────────────
  const { data: documents = [], isLoading, isError } = useQuery<Document[]>({
    queryKey: ["documents", loanId],
    queryFn: () => getDocuments(loanId),
    enabled: Boolean(loanId),
  });

  // ── Grouped by MISMO category ────────────────────────────────────────────
  const grouped = useMemo(() => groupDocuments(documents), [documents]);

  // ── Find selected doc's typeGroup ────────────────────────────────────────
  const selectedTypeGroup = useMemo((): TypeGroup | null => {
    if (!selectedDocId) return null;
    for (const cat of grouped) {
      for (const tg of cat.typeGroups) {
        if (tg.versions.some((v) => v.id === selectedDocId)) return tg;
      }
    }
    return null;
  }, [grouped, selectedDocId]);

  // ── Status update mutation ────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({
      docId,
      newStatus,
    }: {
      docId: string;
      newStatus: DocumentStatus;
    }) =>
      updateDocument(loanId, docId, { document_status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", loanId] });
    },
  });

  const handleStatusChange = async (docId: string, newStatus: DocumentStatus) => {
    await statusMutation.mutateAsync({ docId, newStatus });
  };

  // ── Drag-to-resize split pane ─────────────────────────────────────────────
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(22, Math.min(55, (x / rect.width) * 100));
      setSplitPos(pct);
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // ── Auto-select first doc when data loads ────────────────────────────────
  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading / error ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load documents. Please refresh.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Upload modal */}
      {uploadOpen && (
        <UploadModal
          loanId={loanId}
          onClose={() => setUploadOpen(false)}
          onSuccess={() => {
            setUploadOpen(false);
            queryClient.invalidateQueries({ queryKey: ["documents", loanId] });
          }}
        />
      )}

      <div className="flex flex-col h-full overflow-hidden">
        {/* Page header */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-white shrink-0">
          <h2 className="text-xl font-semibold text-neutral-900">Documents</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            MISMO-categorized eFolder · {documents.length} document
            {documents.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Split pane */}
        <div
          ref={containerRef}
          className="flex flex-1 overflow-hidden"
          style={{ cursor: isDragging ? "col-resize" : undefined }}
        >
          {/* Left pane */}
          <div
            className="overflow-hidden border-r border-neutral-200 bg-white shrink-0"
            style={{ width: `${splitPos}%` }}
          >
            <LeftPane
              grouped={grouped}
              documents={documents}
              selectedDocId={selectedDocId}
              onSelectDoc={setSelectedDocId}
              onUpload={() => setUploadOpen(true)}
            />
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={handleDividerMouseDown}
            className={`w-1 shrink-0 cursor-col-resize relative group ${
              isDragging ? "bg-primary-400" : "bg-neutral-200 hover:bg-primary-300"
            } transition-colors`}
            title="Drag to resize"
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
          </div>

          {/* Right pane */}
          <div className="flex-1 overflow-hidden bg-white">
            <DocumentViewer
              loanId={loanId}
              typeGroup={selectedTypeGroup}
              selectedVersionId={selectedDocId}
              onSelectVersion={setSelectedDocId}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}

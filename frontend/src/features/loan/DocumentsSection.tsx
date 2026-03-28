import React, { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Folder,
  Upload,
  Download,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  X,
  Check,
} from "lucide-react";
import {
  getDocuments,
  createDocument,
  uploadDocumentFile,
  updateDocument,
  deleteDocument,
  getDocumentFileUrl,
} from "@/services/api";
import type { Document as LoanDocument } from "@/types/loan";
import { DocumentStatus } from "@/types/loan";

// ─── Document category definitions ───────────────────────────────────────────

const CATEGORIES = [
  {
    key: "income",
    label: "Income",
    types: ["W2", "PayStub", "TaxReturn", "1099", "VOE", "EmploymentLetter", "OtherIncome"],
  },
  {
    key: "assets",
    label: "Assets",
    types: ["BankStatement", "RetirementStatement", "GiftLetter", "AssetLetter"],
  },
  {
    key: "property",
    label: "Property",
    types: ["AppraisalReport", "TitleReport", "HomeownersInsurance", "FloodInsurance", "PurchaseContract"],
  },
  {
    key: "identity",
    label: "Identity",
    types: ["DriversLicense", "Passport", "SocialSecurityCard"],
  },
  {
    key: "disclosures",
    label: "Disclosures",
    types: ["LoanEstimate", "ClosingDisclosure", "IntentToProceed", "SignedDisclosures"],
  },
  {
    key: "other",
    label: "Other",
    types: ["HOADocuments", "CreditExplanation", "LetterOfExplanation", "Miscellaneous"],
  },
] as const;

type CategoryKey = typeof CATEGORIES[number]["key"];

function categoryFor(docType: string): CategoryKey {
  for (const cat of CATEGORIES) {
    if ((cat.types as readonly string[]).includes(docType)) return cat.key;
  }
  return "other";
}

function labelFor(docType: string): string {
  const map: Record<string, string> = {
    W2: "W-2",
    PayStub: "Pay Stub",
    TaxReturn: "Tax Return",
    "1099": "1099",
    VOE: "Verification of Employment",
    EmploymentLetter: "Employment Letter",
    OtherIncome: "Other Income",
    BankStatement: "Bank Statement",
    RetirementStatement: "Retirement Statement",
    GiftLetter: "Gift Letter",
    AssetLetter: "Asset Letter",
    AppraisalReport: "Appraisal Report",
    TitleReport: "Title Report",
    HomeownersInsurance: "Homeowners Insurance",
    FloodInsurance: "Flood Insurance",
    PurchaseContract: "Purchase Contract",
    DriversLicense: "Driver's License",
    Passport: "Passport",
    SocialSecurityCard: "Social Security Card",
    LoanEstimate: "Loan Estimate",
    ClosingDisclosure: "Closing Disclosure",
    IntentToProceed: "Intent to Proceed",
    SignedDisclosures: "Signed Disclosures",
    HOADocuments: "HOA Documents",
    CreditExplanation: "Credit Explanation",
    LetterOfExplanation: "Letter of Explanation",
    Miscellaneous: "Miscellaneous",
  };
  return map[docType] ?? docType;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DocumentStatus }) {
  const cfg: Record<DocumentStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    Requested: {
      label: "Requested",
      cls: "bg-neutral-100 text-neutral-600",
      icon: <Clock className="w-3 h-3" />,
    },
    Received: {
      label: "Received",
      cls: "bg-blue-100 text-blue-700",
      icon: <FileText className="w-3 h-3" />,
    },
    Reviewed: {
      label: "Reviewed",
      cls: "bg-yellow-100 text-yellow-700",
      icon: <Clock className="w-3 h-3" />,
    },
    Accepted: {
      label: "Accepted",
      cls: "bg-green-100 text-green-700",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    Rejected: {
      label: "Rejected",
      cls: "bg-red-100 text-red-700",
      icon: <XCircle className="w-3 h-3" />,
    },
  };
  const { label, cls, icon } = cfg[status] ?? cfg.Requested;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

// ─── Upload cell (per document row) ──────────────────────────────────────────

interface UploadCellProps {
  loanId: string;
  doc: LoanDocument;
  onUploaded: () => void;
}

function UploadCell({ loanId, doc, onUploaded }: UploadCellProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (file: File) =>
      uploadDocumentFile(loanId, doc.id, file, setProgress),
    onSuccess: () => {
      setProgress(null);
      setError(null);
      onUploaded();
    },
    onError: () => {
      setProgress(null);
      setError("Upload failed. Please try again.");
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    mutation.mutate(file);
    e.target.value = "";
  }

  if (progress !== null) {
    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-neutral-500 tabular-nums">{progress}%</span>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={handleFileChange}
        aria-label={`Upload file for ${labelFor(doc.document_type)}`}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1 disabled:opacity-50"
      >
        <Upload className="w-3.5 h-3.5" />
        Upload
      </button>
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────

interface DocumentRowProps {
  loanId: string;
  doc: LoanDocument;
  onRefresh: () => void;
}

function DocumentRow({ loanId, doc, onRefresh }: DocumentRowProps) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusMutation = useMutation({
    mutationFn: (newStatus: DocumentStatus) =>
      updateDocument(loanId, doc.id, { document_status: newStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents", loanId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(loanId, doc.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents", loanId] }),
  });

  const hasFile = Boolean(doc.s3_key);
  const fileUrl = hasFile
    ? getDocumentFileUrl(loanId, doc.id) +
      `?token=${localStorage.getItem("access_token") ?? ""}`
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
      {/* Type + filename */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900">{labelFor(doc.document_type)}</p>
        {doc.original_filename && (
          <p className="text-xs text-neutral-400 truncate mt-0.5">{doc.original_filename}</p>
        )}
        {doc.uploaded_at && (
          <p className="text-xs text-neutral-400 mt-0.5">
            Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Status */}
      <StatusBadge status={doc.document_status} />

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Upload — only when not yet received */}
        {doc.document_status === "Requested" && (
          <UploadCell loanId={loanId} doc={doc} onUploaded={onRefresh} />
        )}

        {/* Re-upload after received */}
        {doc.document_status === "Received" && (
          <UploadCell loanId={loanId} doc={doc} onUploaded={onRefresh} />
        )}

        {/* Review actions */}
        {doc.document_status === "Received" && (
          <button
            type="button"
            onClick={() => statusMutation.mutate(DocumentStatus.REVIEWED)}
            disabled={statusMutation.isPending}
            title="Mark Reviewed"
            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 disabled:opacity-50"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
        )}

        {doc.document_status === DocumentStatus.REVIEWED && (
          <>
            <button
              type="button"
              onClick={() => statusMutation.mutate(DocumentStatus.ACCEPTED)}
              disabled={statusMutation.isPending}
              title="Accept"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1 disabled:opacity-50"
            >
              <Check className="w-3 h-3" />Accept
            </button>
            <button
              type="button"
              onClick={() => statusMutation.mutate(DocumentStatus.REJECTED)}
              disabled={statusMutation.isPending}
              title="Reject"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-1 disabled:opacity-50"
            >
              <X className="w-3 h-3" />Reject
            </button>
          </>
        )}

        {/* Download */}
        {fileUrl && (
          <a
            href={fileUrl}
            download={doc.original_filename}
            title="Download"
            className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-error font-medium">Delete?</span>
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="px-2 py-1 text-xs font-medium text-white bg-error rounded focus:outline-none"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-1 text-xs font-medium text-neutral-600 bg-neutral-100 rounded focus:outline-none"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            title="Delete"
            className="p-1.5 text-neutral-300 hover:text-error hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add document form (inline) ───────────────────────────────────────────────

interface AddDocFormProps {
  loanId: string;
  defaultTypes: readonly string[];
  onDone: () => void;
}

function AddDocForm({ loanId, defaultTypes, onDone }: AddDocFormProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState(defaultTypes[0] ?? "Miscellaneous");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: { document_type: string; original_filename: string }) =>
      createDocument(loanId, payload),
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      // 1. Create metadata record
      const doc = await createMutation.mutateAsync({
        document_type: selectedType,
        original_filename: file.name,
      });

      // 2. Upload file
      setUploadProgress(0);
      await uploadDocumentFile(loanId, doc.id, file, setUploadProgress);

      queryClient.invalidateQueries({ queryKey: ["documents", loanId] });
      onDone();
    } catch {
      setError("Upload failed. Please try again.");
      setUploadProgress(null);
    }
    e.target.value = "";
  }

  return (
    <div className="px-4 py-3 bg-primary-50 border-t border-primary-100 flex items-center gap-3 flex-wrap">
      <select
        value={selectedType}
        onChange={(e) => setSelectedType(e.target.value)}
        className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
        aria-label="Document type"
      >
        {defaultTypes.map((t) => (
          <option key={t} value={t}>
            {labelFor(t)}
          </option>
        ))}
      </select>

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        onChange={handleFileChange}
        aria-label="Choose file to upload"
      />

      {uploadProgress !== null ? (
        <div className="flex items-center gap-2 flex-1 min-w-[160px]">
          <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all duration-150"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="text-xs text-neutral-500 tabular-nums">{uploadProgress}%</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
        >
          <Upload className="w-3.5 h-3.5" />
          Choose File & Upload
        </button>
      )}

      <button
        type="button"
        onClick={onDone}
        className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors focus:outline-none"
        aria-label="Cancel"
      >
        <X className="w-4 h-4" />
      </button>

      {error && <p className="w-full text-xs text-error">{error}</p>}
    </div>
  );
}

// ─── Category group ───────────────────────────────────────────────────────────

interface CategoryGroupProps {
  category: typeof CATEGORIES[number];
  docs: LoanDocument[];
  loanId: string;
  onRefresh: () => void;
}

function CategoryGroup({ category, docs, loanId, onRefresh }: CategoryGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);

  const receivedCount = docs.filter((d) => d.document_status !== "Requested").length;

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-neutral-50 cursor-pointer select-none"
        onClick={() => setCollapsed((v) => !v)}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setCollapsed((v) => !v);
          }
        }}
      >
        <Folder className="w-4 h-4 text-primary-500 shrink-0" aria-hidden="true" />
        <span className="flex-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">{category.label}</span>
          <span className="text-xs text-neutral-500">
            {receivedCount}/{docs.length} received
          </span>
          {docs.length > 0 && receivedCount === docs.length && (
            <CheckCircle className="w-3.5 h-3.5 text-green-600" aria-label="All received" />
          )}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setAdding(true);
            setCollapsed(false);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>

        <span className="text-neutral-400" aria-hidden="true">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </span>
      </div>

      {/* Document rows */}
      {!collapsed && (
        <div className="bg-white">
          {docs.length === 0 && !adding ? (
            <div className="py-6 flex flex-col items-center text-center">
              <p className="text-sm text-neutral-400">No documents in this category.</p>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="mt-1.5 text-sm text-primary-600 hover:underline focus:outline-none"
              >
                Add the first one
              </button>
            </div>
          ) : (
            docs.map((doc) => (
              <DocumentRow key={doc.id} loanId={loanId} doc={doc} onRefresh={onRefresh} />
            ))
          )}

          {adding && (
            <AddDocForm
              loanId={loanId}
              defaultTypes={category.types}
              onDone={() => setAdding(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary tiles ────────────────────────────────────────────────────────────

function SummaryTiles({ docs }: { docs: LoanDocument[] }) {
  const total = docs.length;
  const requested = docs.filter((d) => d.document_status === DocumentStatus.REQUESTED).length;
  const received = docs.filter((d) => d.document_status === DocumentStatus.RECEIVED).length;
  const accepted = docs.filter((d) => d.document_status === DocumentStatus.ACCEPTED).length;
  const rejected = docs.filter((d) => d.document_status === DocumentStatus.REJECTED).length;

  const tiles = [
    { label: "Total", value: total, color: "text-neutral-900", bg: "bg-neutral-50 border-neutral-200" },
    { label: "Requested", value: requested, color: "text-neutral-500", bg: "bg-neutral-50 border-neutral-200" },
    { label: "Received", value: received, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
    { label: "Accepted", value: accepted, color: "text-green-700", bg: "bg-green-50 border-green-200" },
    { label: "Rejected", value: rejected, color: "text-red-700", bg: "bg-red-50 border-red-200" },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {tiles.map(({ label, value, color, bg }) => (
        <div key={label} className={`rounded-xl border ${bg} px-3 py-3 text-center`}>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Global drop zone ─────────────────────────────────────────────────────────

interface GlobalDropZoneProps {
  loanId: string;
  onUploaded: () => void;
}

function GlobalDropZone({ loanId, onUploaded }: GlobalDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [typeModalFile, setTypeModalFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState("Miscellaneous");
  const queryClient = useQueryClient();

  const allTypes = CATEGORIES.flatMap((c) => [...c.types] as string[]);

  async function handleFiles(files: FileList) {
    if (!files.length) return;
    setTypeModalFile(files[0]);
  }

  async function commitUpload() {
    if (!typeModalFile) return;
    setStatus("uploading");
    setTypeModalFile(null);
    try {
      const doc = await createDocument(loanId, {
        document_type: selectedType,
        original_filename: typeModalFile.name,
      });
      await uploadDocumentFile(loanId, doc.id, typeModalFile);
      queryClient.invalidateQueries({ queryKey: ["documents", loanId] });
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
      onUploaded();
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mb-6 border-2 border-dashed rounded-xl px-6 py-8 flex flex-col items-center justify-center text-center transition-colors ${
          dragging
            ? "border-primary-400 bg-primary-50"
            : status === "done"
            ? "border-green-400 bg-green-50"
            : status === "error"
            ? "border-red-400 bg-red-50"
            : "border-neutral-300 bg-neutral-50 hover:border-primary-300 hover:bg-primary-50/40"
        }`}
      >
        {status === "uploading" ? (
          <>
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm text-neutral-600">Uploading…</p>
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-sm text-green-700 font-medium">Uploaded successfully</p>
          </>
        ) : status === "error" ? (
          <>
            <XCircle className="w-6 h-6 text-red-600 mb-2" />
            <p className="text-sm text-red-700 font-medium">Upload failed — please try again</p>
          </>
        ) : (
          <>
            <Upload className="w-6 h-6 text-neutral-400 mb-2" aria-hidden="true" />
            <p className="text-sm text-neutral-600 font-medium">
              Drop a file here to upload
            </p>
            <p className="text-xs text-neutral-400 mt-1">PDF, JPEG, PNG, DOCX — any file type accepted</p>
          </>
        )}
      </div>

      {/* Type picker modal */}
      {typeModalFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-base font-semibold text-neutral-900 mb-1">Select Document Type</h3>
            <p className="text-sm text-neutral-500 mb-4 truncate">{typeModalFile.name}</p>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 mb-4"
              aria-label="Document type"
            >
              {allTypes.map((t) => (
                <option key={t} value={t}>{labelFor(t)}</option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setTypeModalFile(null)}
                className="px-4 py-2 text-sm text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitUpload}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main DocumentsSection ────────────────────────────────────────────────────

interface DocumentsSectionProps {
  loanId: string;
}

export default function DocumentsSection({ loanId }: DocumentsSectionProps) {
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading, isError } = useQuery<LoanDocument[]>({
    queryKey: ["documents", loanId],
    queryFn: () => getDocuments(loanId),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["documents", loanId] });
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-40">
        <div className="text-center">
          <div className="w-7 h-7 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-neutral-500">Loading documents…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="card p-8 text-center">
          <p className="text-error font-medium">Failed to load documents.</p>
          <p className="text-sm text-neutral-500 mt-1">Please refresh and try again.</p>
        </div>
      </div>
    );
  }

  // Group by category
  const byCategory = CATEGORIES.map((cat) => ({
    category: cat,
    docs: docs.filter((d) => categoryFor(d.document_type) === cat.key),
  }));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Folder className="w-5 h-5 text-primary-600" aria-hidden="true" />
        <h2 className="text-xl font-semibold text-neutral-900">eFolder</h2>
      </div>

      {/* Summary tiles */}
      <SummaryTiles docs={docs} />

      {/* Global drop zone */}
      <GlobalDropZone loanId={loanId} onUploaded={refresh} />

      {/* Per-category collapsible groups */}
      <div className="space-y-4">
        {byCategory.map(({ category, docs: catDocs }) => (
          <CategoryGroup
            key={category.key}
            category={category}
            docs={catDocs}
            loanId={loanId}
            onRefresh={refresh}
          />
        ))}
      </div>

      {/* Compliance note */}
      <div className="mt-6 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
        <p className="text-xs text-neutral-500">
          <strong className="text-neutral-700">Document Retention:</strong>{" "}
          All loan documents must be retained per investor and regulatory guidelines.
          Files uploaded here are stored securely and included in the loan audit trail.
        </p>
      </div>
    </div>
  );
}

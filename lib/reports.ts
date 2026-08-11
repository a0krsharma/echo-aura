/**
 * lib/reports.ts
 * ─────────────────────────────────────────────────────
 * Report System for Echo
 * User reporting for inappropriate content
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface Report {
  id: string;
  contentType: "post" | "comment" | "whisper" | "room" | "user";
  contentId: string;
  reportType: "spam" | "harassment" | "hate_speech" | "explicit" | "misinformation" | "impersonation" | "other";
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  reportedBy: string;
  reportedByHandle: string;
  reason: string;
  additionalInfo?: string;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  resolutionNote?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const REPORTS_COLLECTION = "reports";

// ── Submit a report ─────────────────────────────────────────────────────────────
export async function submitReport(
  contentType: Report["contentType"],
  contentId: string,
  reportType: Report["reportType"],
  reportedBy: string,
  reportedByHandle: string,
  reason: string,
  additionalInfo?: string
): Promise<string> {
  try {
    const db = getFirebaseDb();
    const reportRef = doc(collection(db, REPORTS_COLLECTION));
    const reportId = reportRef.id;
    
    await setDoc(reportRef, {
      id: reportId,
      contentType,
      contentId,
      reportType,
      status: "pending",
      reportedBy,
      reportedByHandle,
      reason,
      additionalInfo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    return reportId;
  } catch (error) {
    console.error("[submitReport] Error:", error);
    throw error;
  }
}

// ── Get pending reports ─────────────────────────────────────────────────────────
export async function getPendingReports(limitCount: number = 50): Promise<Report[]> {
  try {
    const db = getFirebaseDb();
    
    const reportsQuery = query(
      collection(db, REPORTS_COLLECTION),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const reportsSnap = await getDocs(reportsQuery);
    return reportsSnap.docs.map(doc => doc.data() as Report);
  } catch (error) {
    console.error("[getPendingReports] Error:", error);
    return [];
  }
}

// ── Subscribe to pending reports (real-time) ─────────────────────────────────────
export function subscribeToPendingReports(
  callback: (reports: Report[]) => void
): () => void {
  const db = getFirebaseDb();
  
  const reportsQuery = query(
    collection(db, REPORTS_COLLECTION),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  
  const unsubscribe = onSnapshot(reportsQuery, (querySnap) => {
    const reports = querySnap.docs.map(doc => doc.data() as Report);
    callback(reports);
  }, (error) => {
    console.error("[subscribeToPendingReports] Error:", error);
  });
  
  return unsubscribe;
}

// ── Update report status ─────────────────────────────────────────────────────────
export async function updateReportStatus(
  reportId: string,
  status: Report["status"],
  reviewerUid: string,
  resolutionNote?: string
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    
    await updateDoc(reportRef, {
      status,
      reviewedBy: reviewerUid,
      reviewedAt: serverTimestamp(),
      resolutionNote,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("[updateReportStatus] Error:", error);
    throw error;
  }
}

// ── Get report by ID ───────────────────────────────────────────────────────────
export async function getReportById(reportId: string): Promise<Report | null> {
  try {
    const db = getFirebaseDb();
    const reportRef = doc(db, REPORTS_COLLECTION, reportId);
    const reportSnap = await getDoc(reportRef);
    
    if (!reportSnap.exists()) {
      return null;
    }
    
    return reportSnap.data() as Report;
  } catch (error) {
    console.error("[getReportById] Error:", error);
    return null;
  }
}

// ── Get reports for specific content ────────────────────────────────────────────
export async function getReportsForContent(
  contentType: Report["contentType"],
  contentId: string
): Promise<Report[]> {
  try {
    const db = getFirebaseDb();
    
    const reportsQuery = query(
      collection(db, REPORTS_COLLECTION),
      where("contentType", "==", contentType),
      where("contentId", "==", contentId),
      orderBy("createdAt", "desc")
    );
    
    const reportsSnap = await getDocs(reportsQuery);
    return reportsSnap.docs.map(doc => doc.data() as Report);
  } catch (error) {
    console.error("[getReportsForContent] Error:", error);
    return [];
  }
}

// ── Get reports by user ───────────────────────────────────────────────────────
export async function getReportsByUser(
  uid: string,
  limitCount: number = 50
): Promise<Report[]> {
  try {
    const db = getFirebaseDb();
    
    const reportsQuery = query(
      collection(db, REPORTS_COLLECTION),
      where("reportedBy", "==", uid),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const reportsSnap = await getDocs(reportsQuery);
    return reportsSnap.docs.map(doc => doc.data() as Report);
  } catch (error) {
    console.error("[getReportsByUser] Error:", error);
    return [];
  }
}

// ── Get report statistics ─────────────────────────────────────────────────────
export async function getReportStats(): Promise<{
  total: number;
  pending: number;
  reviewing: number;
  resolved: number;
  dismissed: number;
}> {
  try {
    const db = getFirebaseDb();
    
    const totalSnap = await getDocs(collection(db, REPORTS_COLLECTION));
    const total = totalSnap.size;
    
    const pendingQuery = query(
      collection(db, REPORTS_COLLECTION),
      where("status", "==", "pending")
    );
    const pendingSnap = await getDocs(pendingQuery);
    const pending = pendingSnap.size;
    
    const reviewingQuery = query(
      collection(db, REPORTS_COLLECTION),
      where("status", "==", "reviewing")
    );
    const reviewingSnap = await getDocs(reviewingQuery);
    const reviewing = reviewingSnap.size;
    
    const resolvedQuery = query(
      collection(db, REPORTS_COLLECTION),
      where("status", "==", "resolved")
    );
    const resolvedSnap = await getDocs(resolvedQuery);
    const resolved = resolvedSnap.size;
    
    const dismissedQuery = query(
      collection(db, REPORTS_COLLECTION),
      where("status", "==", "dismissed")
    );
    const dismissedSnap = await getDocs(dismissedQuery);
    const dismissed = dismissedSnap.size;
    
    return { total, pending, reviewing, resolved, dismissed };
  } catch (error) {
    console.error("[getReportStats] Error:", error);
    return { total: 0, pending: 0, reviewing: 0, resolved: 0, dismissed: 0 };
  }
}

// ── Bulk update report status ───────────────────────────────────────────────────
export async function bulkUpdateReportStatus(
  reportIds: string[],
  status: Report["status"],
  reviewerUid: string,
  resolutionNote?: string
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const batch = writeBatch(db);
    
    reportIds.forEach(reportId => {
      const reportRef = doc(db, REPORTS_COLLECTION, reportId);
      batch.update(reportRef, {
        status,
        reviewedBy: reviewerUid,
        reviewedAt: serverTimestamp(),
        resolutionNote,
        updatedAt: serverTimestamp(),
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("[bulkUpdateReportStatus] Error:", error);
    throw error;
  }
}

// ── Get reports by type ───────────────────────────────────────────────────────
export async function getReportsByType(
  reportType: Report["reportType"],
  limitCount: number = 50
): Promise<Report[]> {
  try {
    const db = getFirebaseDb();
    
    const reportsQuery = query(
      collection(db, REPORTS_COLLECTION),
      where("reportType", "==", reportType),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    
    const reportsSnap = await getDocs(reportsQuery);
    return reportsSnap.docs.map(doc => doc.data() as Report);
  } catch (error) {
    console.error("[getReportsByType] Error:", error);
    return [];
  }
}

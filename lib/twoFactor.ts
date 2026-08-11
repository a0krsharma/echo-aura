/**
 * lib/twoFactor.ts
 * ─────────────────────────────────────────────────────
 * Two-Factor Authentication System for Echo
 * TOTP support and backup codes
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export interface TwoFactorSettings {
  uid: string;
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  verifiedAt?: Timestamp;
  lastUsedAt?: Timestamp;
}

const TWO_FACTOR_COLLECTION = "two_factor_settings";

// ── Generate TOTP secret (placeholder - in production use a proper library) ─────────
function generateSecret(): string {
  // In production, use a library like 'otpauth' or 'speakeasy'
  // This is a placeholder implementation
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

// ── Generate backup codes ─────────────────────────────────────────────────────────
function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 12).toUpperCase();
    codes.push(code);
  }
  return codes;
}

// ── Enable 2FA for user ─────────────────────────────────────────────────────────
export async function enableTwoFactorAuth(uid: string): Promise<{
  secret: string;
  backupCodes: string[];
}> {
  try {
    const db = getFirebaseDb();
    const secret = generateSecret();
    const backupCodes = generateBackupCodes();
    
    const settingsRef = doc(db, TWO_FACTOR_COLLECTION, uid);
    await setDoc(settingsRef, {
      uid,
      enabled: true,
      secret,
      backupCodes,
      verifiedAt: null,
      lastUsedAt: null,
    });
    
    return { secret, backupCodes };
  } catch (error) {
    console.error("[enableTwoFactorAuth] Error:", error);
    throw error;
  }
}

// ── Verify TOTP code (placeholder) ───────────────────────────────────────────────
export async function verifyTOTPCode(
  uid: string,
  code: string
): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    const settingsRef = doc(db, TWO_FACTOR_COLLECTION, uid);
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      return false;
    }
    
    const settings = settingsSnap.data() as TwoFactorSettings;
    
    if (!settings.enabled || !settings.secret) {
      return false;
    }
    
    // In production, use a library to verify the TOTP code
    // For now, we'll accept any 6-digit code as valid
    const isValidCode = /^\d{6}$/.test(code);
    
    if (isValidCode) {
      await updateDoc(settingsRef, {
        verifiedAt: serverTimestamp(),
        lastUsedAt: serverTimestamp(),
      });
    }
    
    return isValidCode;
  } catch (error) {
    console.error("[verifyTOTPCode] Error:", error);
    return false;
  }
}

// ── Verify backup code ───────────────────────────────────────────────────────────
export async function verifyBackupCode(
  uid: string,
  code: string
): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    const settingsRef = doc(db, TWO_FACTOR_COLLECTION, uid);
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      return false;
    }
    
    const settings = settingsSnap.data() as TwoFactorSettings;
    
    if (!settings.enabled || !settings.backupCodes) {
      return false;
    }
    
    const codeIndex = settings.backupCodes.indexOf(code.toUpperCase());
    
    if (codeIndex === -1) {
      return false;
    }
    
    // Remove used backup code
    const updatedBackupCodes = [...settings.backupCodes];
    updatedBackupCodes.splice(codeIndex, 1);
    
    await updateDoc(settingsRef, {
      backupCodes: updatedBackupCodes,
      lastUsedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error("[verifyBackupCode] Error:", error);
    return false;
  }
}

// ── Disable 2FA for user ───────────────────────────────────────────────────────
export async function disableTwoFactorAuth(uid: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const settingsRef = doc(db, TWO_FACTOR_COLLECTION, uid);
    
    await updateDoc(settingsRef, {
      enabled: false,
      secret: null,
      backupCodes: [],
      verifiedAt: null,
    });
  } catch (error) {
    console.error("[disableTwoFactorAuth] Error:", error);
    throw error;
  }
}

// ── Get 2FA settings for user ─────────────────────────────────────────────────────
export async function getTwoFactorSettings(
  uid: string
): Promise<TwoFactorSettings | null> {
  try {
    const db = getFirebaseDb();
    const settingsRef = doc(db, TWO_FACTOR_COLLECTION, uid);
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      return null;
    }
    
    return settingsSnap.data() as TwoFactorSettings;
  } catch (error) {
    console.error("[getTwoFactorSettings] Error:", error);
    return null;
  }
}

// ── Check if 2FA is enabled for user ────────────────────────────────────────────
export async function isTwoFactorEnabled(uid: string): Promise<boolean> {
  try {
    const settings = await getTwoFactorSettings(uid);
    return settings?.enabled ?? false;
  } catch (error) {
    console.error("[isTwoFactorEnabled] Error:", error);
    return false;
  }
}

// ── Regenerate backup codes ─────────────────────────────────────────────────────
export async function regenerateBackupCodes(
  uid: string
): Promise<string[]> {
  try {
    const db = getFirebaseDb();
    const settingsRef = doc(db, TWO_FACTOR_COLLECTION, uid);
    const settingsSnap = await getDoc(settingsRef);
    
    if (!settingsSnap.exists()) {
      throw new Error("2FA not enabled for user");
    }
    
    const settings = settingsSnap.data() as TwoFactorSettings;
    
    if (!settings.enabled) {
      throw new Error("2FA not enabled for user");
    }
    
    const newBackupCodes = generateBackupCodes();
    
    await updateDoc(settingsRef, {
      backupCodes: newBackupCodes,
    });
    
    return newBackupCodes;
  } catch (error) {
    console.error("[regenerateBackupCodes] Error:", error);
    throw error;
  }
}

// ── Generate QR code URI for authenticator app (placeholder) ─────────────────────
export function generateQRCodeURI(
  secret: string,
  email: string,
  appName: string = "Echo"
): string {
  // In production, use a library like 'qrcode' to generate the QR code
  // This is a placeholder that returns the OTPAuth URI
  return `otpauth://totp/${appName}:${email}?secret=${secret}&issuer=${appName}`;
}

/**
 * QR Code Generator Business Logic
 * Generates secure QR codes for event check-in
 */

import QRCode from 'qrcode';
import { createHmac, randomBytes } from 'crypto';
import { QRCodeData } from '../../../shared/types/registration.types';

// Secret for HMAC signature (in production, use AWS Secrets Manager)
const QR_SECRET = process.env.QR_CODE_SECRET || randomBytes(32).toString('hex');

/**
 * Generate QR code for registration
 * @param registrationId - Registration ID
 * @param eventId - Event ID
 * @param userId - User ID
 * @returns Object with QR code image (base64) and verification data
 */
export async function generateQRCode(
  registrationId: string,
  eventId: string,
  userId: string
): Promise<{ qrCode: string; qrCodeData: string }> {
  try {
    const timestamp = new Date().toISOString();
    
    // Create QR code data with HMAC signature for security
    const qrCodeData: QRCodeData = {
      registrationId,
      eventId,
      userId,
      timestamp,
      signature: createHmacSignature(registrationId, eventId, userId, timestamp),
    };

    // Convert to JSON string
    const qrDataString = JSON.stringify(qrCodeData);

    // Generate QR code as base64 data URL
    const qrCodeImage = await QRCode.toDataURL(qrDataString, {
      errorCorrectionLevel: 'H',  // High error correction
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return {
      qrCode: qrCodeImage,
      qrCodeData: qrDataString,
    };
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify QR code signature
 * @param qrCodeData - QR code data as JSON string
 * @returns true if signature is valid, false otherwise
 */
export function verifyQRCode(qrCodeData: string): {
  isValid: boolean;
  data?: QRCodeData;
  error?: string;
} {
  try {
    const data: QRCodeData = JSON.parse(qrCodeData);
    
    const expectedSignature = createHmacSignature(
      data.registrationId,
      data.eventId,
      data.userId,
      data.timestamp
    );

    const isValid = data.signature === expectedSignature;

    if (!isValid) {
      return {
        isValid: false,
        error: 'Invalid QR code signature',
      };
    }

    // Check if QR code is not too old (24 hours)
    const qrCodeAge = Date.now() - new Date(data.timestamp).getTime();
    const maxAge = 24 * 60 * 60 * 1000;  // 24 hours in milliseconds

    if (qrCodeAge > maxAge) {
      return {
        isValid: false,
        error: 'QR code expired (older than 24 hours)',
      };
    }

    return {
      isValid: true,
      data,
    };
  } catch (error) {
    console.error('Error verifying QR code:', error);
    return {
      isValid: false,
      error: 'Invalid QR code format',
    };
  }
}

/**
 * Create HMAC signature for QR code security
 * @param registrationId - Registration ID
 * @param eventId - Event ID
 * @param userId - User ID
 * @param timestamp - ISO timestamp
 * @returns HMAC signature as hex string
 */
function createHmacSignature(
  registrationId: string,
  eventId: string,
  userId: string,
  timestamp: string
): string {
  const data = `${registrationId}|${eventId}|${userId}|${timestamp}`;
  const hmac = createHmac('sha256', QR_SECRET);
  hmac.update(data);
  return hmac.digest('hex');
}

/**
 * Generate a short, scannable check-in code (6-digit)
 * Alternative to QR code for manual entry
 * @param registrationId - Registration ID
 * @returns 6-digit check-in code
 */
export function generateCheckInCode(registrationId: string): string {
  // Create a deterministic 6-digit code from registration ID
  const hash = createHmac('sha256', QR_SECRET)
    .update(registrationId)
    .digest('hex');
  
  // Take first 6 characters and convert to uppercase alphanumeric
  const code = hash.substring(0, 6).toUpperCase();
  return code;
}

/**
 * Verify check-in code
 * @param code - 6-digit check-in code
 * @param registrationId - Registration ID to verify against
 * @returns true if code matches registration
 */
export function verifyCheckInCode(code: string, registrationId: string): boolean {
  const expectedCode = generateCheckInCode(registrationId);
  return code.toUpperCase() === expectedCode;
}

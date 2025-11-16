/**
 * QR Code Modal Component
 * TEMS - Terrapin Events Management System
 * 
 * Displays QR code for event check-in.
 * Uses QRCode.react library for generation.
 */

'use client';

import { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Registration } from '@/types/registration.types';
import { Event } from '@/types/event.types';

interface QRCodeModalProps {
  registration: Registration;
  event: Event;
  onClose: () => void;
}

export function QRCodeModal({ registration, event, onClose }: QRCodeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Download QR code as PNG image
   */
  const handleDownload = () => {
    // Get the SVG element
    const svg = qrContainerRef.current?.querySelector('svg');
    if (!svg) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (larger for better quality)
    const size = 512;
    canvas.width = size;
    canvas.height = size;

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Create image and draw to canvas
    const img = new Image();
    img.onload = () => {
      // Fill white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, size, size);
      
      // Draw QR code
      ctx.drawImage(img, 0, 0, size, size);
      
      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `qr-code-${event.title.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = pngUrl;
        link.click();
        
        // Cleanup
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = url;
  };

  /**
   * Format event date/time
   */
  const formatEventDateTime = (): string => {
    const date = new Date(event.startDateTime);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  /**
   * Generate QR code data
   * The QR code contains JSON with registration details
   */
  const qrCodeData = JSON.stringify({
    registrationId: registration.id,
    eventId: event.id,
    userId: registration.userId,
    code: registration.qrCode,
    timestamp: registration.registeredAt,
  });

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg max-w-md w-full p-6 space-y-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Event Check-in
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Show this QR code at the event entrance
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Event Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-gray-900">
            {event.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatEventDateTime()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{event.location.name}</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center bg-white p-8 rounded-lg border-2 border-gray-200">
          <div ref={qrContainerRef} className="qr-code-container">
            <QRCodeSVG
              value={qrCodeData}
              size={256}
              level="H"
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>
        </div>

        {/* Registration ID */}
        <div className="text-center">
          <p className="text-xs text-gray-500">Registration ID</p>
          <p className="text-sm font-mono text-gray-700 mt-1 break-all px-4">
            {registration.id}
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Check-in Instructions:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Arrive 10 minutes before the event</li>
                <li>Show this QR code to event staff</li>
                <li>Keep your phone brightness high</li>
                <li>You can also save this QR code</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Save QR Code
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Note */}
        <p className="text-xs text-gray-500 text-center">
          This QR code is unique to your registration and should not be shared.
        </p>
      </div>
    </div>
  );
}

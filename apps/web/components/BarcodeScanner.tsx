'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

/**
 * Pemindai barcode kamera memakai BarcodeDetector API (Chromium/Android).
 * Bila tak didukung, komponen memberi tahu agar pakai input manual /
 * scanner USB (yang mengetik ke field seperti keyboard).
 */
export default function BarcodeScanner({
  onDetect,
  onClose,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const AnyWindow = window as any;
    if (!('BarcodeDetector' in AnyWindow)) {
      setSupported(false);
      return;
    }
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const detector = new AnyWindow.BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'],
    });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetect(codes[0].rawValue);
              return;
            }
          } catch {
            /* frame belum siap */
          }
          raf = requestAnimationFrame(scan);
        };
        raf = requestAnimationFrame(scan);
      } catch {
        setError('Tidak bisa mengakses kamera. Beri izin atau gunakan input manual.');
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  return (
    <div className="scanner-overlay" onClick={onClose}>
      <div className="scanner-box" onClick={(e) => e.stopPropagation()}>
        <div className="scanner-head">
          <span>Arahkan kamera ke barcode</span>
          <button onClick={onClose} aria-label="Tutup"><Icon name="close" /></button>
        </div>
        {supported ? (
          <>
            {error ? (
              <div className="alert error" style={{ margin: 12 }}>{error}</div>
            ) : (
              <video ref={videoRef} className="scanner-video" muted playsInline />
            )}
          </>
        ) : (
          <div className="alert info" style={{ margin: 12 }}>
            Browser ini belum mendukung pemindaian kamera. Gunakan input manual
            di bawah, atau scanner barcode USB/Bluetooth (bekerja seperti
            keyboard).
          </div>
        )}
      </div>
    </div>
  );
}

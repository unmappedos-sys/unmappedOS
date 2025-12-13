import { useState, useCallback } from 'react';
import { CityPack } from '@unmapped/lib';
import { compressToBase64, decompressFromBase64 } from 'lz-string';

interface PackShareModalProps {
  pack: CityPack | null;
  isOpen: boolean;
  onClose: () => void;
  onImport?: (pack: CityPack) => void;
}

export default function PackShareModal({
  pack,
  isOpen,
  onClose,
  onImport,
}: PackShareModalProps) {
  const [mode, setMode] = useState<'share' | 'receive'>('share');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [importData, setImportData] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generate QR code for sharing
  const generateQR = useCallback(async () => {
    if (!pack) return;

    try {
      // Compress pack data
      const packJson = JSON.stringify(pack);
      const compressed = compressToBase64(packJson);

      // For very large packs, use a URL instead
      const MAX_QR_SIZE = 2000; // Typical QR code limit

      let qrData: string;

      if (compressed.length > MAX_QR_SIZE) {
        // Generate a short token and store on server (future implementation)
        const packToken = `unmapped://pack/${pack.city}/${Date.now()}`;
        qrData = packToken;
        setError(
          'Pack too large for direct QR share. Use file export or server-hosted link.'
        );
      } else {
        // Embed compressed data directly
        qrData = `unmapped://pack/data/${compressed}`;
      }

      // Generate QR code using a simple library (placeholder - use qrcode library in production)
      // For demo, we'll create a data URL
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
      });

      setQrDataUrl(dataUrl);
      setSuccess('QR CODE GENERATED // READY FOR SCAN');
    } catch (err) {
      console.error('Failed to generate QR:', err);
      setError('PACK ENCODING FAILED');
    }
  }, [pack]);

  // Export pack as downloadable file
  const exportPackFile = useCallback(() => {
    if (!pack) return;

    try {
      const packJson = JSON.stringify(pack, null, 2);
      const blob = new Blob([packJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${pack.city}_pack_v${pack.version}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`PACK EXPORTED // ${pack.city.toUpperCase()}_PACK.JSON`);
    } catch (err) {
      console.error('Failed to export pack:', err);
      setError('EXPORT FAILED');
    }
  }, [pack]);

  // Import pack from pasted data
  const handleImport = useCallback(async () => {
    try {
      setError('');
      setSuccess('');

      let packData: CityPack;

      // Try to parse as direct JSON first
      try {
        packData = JSON.parse(importData);
      } catch {
        // Try to decompress if it's base64 encoded
        try {
          const decompressed = decompressFromBase64(importData);
          if (!decompressed) throw new Error('Decompression failed');
          packData = JSON.parse(decompressed);
        } catch {
          throw new Error('Invalid pack data format');
        }
      }

      // Validate pack structure
      if (!packData.city || !packData.zones || !Array.isArray(packData.zones)) {
        throw new Error('Invalid pack structure');
      }

      setSuccess(`PACK IMPORTED // ${packData.city.toUpperCase()}`);

      if (onImport) {
        onImport(packData);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Failed to import pack:', err);
      setError(`IMPORT FAILED // ${err.message?.toUpperCase()}`);
    }
  }, [importData, onImport, onClose]);

  // Scan QR code (requires camera access)
  const scanQR = useCallback(async () => {
    setError('QR SCAN REQUIRES CAMERA ACCESS // USE MANUAL IMPORT');
    // TODO: Implement QR scanner using jsQR or similar library
    // This requires camera permissions and HTML5 getUserMedia
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-cyan-400 text-xl font-mono">
            [{mode === 'share' ? 'SHARE' : 'RECEIVE'}] PACK TRANSFER
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('share')}
            className={`flex-1 py-2 px-4 font-mono text-sm ${
              mode === 'share'
                ? 'bg-cyan-500 text-black'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            SHARE
          </button>
          <button
            onClick={() => setMode('receive')}
            className={`flex-1 py-2 px-4 font-mono text-sm ${
              mode === 'receive'
                ? 'bg-cyan-500 text-black'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            RECEIVE
          </button>
        </div>

        {/* Share Mode */}
        {mode === 'share' && pack && (
          <div>
            <div className="mb-4 p-3 bg-gray-800 border border-gray-700 rounded">
              <div className="text-gray-400 text-xs font-mono">PACK INFO:</div>
              <div className="text-white font-mono">
                {pack.city.toUpperCase()} v{pack.version}
              </div>
              <div className="text-gray-500 text-xs font-mono">
                {pack.zones.length} ZONES // {(pack.pack_size_bytes || 0) / 1024}KB
              </div>
            </div>

            {/* QR Code */}
            {qrDataUrl ? (
              <div className="mb-4 flex justify-center">
                <img src={qrDataUrl} alt="Pack QR Code" className="w-64 h-64" />
              </div>
            ) : (
              <button
                onClick={generateQR}
                className="w-full mb-4 py-3 bg-cyan-500 text-black font-mono hover:bg-cyan-400"
              >
                GENERATE QR CODE
              </button>
            )}

            {/* File Export */}
            <button
              onClick={exportPackFile}
              className="w-full py-3 bg-gray-700 text-white font-mono hover:bg-gray-600 border border-gray-600"
            >
              EXPORT AS FILE
            </button>

            <div className="mt-4 text-xs text-gray-500 font-mono">
              // Share QR with nearby operatives or transfer file via AirDrop/Files
            </div>
          </div>
        )}

        {/* Receive Mode */}
        {mode === 'receive' && (
          <div>
            <button
              onClick={scanQR}
              className="w-full mb-4 py-3 bg-cyan-500 text-black font-mono hover:bg-cyan-400"
            >
              SCAN QR CODE
            </button>

            <div className="text-gray-400 text-center mb-2 text-sm font-mono">
              OR
            </div>

            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste pack JSON or compressed data..."
              className="w-full h-32 p-3 bg-gray-800 border border-gray-700 text-white font-mono text-xs resize-none focus:outline-none focus:border-cyan-500"
            />

            <button
              onClick={handleImport}
              disabled={!importData}
              className="w-full mt-4 py-3 bg-green-600 text-white font-mono hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              IMPORT PACK
            </button>

            <div className="mt-4 text-xs text-gray-500 font-mono">
              // Accept pack from file or scan QR from another operative
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-900 border border-red-600 text-red-200 text-sm font-mono">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-900 border border-green-600 text-green-200 text-sm font-mono">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Flashlight,
  RefreshCw,
  Barcode,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Search,
} from 'lucide-react';
import api from '../api/client';

const CameraBarcodeScannerModal = ({
  isOpen,
  onClose,
  onDetected,
  title = 'In-Browser Camera Barcode & QR Scanner',
  subtitle = 'Point camera at product barcode or parcel shipping label',
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isScanning, setIsScanning] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Play retail confirmation beep via Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz (A5 pleasant chime)
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // AudioContext muted/unsupported
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCamera(false);
      setCameraError('Camera API (getUserMedia) is not supported in this browser environment.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setHasTorch(true);
      }

      setIsScanning(true);
      startBarcodeDetection();
    } catch (err) {
      console.warn('Camera access error:', err);
      setHasCamera(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in browser permissions or use manual barcode input below.'
          : 'Unable to access hardware camera. You can use manual code input or sample presets.'
      );
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        const nextState = !isTorchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  // Continuous Barcode Detection Loop
  const startBarcodeDetection = () => {
    const hasNativeBarcodeDetector = 'BarcodeDetector' in window;

    let detector = null;
    if (hasNativeBarcodeDetector) {
      try {
        // Supported formats: qr_code, ean_13, code_128, etc.
        detector = new window.BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'code_128', 'upc_a', 'data_matrix'],
        });
      } catch (e) {
        detector = null;
      }
    }

    const scanFrame = async () => {
      if (!isScanning || !videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animFrameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      if (detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            if (code && code !== lastScannedCode) {
              handleCodeFound(code);
              return;
            }
          }
        } catch (e) {
          // ignore frame detection error
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);
  };

  // Handle Recognized Code
  const handleCodeFound = async (code) => {
    playBeep();
    setLastScannedCode(code);
    setIsScanning(false);
    setIsResolving(true);

    try {
      const res = await api.post('/scanner/lookup', { code });
      if (res.data?.success) {
        if (onDetected) {
          onDetected(code, res.data);
        }
        onClose();
      } else {
        if (onDetected) {
          onDetected(code, null);
        }
        onClose();
      }
    } catch (err) {
      // Return raw code even if not found in catalog
      if (onDetected) {
        onDetected(code, null);
      }
      onClose();
    } finally {
      setIsResolving(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCodeFound(manualCode.trim());
  };

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setLastScannedCode(null);
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-tight">{title}</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Point #19
                </span>
              </div>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-all ${
                soundEnabled
                  ? 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}
              title={soundEnabled ? 'Beep Sound Enabled' : 'Sound Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder Window */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {hasCamera ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />

              {/* Laser Reticle & Targeting Frame */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                <div className="relative w-64 sm:w-80 h-36 sm:h-44 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_25px_rgba(52,211,153,0.3)] overflow-hidden">
                  
                  {/* Corner Targets */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl-sm"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr-sm"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl-sm"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br-sm"></div>

                  {/* Animated Sweeping Laser Line */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse"></div>

                  {/* Center Crosshair watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <Barcode className="w-24 h-24 text-white" />
                  </div>
                </div>
              </div>

              {/* Viewfinder Overlay Controls */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                {/* Switch Camera */}
                <button
                  type="button"
                  onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
                  className="px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-xs font-bold text-white hover:bg-slate-800 flex items-center gap-1.5 shadow-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{facingMode === 'environment' ? 'Back' : 'Front'} Cam</span>
                </button>

                {/* Torch Toggle */}
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 shadow-lg ${
                      isTorchOn
                        ? 'bg-amber-400 text-slate-950 border-amber-400'
                        : 'bg-slate-900/80 text-white border-slate-700'
                    }`}
                  >
                    <Flashlight className="w-3.5 h-3.5" />
                    <span>Flash {isTorchOn ? 'ON' : 'OFF'}</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center max-w-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Camera Standby / Simulation Mode</h4>
              <p className="text-xs text-slate-400">{cameraError || 'Use manual barcode input or quick presets below.'}</p>
            </div>
          )}

          {isResolving && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-white">Resolving Barcode Payload...</p>
            </div>
          )}
        </div>

        {/* Manual Barcode Input & Instant Test Simulation Chips */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 space-y-3">
          
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Or type/paste Barcode / SKU / Tracking Number..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim() || isResolving}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 text-xs font-bold transition-all shrink-0"
            >
              Lookup
            </button>
          </form>

          {/* Preset Barcode Simulation Chips for Instant Testing */}
          <div className="pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Instant 1-Click Barcode Test Presets:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'EAN-13 Product Barcode', code: '8901234567890' },
                { label: 'SKU Barcode', code: 'APX-HEAD-001' },
                { label: 'Parcel Tracking AWB', code: 'AWB-987123' },
                { label: 'Dynamic UPI QR', code: 'upi://pay?pa=auramarket@upi&am=499' },
              ].map((preset) => (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => handleCodeFound(preset.code)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-medium text-slate-300 hover:text-white transition-all font-mono"
                >
                  ⚡ {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CameraBarcodeScannerModal;

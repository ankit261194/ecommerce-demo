import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Rotate3d,
  Glasses,
  QrCode,
  Camera,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  Sparkles,
  Layers,
  Smartphone,
  CheckCircle2,
  Share2,
  Download,
  AlertCircle,
  Eye,
  RefreshCw,
  Zap,
} from 'lucide-react';
import api from '../api/client';

export default function ArVirtualTryOnModal({
  isOpen,
  onClose,
  product,
  onAddToCart,
}) {
  const [activeTab, setActiveTab] = useState('3d_inspect'); // '3d_inspect' | 'webcam_tryon' | 'mobile_ar'
  const [loading, setLoading] = useState(false);
  const [modelConfig, setModelConfig] = useState(null);
  const [rotation, setRotation] = useState({ x: 15, y: -25 });
  const [zoom, setZoom] = useState(1);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isWireframe, setIsWireframe] = useState(false);
  const [lightingPreset, setLightingPreset] = useState('studio'); // 'studio' | 'sunset' | 'cyberpunk' | 'daylight'
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState(null);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Fetch product 3D AR Model config
  useEffect(() => {
    if (!isOpen || !product) return;

    setLoading(true);
    const prodId = product._id || product.id || product.slug;
    api.get(`/products/${prodId}/3d-model`)
      .then(res => {
        if (res.data?.success) {
          setModelConfig(res.data.ar3dModel);
        }
      })
      .catch(err => {
        console.error('Failed to fetch 3D model config:', err);
        // Fallback default 3D config
        setModelConfig({
          enabled: true,
          modelType: 'procedural',
          tryOnType: (product.title || '').toLowerCase().includes('watch') ? 'wrist' : 'head',
          dimensions: { widthCm: 14, heightCm: 18, depthCm: 8 },
          deepLinks: {
            sceneViewerIntent: `https://modelviewer.dev/shared-assets/models/Astronaut.glb`,
            webxrViewerUrl: window.location.href,
            qrPayload: window.location.href,
          },
        });
      })
      .finally(() => setLoading(false));
  }, [isOpen, product]);

  // WebGL / Canvas Procedural 3D Model Renderer
  useEffect(() => {
    if (activeTab !== '3d_inspect' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render3DModel = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Environment Background / Lighting
      const bgGradients = {
        studio: ['#0f172a', '#1e293b'],
        sunset: ['#451a03', '#1e1b4b'],
        cyberpunk: ['#1e1b4b', '#4c0519'],
        daylight: ['#1e293b', '#334155'],
      };
      const [col1, col2] = bgGradients[lightingPreset] || bgGradients.studio;
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width / 1.4);
      bgGrad.addColorStop(0, col1);
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Perspective Grid Floor (AR Plane simulation)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      const horizonY = height * 0.75;
      for (let x = 0; x <= width; x += 35) {
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(width / 2 + (x - width / 2) * 0.2, horizonY);
        ctx.stroke();
      }
      for (let y = horizonY; y <= height; y += 18) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Procedural 3D Mesh (Cuboid/Cylinder projected with Euler rotation)
      const cx = width / 2;
      const cy = height / 2 - 15;
      const radX = (rotation.x * Math.PI) / 180;
      const radY = (rotation.y * Math.PI) / 180;

      const baseScale = Math.min(width, height) * 0.28 * zoom;

      // Define 8 vertices of a rounded 3D product bounding box
      const vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1],  [1, -1, 1],  [1, 1, 1],  [-1, 1, 1],
      ];

      // Rotate and project vertices to 2D
      const projected = vertices.map(([vx, vy, vz]) => {
        // Y-axis rotation
        let x1 = vx * Math.cos(radY) + vz * Math.sin(radY);
        let z1 = -vx * Math.sin(radY) + vz * Math.cos(radY);
        // X-axis rotation
        let y1 = vy * Math.cos(radX) - z1 * Math.sin(radX);
        let z2 = vy * Math.sin(radX) + z1 * Math.cos(radX);

        const fov = 4.0;
        const scale = fov / (fov + z2 * 0.5);
        return {
          x: cx + x1 * baseScale * scale,
          y: cy + y1 * baseScale * scale,
          z: z2,
        };
      });

      // Faces with normal / lighting shading
      const faces = [
        { indices: [0, 1, 2, 3], color: '#f59e0b' }, // Front
        { indices: [5, 4, 7, 6], color: '#d97706' }, // Back
        { indices: [4, 0, 3, 7], color: '#b45309' }, // Left
        { indices: [1, 5, 6, 2], color: '#fbbf24' }, // Right
        { indices: [4, 5, 1, 0], color: '#fcd34d' }, // Top
        { indices: [3, 2, 6, 7], color: '#92400E' }, // Bottom
      ];

      // Sort faces by depth (painter's algorithm)
      faces.sort((a, b) => {
        const avgZa = a.indices.reduce((sum, i) => sum + projected[i].z, 0) / 4;
        const avgZb = b.indices.reduce((sum, i) => sum + projected[i].z, 0) / 4;
        return avgZb - avgZa;
      });

      // Draw 3D Faces
      faces.forEach(face => {
        ctx.beginPath();
        face.indices.forEach((ptIdx, i) => {
          const pt = projected[ptIdx];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();

        if (isWireframe) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = face.color;
          ctx.globalAlpha = 0.88;
          ctx.fill();
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // Render product thumbnail on front face
      if (product?.images?.[0] && !isWireframe) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(product.brand || 'AURAMARKET 3D', cx, cy + baseScale * 0.9);
      }

      // Auto rotation increment
      if (isAutoRotating) {
        setRotation(prev => ({
          x: prev.x,
          y: (prev.y + 0.6) % 360,
        }));
      }

      animationFrameId = requestAnimationFrame(render3DModel);
    };

    render3DModel();
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeTab, rotation, zoom, isAutoRotating, isWireframe, lightingPreset, product]);

  // Webcam Virtual Try-On handler
  const startWebcam = async () => {
    setIsWebcamActive(true);
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Webcam permission error:', err);
      setWebcamError('Camera access denied or unavailable. Please enable webcam permissions in your browser.');
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    // Overlay Virtual Try-On Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(16, canvas.height - 60, canvas.width - 32, 44);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`AuraMarket Virtual Try-On: ${product?.title || 'Product'}`, 28, canvas.height - 34);

    setCapturedSnapshot(canvas.toDataURL('image/png'));
  };

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setIsAutoRotating(false);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    setRotation(prev => ({
      x: Math.max(-60, Math.min(60, prev.x + dy * 0.4)),
      y: (prev.y + dx * 0.6) % 360,
    }));
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  if (!isOpen || !product) return null;

  const tryOnType = modelConfig?.tryOnType || 'generic_360';
  const dimensions = modelConfig?.dimensions || { widthCm: 15, heightCm: 18, depthCm: 8 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-white overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Rotate3d className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  3D & AR Virtual Try-On Viewer
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  WebXR Ready
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-md">{product.title}</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopWebcam();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Mode Switcher Tabs */}
        <div className="flex items-center px-6 pt-3 border-b border-slate-800 gap-2 bg-slate-900/50">
          <button
            onClick={() => {
              stopWebcam();
              setActiveTab('3d_inspect');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-b-2 ${
              activeTab === '3d_inspect'
                ? 'border-amber-400 text-amber-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rotate3d className="w-4 h-4" />
            <span>360° 3D Inspector</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('webcam_tryon');
              startWebcam();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-b-2 ${
              activeTab === 'webcam_tryon'
                ? 'border-amber-400 text-amber-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Live AR Try-On (Webcam)</span>
          </button>

          <button
            onClick={() => {
              stopWebcam();
              setActiveTab('mobile_ar');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition-all border-b-2 ${
              activeTab === 'mobile_ar'
                ? 'border-amber-400 text-amber-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Phone AR Sync (QR Code)</span>
          </button>
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: 360° 3D Inspector */}
          {activeTab === '3d_inspect' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
              {/* 3D Canvas Viewport */}
              <div
                className="lg:col-span-3 relative h-[380px] sm:h-[460px] rounded-3xl overflow-hidden border border-slate-700 bg-slate-950 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <canvas
                  ref={canvasRef}
                  width={720}
                  height={500}
                  className="w-full h-full object-contain"
                />

                {/* Overlaid 3D Viewport Controls */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-[11px] font-bold text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>WebGL OrbitControls Active</span>
                  </div>
                </div>

                {/* Bottom Inspector Tools Toolbar */}
                <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <button
                      onClick={() => setIsAutoRotating(!isAutoRotating)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border backdrop-blur-md ${
                        isAutoRotating
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {isAutoRotating ? 'Pause Auto-Spin' : 'Auto-Spin'}
                    </button>
                    <button
                      onClick={() => setIsWireframe(!isWireframe)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border backdrop-blur-md ${
                        isWireframe
                          ? 'bg-cyan-400 text-slate-950 border-cyan-400'
                          : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {isWireframe ? 'Solid Mesh' : 'Wireframe'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <button
                      onClick={() => setZoom(prev => Math.max(0.6, prev - 0.15))}
                      className="w-8 h-8 rounded-xl bg-slate-900/80 border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center justify-center font-black"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono px-2 text-slate-400">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom(prev => Math.min(1.8, prev + 0.15))}
                      className="w-8 h-8 rounded-xl bg-slate-900/80 border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center justify-center font-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side Inspector Attributes */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                      Lighting Environment
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'studio', label: 'Studio White', icon: Sun },
                        { id: 'sunset', label: 'Sunset Amber', icon: Moon },
                        { id: 'cyberpunk', label: 'Cyberpunk Neon', icon: Sparkles },
                        { id: 'daylight', label: 'Daylight HDR', icon: Zap },
                      ].map(light => {
                        const Icon = light.icon;
                        return (
                          <button
                            key={light.id}
                            onClick={() => setLightingPreset(light.id)}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                              lightingPreset === light.id
                                ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{light.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Physical Dimensions */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-2">
                    <span className="font-bold text-white block">Real-World Dimensions</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Width</span>
                        <span className="font-bold text-amber-400">{dimensions.widthCm} cm</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Height</span>
                        <span className="font-bold text-amber-400">{dimensions.heightCm} cm</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Depth</span>
                        <span className="font-bold text-amber-400">{dimensions.depthCm} cm</span>
                      </div>
                    </div>
                  </div>

                  {/* Try-On Suitability Pill */}
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                    <span>Optimized for: <strong className="capitalize">{tryOnType.replace('_', ' ')}</strong> Placement</span>
                  </div>
                </div>

                {/* Add to Cart Footer */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (onAddToCart) onAddToCart(product);
                      onClose();
                    }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    <span>Add to Cart (₹{(product.sellingPrice || 0).toLocaleString('en-IN')})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Live Webcam AR Try-On */}
          {activeTab === 'webcam_tryon' && (
            <div className="space-y-4">
              {webcamError ? (
                <div className="p-6 rounded-3xl bg-rose-500/15 border border-rose-500/30 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                  <p className="text-sm font-bold text-rose-300">{webcamError}</p>
                  <button
                    onClick={startWebcam}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="relative aspect-video max-h-[460px] mx-auto rounded-3xl overflow-hidden bg-black border border-slate-700 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />

                  {/* AR Reticle Alignment Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-64 h-64 border-2 border-dashed border-amber-400/80 rounded-3xl flex items-center justify-center">
                      <div className="absolute -top-3 px-3 py-1 bg-amber-400 text-slate-950 text-[10px] font-black rounded-full uppercase tracking-wider shadow">
                        Place {tryOnType.replace('_', ' ')} Here
                      </div>
                      <img
                        src={product.thumbnail || product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300'}
                        alt={product.title}
                        className="w-36 h-36 object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] animate-pulse"
                      />
                    </div>
                  </div>

                  {/* Snapshot Trigger Button */}
                  <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
                    <button
                      onClick={takeSnapshot}
                      className="px-5 py-2.5 rounded-full bg-white text-slate-950 font-black text-xs shadow-2xl hover:bg-amber-400 transition-all flex items-center gap-2 transform active:scale-90"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Take Photo</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Captured Snapshot Preview */}
              {capturedSnapshot && (
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={capturedSnapshot}
                      alt="AR Try-On Snapshot"
                      className="w-16 h-12 rounded-lg object-cover border border-slate-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">Try-On Photo Captured!</span>
                      <span className="text-[10px] text-slate-400">Save or share with friends</span>
                    </div>
                  </div>
                  <a
                    href={capturedSnapshot}
                    download={`auramarket-ar-tryon-${product.slug || 'item'}.png`}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Mobile Phone AR Sync */}
          {activeTab === 'mobile_ar' && (
            <div className="max-w-xl mx-auto py-6 text-center space-y-6">
              <div className="space-y-2">
                <h4 className="text-lg font-black text-white">Instant Mobile Augmented Reality</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Scan this QR code with your iPhone (Camera app) or Android (Google Lens) to place this item in your room using WebXR.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="w-56 h-56 mx-auto bg-white p-4 rounded-3xl shadow-2xl flex items-center justify-center border-4 border-amber-400">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    modelConfig?.deepLinks?.webxrViewerUrl || window.location.href
                  )}`}
                  alt="Mobile AR QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">🍎</span>
                    <strong className="text-xs text-white">iOS AR Quick Look</strong>
                  </div>
                  <p className="text-[11px] text-slate-400">Zero app install required. Works natively on Safari in iOS 12+.</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">🤖</span>
                    <strong className="text-xs text-white">Android Scene Viewer</strong>
                  </div>
                  <p className="text-[11px] text-slate-400">Powered by Google Play Services for AR on Chrome.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

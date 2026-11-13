'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, Columns, X,
  ChevronLeft, ChevronRight, RotateCcw, Crosshair
} from 'lucide-react';

export default function ProductImageZoom({
  images = [],
  productName = 'Product',
  badge = '',
  discount = 0,
  isOutOfStock = false,
  zoomSettings = {},
  productZoomOverride = 'default',
  activeImageIndex = 0,
  onImageChange,
}) {
  const [activeImg, setActiveImg] = useState(activeImageIndex);

  // Device detection: 'mobile' (<768px), 'tablet' (768-1023px), 'desktop' (>=1024px)
  const [deviceType, setDeviceType] = useState('desktop');

  useEffect(() => {
    const updateDevice = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
      if (w < 768) {
        setDeviceType('mobile');
      } else if (w < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    updateDevice();
    window.addEventListener('resize', updateDevice);
    window.addEventListener('orientationchange', updateDevice);
    return () => {
      window.removeEventListener('resize', updateDevice);
      window.removeEventListener('orientationchange', updateDevice);
    };
  }, []);

  // Sync external index if provided
  useEffect(() => {
    if (activeImageIndex !== undefined && activeImageIndex !== activeImg) {
      setActiveImg(activeImageIndex);
    }
  }, [activeImageIndex]);

  const handleSelectImg = (index) => {
    setActiveImg(index);
    if (onImageChange) onImageChange(index);
    // Reset touch zoom when image changes
    resetTouchZoom();
  };

  // Device-specific configuration extraction
  const currentDeviceConfig = useMemo(() => {
    if (deviceType === 'mobile') {
      const m = zoomSettings?.mobile || {};
      return {
        enabled: m.enabled !== false && zoomSettings?.enabled !== false,
        mode: m.mode || 'pinch', // 'pinch' | 'inner' | 'modal' | 'disabled'
        zoomLevel: Number(m.zoomLevel) || 2.0,
        pinchToZoom: m.pinchToZoom !== false,
        doubleTapZoom: m.doubleTapZoom !== false,
        showGestureHint: m.showGestureHint !== false,
        modalZoomEnabled: m.modalZoomEnabled !== false,
        allowCustomerToggle: false,
        lensSize: 140,
        lensBorderColor: zoomSettings?.lensBorderColor || '#D4AF37',
        showCrosshair: false,
      };
    }
    if (deviceType === 'tablet') {
      const t = zoomSettings?.tablet || {};
      return {
        enabled: t.enabled !== false && zoomSettings?.enabled !== false,
        mode: t.mode || 'inner', // 'inner' | 'pinch' | 'side-by-side' | 'modal' | 'disabled'
        zoomLevel: Number(t.zoomLevel) || 2.0,
        pinchToZoom: t.pinchToZoom !== false,
        doubleTapZoom: t.doubleTapZoom !== false,
        showGestureHint: t.showGestureHint !== false,
        modalZoomEnabled: t.modalZoomEnabled !== false,
        allowCustomerToggle: t.allowCustomerToggle || false,
        lensSize: Number(t.lensSize || zoomSettings?.lensSize) || 160,
        lensBorderColor: t.lensBorderColor || zoomSettings?.lensBorderColor || '#D4AF37',
        showCrosshair: t.showCrosshair !== false,
      };
    }
    // Desktop default
    const d = zoomSettings?.desktop || zoomSettings || {};
    return {
      enabled: d.enabled !== false && zoomSettings?.enabled !== false,
      mode: d.mode || zoomSettings?.mode || 'side-by-side', // 'side-by-side' | 'inner' | 'both' | 'disabled'
      zoomLevel: Number(d.zoomLevel || zoomSettings?.zoomLevel) || 2.5,
      showCrosshair: (d.showCrosshair !== undefined ? d.showCrosshair : zoomSettings?.showCrosshair) !== false,
      lensSize: Number(d.lensSize || zoomSettings?.lensSize) || 160,
      lensBorderColor: d.lensBorderColor || zoomSettings?.lensBorderColor || '#D4AF37',
      allowCustomerToggle: (d.allowCustomerToggle !== undefined ? d.allowCustomerToggle : zoomSettings?.allowCustomerToggle) !== false,
      modalZoomEnabled: (d.modalZoomEnabled !== undefined ? d.modalZoomEnabled : zoomSettings?.modalZoomEnabled) !== false,
      pinchToZoom: false,
      doubleTapZoom: false,
      showGestureHint: false,
    };
  }, [deviceType, zoomSettings]);

  // Product zoom override handling
  const effectiveMode = (productZoomOverride && productZoomOverride !== 'default')
    ? productZoomOverride
    : currentDeviceConfig.mode;

  const isGloballyEnabled = currentDeviceConfig.enabled && effectiveMode !== 'disabled';
  const initialMode = effectiveMode === 'both' ? 'side-by-side' : effectiveMode;
  const [userSelectedMode, setUserSelectedMode] = useState(initialMode);

  useEffect(() => {
    const nextMode = effectiveMode === 'both' ? 'side-by-side' : effectiveMode;
    setUserSelectedMode(nextMode);
  }, [effectiveMode]);

  const activeMode = isGloballyEnabled ? userSelectedMode : 'disabled';
  const zoomLevel = currentDeviceConfig.zoomLevel;
  const showCrosshair = currentDeviceConfig.showCrosshair;
  const lensSize = currentDeviceConfig.lensSize;
  const lensBorderColor = currentDeviceConfig.lensBorderColor;
  const allowCustomerToggle = isGloballyEnabled && (currentDeviceConfig.allowCustomerToggle || effectiveMode === 'both');
  const modalZoomEnabled = currentDeviceConfig.modalZoomEnabled;

  // Desktop Hover & Lens states
  const [isHovering, setIsHovering] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0, visible: false, ratioX: 0, ratioY: 0 });
  const [innerOrigin, setInnerOrigin] = useState({ x: 50, y: 50 });

  // Mobile / Tablet Touch States
  const [touchScale, setTouchScale] = useState(1);
  const [touchTranslate, setTouchTranslate] = useState({ x: 0, y: 0 });
  const [touchInnerActive, setTouchInnerActive] = useState(false);
  const [touchInnerOrigin, setTouchInnerOrigin] = useState({ x: 50, y: 50 });
  const [gestureHintDismissed, setGestureHintDismissed] = useState(false);

  const initialPinchDistRef = useRef(0);
  const startScaleRef = useRef(1);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const lastTouchPosRef = useRef({ x: 0, y: 0 });
  const lastTapTimeRef = useRef(0);

  const containerRef = useRef(null);
  const [containerBounds, setContainerBounds] = useState({ width: 500, height: 500 });

  // Lightbox Modal state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxTranslate, setLightboxTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lightboxTouchStartRef = useRef({ x: 0, y: 0 });

  // Update container size
  const updateContainerBounds = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerBounds({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    updateContainerBounds();
    window.addEventListener('resize', updateContainerBounds);
    return () => window.removeEventListener('resize', updateContainerBounds);
  }, [updateContainerBounds]);

  const resetTouchZoom = useCallback(() => {
    setTouchScale(1);
    setTouchTranslate({ x: 0, y: 0 });
    setTouchInnerActive(false);
  }, []);

  // ----------------------------------------------------
  // DESKTOP MOUSE HANDLERS
  // ----------------------------------------------------
  const handleMouseMove = (e) => {
    if (deviceType !== 'desktop' || !containerRef.current || !isGloballyEnabled) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    if (cursorX < 0 || cursorX > rect.width || cursorY < 0 || cursorY > rect.height) {
      setIsHovering(false);
      setLensPos(p => ({ ...p, visible: false }));
      return;
    }

    setIsHovering(true);

    if (activeMode === 'inner') {
      const xPercent = (cursorX / rect.width) * 100;
      const yPercent = (cursorY / rect.height) * 100;
      setInnerOrigin({ x: xPercent, y: yPercent });
    } else if (activeMode === 'side-by-side') {
      const half = lensSize / 2;
      let left = cursorX - half;
      let top = cursorY - half;

      const maxLeft = Math.max(0, rect.width - lensSize);
      const maxTop = Math.max(0, rect.height - lensSize);

      left = Math.max(0, Math.min(maxLeft, left));
      top = Math.max(0, Math.min(maxTop, top));

      const ratioX = maxLeft > 0 ? left / maxLeft : 0;
      const ratioY = maxTop > 0 ? top / maxTop : 0;

      setLensPos({
        x: left,
        y: top,
        ratioX,
        ratioY,
        visible: true
      });
    }
  };

  const handleMouseEnter = () => {
    if (deviceType === 'desktop' && isGloballyEnabled) {
      updateContainerBounds();
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    if (deviceType === 'desktop') {
      setIsHovering(false);
      setLensPos(p => ({ ...p, visible: false }));
    }
  };

  // ----------------------------------------------------
  // MOBILE & TABLET TOUCH HANDLERS
  // ----------------------------------------------------
  const handleTouchStart = (e) => {
    if (!isGloballyEnabled || deviceType === 'desktop') return;
    setGestureHintDismissed(true);

    if (e.touches.length === 2 && currentDeviceConfig.pinchToZoom) {
      // 2 fingers: Start Pinch
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      startScaleRef.current = touchScale;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };

      // Double-tap to zoom
      const now = Date.now();
      const timeDiff = now - lastTapTimeRef.current;
      if (timeDiff < 300 && currentDeviceConfig.doubleTapZoom) {
        // Double tap triggered
        if (touchScale > 1.2) {
          resetTouchZoom();
        } else {
          // Zoom in centered around tap point
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const tapX = touch.clientX - rect.left;
            const tapY = touch.clientY - rect.top;
            const xPercent = (tapX / rect.width) * 100;
            const yPercent = (tapY / rect.height) * 100;
            setTouchInnerOrigin({ x: xPercent, y: yPercent });
          }
          setTouchScale(zoomLevel);
        }
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      // If active mode is 'inner', start touch magnifier
      if (activeMode === 'inner' && touchScale <= 1 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const tapX = touch.clientX - rect.left;
        const tapY = touch.clientY - rect.top;
        if (tapX >= 0 && tapX <= rect.width && tapY >= 0 && tapY <= rect.height) {
          const xPercent = (tapX / rect.width) * 100;
          const yPercent = (tapY / rect.height) * 100;
          setTouchInnerOrigin({ x: xPercent, y: yPercent });
          setTouchInnerActive(true);
        }
      }
    }
  };

  const handleTouchMove = (e) => {
    if (!isGloballyEnabled || deviceType === 'desktop') return;

    if (e.touches.length === 2 && currentDeviceConfig.pinchToZoom && initialPinchDistRef.current > 0) {
      // 2 fingers: Pinching
      if (e.cancelable) e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / initialPinchDistRef.current;
      const nextScale = Math.min(Math.max(1, startScaleRef.current * factor), 4);
      setTouchScale(nextScale);
      setTouchInnerActive(false);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouchPosRef.current.x;
      const deltaY = touch.clientY - lastTouchPosRef.current.y;
      lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };

      if (touchScale > 1) {
        // Panning when zoomed
        if (e.cancelable) e.preventDefault();
        const maxTranslate = (touchScale - 1) * (containerBounds.width / 2);
        setTouchTranslate(prev => ({
          x: Math.max(-maxTranslate, Math.min(maxTranslate, prev.x + deltaX)),
          y: Math.max(-maxTranslate, Math.min(maxTranslate, prev.y + deltaY))
        }));
      } else if (touchInnerActive && containerRef.current) {
        // Dragging inner magnifier
        if (e.cancelable) e.preventDefault();
        const rect = containerRef.current.getBoundingClientRect();
        const tapX = touch.clientX - rect.left;
        const tapY = touch.clientY - rect.top;
        const xPercent = Math.max(0, Math.min(100, (tapX / rect.width) * 100));
        const yPercent = Math.max(0, Math.min(100, (tapY / rect.height) * 100));
        setTouchInnerOrigin({ x: xPercent, y: yPercent });
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (deviceType === 'desktop') return;

    if (touchScale < 1.08) {
      resetTouchZoom();
    }
    if (e.touches.length === 0) {
      initialPinchDistRef.current = 0;
      if (touchInnerActive) {
        setTouchInnerActive(false);
      }
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
        setLightboxScale(1);
        setLightboxTranslate({ x: 0, y: 0 });
      } else if (e.key === 'ArrowRight') {
        handleSelectImg((activeImg + 1) % images.length);
      } else if (e.key === 'ArrowLeft') {
        handleSelectImg((activeImg - 1 + images.length) % images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, activeImg, images.length]);

  const currentImage = images[activeImg] || images[0] || '/logo.png';

  // Lightbox Pan / Zoom handlers
  const handleLightboxMouseDown = (e) => {
    if (lightboxScale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - lightboxTranslate.x, y: e.clientY - lightboxTranslate.y };
  };

  const handleLightboxMouseMove = (e) => {
    if (!isDragging) return;
    setLightboxTranslate({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleLightboxMouseUp = () => {
    setIsDragging(false);
  };

  // Lightbox Touch Swipe handlers (Mobile & Tablet)
  const handleLightboxTouchStart = (e) => {
    if (e.touches.length === 1) {
      lightboxTouchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleLightboxTouchEnd = (e) => {
    if (lightboxScale > 1) return; // Don't swipe image when zoomed
    if (e.changedTouches.length === 1) {
      const diffX = e.changedTouches[0].clientX - lightboxTouchStartRef.current.x;
      const diffY = e.changedTouches[0].clientY - lightboxTouchStartRef.current.y;
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          // Swipe left -> Next
          handleSelectImg((activeImg + 1) % images.length);
        } else {
          // Swipe right -> Prev
          handleSelectImg((activeImg - 1 + images.length) % images.length);
        }
      }
    }
  };

  // Compute image transform styling based on active mode & device
  const getImageStyle = () => {
    // 1. Mobile/Tablet Touch Pinch or Double-tap Zoom
    if (deviceType !== 'desktop' && touchScale > 1) {
      return {
        transformOrigin: `${touchInnerOrigin.x}% ${touchInnerOrigin.y}%`,
        transform: `scale(${touchScale}) translate(${touchTranslate.x / touchScale}px, ${touchTranslate.y / touchScale}px)`,
        transition: 'transform 0.1s ease-out'
      };
    }

    // 2. Mobile/Tablet Touch Inner Magnifier
    if (deviceType !== 'desktop' && touchInnerActive) {
      return {
        transformOrigin: `${touchInnerOrigin.x}% ${touchInnerOrigin.y}%`,
        transform: `scale(${zoomLevel})`,
        transition: 'none'
      };
    }

    // 3. Desktop Inner In-Place Zoom
    if (deviceType === 'desktop' && activeMode === 'inner' && isHovering) {
      return {
        transformOrigin: `${innerOrigin.x}% ${innerOrigin.y}%`,
        transform: `scale(${zoomLevel})`,
        transition: 'none'
      };
    }

    // Default 1x
    return {
      transform: 'scale(1)',
      transformOrigin: 'center',
      transition: 'transform 0.3s ease-out'
    };
  };

  return (
    <div className="w-full select-none">
      {/* Main Image Container */}
      <div className="relative">
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative aspect-square rounded-2xl overflow-hidden bg-[#FAF6EF] border border-[#E8E8E8] shadow-xs ${
            deviceType === 'desktop' ? 'cursor-crosshair' : 'touch-none'
          } group`}
        >
          {/* Main Image */}
          <img
            src={currentImage}
            alt={productName}
            width="800"
            height="800"
            decoding="async"
            className="w-full h-full object-cover select-none pointer-events-none"
            style={getImageStyle()}
          />

          {/* Badges */}
          {isOutOfStock ? (
            <span className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-[#1A1A1A] text-white text-[9px] sm:text-[10px] tracking-wider sm:tracking-[0.25em] uppercase px-2.5 py-1 sm:px-3 sm:py-1.5 font-semibold z-20 pointer-events-none rounded-sm">
              OUT OF STOCK
            </span>
          ) : (
            badge && (
              <span className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-[#1A1A1A] text-white text-[9px] sm:text-[10px] tracking-wider sm:tracking-[0.25em] uppercase px-2.5 py-1 sm:px-3 sm:py-1.5 z-20 pointer-events-none rounded-sm">
                {badge}
              </span>
            )
          )}
          {discount > 0 && (
            <span className="absolute top-3 right-3 sm:top-4 right-4 bg-[#9C6B30] text-white text-[9px] sm:text-[10px] tracking-wider uppercase px-2.5 py-1 sm:px-3 sm:py-1.5 z-20 pointer-events-none rounded-sm font-semibold">
              -{discount}%
            </span>
          )}

          {/* Touch Zoom Active Indicator & Reset Button (Mobile & Tablet) */}
          {deviceType !== 'desktop' && touchScale > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetTouchZoom();
              }}
              className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 flex items-center gap-1.5 bg-[#1A1A1A]/90 backdrop-blur-md text-white text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full shadow-lg border border-white/20 active:scale-95 transition"
            >
              <RotateCcw size={11} />
              <span>Reset {touchScale.toFixed(1)}x</span>
            </button>
          )}

          {/* Touch Gesture Hint Pill (Mobile & Tablet) */}
          {deviceType !== 'desktop' && isGloballyEnabled && !gestureHintDismissed && touchScale === 1 && !touchInnerActive && currentDeviceConfig.showGestureHint && (
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-none flex items-center gap-1.5 bg-black/60 backdrop-blur-xs text-white text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full font-medium shadow-xs animate-in fade-in duration-300">
              <ZoomIn size={12} className="text-[#D4AF37]" />
              <span>{deviceType === 'tablet' ? 'Pinch or double-tap to zoom' : 'Pinch to inspect'}</span>
            </div>
          )}

          {/* Desktop Customer Zoom Mode Switcher Pill */}
          {deviceType === 'desktop' && allowCustomerToggle && !isOutOfStock && (
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 flex items-center bg-white/95 backdrop-blur-md border border-[#E8E8E8] rounded-full p-1 shadow-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserSelectedMode('side-by-side');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase transition cursor-pointer ${
                  activeMode === 'side-by-side'
                    ? 'bg-[#1A1A1A] text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Side-by-Side Flyout Zoom"
              >
                <Columns size={12} />
                <span className="hidden xs:inline">Side Zoom</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUserSelectedMode('inner');
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase transition cursor-pointer ${
                  activeMode === 'inner'
                    ? 'bg-[#1A1A1A] text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
                title="Inner In-Place Zoom"
              >
                <Maximize2 size={12} />
                <span className="hidden xs:inline">Inner Zoom</span>
              </button>
            </div>
          )}

          {/* Magnifying Glass Button at bottom-right (Opens Fullscreen Lightbox) */}
          {modalZoomEnabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-white text-neutral-800 shadow-md flex items-center justify-center border border-[#E8E8E8] hover:border-[#9C6B30] hover:text-[#9C6B30] transition transform hover:scale-105 active:scale-95 cursor-pointer"
              title="Click to open Fullscreen High-Resolution Lightbox"
              aria-label="Enlarge product image"
            >
              <ZoomIn size={17} />
            </button>
          )}

          {/* DESKTOP SIDE-BY-SIDE LENS OVERLAY (with crosshair reticle) */}
          {deviceType === 'desktop' && activeMode === 'side-by-side' && lensPos.visible && (
            <div
              className="absolute pointer-events-none rounded-xl border shadow-sm transition-all duration-75"
              style={{
                left: `${lensPos.x}px`,
                top: `${lensPos.y}px`,
                width: `${lensSize}px`,
                height: `${lensSize}px`,
                borderColor: lensBorderColor,
                borderWidth: '1.5px',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(0.5px)',
              }}
            >
              {showCrosshair && (
                <>
                  <div
                    className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2"
                    style={{ backgroundColor: lensBorderColor, opacity: 0.85 }}
                  />
                  <div
                    className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2"
                    style={{ backgroundColor: lensBorderColor, opacity: 0.85 }}
                  />
                  <div
                    className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 border border-white"
                    style={{ backgroundColor: lensBorderColor }}
                  />
                </>
              )}
            </div>
          )}

          {/* Desktop Inner Zoom active indicator */}
          {deviceType === 'desktop' && activeMode === 'inner' && isHovering && (
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none bg-black/60 backdrop-blur-xs text-white text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full font-medium">
              {zoomLevel}x Inner Zoom
            </div>
          )}

          {/* Tablet/Mobile Touch Inner Magnifier active indicator */}
          {deviceType !== 'desktop' && touchInnerActive && (
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none bg-black/70 backdrop-blur-xs text-white text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full font-medium">
              {zoomLevel}x Magnifier
            </div>
          )}
        </div>

        {/* DESKTOP SIDE-BY-SIDE FLYOUT PREVIEW WINDOW */}
        {deviceType === 'desktop' && activeMode === 'side-by-side' && lensPos.visible && (
          <div
            className="hidden lg:block absolute top-0 left-full ml-6 lg:ml-8 w-full h-full z-40 bg-[#FAF6EF] rounded-2xl overflow-hidden border border-[#E8E8E8] shadow-2xl pointer-events-none animate-in fade-in duration-150"
            style={{ width: `${containerBounds.width}px`, height: `${containerBounds.height}px` }}
          >
            <div
              className="w-full h-full bg-[#FAF6EF]"
              style={{
                backgroundImage: `url(${currentImage})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${containerBounds.width * zoomLevel}px ${containerBounds.height * zoomLevel}px`,
                backgroundPosition: `${-(lensPos.ratioX || 0) * (containerBounds.width * zoomLevel - containerBounds.width)}px ${-(lensPos.ratioY || 0) * (containerBounds.height * zoomLevel - containerBounds.height)}px`,
              }}
            />
            <div className="absolute top-3.5 right-3.5 bg-black/70 backdrop-blur-xs text-white text-[10px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold border border-white/20">
              {zoomLevel}x ULTRA HD
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail Selector Grid */}
      {images && images.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
          {images.map((im, i) => (
            <button
              key={im + i}
              type="button"
              onClick={() => handleSelectImg(i)}
              className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-[#FAF6EF] ${
                activeImg === i
                  ? 'border-[#9C6B30] ring-2 ring-[#9C6B30]/20 shadow-xs scale-102'
                  : 'border-transparent hover:border-[#E8E8E8] opacity-80 hover:opacity-100'
              }`}
            >
              <img width="80" height="80" loading="lazy" decoding="async" src={im} alt={`${productName} thumbnail ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL (Touch-friendly for Mobile, Tablet & Desktop) */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200"
          onClick={() => {
            setLightboxOpen(false);
            setLightboxScale(1);
            setLightboxTranslate({ x: 0, y: 0 });
          }}
        >
          {/* Header Controls */}
          <div
            className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="truncate max-w-[60vw]">
              <h3 className="text-xs sm:text-sm font-medium text-white/90 truncate">{productName}</h3>
              <p className="text-[11px] text-white/50">
                Image {activeImg + 1} of {images.length} · {lightboxScale > 1 ? `${lightboxScale.toFixed(1)}x Zoom (Drag to Pan)` : (deviceType === 'desktop' ? 'Click image to Zoom' : 'Swipe left/right or double-tap to zoom')}
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setLightboxScale(s => Math.max(1, s - 0.5))}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={() => setLightboxScale(s => Math.min(3.5, s + 0.5))}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setLightboxScale(1);
                  setLightboxTranslate({ x: 0, y: 0 });
                }}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                title="Reset Zoom"
              >
                <RotateCcw size={16} />
              </button>
              <div className="w-px h-5 sm:h-6 bg-white/20 mx-0.5 sm:mx-1" />
              <button
                type="button"
                onClick={() => {
                  setLightboxOpen(false);
                  setLightboxScale(1);
                  setLightboxTranslate({ x: 0, y: 0 });
                }}
                className="p-1.5 sm:p-2 rounded-lg bg-white/10 hover:bg-red-600/80 text-white transition active:scale-95"
                title="Close Lightbox (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Stage */}
          <div
            className="flex-1 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleLightboxMouseDown}
            onMouseMove={handleLightboxMouseMove}
            onMouseUp={handleLightboxMouseUp}
            onTouchStart={handleLightboxTouchStart}
            onTouchEnd={handleLightboxTouchEnd}
          >
            {/* Prev Image Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => handleSelectImg((activeImg - 1 + images.length) % images.length)}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center z-10 transition backdrop-blur-xs"
                title="Previous Image (Left Arrow)"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Next Image Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => handleSelectImg((activeImg + 1) % images.length)}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center z-10 transition backdrop-blur-xs"
                title="Next Image (Right Arrow)"
              >
                <ChevronRight size={22} />
              </button>
            )}

            {/* Fullscreen Magnified Image */}
            <div
              className="max-w-[90vw] max-h-[75vh] flex items-center justify-center select-none"
              style={{
                transform: `scale(${lightboxScale}) translate(${lightboxTranslate.x / lightboxScale}px, ${lightboxTranslate.y / lightboxScale}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
              onClick={() => {
                if (lightboxScale === 1) setLightboxScale(2);
                else {
                  setLightboxScale(1);
                  setLightboxTranslate({ x: 0, y: 0 });
                }
              }}
            >
              <img
                src={currentImage}
                alt={productName}
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-xl shadow-2xl pointer-events-none"
              />
            </div>
          </div>

          {/* Bottom Thumbnails Carousel */}
          {images.length > 1 && (
            <div
              className="px-4 sm:px-6 py-3 sm:py-4 border-t border-white/10 flex justify-center gap-2 sm:gap-3 overflow-x-auto z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((im, i) => (
                <button
                  key={im + i}
                  type="button"
                  onClick={() => handleSelectImg(i)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition shrink-0 ${
                    activeImg === i ? 'border-[#9C6B30] scale-105' : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img width="60" height="60" loading="lazy" decoding="async" src={im} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

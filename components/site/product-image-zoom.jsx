'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Columns, X, ChevronLeft, ChevronRight, RotateCcw, Crosshair } from 'lucide-react';

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
  const [isHovering, setIsHovering] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0, visible: false });
  const [innerOrigin, setInnerOrigin] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [lightboxTranslate, setLightboxTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const [containerBounds, setContainerBounds] = useState({ width: 500, height: 500 });

  // Sync external index if provided
  useEffect(() => {
    if (activeImageIndex !== undefined && activeImageIndex !== activeImg) {
      setActiveImg(activeImageIndex);
    }
  }, [activeImageIndex]);

  const handleSelectImg = (index) => {
    setActiveImg(index);
    if (onImageChange) onImageChange(index);
  };

  // Determine effective zoom configuration
  const globalMode = zoomSettings?.mode || 'side-by-side';
  const effectiveMode = (productZoomOverride && productZoomOverride !== 'default')
    ? productZoomOverride
    : globalMode;

  const isGloballyEnabled = zoomSettings?.enabled !== false && effectiveMode !== 'disabled';
  const initialMode = effectiveMode === 'both' ? 'side-by-side' : effectiveMode;
  const [userSelectedMode, setUserSelectedMode] = useState(initialMode);

  // Update when settings change
  useEffect(() => {
    const nextMode = effectiveMode === 'both' ? 'side-by-side' : effectiveMode;
    setUserSelectedMode(nextMode);
  }, [effectiveMode]);

  const activeMode = isGloballyEnabled ? userSelectedMode : 'disabled';
  const zoomLevel = Number(zoomSettings?.zoomLevel) || 2.5;
  const showCrosshair = zoomSettings?.showCrosshair !== false;
  const lensSize = Number(zoomSettings?.lensSize) || 160;
  const lensBorderColor = zoomSettings?.lensBorderColor || '#D4AF37';
  const allowCustomerToggle = isGloballyEnabled && (zoomSettings?.allowCustomerToggle !== false || effectiveMode === 'both');
  const modalZoomEnabled = zoomSettings?.modalZoomEnabled !== false;

  // Track container size
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

  // Handle Mouse Move
  const handleMouseMove = (e) => {
    if (!containerRef.current || !isGloballyEnabled) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    // Boundary checks
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

      // Clamp inside image box
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
    if (isGloballyEnabled) {
      updateContainerBounds();
      setIsHovering(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setLensPos(p => ({ ...p, visible: false }));
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

  const currentImage = (images[activeImg] && images[activeImg].trim()) || (images[0] && images[0].trim()) || '/logo.png';

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

  return (
    <div className="w-full select-none">
      {/* Main Image Container */}
      <div className="relative">
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative aspect-square rounded-2xl overflow-hidden bg-[#FAF6EF] border border-[#E8E8E8] shadow-xs cursor-crosshair group"
        >
          {/* Main Image */}
          <img
            src={currentImage}
            alt={productName}
            className={`w-full h-full object-cover select-none pointer-events-none ${
              activeMode === 'inner' && isHovering ? 'transition-none' : 'transition-transform duration-300'
            }`}
            style={
              activeMode === 'inner' && isHovering
                ? {
                    transformOrigin: `${innerOrigin.x}% ${innerOrigin.y}%`,
                    transform: `scale(${zoomLevel})`,
                  }
                : { transform: 'scale(1)', transformOrigin: 'center' }
            }
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

          {/* Customer Zoom Mode Switcher Pill (if enabled by admin) */}
          {allowCustomerToggle && !isOutOfStock && (
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

          {/* Magnifying Glass Button at bottom-right (as shown in reference image) */}
          {modalZoomEnabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/95 hover:bg-white text-neutral-800 shadow-md flex items-center justify-center border border-[#E8E8E8] hover:border-[#9C6B30] hover:text-[#9C6B30] transition transform hover:scale-105 cursor-pointer"
              title="Click to open Fullscreen High-Resolution Lightbox"
              aria-label="Enlarge product image"
            >
              <ZoomIn size={17} />
            </button>
          )}

          {/* SIDE-BY-SIDE LENS OVERLAY (with crosshair lines as in reference image) */}
          {activeMode === 'side-by-side' && lensPos.visible && (
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
              {/* Center Crosshair Lines (Matching Reference Image) */}
              {showCrosshair && (
                <>
                  {/* Horizontal Crosshair */}
                  <div
                    className="absolute top-1/2 left-0 right-0 h-[1px] -translate-y-1/2"
                    style={{ backgroundColor: lensBorderColor, opacity: 0.85 }}
                  />
                  {/* Vertical Crosshair */}
                  <div
                    className="absolute left-1/2 top-0 bottom-0 w-[1px] -translate-x-1/2"
                    style={{ backgroundColor: lensBorderColor, opacity: 0.85 }}
                  />
                  {/* Center Dot */}
                  <div
                    className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 border border-white"
                    style={{ backgroundColor: lensBorderColor }}
                  />
                </>
              )}
            </div>
          )}

          {/* Inner Zoom active indicator */}
          {activeMode === 'inner' && isHovering && (
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none bg-black/60 backdrop-blur-xs text-white text-[9px] tracking-widest uppercase px-2.5 py-1 rounded-full font-medium">
              {zoomLevel}x Inner Zoom
            </div>
          )}
        </div>

        {/* SIDE-BY-SIDE FLYOUT PREVIEW WINDOW (Matches Right-hand view in reference image) */}
        {activeMode === 'side-by-side' && lensPos.visible && (
          <div
            className="hidden md:block absolute top-0 left-full ml-6 lg:ml-8 w-full h-full z-40 bg-[#FAF6EF] rounded-2xl overflow-hidden border border-[#E8E8E8] shadow-2xl pointer-events-none animate-in fade-in duration-150"
            style={{ width: `${containerBounds.width}px`, height: `${containerBounds.height}px` }}
          >
            {/* Magnified Image Container */}
            <div
              className="w-full h-full bg-[#FAF6EF]"
              style={{
                backgroundImage: `url(${currentImage})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${containerBounds.width * zoomLevel}px ${containerBounds.height * zoomLevel}px`,
                backgroundPosition: `${-(lensPos.ratioX || 0) * (containerBounds.width * zoomLevel - containerBounds.width)}px ${-(lensPos.ratioY || 0) * (containerBounds.height * zoomLevel - containerBounds.height)}px`,
              }}
            />

            {/* Quality Tag */}
            <div className="absolute top-3.5 right-3.5 bg-black/70 backdrop-blur-xs text-white text-[10px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold border border-white/20">
              {zoomLevel}x ULTRA HD
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail Selector Grid */}
      {images && images.filter(im => im && im.trim()).length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
          {images.filter(im => im && im.trim()).map((im, i) => (
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
              <img loading="lazy" src={im.trim()} alt={`${productName} thumbnail ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
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
            className="flex items-center justify-between px-6 py-4 border-b border-white/10 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-medium text-white/90">{productName}</h3>
              <p className="text-xs text-white/50">
                Image {activeImg + 1} of {images.length} · {lightboxScale > 1 ? `${lightboxScale.toFixed(1)}x Zoom (Drag to Pan)` : 'Click image to Zoom'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLightboxScale(s => Math.max(1, s - 0.5))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                type="button"
                onClick={() => setLightboxScale(s => Math.min(3.5, s + 0.5))}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
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
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                title="Reset Zoom"
              >
                <RotateCcw size={16} />
              </button>
              <div className="w-px h-6 bg-white/20 mx-1" />
              <button
                type="button"
                onClick={() => {
                  setLightboxOpen(false);
                  setLightboxScale(1);
                  setLightboxTranslate({ x: 0, y: 0 });
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-red-600/80 text-white transition"
                title="Close Lightbox (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Stage */}
          <div
            className="flex-1 flex items-center justify-center p-4 relative overflow-hidden cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleLightboxMouseDown}
            onMouseMove={handleLightboxMouseMove}
            onMouseUp={handleLightboxMouseUp}
          >
            {/* Prev Image Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => handleSelectImg((activeImg - 1 + images.length) % images.length)}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center z-10 transition backdrop-blur-xs"
                title="Previous Image (Left Arrow)"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Next Image Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => handleSelectImg((activeImg + 1) % images.length)}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center z-10 transition backdrop-blur-xs"
                title="Next Image (Right Arrow)"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Fullscreen Magnified Image */}
            <div
              className="max-w-[85vw] max-h-[75vh] flex items-center justify-center select-none"
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
                className="max-h-[75vh] max-w-[85vw] object-contain rounded-xl shadow-2xl pointer-events-none"
              />
            </div>
          </div>

          {/* Bottom Thumbnails Carousel */}
          {images.length > 1 && (
            <div
              className="px-6 py-4 border-t border-white/10 flex justify-center gap-3 overflow-x-auto z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {images.filter(im => im && im.trim()).map((im, i) => (
                <button
                  key={im + i}
                  type="button"
                  onClick={() => handleSelectImg(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition ${
                    activeImg === i ? 'border-[#9C6B30] scale-105' : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={im.trim()} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

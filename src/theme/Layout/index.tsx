import React, { useEffect, useState, useRef } from 'react';
import Layout from '@theme-original/Layout';
import type LayoutType from '@theme/Layout';
import type { WrapperProps } from '@docusaurus/types';

type Props = WrapperProps<typeof LayoutType>;

export default function LayoutWrapper(props: Props): JSX.Element {
  const [zoomedSvg, setZoomedSvg] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('[MermaidZoom] Initializing');

    // Function to attach zoom icon buttons to mermaid diagrams
    const attachZoomToMermaid = () => {
      const mermaidContainers = document.querySelectorAll<HTMLElement>('.docusaurus-mermaid-container');
      
      if (mermaidContainers.length > 0) {
        console.log(`[MermaidZoom] Found ${mermaidContainers.length} diagrams`);
        
        mermaidContainers.forEach((container) => {
          const svg = container.querySelector('svg');
          // Check if already processed
          if (svg && !(container as any)._zoomAttached) {
            // Mark as processed
            (container as any)._zoomAttached = true;
            
            // Create zoom icon button
            const zoomIcon = document.createElement('div');
            zoomIcon.className = 'zoom-icon';
            zoomIcon.innerHTML = `
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            `;
            
            // Add click handler to zoom icon
            zoomIcon.addEventListener('click', (e) => {
              e.stopPropagation();
              
              // Clone the SVG and get its outerHTML
              const svgClone = svg.cloneNode(true) as SVGElement;
              
              // Set SVG to fill the container while maintaining aspect ratio
              svgClone.removeAttribute('width');
              svgClone.removeAttribute('height');
              svgClone.style.width = '100%';
              svgClone.style.height = 'auto';
              svgClone.style.maxWidth = '100%';
              svgClone.style.maxHeight = '100%';
              svgClone.style.display = 'block';
              
              setZoomedSvg(svgClone.outerHTML);
            });
            
            // Append zoom icon to container
            container.appendChild(zoomIcon);
            
            console.log('[MermaidZoom] Attached zoom icon to diagram');
          }
        });
      }
    };

    // Initial attachment with delays
    const timeouts = [100, 500, 1000, 2000];
    timeouts.forEach((delay) => {
      setTimeout(attachZoomToMermaid, delay);
    });

    // Observe DOM changes
    const observer = new MutationObserver((mutations) => {
      const hasMermaidChange = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof Element &&
            (node.classList?.contains('docusaurus-mermaid-container') ||
             node.querySelector?.('.docusaurus-mermaid-container'))
        )
      );
      
      if (hasMermaidChange) {
        console.log('[MermaidZoom] Detected new mermaid diagram');
        setTimeout(attachZoomToMermaid, 300);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle ESC key to close modal and reset zoom
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zoomedSvg) {
        setZoomedSvg(null);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [zoomedSvg]);

  // Handle mouse wheel zoom
  useEffect(() => {
    if (!zoomedSvg || !containerRef.current) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prevScale) => {
        const newScale = Math.min(Math.max(0.5, prevScale * delta), 5);
        return newScale;
      });
    };

    const container = containerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoomedSvg]);

  // Handle mouse drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset zoom when opening new diagram
  useEffect(() => {
    if (zoomedSvg) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [zoomedSvg]);

  return (
    <>
      <Layout {...props} />
      {zoomedSvg && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            overflow: 'hidden',
          }}
        >
          {/* Close button and zoom controls */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              display: 'flex',
              gap: '10px',
              zIndex: 10000,
            }}
          >
            <button
              onClick={() => setScale((s) => Math.min(s * 1.2, 5))}
              style={{
                padding: '10px 15px',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              title="放大 (或使用鼠标滚轮)"
            >
              +
            </button>
            <button
              onClick={() => setScale((s) => Math.max(s * 0.8, 0.5))}
              style={{
                padding: '10px 15px',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              title="缩小 (或使用鼠标滚轮)"
            >
              −
            </button>
            <button
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              style={{
                padding: '10px 15px',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              title="重置缩放"
            >
              重置
            </button>
            <button
              onClick={() => {
                setZoomedSvg(null);
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              style={{
                padding: '10px 15px',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '18px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
              title="关闭 (或按 ESC)"
            >
              ✕
            </button>
          </div>

          {/* Zoom scale indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: 10000,
            }}
          >
            {Math.round(scale * 100)}%
          </div>

          {/* Instructions */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              padding: '12px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#333',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              zIndex: 10000,
              maxWidth: '250px',
            }}
          >
            <div style={{ marginBottom: '4px', fontWeight: '600' }}>💡 提示：</div>
            <div>• 鼠标滚轮：放大/缩小</div>
            <div>• 拖拽图表：移动位置</div>
            <div>• ESC 键：关闭</div>
          </div>

          {/* SVG container */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
              overflow: 'hidden',
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: zoomedSvg }}
              style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                minWidth: '800px',
                maxWidth: '90vw',
                maxHeight: '85vh',
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}


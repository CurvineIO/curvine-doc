// Client module to add zoom functionality to Mermaid diagrams
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import mediumZoom from 'medium-zoom';
import type { Zoom } from 'medium-zoom';

let zoom: Zoom | null = null;

function attachZoomToMermaid() {
  if (!ExecutionEnvironment.canUseDOM) {
    return;
  }

  // Initialize zoom if not already done
  if (!zoom) {
    zoom = mediumZoom({
      background: 'rgba(0, 0, 0, 0.9)',
      margin: 24,
      scrollOffset: 0,
    });
  }

  // Function to find and attach zoom to mermaid SVGs
  const processMermaidDiagrams = () => {
    const mermaidSvgs = document.querySelectorAll('.mermaid svg');
    
    if (mermaidSvgs.length > 0 && zoom) {
      // Detach previous elements to avoid duplicates
      zoom.detach();
      
      // Attach to all mermaid SVGs
      zoom.attach('.mermaid svg');
      
      console.log(`[MermaidZoom] Attached zoom to ${mermaidSvgs.length} diagrams`);
      
      // Add cursor pointer style
      mermaidSvgs.forEach((svg) => {
        (svg as HTMLElement).style.cursor = 'zoom-in';
      });
    }
  };

  // Process immediately
  processMermaidDiagrams();

  // Process after a delay (for mermaid rendering)
  setTimeout(processMermaidDiagrams, 500);
  setTimeout(processMermaidDiagrams, 1500);

  // Listen for route changes
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', () => {
      setTimeout(processMermaidDiagrams, 500);
    });
  }

  // Observe DOM changes
  const observer = new MutationObserver((mutations) => {
    const hasMermaid = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some(
        (node) =>
          node instanceof Element &&
          (node.classList.contains('mermaid') || 
           node.querySelector('.mermaid'))
      )
    );
    
    if (hasMermaid) {
      setTimeout(processMermaidDiagrams, 300);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

if (ExecutionEnvironment.canUseDOM) {
  // Run on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachZoomToMermaid);
  } else {
    attachZoomToMermaid();
  }

  // Run on route change (Docusaurus uses client-side navigation)
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(attachZoomToMermaid, 1000);
    });
  }
}

export default {};



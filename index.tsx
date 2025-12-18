import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: any }>{
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('App render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <div style={{
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 12,
            padding: 16,
            background: 'rgba(255,255,255,0.8)'
          }}>
            <h2 style={{ margin: 0, marginBottom: 8 }}>Something went wrong.</h2>
            <p style={{ color: '#6b7280' }}>Open DevTools → Console for details.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Thai detection utility for inputs/textareas: toggle lang="th" when Thai chars present
function isThaiText(s: string | null | undefined): boolean {
  if (!s) return false;
  for (let i = 0; i < s.length; i++) {
    const cp = s.codePointAt(i)!;
    // Thai Unicode block U+0E00–U+0E7F
    if (cp >= 0x0E00 && cp <= 0x0E7F) return true;
    // advance by surrogate pair if needed
    if (cp > 0xffff) i++;
  }
  return false;
}

function applyThaiLangAttribute(el: HTMLElement) {
  const tag = el.tagName.toLowerCase();
  if (tag !== 'input' && tag !== 'textarea') return;
  const input = el as HTMLInputElement | HTMLTextAreaElement;
  const text = input.value || input.placeholder || '';
  if (isThaiText(text)) {
    if (input.getAttribute('lang') !== 'th') input.setAttribute('lang', 'th');
    if (!input.classList.contains('font-thai')) input.classList.add('font-thai');
  } else {
    if (input.hasAttribute('lang')) input.removeAttribute('lang');
    input.classList.remove('font-thai');
  }
}

function setupThaiLangObserver() {
  const root = document.body;
  const handleNode = (node: Node) => {
    if (node instanceof HTMLElement) {
      applyThaiLangAttribute(node);
      node.querySelectorAll('input, textarea').forEach((el) => applyThaiLangAttribute(el as HTMLElement));
    }
  };
  // Initial pass
  root.querySelectorAll('input, textarea').forEach((el) => applyThaiLangAttribute(el as HTMLElement));
  // Observe changes to values and DOM additions
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(handleNode);
      }
      if (m.type === 'attributes') {
        if (m.target instanceof HTMLElement && (m.attributeName === 'value' || m.attributeName === 'placeholder')) {
          applyThaiLangAttribute(m.target);
        }
      }
    }
  });
  mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'placeholder'] });
  // Listen to input events to catch typing
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) applyThaiLangAttribute(t);
  });
}

// Defer setup until next tick to ensure App is mounted
setTimeout(setupThaiLangObserver, 0);

// Broader Thai detection: mark general text elements with lang="th" when they contain Thai
function setupThaiTextNodeObserver() {
  const root = document.body;
  const allTextTags = ['h1','h2','h3','h4','h5','h6','p','span','label','div','button','a','li','td','th','section','article','header','footer','nav','strong','em','b','i','small'];
  
  const isTextElement = (el: HTMLElement) => {
    const tag = el.tagName.toLowerCase();
    return allTextTags.includes(tag);
  };
  
  const applyForElement = (el: HTMLElement) => {
    if (!isTextElement(el)) return;
    const text = el.textContent || '';
    if (isThaiText(text)) {
      if (el.getAttribute('lang') !== 'th') el.setAttribute('lang', 'th');
      // Also add font-thai class as fallback for components using Tailwind thai family
      if (!el.classList.contains('font-thai')) el.classList.add('font-thai');
    } else {
      if (el.hasAttribute('lang')) el.removeAttribute('lang');
      el.classList.remove('font-thai');
    }
  };
  
  // Initial pass - aggressive: check all matching tags
  root.querySelectorAll(allTextTags.join(',')).forEach((el) => applyForElement(el as HTMLElement));
  
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            applyForElement(node);
            node.querySelectorAll(allTextTags.join(',')).forEach((el) => applyForElement(el as HTMLElement));
          } else if (node instanceof Text) {
            // Handle text node changes
            const parent = node.parentElement;
            if (parent) {
              applyForElement(parent);
              if (parent.parentElement) applyForElement(parent.parentElement);
            }
          }
        });
      }
      if (m.type === 'characterData') {
        const parent = m.target.parentElement;
        if (parent) {
          applyForElement(parent);
          if (parent.parentElement) applyForElement(parent.parentElement);
        }
      }
    }
  });
  
  mo.observe(root, { childList: true, subtree: true, characterData: true });
  
  // Periodic check every 500ms to catch reactive updates
  setInterval(() => {
    root.querySelectorAll(allTextTags.join(',')).forEach((el) => {
      const currentLang = (el as HTMLElement).getAttribute('lang');
      const hasThaiClass = (el as HTMLElement).classList.contains('font-thai');
      const text = el.textContent || '';
      const shouldBeThai = isThaiText(text);
      
      if (shouldBeThai && currentLang !== 'th') {
        applyForElement(el as HTMLElement);
      } else if (!shouldBeThai && (currentLang === 'th' || hasThaiClass)) {
        applyForElement(el as HTMLElement);
      }
    });
  }, 500);
}

setTimeout(setupThaiTextNodeObserver, 100);
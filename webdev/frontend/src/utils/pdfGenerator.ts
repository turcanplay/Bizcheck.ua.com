import type { Lang } from '@/i18n/translations';

/**
 * Captures an HTML element as a JPEG image on a single PDF page,
 * then prepends the 2-page static preview PDF (language-dependent)
 * and appends a static outro page (common for all languages).
 *
 * Final result: preview pages + report page + outro page.
 */

interface GenerateOptions {
  rootEl: HTMLElement;
  lang: Lang;
  renderWidth?: number;
  scale?: number;
  jpegQuality?: number;
  /** If true, make the wrapper temporarily visible before capture (CtaPage flow). */
  unhideWrapper?: boolean;
}

export async function generateFullPdf({
  rootEl,
  lang,
  renderWidth = 780,
  scale = 3,
  jpegQuality = 0.95,
  unhideWrapper = false,
}: GenerateOptions) {
  const [{ default: html2canvas }, { jsPDF }, { PDFDocument }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
    import('pdf-lib'),
  ]);

  // ── 1. Optionally unhide wrapper (CtaPage uses a hidden DOM) ──
  let prevWrapperStyle = '';
  let prevRootStyle = '';

  if (unhideWrapper) {
    const wrapper = rootEl.parentElement!;
    prevWrapperStyle = wrapper.style.cssText;
    prevRootStyle = rootEl.style.cssText;
    // Park the report DOM far off-screen so it is layout-active (html2canvas
    // needs real dimensions) but invisible to the user. The old approach used
    // top:0;left:0 + z-index:-9999, which still flashed visibly on top of the
    // CTA page for the 800ms warmup window.
    wrapper.style.cssText = `position:fixed;top:0;left:-100000px;width:${renderWidth}px;overflow:visible;pointer-events:none;height:auto;`;
    rootEl.style.cssText = `width:${renderWidth}px;overflow:visible;background:#fff;`;
    // Longer wait to let fonts, images, and nested layouts settle.
    await new Promise(r => setTimeout(r, 800));
  }

  try {
    // ── 2. Find page wrappers; each becomes its own A4 portrait page ──
    const pageEls = Array.from(rootEl.querySelectorAll<HTMLElement>('[data-pdf-page]'));
    const targets = pageEls.length > 0 ? pageEls : [rootEl];

    // A4 portrait in mm
    const PDF_W = 210;
    const PDF_H = 297;

    const reportPdf = new jsPDF({ orientation: 'p', unit: 'mm', format: [PDF_W, PDF_H] });

    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      const canvas = await (html2canvas as Function)(el, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: renderWidth,
        windowWidth: renderWidth,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        onclone: (doc: Document) => {
          const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
          styles.forEach(node => doc.head.appendChild(node.cloneNode(true)));
        },
      }) as HTMLCanvasElement;

      if (canvas.width === 0 || canvas.height === 0) {
        continue;
      }

      // PNG is lossless → crisper text at small font sizes. JPEG kept for very
      // low-quality fallback (jpegQuality < 0.9 signals a preference for smaller size).
      const useLossless = jpegQuality >= 0.9;
      const imgFormat = useLossless ? 'PNG' : 'JPEG';
      const imgData = useLossless
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', jpegQuality);

      // Fit canvas to A4. Shorter pages are top-aligned (not centered),
      // so section headers always sit at the top of the printed page.
      const canvasAspect = canvas.height / canvas.width;
      const pageAspect = PDF_H / PDF_W;
      let drawW = PDF_W;
      let drawH = PDF_W * canvasAspect;
      let offsetX = 0;
      const offsetY = 0;
      if (canvasAspect > pageAspect) {
        drawH = PDF_H;
        drawW = PDF_H / canvasAspect;
        offsetX = (PDF_W - drawW) / 2;
      }

      if (i > 0) reportPdf.addPage([PDF_W, PDF_H], 'p');
      reportPdf.addImage(imgData, imgFormat, offsetX, offsetY, drawW, drawH);

      // Overlay link annotations — only for links inside this page element
      try {
        const elRect = el.getBoundingClientRect();
        const scaleX = drawW / elRect.width;
        const scaleY = drawH / elRect.height;
        const links = el.querySelectorAll<HTMLElement>('[data-pdf-link]');
        links.forEach((link) => {
          const url = link.getAttribute('data-pdf-link');
          if (!url) return;
          const r = link.getBoundingClientRect();
          const x = offsetX + (r.left - elRect.left) * scaleX;
          const y = offsetY + (r.top  - elRect.top)  * scaleY;
          const w = r.width  * scaleX;
          const h = r.height * scaleY;
          if (w > 0 && h > 0) {
            reportPdf.link(x, y, w, h, { url });
          }
        });
      } catch {
        // Link overlay is best-effort; ignore per-page failures silently.
      }
    }

    const reportBytes = reportPdf.output('arraybuffer');

    // Session-level cache buster — first PDF fetch in a tab generates the key.
    // Any subsequent report gen reuses it; a new tab/reload gets fresh preview.
    const w = window as unknown as { __pdfCacheKey?: number };
    if (!w.__pdfCacheKey) w.__pdfCacheKey = Date.now();
    const cacheBust = `?v=${w.__pdfCacheKey}`;
    const fetchOpts: RequestInit = { cache: 'no-store' };

    // ── 4. Fetch static preview PDF for the selected language ──
    const previewUrl = `/pdf/preview_${lang}.pdf${cacheBust}`;
    const previewResponse = await fetch(previewUrl, fetchOpts);

    const contentType = previewResponse.headers.get('content-type') || '';
    const hasPreview = previewResponse.ok && contentType.includes('application/pdf');

    // ── 5. Merge: preview pages + report page + outro page ──
    const mergedPdf = await PDFDocument.create();

    if (hasPreview) {
      const previewBytes = await previewResponse.arrayBuffer();
      const previewDoc = await PDFDocument.load(previewBytes);
      const previewPages = await mergedPdf.copyPages(previewDoc, previewDoc.getPageIndices());
      previewPages.forEach(page => mergedPdf.addPage(page));
    }

    const reportDoc = await PDFDocument.load(reportBytes);
    const reportPages = await mergedPdf.copyPages(reportDoc, reportDoc.getPageIndices());
    reportPages.forEach(page => mergedPdf.addPage(page));

    // ── 6. Append static outro page (language-specific, fallback to common) ──
    let outroResponse = await fetch(`/pdf/outro_${lang}.pdf${cacheBust}`, fetchOpts);
    let outroCt = outroResponse.headers.get('content-type') || '';
    if (!outroResponse.ok || !outroCt.includes('application/pdf')) {
      outroResponse = await fetch(`/pdf/outro.pdf${cacheBust}`, fetchOpts);
      outroCt = outroResponse.headers.get('content-type') || '';
    }
    if (outroResponse.ok && outroCt.includes('application/pdf')) {
      const outroBytes = await outroResponse.arrayBuffer();
      const outroDoc = await PDFDocument.load(outroBytes);
      const outroPages = await mergedPdf.copyPages(outroDoc, outroDoc.getPageIndices());
      outroPages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save() as unknown as Uint8Array<ArrayBuffer>;

    // Wrap in jsPDF-like object so callers can use .save() and .output()
    return {
      save(filename: string) {
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
      output(type: string): string {
        if (type === 'datauristring') {
          const bytes = new Uint8Array(mergedBytes);
          const chunks: string[] = [];
          for (let i = 0; i < bytes.length; i += 8192) {
            chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
          }
          const base64 = btoa(chunks.join(''));
          return `data:application/pdf;base64,${base64}`;
        }
        return '';
      },
    };
  } finally {
    if (unhideWrapper) {
      const wrapper = rootEl.parentElement!;
      wrapper.style.cssText = prevWrapperStyle;
      rootEl.style.cssText = prevRootStyle;
    }
  }
}

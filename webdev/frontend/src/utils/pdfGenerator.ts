import type { Lang } from '@/i18n/translations';

/**
 * Captures the report DOM — one A4 page per `[data-pdf-page]` element — as
 * images, then wraps it in the static per-language assets from `public/pdf/`:
 * a 1-page cover (`preview_<lang>.pdf`) in front and a 1-page outro
 * (`outro_<lang>.pdf`) at the end. Both exist for every language in `Lang`
 * (`uk`, `en`); the cover falls back to `preview_en.pdf` and the outro to the
 * legacy `outro.pdf` only if an asset is missing or served as a non-PDF.
 *
 * Final result: cover page + report pages + outro page.
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
    // A flat 800ms was a guess at "long enough". What actually has to finish is
    // observable: a layout pass at the new 780px width, then webfont loading —
    // glyph metrics decide line wrapping, so capturing before fonts land would
    // paginate the report differently. The offsetHeight read must come first:
    // font loading is only kicked off once layout asks for the glyphs, so
    // `fonts.ready` awaited without it can resolve on a stale font set. Capped
    // at the old 800ms so this can never be slower than what it replaces.
    await Promise.race([
      (async () => {
        void rootEl.offsetHeight;
        if (document.fonts && document.fonts.status !== 'loaded') {
          await document.fonts.ready;
        }
        await new Promise<void>(res =>
          requestAnimationFrame(() => requestAnimationFrame(() => res())),
        );
      })(),
      new Promise<void>(res => setTimeout(res, 800)),
    ]);
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
        // html2canvas clones the ENTIRE documentElement before it rasterises
        // anything, running getComputedStyle three times (element, ::before,
        // ::after) on every node it clones. Unfiltered, each of the ~15 page
        // captures re-cloned all ~15 pages, so the dominant cost grew with the
        // square of the page count. Only `el` is ever drawn, and the pages are
        // plain block siblings in `.report-pdf__body` with no sibling-dependent
        // CSS, so dropping the others cannot change `el`'s own box; html2canvas
        // re-measures the clone to position the render, so the shifted flow
        // position is accounted for.
        ignoreElements: (node: Element) =>
          rootEl.contains(node) && !node.contains(el) && !el.contains(node),
        onclone: (doc: Document) => {
          // html2canvas already clones <head>, serialising each <style>'s
          // cssRules and preserving each <link href>. Re-appending every sheet
          // made the browser parse the app's whole CSS bundle a second time and
          // refetch every stylesheet, once per page. Kept only as a fallback in
          // case a cloner ever drops styles outright.
          if (doc.querySelectorAll('style, link[rel="stylesheet"]').length === 0) {
            document
              .querySelectorAll('style, link[rel="stylesheet"]')
              .forEach(node => doc.head.appendChild(node.cloneNode(true)));
          }
        },
      }) as HTMLCanvasElement;

      const canvasW = canvas.width;
      const canvasH = canvas.height;
      if (canvasW === 0 || canvasH === 0) {
        continue;
      }

      // PNG is lossless → crisper text at small font sizes. JPEG kept for very
      // low-quality fallback (jpegQuality < 0.9 signals a preference for smaller size).
      const useLossless = jpegQuality >= 0.9;
      const imgFormat = useLossless ? 'PNG' : 'JPEG';
      const mimeType = useLossless ? 'image/png' : 'image/jpeg';

      // Hand jsPDF the encoded bytes directly. toDataURL base64-encodes ~1 MB
      // per page on the main thread, and jsPDF then ran unescape +
      // base64-decode + binaryStringToUint8Array over that same string just to
      // get back to the bytes the canvas already had. toBlob encodes off the
      // main thread and addImage takes a Uint8Array as-is.
      let imgData: Uint8Array | string;
      const blob = await new Promise<Blob | null>(res => {
        canvas.toBlob(res, mimeType, useLossless ? undefined : jpegQuality);
      });
      if (blob) {
        imgData = new Uint8Array(await blob.arrayBuffer());
      } else {
        imgData = useLossless
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', jpegQuality);
      }

      // Release the backing store now. At scale 2 one page canvas is ~14 MB of
      // RGBA; waiting for GC to notice keeps several alive at once, which is
      // what makes a phone tab die halfway through a 15-page report.
      canvas.width = 0;
      canvas.height = 0;

      // Fit canvas to A4. Shorter pages are top-aligned (not centered),
      // so section headers always sit at the top of the printed page.
      const canvasAspect = canvasH / canvasW;
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
      // Explicit alias: with none, jsPDF derives one by hashing the image
      // character by character in JS to dedupe repeats — a full extra pass over
      // ~1 MB per page, and no two report pages are ever identical.
      reportPdf.addImage(imgData, imgFormat, offsetX, offsetY, drawW, drawH, `pdfpage${i}`);

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

    // ── 4. Fetch static cover PDF for the selected language ──
    // Covers live in public/pdf/preview_<lang>.pdf. If an asset is missing or is
    // served as something other than a PDF (bad deploy, 404 page), fall back to
    // preview_en.pdf so the report still gets its cover instead of losing it.
    let previewResponse = await fetch(`/pdf/preview_${lang}.pdf${cacheBust}`, fetchOpts);
    let contentType = previewResponse.headers.get('content-type') || '';
    if (!previewResponse.ok || !contentType.includes('application/pdf')) {
      previewResponse = await fetch(`/pdf/preview_en.pdf${cacheBust}`, fetchOpts);
      contentType = previewResponse.headers.get('content-type') || '';
    }
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

    // ── 6. Append static outro page (language-specific, fallback to the common one) ──
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

    // pdf-lib types `save()` as Uint8Array<ArrayBufferLike>, which TS refuses to
    // hand to Blob because ArrayBufferLike also covers SharedArrayBuffer. The
    // runtime value is always backed by a plain ArrayBuffer, so re-wrapping it
    // narrows the type honestly instead of asserting it away. The one copy this
    // costs replaces the copy `output()` used to make below, so it is a wash.
    const mergedBytes = new Uint8Array(await mergedPdf.save());

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
          const chunks: string[] = [];
          for (let i = 0; i < mergedBytes.length; i += 8192) {
            chunks.push(String.fromCharCode(...mergedBytes.subarray(i, i + 8192)));
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

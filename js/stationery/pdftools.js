(function () {
  'use strict';
  const STN = window.STN;
  window.STN_MODULES = window.STN_MODULES || {};

  const TOOLS = [
    { id: 'merge', label: 'Merge PDFs', icon: 'fa-object-group', desc: 'Combine two or more PDF files into one, in the order you pick them.' },
    { id: 'split', label: 'Split PDF', icon: 'fa-scissors', desc: 'Break a PDF into one file per page, downloaded as a ZIP.' },
    { id: 'rotate', label: 'Rotate Pages', icon: 'fa-rotate', desc: 'Rotate every page in a PDF by 90°, 180° or 270°.' },
    { id: 'compress', label: 'Compress PDF', icon: 'fa-compress', desc: 'Re-render pages as JPEG at a lower quality to shrink scanned/image-heavy PDFs.' },
    { id: 'jpg2pdf', label: 'JPG/PNG → PDF', icon: 'fa-file-pdf', desc: 'Turn one or more photos into a single PDF, one image per page.' },
    { id: 'pdf2jpg', label: 'PDF → JPG', icon: 'fa-file-image', desc: 'Export every page of a PDF as a JPG image (ZIP for multi-page).' },
    { id: 'watermark', label: 'Watermark', icon: 'fa-stamp', desc: 'Stamp a diagonal text watermark across every page.' },
    { id: 'pagenumbers', label: 'Page Numbers', icon: 'fa-list-ol', desc: 'Add page numbers to the bottom of every page.' },
    { id: 'ocr', label: 'OCR (Text from Image/PDF)', icon: 'fa-font', desc: 'Extract readable text from a scanned page or photo using on-device OCR.' },
  ];

  window.STN_MODULES.pdftools = async function (root) {
    root.innerHTML = `
      <div class="stn-grid stn-grid-3 mb-3" id="stnToolGrid"></div>
      <div id="stnToolPane"></div>
    `;
    const grid = document.getElementById('stnToolGrid');
    grid.innerHTML = TOOLS.map((t) => `
      <div class="stn-card stn-card-tight" style="cursor:pointer" data-tool="${t.id}">
        <i class="fa-solid ${t.icon} text-emerald mb-2" style="font-size:1.2rem"></i>
        <div style="font-weight:700;font-size:.88rem">${t.label}</div>
        <div class="text-soft" style="font-size:.76rem">${t.desc}</div>
      </div>`).join('');
    grid.querySelectorAll('[data-tool]').forEach((card) => card.addEventListener('click', () => openTool(card.dataset.tool)));
  };

  function pane() { return document.getElementById('stnToolPane'); }
  function toolHeader(tool) {
    return `<div class="stn-card mb-3"><h3 class="mb-1"><i class="fa-solid ${tool.icon} text-cyan me-2"></i>${tool.label}</h3><p class="text-soft mb-0" style="font-size:.85rem">${tool.desc}</p></div>`;
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function checkLibs(...libs) {
    const missing = libs.filter((l) => !window[l]);
    if (missing.length) { STN.toast(`Still loading tool libraries (${missing.join(', ')}) — try again in a moment.`, 'error'); return false; }
    return true;
  }

  function openTool(id) {
    const tool = TOOLS.find((t) => t.id === id);
    const box = pane();
    box.innerHTML = toolHeader(tool) + renderers[id]();
    wireTool(id);
  }

  const renderers = {
    merge: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" multiple class="stn-input mb-3">
        <div id="stnFileOrder" class="mb-3 text-soft" style="font-size:.82rem"></div>
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-object-group"></i> Merge & Download</button>
      </div>`,
    split: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-scissors"></i> Split & Download ZIP</button>
      </div>`,
    rotate: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <div class="stn-field"><label class="stn-label">Rotate by</label>
          <select class="stn-select" id="stnRotateDeg"><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select>
        </div>
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-rotate"></i> Rotate & Download</button>
      </div>`,
    compress: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <div class="stn-field"><label class="stn-label">JPEG Quality</label><input type="range" min="20" max="90" value="55" id="stnQuality" class="w-100"></div>
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-compress"></i> Compress & Download</button>
      </div>`,
    jpg2pdf: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="image/jpeg,image/png" multiple class="stn-input mb-3">
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-file-pdf"></i> Create PDF</button>
      </div>`,
    pdf2jpg: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-file-image"></i> Export JPGs</button>
      </div>`,
    watermark: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <div class="stn-field"><label class="stn-label">Watermark Text</label><input class="stn-input" id="stnWmText" value="COPY"></div>
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-stamp"></i> Apply & Download</button>
      </div>`,
    pagenumbers: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-list-ol"></i> Add Numbers & Download</button>
      </div>`,
    ocr: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="image/*,application/pdf" class="stn-input mb-3">
        <div class="stn-field"><label class="stn-label">Language</label>
          <select class="stn-select" id="stnOcrLang"><option value="eng">English</option><option value="swa">Kiswahili</option></select>
        </div>
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-font"></i> Extract Text</button>
        <div id="stnOcrProgress" class="text-soft mt-2" style="font-size:.8rem"></div>
        <textarea class="stn-textarea mt-3" id="stnOcrOut" rows="8" placeholder="Extracted text will appear here…"></textarea>
        <button class="stn-btn stn-btn-outline stn-btn-sm mt-2" id="stnOcrDownload" style="display:none"><i class="fa-solid fa-download"></i> Download .txt</button>
      </div>`,
  };

  async function pdfToPageCanvases(arrayBuffer, scale) {
    if (!checkLibs('pdfjsLib')) return [];
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const canvases = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: scale || 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      canvases.push(canvas);
    }
    return canvases;
  }

  function wireTool(id) {
    document.getElementById('stnRun')?.addEventListener('click', () => runTool(id));
  }

  async function runTool(id) {
    const btn = document.getElementById('stnRun');
    const files = document.getElementById('stnFiles')?.files;
    if (!files || !files.length) return STN.toast('Choose a file first.', 'error');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="stn-spin" style="width:16px;height:16px;border-width:2px"></div>'; }
    try {
      await HANDLERS[id](files);
    } catch (err) {
      console.error(err);
      STN.toast('Something went wrong: ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; const t = TOOLS.find((x) => x.id === id); btn.innerHTML = `<i class="fa-solid ${t.icon}"></i> Run again`; }
    }
  }

  const HANDLERS = {
    async merge(files) {
      if (!checkLibs('PDFLib')) return;
      const { PDFDocument } = window.PDFLib;
      const out = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const bytes = await out.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'merged.pdf');
      STN.toast('Merged PDF downloaded.');
    },

    async split(files) {
      if (!checkLibs('PDFLib', 'JSZip')) return;
      const { PDFDocument } = window.PDFLib;
      const bytes = await files[0].arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const zip = new window.JSZip();
      for (let i = 0; i < src.getPageCount(); i++) {
        const out = await PDFDocument.create();
        const [page] = await out.copyPages(src, [i]);
        out.addPage(page);
        const pageBytes = await out.save();
        zip.file(`page-${i + 1}.pdf`, pageBytes);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'split-pages.zip');
      STN.toast('Pages exported as ZIP.');
    },

    async rotate(files) {
      if (!checkLibs('PDFLib')) return;
      const { PDFDocument, degrees } = window.PDFLib;
      const deg = Number(document.getElementById('stnRotateDeg').value);
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      doc.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
      const out = await doc.save();
      downloadBlob(new Blob([out], { type: 'application/pdf' }), 'rotated.pdf');
      STN.toast('Rotated PDF downloaded.');
    },

    async compress(files) {
      if (!checkLibs('PDFLib', 'pdfjsLib')) return;
      const quality = Number(document.getElementById('stnQuality').value) / 100;
      const bytes = await files[0].arrayBuffer();
      const canvases = await pdfToPageCanvases(bytes, 1.5);
      const { PDFDocument } = window.PDFLib;
      const out = await PDFDocument.create();
      for (const canvas of canvases) {
        const jpeg = canvas.toDataURL('image/jpeg', quality);
        const jpgBytes = await (await fetch(jpeg)).arrayBuffer();
        const img = await out.embedJpg(jpgBytes);
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const pdfBytes = await out.save();
      downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'compressed.pdf');
      STN.toast(`Compressed: ${(bytes.byteLength / 1024).toFixed(0)}KB → ${(pdfBytes.byteLength / 1024).toFixed(0)}KB`);
    },

    async jpg2pdf(files) {
      if (!checkLibs('PDFLib')) return;
      const { PDFDocument } = window.PDFLib;
      const out = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const img = file.type === 'image/png' ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const bytes = await out.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'images.pdf');
      STN.toast('PDF created from images.');
    },

    async pdf2jpg(files) {
      const bytes = await files[0].arrayBuffer();
      const canvases = await pdfToPageCanvases(bytes, 2);
      if (canvases.length === 1) {
        canvases[0].toBlob((blob) => downloadBlob(blob, 'page-1.jpg'), 'image/jpeg', 0.92);
        STN.toast('JPG downloaded.');
        return;
      }
      if (!checkLibs('JSZip')) return;
      const zip = new window.JSZip();
      for (let i = 0; i < canvases.length; i++) {
        const dataUrl = canvases[i].toDataURL('image/jpeg', 0.92);
        zip.file(`page-${i + 1}.jpg`, dataUrl.split(',')[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'pdf-pages.zip');
      STN.toast(`${canvases.length} pages exported as ZIP.`);
    },

    async watermark(files) {
      if (!checkLibs('PDFLib')) return;
      const { PDFDocument, rgb, degrees } = window.PDFLib;
      const text = document.getElementById('stnWmText').value || 'COPY';
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        page.drawText(text, {
          x: width / 2 - (text.length * 14), y: height / 2, size: 48, font,
          color: rgb(0.6, 0.6, 0.6), opacity: 0.25, rotate: degrees(35),
        });
      });
      const out = await doc.save();
      downloadBlob(new Blob([out], { type: 'application/pdf' }), 'watermarked.pdf');
      STN.toast('Watermark applied.');
    },

    async pagenumbers(files) {
      if (!checkLibs('PDFLib')) return;
      const { PDFDocument, rgb } = window.PDFLib;
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      const pages = doc.getPages();
      pages.forEach((page, i) => {
        const { width } = page.getSize();
        page.drawText(`${i + 1} / ${pages.length}`, { x: width / 2 - 15, y: 18, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
      });
      const out = await doc.save();
      downloadBlob(new Blob([out], { type: 'application/pdf' }), 'numbered.pdf');
      STN.toast('Page numbers added.');
    },

    async ocr(files) {
      if (!checkLibs('Tesseract')) return;
      const lang = document.getElementById('stnOcrLang').value;
      const progressEl = document.getElementById('stnOcrProgress');
      const file = files[0];
      let imageSource;
      if (file.type === 'application/pdf') {
        const canvases = await pdfToPageCanvases(await file.arrayBuffer(), 2);
        imageSource = canvases[0].toDataURL('image/png');
      } else {
        imageSource = URL.createObjectURL(file);
      }
      const worker = await window.Tesseract.createWorker(lang, 1, {
        logger: (m) => { if (m.status && typeof m.progress === 'number') progressEl.textContent = `${m.status}… ${Math.round(m.progress * 100)}%`; },
      });
      const { data } = await worker.recognize(imageSource);
      await worker.terminate();
      document.getElementById('stnOcrOut').value = data.text;
      progressEl.textContent = 'Done.';
      const dl = document.getElementById('stnOcrDownload');
      dl.style.display = '';
      dl.onclick = () => downloadBlob(new Blob([data.text], { type: 'text/plain' }), 'extracted-text.txt');
      STN.toast('Text extracted.');
    },
  };
})();

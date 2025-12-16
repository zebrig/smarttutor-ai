import * as pdfjsLib from 'pdfjs-dist';

// Set worker source (served from our domain)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface PDFPageInfo {
  pageNumber: number;
  thumbnail: string; // Small preview for selection
}

export interface PDFInfo {
  totalPages: number;
  pages: PDFPageInfo[];
}

// Load PDF and get basic info with thumbnails
export async function loadPDFInfo(file: File): Promise<PDFInfo> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  const pages: PDFPageInfo[] = [];

  // Generate thumbnails for all pages (small size for quick loading)
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const thumbnail = await renderPageToImage(page, 150); // Small thumbnail
    pages.push({
      pageNumber: i,
      thumbnail
    });
  }

  return { totalPages, pages };
}

// Render a single page to image
async function renderPageToImage(page: any, maxWidth: number): Promise<string> {
  const viewport = page.getViewport({ scale: 1 });
  const scale = maxWidth / viewport.width;
  const scaledViewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas context failed');

  await page.render({
    canvasContext: context,
    viewport: scaledViewport
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.8);
}

// Extract selected pages as full-quality images
export async function extractPDFPages(
  file: File,
  pageNumbers: number[],
  onProgress?: (current: number, total: number) => void
): Promise<{ pageNumber: number; image: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const results: { pageNumber: number; image: string }[] = [];

  for (let i = 0; i < pageNumbers.length; i++) {
    const pageNum = pageNumbers[i];
    const page = await pdf.getPage(pageNum);

    // Render at good quality (max 2000px width for API)
    const image = await renderPageToImage(page, 2000);

    results.push({
      pageNumber: pageNum,
      image
    });

    if (onProgress) {
      onProgress(i + 1, pageNumbers.length);
    }
  }

  return results;
}

import { fitA4Page } from './pdf-page-fit';
/** Capture le document RH affiché pour produire un PDF identique à l’aperçu. */
export async function captureElementAsPdf(element: HTMLElement, options?: { fitPage?: boolean }): Promise<Blob> {
  const html2canvas = (await import('html2canvas-pro')).default;
  const { jsPDF } = await import('jspdf');
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: options?.fitPage ? Math.max(900, element.scrollWidth) : element.scrollWidth,
    onclone: options?.fitPage ? (_document, clonedElement) => {
      // A narrow mobile dialog must not turn the receipt into a long, tiny strip.
      clonedElement.style.width = '760px';
      clonedElement.style.maxWidth = '760px';
    } : undefined,
    windowHeight: element.scrollHeight,
  });
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageWidth = 210;
  const pageHeight = 297;
  const imageHeight = (canvas.height * pageWidth) / canvas.width;
  if (options?.fitPage) {
    // A short receipt must remain a single A4 sheet even when the screen layout is tall.
    const fitted = fitA4Page(canvas.width, canvas.height);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', fitted.x, fitted.y, fitted.width, fitted.height);
    return pdf.output('blob');
  }
  if (imageHeight <= pageHeight) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageWidth, imageHeight);
    return pdf.output('blob');
  }
  const sliceHeight = Math.floor((canvas.width * pageHeight) / pageWidth);
  let offset = 0;
  let page = 0;
  while (offset < canvas.height) {
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = Math.min(sliceHeight, canvas.height - offset);
    const context = slice.getContext('2d');
    if (!context) throw new Error('Canvas indisponible.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(canvas, 0, offset, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
    if (page > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageWidth, (slice.height * pageWidth) / canvas.width);
    offset += slice.height;
    page += 1;
  }
  return pdf.output('blob');
}
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ExportOptions {
  title: string;
  filename: string;
  language: string;
}

export async function exportElementToPdf(
  elementId: string,
  options: ExportOptions
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found:', elementId);
    return false;
  }

  try {
    // Create canvas from element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Add header
    pdf.setFontSize(18);
    pdf.setTextColor(34, 139, 34); // Forest green
    pdf.text('AgroCamer', 15, 15);
    
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(options.title, 15, 25);
    
    pdf.setFontSize(9);
    const dateText = options.language === 'fr' 
      ? `Généré le ${new Date().toLocaleDateString('fr-FR')}` 
      : `Generated on ${new Date().toLocaleDateString('en-US')}`;
    pdf.text(dateText, 15, 32);
    
    // Calculate image dimensions
    const imgWidth = pdfWidth - 30;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add image (with pagination if needed)
    let yPosition = 40;
    const maxHeight = pdfHeight - 50;
    
    if (imgHeight <= maxHeight) {
      pdf.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
    } else {
      // Multi-page support
      let remainingHeight = imgHeight;
      let sourceY = 0;
      
      while (remainingHeight > 0) {
        const sliceHeight = Math.min(maxHeight, remainingHeight);
        const sliceRatio = sliceHeight / imgHeight;
        
        // Create a slice of the canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = canvas.height * sliceRatio;
        
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, sourceY * (canvas.height / imgHeight),
            canvas.width, sliceCanvas.height,
            0, 0,
            sliceCanvas.width, sliceCanvas.height
          );
          
          const sliceData = sliceCanvas.toDataURL('image/png');
          pdf.addImage(sliceData, 'PNG', 15, yPosition, imgWidth, sliceHeight);
        }
        
        remainingHeight -= sliceHeight;
        sourceY += sliceHeight;
        
        if (remainingHeight > 0) {
          pdf.addPage();
          yPosition = 15;
        }
      }
    }
    
    // Add footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `Page ${i}/${pageCount} - AgroCamer © ${new Date().getFullYear()}`,
        pdfWidth / 2,
        pdfHeight - 10,
        { align: 'center' }
      );
    }
    
    // Download
    pdf.save(`${options.filename}.pdf`);
    return true;
  } catch (error) {
    console.error('PDF export failed:', error);
    return false;
  }
}

export function generateReportContent(
  type: 'diagnosis' | 'harvest',
  data: Record<string, unknown>,
  language: string
): string {
  if (type === 'diagnosis') {
    return language === 'fr'
      ? `Rapport de Diagnostic Phytosanitaire`
      : `Plant Health Diagnostic Report`;
  }
  
  return language === 'fr'
    ? `Rapport d'Analyse de Récolte`
    : `Harvest Analysis Report`;
}

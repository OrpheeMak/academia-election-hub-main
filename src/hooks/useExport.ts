// hooks/useExport.ts
// Hook pour exporter les données (PDF, CSV, Excel)

import { useState } from 'react';

export const useExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Exporte les données en CSV
   */
  const exportToCSV = (data: any[], filename: string = 'export.csv') => {
    try {
      setIsExporting(true);

      // Créer les en-têtes
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(','),
        ...data.map((row) =>
          headers.map((header) => {
            const value = row[header];
            // Échapper les guillemets et entourer de guillemets si nécessaire
            return typeof value === 'string' && value.includes(',')
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          }).join(',')
        ),
      ].join('\n');

      // Créer et télécharger le fichier
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Exporte les données en JSON
   */
  const exportToJSON = (data: any[], filename: string = 'export.json') => {
    try {
      setIsExporting(true);

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erreur lors de l\'export JSON:', error);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Génère un rapport PDF (simple)
   */
  const generatePDFReport = (content: string, filename: string = 'rapport.pdf') => {
    try {
      setIsExporting(true);

      // Pour une vraie implémentation, utiliser jsPDF ou html2pdf
      // Ici c'est un exemple basique
      const pdf = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Rapport Electoral) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000229 00000 n
0000000314 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
408
%%EOF`;

      const blob = new Blob([pdf], { type: 'application/pdf' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToCSV,
    exportToJSON,
    generatePDFReport,
    isExporting,
  };
};

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

interface ExportData {
  analyticsData: any[];
  stats: {
    totalSessions: number;
    uniqueCountries: number;
    completedSessions: number;
    averageBudget: number;
  };
  selectedCountry: string;
  timeRange: string;
}

// Export as JSON
export const exportToJSON = (data: ExportData) => {
  const exportData = {
    generatedAt: new Date().toISOString(),
    filters: {
      country: data.selectedCountry,
      timeRange: data.timeRange
    },
    summary: data.stats,
    analyticsData: data.analyticsData
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });
  
  const fileName = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
  saveAs(blob, fileName);
};

// Export as CSV
export const exportToCSV = (data: ExportData) => {
  const headers = [
    'Session ID',
    'Pays',
    'Ville', 
    'Région',
    'Type de Groupe',
    'Taille Groupe',
    'Niveau Budget',
    'Montant Budget',
    'Devise',
    'Destinations',
    'Statut',
    'Date'
  ];

  const csvContent = [
    headers.join(','),
    ...data.analyticsData.map(item => [
      item.session_id?.substring(0, 12) + '...' || '',
      item.user_country || '',
      item.user_city || '',
      item.user_region || '',
      item.travel_group_type || '',
      item.travel_group_size || '',
      item.budget_level || '',
      item.budget_amount || '',
      item.budget_currency || '',
      item.destinations ? JSON.stringify(item.destinations).replace(/,/g, ';') : '',
      item.completion_status || '',
      new Date(item.created_at).toLocaleDateString('fr-FR')
    ].map(field => `"${field}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
  saveAs(blob, fileName);
};

// Generate logo canvas
const generateLogo = (): Promise<HTMLCanvasElement> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = 200;
    canvas.height = 60;
    
    // Background
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(0, 0, 200, 60);
    
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TRAVEL ANALYTICS', 100, 35);
    
    resolve(canvas);
  });
};

// Export as PDF with all analytics sections
export const exportToPDF = async (data: ExportData) => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPosition = 20;

    // Add logo
    const logoCanvas = await generateLogo();
    const logoImg = logoCanvas.toDataURL('image/png');
    pdf.addImage(logoImg, 'PNG', 20, yPosition, 50, 15);
    yPosition += 25;

    // Title and metadata
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Rapport Complet d\'Analyse de Voyage', 20, yPosition);
    yPosition += 15;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 20, yPosition);
    pdf.text(`Pays sélectionné: ${data.selectedCountry === 'all' ? 'Tous les pays' : data.selectedCountry}`, 20, yPosition + 5);
    pdf.text(`Période d'analyse: ${data.timeRange} derniers jours`, 20, yPosition + 10);
    yPosition += 25;

    // Executive Summary
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('1. RÉSUMÉ EXÉCUTIF', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    const conversionRate = data.stats.totalSessions > 0 ? ((data.stats.completedSessions / data.stats.totalSessions) * 100).toFixed(1) : '0';
    
    pdf.text(`• Sessions totales analysées: ${data.stats.totalSessions.toLocaleString()}`, 25, yPosition);
    pdf.text(`• Pays d'origine uniques: ${data.stats.uniqueCountries}`, 25, yPosition + 6);
    pdf.text(`• Taux de conversion global: ${conversionRate}%`, 25, yPosition + 12);
    pdf.text(`• Budget moyen par voyage: ${data.stats.averageBudget ? data.stats.averageBudget.toFixed(0) + '€' : 'N/A'}`, 25, yPosition + 18);
    yPosition += 35;

    // Section 2: Overview Analytics
    pdf.addPage();
    yPosition = 20;
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('2. ANALYSE COMPORTEMENTALE', 20, yPosition);
    yPosition += 15;

    // Capture budget distribution chart
    await captureAndAddChart(pdf, '[data-chart="budget-pie"]', 'Distribution des Niveaux de Budget', yPosition);
    yPosition += 90;

    // Capture group types chart
    await captureAndAddChart(pdf, '[data-chart="group-bar"]', 'Types de Groupes de Voyage', yPosition);
    
    // Section 3: Geographic Analysis
    pdf.addPage();
    yPosition = 20;
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('3. ANALYSE GÉOGRAPHIQUE - BASSINS ÉMETTEURS', 20, yPosition);
    yPosition += 15;

    await captureAndAddChart(pdf, '[data-chart="country-bar"]', 'Top Pays par Sessions', yPosition);
    yPosition += 90;

    await captureAndAddChart(pdf, '[data-chart="regional-pie"]', 'Répartition Régionale', yPosition);

    // Section 4: Preferences Analysis
    pdf.addPage();
    yPosition = 20;
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('4. ANALYSE DES PRÉFÉRENCES', 20, yPosition);
    yPosition += 15;

    // Culinary preferences
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('4.1 Préférences Culinaires', 20, yPosition);
    yPosition += 10;

    await capturePreferencesSection(pdf, 'culinary', yPosition);
    yPosition += 50;

    // Accommodation preferences
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('4.2 Préférences d\'Hébergement', 20, yPosition);
    yPosition += 10;

    await capturePreferencesSection(pdf, 'accommodation', yPosition);
    
    // Section 5: Trends Analysis
    pdf.addPage();
    yPosition = 20;
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('5. ANALYSE DES TENDANCES', 20, yPosition);
    yPosition += 15;

    await captureAndAddChart(pdf, '[data-chart="trends-line"]', 'Évolution des Sessions dans le Temps', yPosition);

    // Section 6: Detailed Basin Analysis
    yPosition += 100;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('5.1 Analyse Détaillée des Bassins Émetteurs', 20, yPosition);
    yPosition += 10;

    await captureBasinAnalysis(pdf, yPosition);

    // Section 7: Data Summary
    pdf.addPage();
    yPosition = 20;
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('6. TABLEAU DE BORD RÉCAPITULATIF', 20, yPosition);
    yPosition += 15;

    // Add summary table
    await addDataSummaryTable(pdf, data, yPosition);

    // Footer on last page
    const pageCount = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Page ${i} sur ${pageCount}`, 180, 285);
      pdf.text('Rapport généré par Travel Analytics Platform', 20, 285);
    }

    // Save PDF
    const fileName = `rapport-analytics-complet-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating comprehensive PDF:', error);
    throw error;
  }
};

// Helper function to capture and add chart
const captureAndAddChart = async (pdf: jsPDF, selector: string, title: string, yPosition: number) => {
  const element = document.querySelector(selector) as HTMLElement;
  if (element) {
    try {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, 20, yPosition);
      
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 170;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 20, yPosition + 5, imgWidth, Math.min(imgHeight, 70));
    } catch (error) {
      console.error(`Error capturing chart ${title}:`, error);
      pdf.setFontSize(10);
      pdf.text(`[Graphique ${title} non disponible]`, 20, yPosition + 20);
    }
  }
};

// Helper function to capture preferences sections
const capturePreferencesSection = async (pdf: jsPDF, type: string, yPosition: number) => {
  const element = document.querySelector(`[data-preferences="${type}"]`) as HTMLElement;
  if (element) {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 170;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, Math.min(imgHeight, 40));
    } catch (error) {
      console.error(`Error capturing ${type} preferences:`, error);
    }
  }
};

// Helper function to capture basin analysis
const captureBasinAnalysis = async (pdf: jsPDF, yPosition: number) => {
  const element = document.querySelector('[data-analysis="basin"]') as HTMLElement;
  if (element) {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 170;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, Math.min(imgHeight, 150));
    } catch (error) {
      console.error('Error capturing basin analysis:', error);
    }
  }
};

// Helper function to add data summary table
const addDataSummaryTable = async (pdf: jsPDF, data: ExportData, yPosition: number) => {
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  const recentData = data.analyticsData.slice(0, 10); // Top 10 most recent
  
  pdf.text('Aperçu des Dernières Sessions:', 20, yPosition);
  yPosition += 10;
  
  // Table headers
  pdf.setFont('helvetica', 'bold');
  pdf.text('Pays', 20, yPosition);
  pdf.text('Groupe', 50, yPosition);
  pdf.text('Budget', 80, yPosition);
  pdf.text('Statut', 110, yPosition);
  pdf.text('Date', 140, yPosition);
  yPosition += 5;
  
  // Table data
  pdf.setFont('helvetica', 'normal');
  recentData.forEach((item, index) => {
    if (yPosition > 270) return; // Stop if near page end
    
    pdf.text(item.user_country?.substring(0, 15) || 'N/A', 20, yPosition);
    pdf.text(item.travel_group_type?.substring(0, 12) || 'N/A', 50, yPosition);
    pdf.text(item.budget_amount ? `${item.budget_amount}€` : 'N/A', 80, yPosition);
    pdf.text(item.completion_status || 'N/A', 110, yPosition);
    pdf.text(new Date(item.created_at).toLocaleDateString('fr-FR'), 140, yPosition);
    yPosition += 5;
  });
};
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DetailedItinerary } from '@/types/trip';

export const exportItineraryToPDF = async (itinerary: DetailedItinerary): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // En-tête
  pdf.setFontSize(24);
  pdf.setTextColor(60, 60, 60);
  pdf.text('Itinéraire de Voyage', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Informations du voyage
  pdf.setFontSize(14);
  pdf.setTextColor(80, 80, 80);
  
  const destinations = itinerary.trip.destinations.map(d => `${d.city}, ${d.country}`).join(', ');
  pdf.text(`Destinations: ${destinations}`, 20, yPosition);
  yPosition += 10;
  
  pdf.text(`Dates: ${itinerary.trip.startDate?.toLocaleDateString()} - ${itinerary.trip.endDate?.toLocaleDateString()}`, 20, yPosition);
  yPosition += 10;
  
  pdf.text(`Budget total: ${itinerary.totalCost}€`, 20, yPosition);
  yPosition += 20;

  // Itinéraire jour par jour
  pdf.setFontSize(18);
  pdf.setTextColor(60, 60, 60);
  pdf.text('Itinéraire Détaillé', 20, yPosition);
  yPosition += 15;

  itinerary.days.forEach((day, index) => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Jour ${index + 1} - ${day.destination}`, 20, yPosition);
    yPosition += 8;
    
    pdf.setFontSize(12);
    pdf.text(`Thème: ${day.theme}`, 20, yPosition);
    yPosition += 8;

    day.activities.forEach((activity) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setTextColor(50, 50, 50);
      pdf.text(`• ${activity.time} - ${activity.title}`, 25, yPosition);
      yPosition += 6;
      
      if (activity.description) {
        const lines = pdf.splitTextToSize(activity.description, pageWidth - 50);
        pdf.setFontSize(10);
        pdf.setTextColor(120, 120, 120);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - 15) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, 30, yPosition);
          yPosition += 4;
        });
        pdf.setFontSize(12);
      }
      yPosition += 3;
    });
    yPosition += 10;
  });

  // Recommandations
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = 20;
  }

  pdf.setFontSize(18);
  pdf.setTextColor(60, 60, 60);
  pdf.text('Recommandations', 20, yPosition);
  yPosition += 15;

  // Spécialités culinaires
  if (itinerary.recommendations.mustTryDishes) {
    pdf.setFontSize(14);
    pdf.text('Spécialités culinaires:', 20, yPosition);
    yPosition += 8;
    
    Object.entries(itinerary.recommendations.mustTryDishes).forEach(([destination, dishes]) => {
      pdf.setFontSize(12);
      dishes.forEach((dish) => {
        if (yPosition > pageHeight - 15) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(`• ${dish}`, 25, yPosition);
        yPosition += 6;
      });
    });
    yPosition += 10;
  }

  // Sauvegarder le PDF
  const fileName = `itineraire-${destinations.replace(/,\s*/g, '-').toLowerCase()}.pdf`;
  pdf.save(fileName);
};

export const shareItinerary = async (itinerary: DetailedItinerary, platform: 'whatsapp' | 'facebook' | 'twitter'): Promise<void> => {
  const destinations = itinerary.trip.destinations.map(d => `${d.city}, ${d.country}`).join(', ');
  const dates = `${itinerary.trip.startDate?.toLocaleDateString()} - ${itinerary.trip.endDate?.toLocaleDateString()}`;
  
  const shareText = `🌍 Mon itinéraire de voyage vers ${destinations} du ${dates}! Organisé avec Voyage AI ✈️`;
  const url = window.location.href;

  switch (platform) {
    case 'whatsapp':
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`, '_blank');
      break;
    case 'facebook':
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(shareText)}`, '_blank');
      break;
    case 'twitter':
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`, '_blank');
      break;
  }
};

export const copyItineraryLink = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(window.location.href);
  } catch (err) {
    // Fallback pour les navigateurs qui ne supportent pas l'API clipboard
    const textArea = document.createElement('textarea');
    textArea.value = window.location.href;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};
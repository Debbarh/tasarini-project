import jsPDF from 'jspdf';
import type { DetailedItinerary } from '@/types/trip';

// Brand colors (from site's theme)
const COLORS = {
  primary: [13, 164, 209] as [number, number, number], // Azure/teal
  primaryLight: [51, 192, 230] as [number, number, number], // Primary glow
  secondary: [245, 247, 250] as [number, number, number], // Light bg
  text: [30, 41, 59] as [number, number, number], // Dark text
  textLight: [100, 116, 139] as [number, number, number], // Muted text
  white: [255, 255, 255] as [number, number, number],
  success: [34, 197, 94] as [number, number, number],
  warning: [251, 146, 60] as [number, number, number],
};

// Helper to load image as base64
const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
};

// Helper to load multiple images
const loadDestinationImages = async (destinationImages: { [cityName: string]: any[] } | undefined): Promise<{ [cityName: string]: string[] }> => {
  if (!destinationImages) return {};

  const loadedImages: { [cityName: string]: string[] } = {};

  for (const [city, images] of Object.entries(destinationImages)) {
    const cityImages: string[] = [];

    // Load up to 3 images per destination
    for (const image of images.slice(0, 3)) {
      try {
        const base64 = await loadImageAsBase64(image.thumbnailUrl || image.url);
        cityImages.push(base64);
      } catch (error) {
        console.warn(`Could not load image for ${city}:`, error);
      }
    }

    if (cityImages.length > 0) {
      loadedImages[city] = cityImages;
    }
  }

  return loadedImages;
};

// Pré-charge en base64 les images d'activités persistées (activity.image), indexées
// par "dayIndex:activityIndex" pour un rendu synchrone dans le PDF.
const loadActivityImages = async (itinerary: DetailedItinerary): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const days = itinerary?.days || [];
  for (let di = 0; di < days.length; di++) {
    const acts = (days[di] as any)?.activities || [];
    for (let ai = 0; ai < acts.length; ai++) {
      const img = acts[ai]?.image;
      const src = img?.thumbnailUrl || img?.url;
      if (!src) continue;
      try {
        out[`${di}:${ai}`] = await loadImageAsBase64(src);
      } catch (error) {
        console.warn('Could not load activity image:', error);
      }
    }
  }
  return out;
};

const loadFontBase64 = async (path: string): Promise<string> => {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const registerJost = async (pdf: jsPDF) => {
  try {
    const regular = await loadFontBase64('/fonts/Jost-Regular.ttf');
    const bold = await loadFontBase64('/fonts/Jost-Bold.ttf');
    pdf.addFileToVFS('Jost-Regular.ttf', regular);
    pdf.addFileToVFS('Jost-Bold.ttf', bold);
    // Register under Jost and alias helvetica to keep existing calls working
    pdf.addFont('Jost-Regular.ttf', 'Jost', 'normal');
    pdf.addFont('Jost-Bold.ttf', 'Jost', 'bold');
    pdf.addFont('Jost-Regular.ttf', 'helvetica', 'normal');
    pdf.addFont('Jost-Bold.ttf', 'helvetica', 'bold');
    pdf.setFont('Jost', 'normal');
  } catch (error) {
    console.warn('Could not register Jost fonts, falling back to default:', error);
  }
};

export const exportItineraryToPDF = async (itinerary: DetailedItinerary): Promise<void> => {
  // Load logo first
  let logoBase64: string | null = null;
  try {
    logoBase64 = await loadImageAsBase64('/brand/070b3052-89a5-4274-add2-2a60a3411cf2.png');
  } catch (error) {
    console.warn('Could not load logo image:', error);
  }

  // Load destination images
  const destinationImages = await loadDestinationImages(itinerary.destinationImages);
  const heroImage = Object.values(destinationImages)[0]?.[0] || null;

  // Load activity images (persisted on each activity.image), indexées "dayIndex:actIndex"
  const activityImagesB64 = await loadActivityImages(itinerary);

  const pdf = new jsPDF('p', 'mm', 'a4');
  await registerJost(pdf);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  const getDestinationImage = (destination?: string) => {
    if (!destination) return null;
    const city = destination.split(',')[0].trim();
    return destinationImages[city]?.[0] || null;
  };

  // Helper functions
  const drawFramedImage = (image: string, x: number, y: number, width: number, height: number, radius = 5, padding = 1.5) => {
    try {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(x, y, width, height, radius, radius, 'F');
      pdf.addImage(image, 'PNG', x + padding, y + padding, width - padding * 2, height - padding * 2);
    } catch (error) {
      console.warn('Could not add framed image:', error);
    }
  };

  const addLogo = (x: number, y: number, size: number) => {
    if (!logoBase64) return;
    try {
      pdf.addImage(logoBase64, 'PNG', x, y, size, size);
    } catch (error) {
      console.warn('Could not add logo:', error);
    }
  };

  const drawCover = () => {
    // Full-bleed hero
    if (heroImage) {
      try {
        pdf.addImage(heroImage, 'PNG', 0, 0, pageWidth, pageHeight);
      } catch (error) {
        console.warn('Could not add hero image:', error);
      }
    } else {
      pdf.setFillColor(...COLORS.primary);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    }

    // Overlay gradient
    pdf.setGState(pdf.GState({ opacity: 0.78 }));
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.setGState(pdf.GState({ opacity: 1 }));

    // Decorative circles
    pdf.setFillColor(...COLORS.primaryLight);
    pdf.setGState(pdf.GState({ opacity: 0.35 }));
    pdf.circle(pageWidth - 25, 35, 45, 'F');
    pdf.circle(28, pageHeight - 45, 35, 'F');
    pdf.setGState(pdf.GState({ opacity: 1 }));

    // Brand
    pdf.setTextColor(...COLORS.white);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(30);
    pdf.text('TASARINI', margin, 35);
    addLogo(pageWidth - margin - 20, 18, 18);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text("Brochure de voyage personnalisee", margin, 43);

    // Title + route
    const title = itinerary.title || 'Votre escapade signature';
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(26);
    pdf.text(title.toUpperCase(), margin, 80);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const destinations = itinerary.trip.destinations.map(d => `${d.city}`).join('  ·  ');
    pdf.text(destinations || 'Destination a definir', margin, 90);

    // Chips with quick facts
    const chipY = 110;
    const chipPaddingX = 8;
    const chips = [
      { label: 'Dates', value: itinerary.trip.startDate && itinerary.trip.endDate ? `${new Date(itinerary.trip.startDate).toLocaleDateString('fr-FR')} → ${new Date(itinerary.trip.endDate).toLocaleDateString('fr-FR')}` : 'A planifier' },
      { label: 'Budget', value: `${itinerary.totalCost?.toFixed(0) || 0} €` },
      { label: 'Voyageurs', value: `${itinerary.trip.travelGroup?.size || 1} pers.` },
    ];
    let chipX = margin;
    chips.forEach(chip => {
      const text = `${chip.label.toUpperCase()}  ${chip.value}`;
      const width = pdf.getTextWidth(text) + chipPaddingX * 2;
      pdf.setFillColor(255, 255, 255);
      pdf.setGState(pdf.GState({ opacity: 0.16 }));
      pdf.roundedRect(chipX, chipY - 7, width, 12, 3, 3, 'F');
      pdf.setGState(pdf.GState({ opacity: 1 }));
      pdf.setTextColor(...COLORS.white);
      pdf.setFontSize(9);
      pdf.text(text, chipX + chipPaddingX, chipY + 2);
      chipX += width + 4;
    });

    // Callout
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.white);
    pdf.text("Inspiration, activites, essentiels pratiques, tout dans une brochure moderne.", margin, 140);

    // Logo badge lower right
    addLogo(pageWidth - margin - 18, pageHeight - margin - 18, 16);

    // New page for content
    pdf.addPage();
    yPos = margin;
  };

  const addNewPageIfNeeded = (requiredSpace: number = 40) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  const drawInfoBox = () => {
    const boxHeight = 60;
    addNewPageIfNeeded(boxHeight);

    // Glass panel
    pdf.setFillColor(...COLORS.primary);
    pdf.setGState(pdf.GState({ opacity: 0.08 }));
    pdf.roundedRect(margin, yPos, contentWidth, boxHeight, 4, 4, 'F');
    pdf.setGState(pdf.GState({ opacity: 1 }));

    // Content
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(11);

    const destinations = itinerary.trip.destinations.map(d => `${d.city}, ${d.country}`).join(' → ');
    const startDate = itinerary.trip.startDate ? new Date(itinerary.trip.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const endDate = itinerary.trip.endDate ? new Date(itinerary.trip.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const dateText = startDate && endDate ? `${startDate} - ${endDate}` : 'A planifier';

    // Inline layout
    pdf.setFont('helvetica', 'bold');
    pdf.text('Destinations', margin + 5, yPos + 12);
    pdf.setFont('helvetica', 'normal');
    const destLines = pdf.splitTextToSize(destinations || 'A definir', contentWidth - 70);
    pdf.text(destLines, margin + 38, yPos + 12);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Dates', margin + 5, yPos + 26);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dateText, margin + 38, yPos + 26);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Voyageurs', margin + 5, yPos + 40);
    pdf.setFont('helvetica', 'normal');
    const travelers = itinerary.trip.travelGroup?.size || 1;
    pdf.text(`${travelers} personne${travelers > 1 ? 's' : ''}`, margin + 38, yPos + 40);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Budget total', pageWidth - margin - 74, yPos + 24);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.primary);
    pdf.setFontSize(15);
    pdf.text(`${itinerary.totalCost?.toFixed(0) || 0} €`, pageWidth - margin - 52, yPos + 40);

    addLogo(pageWidth - margin - 16, yPos + boxHeight - 18, 10);

    yPos += boxHeight + 18;
  };

  const drawBudgetBreakdown = () => {
    if (!itinerary.budgetBreakdown) return;

    addNewPageIfNeeded(60);

    // Section title
    pdf.setTextColor(...COLORS.text);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('REPARTITION DU BUDGET', margin, yPos);
    yPos += 10;

    const breakdown = itinerary.budgetBreakdown;
    const categories = [
      { key: 'accommodation', label: 'Hebergement', color: COLORS.primary },
      { key: 'food', label: 'Nourriture', color: COLORS.success },
      { key: 'activities', label: 'Activites', color: COLORS.warning },
      { key: 'transport', label: 'Transport', color: [147, 51, 234] as [number, number, number] },
      { key: 'shopping', label: 'Shopping', color: [236, 72, 153] as [number, number, number] },
      { key: 'miscellaneous', label: 'Divers', color: COLORS.textLight },
    ];

    const startX = margin;
    const barWidth = contentWidth;
    const barHeight = 8;

    categories.forEach((cat) => {
      const value = breakdown[cat.key as keyof typeof breakdown] || 0;
      const percentage = (value / itinerary.totalCost) * 100;
      const barFillWidth = (barWidth * percentage) / 100;

      addNewPageIfNeeded(25);

      // Label
      pdf.setFontSize(9);
      pdf.setFont('Jost', 'normal');
      pdf.setTextColor(...COLORS.text);
      pdf.text(cat.label, startX, yPos);

      // Amount and percentage
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...cat.color);
      pdf.text(`${value.toFixed(0)} EUR (${percentage.toFixed(0)}%)`, pageWidth - margin - 35, yPos);

      yPos += 5;

      // Bar background
      pdf.setFillColor(230, 230, 230);
      pdf.roundedRect(startX, yPos, barWidth, barHeight, 2, 2, 'F');

      // Bar fill
      if (barFillWidth > 0) {
        pdf.setFillColor(...cat.color);
        pdf.roundedRect(startX, yPos, barFillWidth, barHeight, 2, 2, 'F');
      }

      yPos += barHeight + 8;
    });

    yPos += 10;
  };

  const drawSectionTitle = (icon: string, title: string) => {
    addNewPageIfNeeded(15);

    // Background bar
    pdf.setFillColor(...COLORS.primary);
    pdf.setGState(pdf.GState({ opacity: 0.1 }));
    pdf.rect(margin - 5, yPos - 6, contentWidth + 10, 12, 'F');
    pdf.setGState(pdf.GState({ opacity: 1 }));

    pdf.setTextColor(...COLORS.primary);
    pdf.setFontSize(14);
    pdf.setFont('Jost', 'bold');
    pdf.text(`${icon} ${title}`, margin, yPos);
    yPos += 12;
  };

  const drawDayItinerary = () => {
    if (!itinerary.days || itinerary.days.length === 0) return;

    drawSectionTitle('', 'ITINERAIRE DETAILLE');

    itinerary.days.forEach((day, dayIndex) => {
      addNewPageIfNeeded(50);

      const dayHero = getDestinationImage(day.destination);
      if (dayHero) {
        const bandHeight = 32;
        try {
          drawFramedImage(dayHero, margin, yPos, contentWidth, bandHeight, 6, 2);
          pdf.setGState(pdf.GState({ opacity: 0.35 }));
          pdf.setFillColor(0, 0, 0);
          pdf.rect(margin, yPos, contentWidth, bandHeight, 'F');
          pdf.setGState(pdf.GState({ opacity: 1 }));

          pdf.setTextColor(255, 255, 255);
          pdf.setFont('Jost', 'bold');
          pdf.setFontSize(10);
          pdf.text(`${day.destination}`, margin + 5, yPos + 10);
          pdf.setFont('Jost', 'normal');
          pdf.setFontSize(9);
          pdf.text('Instantané du jour', margin + 5, yPos + 18);
        } catch (error) {
          console.warn('Could not add day hero image:', error);
        }
        yPos += bandHeight + 6;
      }

      // Day header
      pdf.setFillColor(...COLORS.primary);
      pdf.rect(margin, yPos, 6, 20, 'F');

      pdf.setTextColor(...COLORS.text);
      pdf.setFontSize(13);
      pdf.setFont('Jost', 'bold');
      const dayDate = new Date(day.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      pdf.text(`Jour ${dayIndex + 1} • ${dayDate}`, margin + 10, yPos + 6);

      pdf.setFontSize(11);
      pdf.setTextColor(...COLORS.textLight);
      pdf.setFont('Jost', 'normal');
      pdf.text(`${day.destination} - ${day.theme}`, margin + 10, yPos + 14);

      yPos += 25;

      // Activities
      if (day.activities && day.activities.length > 0) {
        day.activities.forEach((activity, actIndex) => {
          addNewPageIfNeeded(25);

          const rowTop = yPos;
          const actThumb = activityImagesB64[`${dayIndex}:${actIndex}`];
          // Largeur de texte réduite si une vignette est affichée à droite
          const actTextWidth = actThumb ? contentWidth - 20 - 28 : contentWidth - 20;

          // Timeline dot
          pdf.setFillColor(...COLORS.primaryLight);
          pdf.circle(margin + 3, yPos + 2, 2, 'F');

          if (actIndex < day.activities.length - 1) {
            pdf.setDrawColor(...COLORS.primaryLight);
            pdf.setLineWidth(0.5);
            pdf.line(margin + 3, yPos + 4, margin + 3, yPos + 20);
          }

          // Activity content
          pdf.setTextColor(...COLORS.text);
          pdf.setFontSize(10);
          pdf.setFont('Jost', 'bold');
          pdf.text(`${activity.time} • ${activity.title}`, margin + 10, yPos + 4);

          pdf.setFont('Jost', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(...COLORS.textLight);

          if (activity.description) {
            const descLines = pdf.splitTextToSize(activity.description, actTextWidth);
            pdf.text(descLines.slice(0, 2), margin + 10, yPos + 10);
            yPos += 10 + (Math.min(descLines.length, 2) * 4);
          } else {
            yPos += 10;
          }

          // Activity details
          const details = [];
          if (activity.duration) details.push(`Duree: ${activity.duration}`);
          if (activity.cost > 0) details.push(`${activity.cost} EUR`);
          if (activity.type) details.push(`Type: ${activity.type}`);

          if (details.length > 0) {
            pdf.setFontSize(8);
            pdf.setTextColor(...COLORS.textLight);
            pdf.text(details.join(' | '), margin + 10, yPos);
            yPos += 6;
          }

          // Vignette de l'activité (image persistée) alignée à droite de la ligne
          if (actThumb) {
            const tW = 24, tH = 18;
            drawFramedImage(actThumb, margin + contentWidth - tW, rowTop, tW, tH, 4, 1.5);
            if (yPos < rowTop + tH + 2) yPos = rowTop + tH + 2;
          }

          yPos += 8;
        });
      }

      // Day budget
          pdf.setFontSize(9);
          pdf.setFont('Jost', 'bold');
          pdf.setTextColor(...COLORS.primary);
          pdf.text(`Budget du jour: ${day.totalCost || day.dailyBudget || 0} EUR`, margin, yPos);

      yPos += 15;
    });
  };

  const drawEnrichedSection = (icon: string, title: string, content: string | string[]) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return;

    addNewPageIfNeeded(30);

    drawSectionTitle(icon, title);

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.text);

    if (typeof content === 'string') {
      const lines = pdf.splitTextToSize(content, contentWidth);
      lines.forEach((line: string) => {
        addNewPageIfNeeded(15);
        pdf.text(line, margin, yPos);
        yPos += 5;
      });
    } else {
      content.forEach((item: string) => {
        addNewPageIfNeeded(15);
        pdf.text(`• ${item}`, margin + 5, yPos);
        yPos += 6;
      });
    }

    yPos += 8;
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.textLight);
    pdf.setFont('helvetica', 'normal');

    const footerText = `Genere par TASARINI | ${new Date().toLocaleDateString('fr-FR')}`;
    pdf.text(footerText, margin, pageHeight - 10);

    pdf.text(`Page ${pageNum} / ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
    addLogo(pageWidth - margin - 10, pageHeight - 16, 8);
  };

  const drawDestinationGallery = () => {
    if (!destinationImages || Object.keys(destinationImages).length === 0) return;

    addNewPageIfNeeded(90);

    drawSectionTitle('', 'VOS DESTINATIONS EN IMAGES');

    Object.entries(destinationImages).forEach(([city, images]) => {
      if (images.length === 0) return;

      // Space estimation for hero + minis
      addNewPageIfNeeded(90);

      const hero = images[0];
      const secondary = images[1];
      const tertiary = images[2];

      // City header
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.primary);
      pdf.text(city.toUpperCase(), margin, yPos);
      yPos += 6;

      // Hero band
      const heroHeight = 60;
      if (hero) {
        drawFramedImage(hero, margin, yPos, contentWidth, heroHeight, 6, 2);
        pdf.setGState(pdf.GState({ opacity: 0.4 }));
        pdf.setFillColor(0, 0, 0);
        pdf.rect(margin, yPos, contentWidth, heroHeight, 'F');
        pdf.setGState(pdf.GState({ opacity: 1 }));

        pdf.setTextColor(255, 255, 255);
        pdf.setFont('Jost', 'bold');
        pdf.setFontSize(13);
        pdf.text(city, margin + 6, yPos + 12);
        pdf.setFont('Jost', 'normal');
        pdf.setFontSize(9);
        pdf.text('Moments a capturer', margin + 6, yPos + 20);
      }

      yPos += heroHeight + 6;

      // Mini mosaics
      const miniHeight = 42;
      const miniWidth = (contentWidth - 4) / 2;

      if (secondary) {
        drawFramedImage(secondary, margin, yPos, miniWidth, miniHeight, 5, 1.5);
      }

      if (tertiary) {
        drawFramedImage(tertiary, margin + miniWidth + 4, yPos, miniWidth, miniHeight, 5, 1.5);
      }

      // Caption band
      pdf.setGState(pdf.GState({ opacity: 0.12 }));
      pdf.setFillColor(...COLORS.primary);
      pdf.rect(margin, yPos + miniHeight - 10, contentWidth, 12, 'F');
      pdf.setGState(pdf.GState({ opacity: 1 }));
      pdf.setTextColor(...COLORS.text);
      pdf.setFontSize(8);
      pdf.setFont('Jost', 'bold');
      pdf.text('Inspiration photo • Unsplash', margin + 4, yPos + miniHeight);
      addLogo(pageWidth - margin - 10, yPos + miniHeight - 8, 8);

      yPos += miniHeight + 12;
    });

    yPos += 6;
  };

  const drawMoodboard = () => {
    const flatImages = Object.values(destinationImages).flat();
    if (flatImages.length === 0) return;

    addNewPageIfNeeded(70);
    drawSectionTitle('', 'MOODBOARD VISUEL');

    const picks = flatImages.slice(0, 4);
    const blockHeight = 55;
    const blockWidth = (contentWidth - 4) / 2;

    picks.forEach((img, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + col * (blockWidth + 4);
      const y = yPos + row * (blockHeight + 4);
      drawFramedImage(img, x, y, blockWidth, blockHeight, 5, 2);
      pdf.setGState(pdf.GState({ opacity: 0.25 }));
      pdf.setFillColor(0, 0, 0);
      pdf.rect(x, y, blockWidth, blockHeight, 'F');
      pdf.setGState(pdf.GState({ opacity: 1 }));

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('Jost', 'bold');
      pdf.setFontSize(9);
      pdf.text(`Mood ${index + 1}`, x + 4, y + 10);
    });

    yPos += 2 * (blockHeight + 4) + 6;
  };

  // Start building the PDF
  drawCover();
  drawInfoBox();
  drawDestinationGallery(); // Gallery of destination images
  drawMoodboard();
  drawBudgetBreakdown();
  drawDayItinerary();

  // Enriched sections
  if (itinerary.whyVisit) {
    drawEnrichedSection('', 'POURQUOI VISITER', itinerary.whyVisit);
  }

  if (itinerary.mustSee && itinerary.mustSee.length > 0) {
    drawEnrichedSection('', 'INCONTOURNABLES', itinerary.mustSee);
  }

  // Best Time to Visit
  if (itinerary.bestTimeToVisit) {
    const btv = itinerary.bestTimeToVisit;
    const content: string[] = [];
    if (btv.overall) content.push(btv.overall);
    if (btv.avoidPeriods && btv.avoidPeriods.length > 0) {
      content.push(`Periodes a eviter: ${btv.avoidPeriods.join(', ')}`);
    }
    if (content.length > 0) {
      drawEnrichedSection('', 'MEILLEURE PERIODE POUR VISITER', content);
    }
  }

  // Visa and Entry Requirements
  if (itinerary.visaAndEntry) {
    const visa = itinerary.visaAndEntry;
    const content: string[] = [];
    if (visa.generalInfo) content.push(visa.generalInfo);
    if (visa.requirements) content.push(...visa.requirements);
    if (visa.processingTime) content.push(`Delai de traitement: ${visa.processingTime}`);
    if (visa.cost) content.push(`Cout: ${visa.cost}`);
    if (content.length > 0) {
      drawEnrichedSection('', 'VISA ET CONDITIONS D\'ENTREE', content);
    }
  }

  // Health and Safety
  if (itinerary.healthAndSafety) {
    const health = itinerary.healthAndSafety;
    const content: string[] = [];
    if (health.vaccinations && health.vaccinations.length > 0) {
      content.push(`Vaccinations: ${health.vaccinations.join(', ')}`);
    }
    if (health.healthTips) content.push(...health.healthTips);
    if (health.safetyTips) content.push(...health.safetyTips);
    if (content.length > 0) {
      drawEnrichedSection('', 'SANTE ET SECURITE', content);
    }
  }

  // Must Try Dishes
  if (itinerary.mustTryDishes && itinerary.mustTryDishes.length > 0) {
    addNewPageIfNeeded(30);
    drawSectionTitle('', 'SPECIALITES CULINAIRES');

    itinerary.mustTryDishes.forEach((dish) => {
      addNewPageIfNeeded(25);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.text);
      pdf.text(`> ${dish.name}`, margin + 5, yPos);
      yPos += 6;

      if (dish.description) {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...COLORS.textLight);
        const lines = pdf.splitTextToSize(dish.description, contentWidth - 10);
        pdf.text(lines, margin + 7, yPos);
        yPos += lines.length * 4;
      }

      pdf.setFontSize(8);
      pdf.setTextColor(...COLORS.primary);
      if (dish.whereToFind) {
        pdf.text(`Ou trouver: ${dish.whereToFind}`, margin + 7, yPos);
        yPos += 4;
      }
      if (dish.priceRange) {
        pdf.text(`Prix: ${dish.priceRange}`, margin + 7, yPos);
        yPos += 4;
      }
      yPos += 6;
    });
  }

  // Cultural Tips
  if (itinerary.culturalTips && itinerary.culturalTips.length > 0) {
    drawEnrichedSection('', 'CONSEILS CULTURELS', itinerary.culturalTips);
  }

  // Transportation Advice
  if (itinerary.transportationAdvice) {
    const transport = itinerary.transportationAdvice;
    const content: string[] = [];
    if (transport.gettingThere) content.push(`Comment y aller: ${transport.gettingThere}`);
    if (transport.localTransport) {
      const local = transport.localTransport;
      if (local.metro) content.push(`Metro: ${local.metro}`);
      if (local.bus) content.push(`Bus: ${local.bus}`);
      if (local.taxi) content.push(`Taxi: ${local.taxi}`);
    }
    if (transport.tips) content.push(...transport.tips);
    if (content.length > 0) {
      drawEnrichedSection('', 'CONSEILS DE TRANSPORT', content);
    }
  }

  // Sustainability Tips
  if (itinerary.sustainabilityTips && itinerary.sustainabilityTips.length > 0) {
    drawEnrichedSection('', 'CONSEILS ECO-RESPONSABLES', itinerary.sustainabilityTips);
  }

  // Gift Ideas
  if (itinerary.giftIdeas && itinerary.giftIdeas.length > 0) {
    addNewPageIfNeeded(30);
    drawSectionTitle('', 'IDEES CADEAUX');

    itinerary.giftIdeas.forEach((gift) => {
      addNewPageIfNeeded(20);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.text);
      pdf.text(`> ${gift.item}`, margin + 5, yPos);
      yPos += 6;

      pdf.setFontSize(8);
      pdf.setFont('Jost', 'normal');
      pdf.setTextColor(...COLORS.textLight);
      if (gift.description) {
        const lines = pdf.splitTextToSize(gift.description, contentWidth - 10);
        pdf.text(lines, margin + 7, yPos);
        yPos += lines.length * 4;
      }
      if (gift.whereToBuy) {
        pdf.text(`Ou acheter: ${gift.whereToBuy}`, margin + 7, yPos);
        yPos += 4;
      }
      if (gift.priceRange) {
        pdf.text(`Prix: ${gift.priceRange}`, margin + 7, yPos);
        yPos += 4;
      }
      yPos += 6;
    });
  }

  // Similar Destinations
  if (itinerary.similarDestinations && itinerary.similarDestinations.length > 0) {
    addNewPageIfNeeded(30);
    drawSectionTitle('', 'DESTINATIONS SIMILAIRES');

    itinerary.similarDestinations.forEach((dest) => {
      addNewPageIfNeeded(15);
      pdf.setFontSize(10);
      pdf.setFont('Jost', 'bold');
      pdf.setTextColor(...COLORS.text);
      pdf.text(`> ${dest.name}, ${dest.country}`, margin + 5, yPos);
      yPos += 6;

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.textLight);
      const lines = pdf.splitTextToSize(dest.why, contentWidth - 10);
      pdf.text(lines, margin + 7, yPos);
      yPos += lines.length * 4 + 6;
    });
  }

  // Local Events
  if (itinerary.localEvents && itinerary.localEvents.length > 0) {
    addNewPageIfNeeded(30);
    drawSectionTitle('', 'EVENEMENTS LOCAUX');

    itinerary.localEvents.forEach((event) => {
      addNewPageIfNeeded(15);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.text);
      pdf.text(`> ${event.name}`, margin + 5, yPos);
      yPos += 6;

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.textLight);
      pdf.text(`Date: ${event.date}`, margin + 7, yPos);
      yPos += 4;
      if (event.description) {
        const lines = pdf.splitTextToSize(event.description, contentWidth - 10);
        pdf.text(lines, margin + 7, yPos);
        yPos += lines.length * 4;
      }
      yPos += 6;
    });
  }

  // Packing List
  if (itinerary.packingList && itinerary.packingList.length > 0) {
    drawEnrichedSection('', 'LISTE DE BAGAGES', itinerary.packingList);
  }

  // Add page numbers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(i, totalPages);
  }

  // Save the PDF
  const destinations = itinerary.trip.destinations.map(d => d.city).join('-');
  const fileName = `itineraire-${destinations.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};

export const shareItinerary = async (itinerary: DetailedItinerary, platform: 'whatsapp' | 'facebook' | 'twitter'): Promise<void> => {
  const destinations = itinerary.trip.destinations.map(d => `${d.city}, ${d.country}`).join(', ');
  const startDate = itinerary.trip.startDate ? new Date(itinerary.trip.startDate).toLocaleDateString('fr-FR') : '';
  const endDate = itinerary.trip.endDate ? new Date(itinerary.trip.endDate).toLocaleDateString('fr-FR') : '';
  const dates = `${startDate} - ${endDate}`;

  const shareText = `Mon itineraire de voyage vers ${destinations} du ${dates}! Organise avec TASARINI`;
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

import { jsPDF } from 'jspdf';

/** Renders the reward certificate and green impact summary as a downloadable PDF, entirely in the browser. */
export function downloadCertificate(c) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFillColor(232, 245, 233);
  doc.rect(0, 0, 595, 842, 'F');
  doc.setTextColor(27, 94, 32);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('Eco-Bin Reward Certificate', 297, 120, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  doc.text('This certifies that', 297, 175, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(c.resident_name, 297, 210, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text(`(eco-ID ${c.eco_id}) redeemed ${c.points_redeemed} points for:`, 297, 240, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(c.reward, 297, 268, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Green impact to date', 60, 330);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  let y = 355;
  if (!c.impact?.length) { doc.text('No recyclables logged yet.', 60, y); y += 22; }
  (c.impact || []).forEach((i) => { doc.text(`• ${i.material}: ${i.kg} kg recycled`, 60, y); y += 22; });

  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  doc.text(`Certificate code: ${c.code}`, 60, 760);
  doc.text(`Issued: ${c.issued_at || ''}`, 60, 776);
  doc.save(`eco-bin-certificate-${c.code}.pdf`);
}


import { jsPDF } from 'jspdf';

/**
 * EcoBin Reward Voucher PDF
 * Landscape voucher inspired by the supplied reference.
 */

export function downloadCertificate(c) {
  try {
    if (!c) {
      throw new Error('Certificate information is missing.');
    }

    const W = 1000;
    const H = 440;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [W, H],
      compress: true
    });

    const green = [39, 83, 51];
    const darkGreen = [24, 65, 43];
    const cream = [250, 248, 232];
    const sage = [220, 231, 193];
    const white = [255, 255, 255];
    const mutedGreen = [112, 139, 103];

    // Helper: Draw leaves
    function drawLeaf(x, y, rx, ry, color) {
      doc.setFillColor(...color);
      doc.ellipse(x, y, rx, ry, 'F');

      doc.setDrawColor(235, 239, 219);
      doc.setLineWidth(1);
      doc.line(
        x - rx * 0.6,
        y + ry * 0.5,
        x + rx * 0.6,
        y - ry * 0.5
      );
    }

    // Helper: Fit text inside a maximum width
    function fitText(value, maxWidth, startSize, minSize = 15) {
      let size = startSize;

      doc.setFont('helvetica', 'bold');

      while (size > minSize) {
        doc.setFontSize(size);

        if (doc.getTextWidth(String(value)) <= maxWidth) {
          break;
        }

        size--;
      }

      return size;
    }

    // ==========================================
    // BACKGROUND
    // ==========================================

    doc.setFillColor(...cream);
    doc.rect(0, 0, W, H, 'F');

    doc.setFillColor(255, 254, 246);
    doc.roundedRect(8, 8, 984, 424, 22, 22, 'F');

    // Outer border
    doc.setDrawColor(...green);
    doc.setLineWidth(2);
    doc.roundedRect(5, 5, 990, 430, 22, 22, 'S');

    // ==========================================
    // BOTANICAL DECORATIONS
    // ==========================================

    drawLeaf(25, 20, 55, 19, [124, 157, 99]);
    drawLeaf(65, 12, 45, 15, [157, 183, 127]);

    drawLeaf(965, 18, 55, 19, [124, 157, 99]);
    drawLeaf(925, 12, 45, 15, [157, 183, 127]);

    drawLeaf(28, 335, 48, 17, [101, 143, 82]);
    drawLeaf(52, 385, 38, 15, [127, 158, 98]);
    drawLeaf(82, 350, 34, 13, [145, 174, 112]);

    drawLeaf(950, 370, 45, 15, [115, 151, 89]);

    // ==========================================
    // RIGHT PANEL
    // ==========================================

    doc.setFillColor(246, 247, 226);
    doc.rect(792, 10, 198, 420, 'F');

    // Vertical dashed divider
    doc.setDrawColor(...mutedGreen);
    doc.setLineWidth(3);
    doc.setLineDashPattern([8, 7], 0);
    doc.line(790, 10, 790, 430);
    doc.setLineDashPattern([], 0);

    // ==========================================
    // ECO-BIN LOGO
    // ==========================================

    doc.setFillColor(...green);
    doc.circle(105, 57, 34, 'F');

    drawLeaf(96, 52, 11, 5, [91, 183, 121]);
    drawLeaf(111, 52, 11, 5, [111, 196, 137]);
    drawLeaf(104, 67, 10, 5, [76, 151, 105]);

    // Brand name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(43);
    doc.setTextColor(...darkGreen);
    doc.text('Eco-Bin', 168, 48);

    doc.setFontSize(15);
    doc.text('REWARDS SYSTEM', 171, 72);

    // Header tagline
    doc.setDrawColor(...green);
    doc.setLineWidth(1.5);
    doc.line(410, 42, 500, 42);

    doc.setFontSize(12);
    doc.text('REDEEM  •  REWARD  •  GO GREEN', 510, 46);

    // ==========================================
    // MAIN TITLE
    // ==========================================

    doc.setFillColor(...green);
    doc.roundedRect(80, 88, 680, 72, 20, 20, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(44);
    doc.setTextColor(...white);

    doc.text('REWARD VOUCHER', 420, 139, {
      align: 'center',
      charSpace: 3
    });

    drawLeaf(718, 123, 27, 11, [166, 194, 128]);

    // ==========================================
    // RECIPIENT INFORMATION
    // ==========================================

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...green);

    doc.text(
      'THIS VOUCHER IS PRESENTED TO:',
      420,
      193,
      {
        align: 'center',
        charSpace: 2
      }
    );

    // Resident name background
    doc.setFillColor(...sage);
    doc.roundedRect(80, 202, 680, 67, 18, 18, 'F');

    // Resident name
    const residentName = String(
      c.resident_name || 'EcoBin Resident'
    );

    const nameSize = fitText(
      residentName,
      630,
      48,
      23
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(nameSize);
    doc.setTextColor(...darkGreen);

    doc.text(residentName, 420, 252, {
      align: 'center'
    });

    // Eco ID
    doc.setFontSize(20);
    doc.setTextColor(...green);

    doc.text(
      `(ECO-ID: ${c.eco_id || 'N/A'})`,
      420,
      294,
      { align: 'center' }
    );

    // Horizontal divider
    doc.setDrawColor(...mutedGreen);
    doc.setLineWidth(1.5);
    doc.line(80, 308, 760, 308);

    // ==========================================
    // REDEEMED POINTS
    // ==========================================

    drawLeaf(130, 355, 17, 8, [65, 125, 75]);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...green);

    doc.text('REDEEMED POINTS', 158, 351);

    // Points value - positioned higher and centered
    const points = Number(c.points_redeemed || 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(39);
    doc.setTextColor(...darkGreen);

    doc.text(
      points.toLocaleString(),
      235,
      395,
      { align: 'center' }
    );

    // ==========================================
    // VERTICAL DIVIDER
    // ==========================================

    doc.setDrawColor(...green);
    doc.setLineWidth(2);
    doc.line(375, 325, 375, 408);

    // ==========================================
    // REWARD INFORMATION
    // ==========================================

    // Trophy icon
    doc.setFillColor(...green);
    doc.roundedRect(414, 333, 36, 27, 5, 5, 'F');

    doc.setFillColor(...cream);
    doc.roundedRect(422, 338, 20, 15, 3, 3, 'F');
    doc.rect(428, 352, 8, 8, 'F');
    doc.rect(423, 359, 18, 3, 'F');

    // Reward label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...green);
    doc.text('REWARD', 470, 351);

    // Reward name
    const rewardName = String(c.reward || 'Eco Reward');

    const rewardSize = fitText(
      rewardName,
      290,
      25,
      15
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(rewardSize);
    doc.setTextColor(...darkGreen);

    doc.text(rewardName, 470, 386);

    // ==========================================
    // GLOBE ILLUSTRATION
    // ==========================================

    doc.setFillColor(...green);
    doc.circle(890, 151, 61, 'F');

    doc.setFillColor(236, 239, 210);
    doc.circle(890, 151, 51, 'F');

    // Simplified continents
    doc.setFillColor(...green);

    doc.ellipse(876, 139, 13, 23, 'F');
    doc.ellipse(900, 166, 17, 25, 'F');
    doc.ellipse(913, 128, 10, 13, 'F');
    doc.ellipse(869, 180, 8, 13, 'F');

    // Globe outline
    doc.setDrawColor(...green);
    doc.setLineWidth(1.5);

    doc.circle(890, 151, 51, 'S');
    doc.ellipse(890, 151, 24, 51, 'S');
    doc.ellipse(890, 151, 51, 19, 'S');

    // Plant decoration
    drawLeaf(870, 77, 13, 5, [55, 112, 65]);
    drawLeaf(899, 73, 13, 5, [55, 112, 65]);

    doc.setDrawColor(...green);
    doc.setLineWidth(2);
    doc.line(884, 91, 884, 105);

    // ==========================================
    // RIGHT PANEL SLOGAN
    // ==========================================

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(23);
    doc.setTextColor(...green);

    doc.text('Small actions.', 890, 240, {
      align: 'center'
    });

    doc.text('Big impact.', 890, 267, {
      align: 'center'
    });

    // Decorative underline
    doc.setDrawColor(...green);
    doc.setLineWidth(2);

    doc.line(842, 293, 884, 278);
    doc.line(884, 278, 931, 293);

    // ==========================================
    // BOTTOM LANDSCAPE DECORATIONS
    // LOWERED TO KEEP POINTS VISIBLE
    // ==========================================

    // Light green landscape
    doc.setFillColor(181, 204, 151);

    doc.triangle(
      0, 440,
      250, 425,
      470, 440,
      'F'
    );

    doc.triangle(
      790, 440,
      920, 425,
      1000, 440,
      'F'
    );

    // Medium green landscape
    doc.setFillColor(99, 143, 91);

    doc.triangle(
      0, 440,
      250, 433,
      490, 440,
      'F'
    );

    doc.triangle(
      790, 440,
      920, 433,
      1000, 440,
      'F'
    );

    // Dark green bottom layer
    doc.setFillColor(...green);

    doc.triangle(
      0, 440,
      300, 437,
      600, 440,
      'F'
    );

    doc.triangle(
      790, 440,
      925, 437,
      1000, 440,
      'F'
    );

    // ==========================================
    // CERTIFICATE DETAILS
    // ==========================================

    // Draw footer after landscape
    // so the certificate details remain visible.

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...white);

    doc.text(
      `CERTIFICATE CODE: ${c.code || 'N/A'}`,
      80,
      428
    );

    doc.text(
      `ISSUED: ${c.issued_at || 'N/A'}`,
      430,
      428
    );

    // ==========================================
    // SIDE CUTOUTS
    // ==========================================

    doc.setFillColor(...cream);
    doc.circle(5, 220, 19, 'F');
    doc.circle(995, 220, 19, 'F');

    doc.setDrawColor(...green);
    doc.setLineWidth(2);

    doc.circle(5, 220, 19, 'S');
    doc.circle(995, 220, 19, 'S');

    // ==========================================
    // DOWNLOAD PDF
    // ==========================================

    const safeCode = String(c.code || 'voucher')
      .replace(/[^a-zA-Z0-9_-]/g, '-');

    doc.save(`EcoBin-Reward-Voucher-${safeCode}.pdf`);

  } catch (error) {
    console.error('EcoBin PDF Error:', error);

    alert(
      'Unable to generate the reward voucher. Please check the browser console.'
    );
  }
}

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

export function buildShippingSlipPDF(order) {
  return new Promise(async (resolve, reject) => {
    try {
      // 4x6 inches is 288 x 432 points
      const doc = new PDFDocument({ size: [288, 432], margin: 15 });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const address = order.address || {};
      const amounts = order.amounts || {};
      const isCod = (order.payment || '').toLowerCase() === 'cod';

      // ============ Draw Outer Border ============
      doc.rect(15, 15, 258, 402).lineWidth(2).strokeColor('#000000').stroke();

      // ============ Header ============
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(16).text('MikuMantra', 22, 22);
      doc.font('Helvetica').fontSize(6).text('HOUSE OF FINE JEWELLERY', 22, 39, { characterSpacing: 1 });

      // Badge (COD or PREPAID)
      if (isCod) {
        doc.rect(190, 20, 75, 22).fill('#000000');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('COD', 190, 26, { align: 'center', width: 75 });
      } else {
        doc.rect(190, 20, 75, 22).lineWidth(2).strokeColor('#000000').stroke();
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10).text('PREPAID', 190, 26, { align: 'center', width: 75 });
      }

      // Divider 1
      doc.moveTo(15, 48).lineTo(273, 48).lineWidth(1.5).strokeColor('#000000').stroke();

      // ============ SHIP TO Address ============
      doc.fillColor('#666666').font('Helvetica-Bold').fontSize(7).text('SHIP TO:', 22, 54);
      
      let y = 63;
      if (address.fullName) {
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11).text(address.fullName.toUpperCase(), 22, y, { width: 244, ellipsis: true });
        y += 13;

        doc.fillColor('#333333').font('Helvetica').fontSize(8);
        const addrText = `${address.line1 || ''}${address.line2 ? ', ' + address.line2 : ''}`;
        doc.text(addrText.toUpperCase(), 22, y, { width: 244, height: 20, ellipsis: true });
        y += 18;

        doc.font('Helvetica-Bold').text(`${(address.city || '').toUpperCase()}, ${(address.state || '').toUpperCase()}`, 22, y);
        y += 11;

        // PIN Code Box
        doc.rect(22, y, 100, 16).fill('#F0F0F0');
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9).text(`PIN: ${address.pincode}`, 26, y + 4);
      } else {
        doc.fillColor('#999999').font('Helvetica-Oblique').fontSize(8).text('No shipping address provided', 22, y);
      }

      // Phone Box
      if (address.phone) {
        doc.rect(130, y, 136, 16).fill('#F0F0F0');
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text(`PHONE: ${address.phone}`, 134, y + 4);
      }
      
      // Divider 2
      doc.moveTo(15, 122).lineTo(273, 122).lineWidth(1.5).strokeColor('#000000').stroke();

      // ============ Order Details ============
      doc.fillColor('#000000');
      doc.font('Helvetica-Bold').fontSize(7);
      
      // Left side info
      doc.fillColor('#666666').text('ORDER REFERENCE', 22, 128);
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text(order.orderNumber, 22, 136);

      doc.fillColor('#666666').font('Helvetica-Bold').fontSize(7).text('ORDER DATE', 22, 148);
      const formattedDate = new Date(order.placedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text(formattedDate, 22, 156);

      // Right side info
      doc.fillColor('#666666').font('Helvetica-Bold').fontSize(7).text('PAYMENT METHOD', 145, 128);
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text(order.payment === 'cod' ? 'Cash On Delivery' : (order.payment || 'PREPAID').toUpperCase(), 145, 136);

      doc.fillColor('#666666').font('Helvetica-Bold').fontSize(7).text('COLLECTABLE AMOUNT', 145, 148);
      const collectable = isCod ? `INR ${amounts.total.toLocaleString('en-IN')}` : 'INR 0.00 (PAID)';
      doc.fillColor('#9C6B30').font('Helvetica-Bold').fontSize(9).text(collectable, 145, 156);

      // Divider 3
      doc.moveTo(15, 172).lineTo(273, 172).lineWidth(1.5).strokeColor('#000000').stroke();

      // ============ Package Contents ============
      doc.fillColor('#666666').font('Helvetica-Bold').fontSize(7).text('PACKAGE CONTENTS:', 22, 178);

      // Simple Table Headers
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7);
      doc.rect(22, 188, 244, 12).fill('#F0F0F0');
      doc.fillColor('#333333').text('PRODUCT DESCRIPTION', 26, 191);
      doc.text('QTY', 235, 191, { align: 'right', width: 25 });

      let itemY = 203;
      const maxDisplayItems = 4;
      const items = order.items || [];
      
      items.slice(0, maxDisplayItems).forEach((it) => {
        doc.fillColor('#000000').font('Helvetica').fontSize(7.5).text(it.name.toUpperCase(), 26, itemY, { width: 200, ellipsis: true });
        doc.font('Helvetica-Bold').text(String(it.qty), 235, itemY, { align: 'right', width: 25 });
        itemY += 12;
      });

      if (items.length > maxDisplayItems) {
        doc.fillColor('#666666').font('Helvetica-Oblique').fontSize(7.5).text(`+ ${items.length - maxDisplayItems} more items...`, 26, itemY);
      } else if (items.length === 0) {
        doc.fillColor('#999999').font('Helvetica-Oblique').fontSize(7.5).text('No items in package', 26, itemY);
      }

      // Divider 4
      doc.moveTo(15, 275).lineTo(273, 275).lineWidth(1.5).strokeColor('#000000').stroke();

      // ============ Barcode & QR Code Footer ============
      // 1. Generate Barcode with bwip-js
      try {
        const barcodeBuffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: order.orderNumber,
          scale: 3,
          height: 12,
          includetext: true,
          textsize: 8,
          textxalign: 'center',
        });
        
        doc.image(barcodeBuffer, 22, 290, { width: 145, height: 48 });
      } catch (err) {
        console.error('PDF Barcode generation error:', err);
        doc.fillColor('#FF0000').font('Helvetica').fontSize(8).text('Barcode Error', 22, 305);
      }

      // 2. Generate QR Code with qrcode
      try {
        const qrData = JSON.stringify({
          orderNumber: order.orderNumber,
          customerName: address.fullName,
          phone: address.phone,
          pincode: address.pincode,
          total: amounts.total,
          payment: order.payment,
          status: order.status,
          carrier: order.courier?.carrier || order.carrier || null,
          trackingNumber: order.courier?.trackingNumber || order.trackingNumber || null
        });

        const qrBuffer = await QRCode.toBuffer(qrData, {
          width: 100,
          margin: 1,
        });

        doc.image(qrBuffer, 195, 280, { width: 62, height: 62 });
        doc.fillColor('#666666').font('Helvetica-Bold').fontSize(6).text('SCAN DETAILS', 195, 345, { width: 62, align: 'center' });
      } catch (err) {
        console.error('PDF QR Code generation error:', err);
        doc.fillColor('#FF0000').font('Helvetica').fontSize(8).text('QR Error', 195, 305);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

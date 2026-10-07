import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import bwipjs from 'bwip-js';

async function drawSingleSlip(doc, order, copyNum, copyTitle, barcodeBuffer, qrBuffer) {
  const address = order.address || {};
  const amounts = order.amounts || {};
  const isCod = (order.payment || '').toLowerCase() === 'cod';

  // ============ Draw Outer Border ============
  doc.rect(15, 15, 258, 402).lineWidth(2).strokeColor('#000000').stroke();

  // ============ Header ============
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(15).text('MikuMantra', 22, 21);
  doc.font('Helvetica').fontSize(5.5).text('HOUSE OF FINE JEWELLERY', 22, 36, { characterSpacing: 1 });

  // Badge (COD or PREPAID)
  if (isCod) {
    doc.rect(190, 19, 75, 20).fill('#000000');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text('COD', 190, 24, { align: 'center', width: 75 });
  } else {
    doc.rect(190, 19, 75, 20).lineWidth(1.5).strokeColor('#000000').stroke();
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9.5).text('PREPAID', 190, 24, { align: 'center', width: 75 });
  }

  // Copy Badge Bar
  doc.rect(15, 43, 258, 12).fill('#F0ECE1');
  doc.fillColor('#7A501F').font('Helvetica-Bold').fontSize(6).text(`SLIP ${copyNum} OF 2 • ${copyTitle.toUpperCase()}`, 15, 46.5, { align: 'center', width: 258 });

  // Divider 1
  doc.moveTo(15, 55).lineTo(273, 55).lineWidth(1.5).strokeColor('#000000').stroke();

  // ============ SHIP TO Address ============
  doc.fillColor('#666666').font('Helvetica-Bold').fontSize(6.5).text('SHIP TO:', 22, 59);
  
  let y = 67;
  if (address.fullName) {
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10).text(address.fullName.toUpperCase(), 22, y, { width: 244, ellipsis: true });
    y += 12;

    doc.fillColor('#333333').font('Helvetica').fontSize(7.5);
    const addrText = `${address.line1 || ''}${address.line2 ? ', ' + address.line2 : ''}`;
    doc.text(addrText.toUpperCase(), 22, y, { width: 244, height: 18, ellipsis: true });
    y += 16;

    doc.font('Helvetica-Bold').text(`${(address.city || '').toUpperCase()}, ${(address.state || '').toUpperCase()}`, 22, y);
    y += 10;

    // PIN Code Box
    doc.rect(22, y, 95, 14).fill('#F0F0F0');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text(`PIN: ${address.pincode}`, 26, y + 3);
  } else {
    doc.fillColor('#999999').font('Helvetica-Oblique').fontSize(7.5).text('No shipping address provided', 22, y);
  }

  // Phone Box
  if (address.phone) {
    doc.rect(125, y, 141, 14).fill('#F0F0F0');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7.5).text(`PHONE: ${address.phone}`, 129, y + 3);
  }
  
  // Divider 2
  doc.moveTo(15, 120).lineTo(273, 120).lineWidth(1.5).strokeColor('#000000').stroke();

  // ============ Order Details ============
  doc.fillColor('#000000');
  doc.font('Helvetica-Bold').fontSize(6.5);
  
  // Row 1: Order Reference & Payment Method
  doc.fillColor('#666666').text('ORDER REFERENCE', 22, 124);
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7.5).text(order.orderNumber, 22, 131);

  doc.fillColor('#666666').font('Helvetica-Bold').fontSize(6.5).text('PAYMENT METHOD', 145, 124);
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7.5).text(order.payment === 'cod' ? 'Cash On Delivery' : (order.payment || 'PREPAID').toUpperCase(), 145, 131);

  // Row 2: Order Date & Collectable Amount
  doc.fillColor('#666666').font('Helvetica-Bold').fontSize(6.5).text('ORDER DATE', 22, 141);
  const formattedDate = new Date(order.placedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7.5).text(formattedDate, 22, 148);

  doc.fillColor('#666666').font('Helvetica-Bold').fontSize(6.5).text('COLLECTABLE AMOUNT', 145, 141);
  const collectable = isCod ? `INR ${amounts.total.toLocaleString('en-IN')}` : 'INR 0.00 (PAID)';
  doc.fillColor('#9C6B30').font('Helvetica-Bold').fontSize(8.5).text(collectable, 145, 148);

  // Row 3: Courier Partner & AWB Tracking Number
  const carrierName = order.courier?.carrier || order.carrier || 'Pending Assignment';
  const awbNum = order.courier?.trackingNumber || order.trackingNumber || 'Pending Dispatch';
  
  doc.fillColor('#666666').font('Helvetica-Bold').fontSize(6.5).text('COURIER PARTNER', 22, 158);
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7.5).text(carrierName.toUpperCase(), 22, 165, { width: 115, ellipsis: true });

  doc.fillColor('#666666').font('Helvetica-Bold').fontSize(6.5).text('AWB / TRACKING NO', 145, 158);
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7.5).text(awbNum.toUpperCase(), 145, 165, { width: 120, ellipsis: true });

  // Divider 3
  doc.moveTo(15, 177).lineTo(273, 177).lineWidth(1.5).strokeColor('#000000').stroke();

  // ============ Package Contents ============
  doc.fillColor('#666666').font('Helvetica-Bold').fontSize(6.5).text('PACKAGE CONTENTS:', 22, 181);

  // Simple Table Headers
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(6.5);
  doc.rect(22, 189, 244, 10).fill('#F0F0F0');
  doc.fillColor('#333333').text('PRODUCT DESCRIPTION', 26, 191);
  doc.text('QTY', 235, 191, { align: 'right', width: 25 });

  let itemY = 202;
  const maxDisplayItems = copyNum === 2 ? 3 : 4;
  const items = order.items || [];
  
  items.slice(0, maxDisplayItems).forEach((it) => {
    doc.fillColor('#000000').font('Helvetica').fontSize(7).text(it.name.toUpperCase(), 26, itemY, { width: 200, ellipsis: true });
    doc.font('Helvetica-Bold').text(String(it.qty), 235, itemY, { align: 'right', width: 25 });
    itemY += 11;
  });

  if (items.length > maxDisplayItems) {
    doc.fillColor('#666666').font('Helvetica-Oblique').fontSize(7).text(`+ ${items.length - maxDisplayItems} more items...`, 26, itemY);
    itemY += 10;
  } else if (items.length === 0) {
    doc.fillColor('#999999').font('Helvetica-Oblique').fontSize(7).text('No items in package', 26, itemY);
    itemY += 10;
  }

  // Courier Pickup Handover Box for Copy 2
  if (copyNum === 2) {
    doc.rect(22, 238, 244, 28).lineWidth(0.8).strokeColor('#999999').stroke();
    doc.fillColor('#444444').font('Helvetica-Bold').fontSize(6).text('COURIER HANDOVER ACKNOWLEDGEMENT', 26, 241);
    doc.fillColor('#666666').font('Helvetica').fontSize(5.5).text('Received sealed luxury parcel in good tamper-evident condition.', 26, 249);
    doc.text('Pickup Date: _______________   Courier Signature / Emp ID: _________________________', 26, 257);
  }

  // Divider 4
  doc.moveTo(15, 271).lineTo(273, 271).lineWidth(1.5).strokeColor('#000000').stroke();

  // ============ Barcode & QR Code Footer ============
  if (barcodeBuffer) {
    try {
      doc.image(barcodeBuffer, 22, 282, { width: 145, height: 48 });
    } catch (err) {
      console.error('PDF Barcode image error:', err);
    }
  }

  if (qrBuffer) {
    try {
      doc.image(qrBuffer, 195, 275, { width: 60, height: 60 });
      doc.fillColor('#666666').font('Helvetica-Bold').fontSize(5.5).text('SCAN DETAILS', 195, 338, { width: 60, align: 'center' });
    } catch (err) {
      console.error('PDF QR Code image error:', err);
    }
  }

  // Security Footer Assurance Note
  doc.rect(15, 395, 258, 22).fill('#FAF8F5');
  doc.moveTo(15, 395).lineTo(273, 395).lineWidth(1).strokeColor('#000000').stroke();
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(6).text(
    copyNum === 1
      ? 'CONSIGNEE COPY: Inspect parcel seal before receiving. Tamper-evident verified.'
      : 'COURIER COPY: Retain with pickup manifest. Insured transit priority consignment.',
    15, 403, { align: 'center', width: 258 }
  );
}

export function buildShippingSlipPDF(order) {
  return new Promise(async (resolve, reject) => {
    try {
      // Exactly 2 shipping slips generated per order
      // 4x6 inches is 288 x 432 points
      const doc = new PDFDocument({ size: [288, 432], margin: 15, autoFirstPage: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const address = order.address || {};
      const amounts = order.amounts || {};

      // 1. Generate Barcode with bwip-js (prefer AWB tracking number, fallback to orderNumber)
      const barcodeText = (order.courier?.trackingNumber || order.trackingNumber || order.orderNumber).trim();
      let barcodeBuffer = null;
      try {
        barcodeBuffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: barcodeText,
          scale: 3,
          height: 12,
          includetext: true,
          textsize: 8,
          textxalign: 'center',
        });
      } catch (err) {
        console.error('PDF Barcode generation error:', err);
      }

      // 2. Generate QR Code with qrcode
      let qrBuffer = null;
      try {
        const qrData = JSON.stringify({
          orderNumber: order.orderNumber,
          customerName: address.fullName,
          phone: address.phone,
          pincode: address.pincode,
          total: amounts.total,
          payment: order.payment,
          status: order.status,
          carrier: order.courier?.carrier || order.carrier || '',
          trackingNumber: order.courier?.trackingNumber || order.trackingNumber || '',
          trackingUrl: order.courier?.trackingUrl || order.trackingUrl || ''
        });

        qrBuffer = await QRCode.toBuffer(qrData, {
          width: 100,
          margin: 1,
        });
      } catch (err) {
        console.error('PDF QR Code generation error:', err);
      }

      // ============ SLIP 1 OF 2: CONSIGNEE / PACKAGE COPY (ORIGINAL) ============
      await drawSingleSlip(
        doc,
        order,
        1,
        'Consignee / Package Copy (Original)',
        barcodeBuffer,
        qrBuffer
      );

      // ============ SLIP 2 OF 2: COURIER / TRANSPORTER COPY (DUPLICATE) ============
      doc.addPage({ size: [288, 432], margin: 15 });
      await drawSingleSlip(
        doc,
        order,
        2,
        'Courier / Transporter Copy (Duplicate)',
        barcodeBuffer,
        qrBuffer
      );

      // Finish document - strictly exactly 2 pages / 2 shipping slips
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

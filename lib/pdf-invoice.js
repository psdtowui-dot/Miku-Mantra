import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

export function buildInvoicePDF(order, companyConfig = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const GOLD = companyConfig.primaryColor || '#9C6B30';
      const DARK = companyConfig.darkColor || '#1A1A1A';
      const MUTED = '#555555';
      const LIGHT_BG = companyConfig.lightBg || '#FAF6EF';
      const BORDER_COLOR = '#E0E0E0';

      // Load company logo image if available
      let logoBuffer = companyConfig.logoBuffer || null;
      let faviconBuffer = companyConfig.faviconBuffer || null;

      if (!faviconBuffer && companyConfig.favicon) {
        try {
          if (companyConfig.favicon.startsWith('data:')) {
            const base64Data = companyConfig.favicon.split(',')[1];
            if (base64Data) faviconBuffer = Buffer.from(base64Data, 'base64');
          } else if (companyConfig.favicon.startsWith('http://') || companyConfig.favicon.startsWith('https://')) {
            const res = await fetch(companyConfig.favicon);
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer();
              faviconBuffer = Buffer.from(arrayBuf);
            }
          } else if (companyConfig.favicon.includes('/uploads/')) {
            const filename = companyConfig.favicon.split('/uploads/')[1];
            const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename);
            if (fs.existsSync(uploadPath)) {
              faviconBuffer = fs.readFileSync(uploadPath);
            }
          }
        } catch (e) {
          console.warn('Failed to load favicon image for PDF invoice:', e.message);
        }
      }

      if (!faviconBuffer) {
        const appIconPath = path.join(process.cwd(), 'app', 'icon.png');
        if (fs.existsSync(appIconPath)) {
          try { faviconBuffer = fs.readFileSync(appIconPath); } catch (e) {}
        }
      }

      if (!logoBuffer && companyConfig.logo) {
        try {
          if (companyConfig.logo.startsWith('data:')) {
            const base64Data = companyConfig.logo.split(',')[1];
            if (base64Data) logoBuffer = Buffer.from(base64Data, 'base64');
          } else if (companyConfig.logo.startsWith('http://') || companyConfig.logo.startsWith('https://')) {
            const res = await fetch(companyConfig.logo);
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer();
              logoBuffer = Buffer.from(arrayBuf);
            }
          } else {
            if (companyConfig.logo.includes('/uploads/')) {
              const filename = companyConfig.logo.split('/uploads/')[1];
              const uploadPath = path.join(process.cwd(), 'public', 'uploads', filename);
              if (fs.existsSync(uploadPath)) {
                logoBuffer = fs.readFileSync(uploadPath);
              }
            }
            if (!logoBuffer) {
              const localPath = path.join(process.cwd(), 'public', companyConfig.logo.replace(/^\//, ''));
              if (fs.existsSync(localPath)) {
                logoBuffer = fs.readFileSync(localPath);
              }
            }
            if (!logoBuffer) {
              const defaultLogoPath = path.join(process.cwd(), 'public', 'logo.png');
              if (fs.existsSync(defaultLogoPath)) {
                logoBuffer = fs.readFileSync(defaultLogoPath);
              }
            }
          }
        } catch (e) {
          console.warn('Failed to load logo image for PDF invoice:', e.message);
        }
      }

      let y = 40;

      // ============ 1. HEADER & BRANDING ============
      // Render Logo or Brand Heading (with Favicon fallback)
      let headerImageRendered = false;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 40, y, { fit: [160, 45] });
          y += 50;
          headerImageRendered = true;
        } catch (e) {
          console.warn('Invoice: Failed to render logo, trying favicon:', e.message);
        }
      }

      if (!headerImageRendered && faviconBuffer) {
        try {
          doc.image(faviconBuffer, 40, y, { fit: [42, 42] });
          doc.fillColor(DARK).font('Helvetica-Bold').fontSize(18).text(companyConfig.name || 'MikuMantra Fine Jewellery', 90, y + 12);
          y += 50;
          headerImageRendered = true;
        } catch (e) {
          console.warn('Invoice: Failed to render favicon:', e.message);
        }
      }

      if (!headerImageRendered) {
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(22).text(companyConfig.name || 'MikuMantra', 40, y);
        y += 26;
      }

      // Company Info (Left Side)
      const compName = companyConfig.name || 'MikuMantra Fine Jewellery';
      const compAddress = companyConfig.address || companyConfig.registeredAddress || '';
      const compEmail = companyConfig.email || '';
      const compPhone = companyConfig.phone || '';
      const compWebsite = companyConfig.website ? companyConfig.website.replace(/\/$/, '') : '';
      const compGstin = companyConfig.gstin ? `GSTIN: ${companyConfig.gstin}` : '';
      const compPan = companyConfig.pan ? `PAN: ${companyConfig.pan}` : '';
      const compCin = companyConfig.cin ? `CIN: ${companyConfig.cin}` : '';

      const leftColWidth = 295;
      const renderLeftLine = (text, isBold = false, fontSize = 8.5, color = MUTED, extraGap = 2.5) => {
        if (!text) return;
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).fillColor(color);
        const textH = doc.heightOfString(text, { width: leftColWidth, lineGap: 1.5 });
        doc.text(text, 40, y, { width: leftColWidth, lineGap: 1.5 });
        y += textH + extraGap;
      };

      renderLeftLine(compName, true, 10, DARK, 3);
      if (compAddress) renderLeftLine(compAddress, false, 8.5, MUTED, 2.5);

      // Email and Phone on one clean line
      const contactLine = [compEmail, compPhone].filter(Boolean).join('  |  ');
      if (contactLine) renderLeftLine(contactLine, false, 8.5, MUTED, 2.5);

      // Website cleanly on its own line if present
      if (compWebsite) renderLeftLine(compWebsite, false, 8.5, MUTED, 2.5);

      // Tax registration details
      const taxRegLine = [compGstin, compPan, compCin].filter(Boolean).join('  |  ');
      if (taxRegLine) renderLeftLine(taxRegLine, false, 8.5, MUTED, 2.5);

      // Tax Invoice Title & Metadata Box (Right Side)
      let rightY = 40;
      const invoiceTitle = companyConfig.invoiceTitle || 'TAX INVOICE';
      const invoiceSubtitle = companyConfig.invoiceSubtitle || 'ORIGINAL FOR RECIPIENT';
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(18).text(invoiceTitle, 350, rightY, { align: 'right', width: 205 });
      rightY += 22;
      doc.fillColor(GOLD).font('Helvetica').fontSize(8).text(invoiceSubtitle, 350, rightY, { align: 'right', width: 205, characterSpacing: 1 });
      rightY += 16;

      const invPrefix = companyConfig.invoicePrefix || 'INV-';
      const invoiceNum = order.invoiceNumber || `${invPrefix}${order.orderNumber}`;
      const invoiceDate = new Date(order.placedAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const orderDate = new Date(order.placedAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const paymentMethod = order.payment === 'cod' ? 'Cash on Delivery (COD)' : (order.payment === 'razorpay' ? 'Online (Razorpay)' : (order.payment || 'ONLINE').toUpperCase());
      const paymentStatus = (order.paymentStatus || 'PENDING').toUpperCase();

      doc.fillColor(MUTED).font('Helvetica').fontSize(8.5)
        .text(`Invoice No: `, 350, rightY, { align: 'right', width: 110 })
        .fillColor(DARK).font('Helvetica-Bold').text(invoiceNum, 460, rightY, { align: 'right', width: 95 });
      rightY += 13;

      doc.fillColor(MUTED).font('Helvetica')
        .text(`Invoice Date: `, 350, rightY, { align: 'right', width: 110 })
        .fillColor(DARK).text(invoiceDate, 460, rightY, { align: 'right', width: 95 });
      rightY += 13;

      doc.fillColor(MUTED).font('Helvetica')
        .text(`Order ID: `, 350, rightY, { align: 'right', width: 110 })
        .fillColor(DARK).text(order.orderNumber, 460, rightY, { align: 'right', width: 95 });
      rightY += 13;

      doc.fillColor(MUTED).font('Helvetica')
        .text(`Payment Status: `, 350, rightY, { align: 'right', width: 110 })
        .fillColor(paymentStatus === 'PAID' ? '#16a34a' : '#d97706').font('Helvetica-Bold').text(paymentStatus, 460, rightY, { align: 'right', width: 95 });
      rightY += 13;

      y = Math.max(y + 10, rightY + 10);

      // Gold Divider line
      doc.moveTo(40, y).lineTo(555, y).lineWidth(1).strokeColor(GOLD).stroke();
      y += 15;

      if (companyConfig.showWatermark && (paymentStatus === 'PAID' || order.status === 'cancelled')) {
        try {
          doc.save();
          doc.rotate(-30, { origin: [300, 420] });
          doc.fontSize(64).fillColor(paymentStatus === 'PAID' ? '#16a34a' : '#dc2626').fillOpacity(0.06);
          doc.text(paymentStatus === 'PAID' ? 'PAID' : 'CANCELLED', 170, 400);
          doc.restore();
        } catch (wmErr) {}
      }

      // ============ 2. BILLING & SHIPPING ADDRESSES ============
      const addr = order.address || {};
      const boxWidth = 245;

      // Bill To / Ship To Header
      doc.rect(40, y, boxWidth, 20).fill('#F4F4F5');
      doc.rect(310, y, boxWidth, 20).fill('#F4F4F5');

      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8)
        .text('BILL TO (CUSTOMER)', 50, y + 6)
        .text('SHIP TO (DELIVERY ADDRESS)', 320, y + 6);
      y += 25;

      const custName = addr.fullName || 'Valued Customer';
      const line1 = addr.line1 || '';
      const line2 = addr.line2 ? `, ${addr.line2}` : '';
      const streetAddress = `${line1}${line2}`.trim();
      const cityStatePin = [addr.city, addr.state].filter(Boolean).join(', ') + (addr.pincode ? ` - ${addr.pincode}` : '');
      const phone = addr.phone ? `Phone: ${addr.phone}` : '';
      const email = order.guestEmail || addr.email ? `Email: ${order.guestEmail || addr.email}` : '';

      const renderAddrRow = (leftText, rightText, isBold = false, fontSize = 8.5, color = MUTED, extraGap = 2.5) => {
        if (!leftText && !rightText) return;
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).fillColor(color);
        const hLeft = leftText ? doc.heightOfString(leftText, { width: 230, lineGap: 1.5 }) : 0;
        const hRight = rightText ? doc.heightOfString(rightText, { width: 230, lineGap: 1.5 }) : 0;
        const maxH = Math.max(hLeft, hRight, 11);
        if (leftText) doc.text(leftText, 50, y, { width: 230, lineGap: 1.5 });
        if (rightText) doc.text(rightText, 320, y, { width: 230, lineGap: 1.5 });
        y += maxH + extraGap;
      };

      renderAddrRow(custName, custName, true, 9.5, DARK, 3);
      if (streetAddress) renderAddrRow(streetAddress, streetAddress, false, 8.5, MUTED, 2.5);
      if (cityStatePin) renderAddrRow(cityStatePin, cityStatePin, false, 8.5, MUTED, 2.5);
      if (phone) renderAddrRow(phone, phone, false, 8.5, MUTED, 2.5);
      if (email) renderAddrRow(email, email, false, 8.5, MUTED, 2.5);

      y += 12;

      // ============ 3. ITEMS TABLE ============
      function drawTableHeader(curY) {
        doc.rect(40, curY, 515, 22).fill(DARK);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8)
          .text('#', 48, curY + 6, { width: 20, align: 'left' })
          .text('PRODUCT / DESCRIPTION', 75, curY + 6, { width: 240, align: 'left' })
          .text('QTY', 320, curY + 6, { width: 45, align: 'center' })
          .text('UNIT PRICE', 370, curY + 6, { width: 85, align: 'right' })
          .text('TOTAL AMOUNT', 460, curY + 6, { width: 85, align: 'right' });
        return curY + 22;
      }

      y = drawTableHeader(y);

      const items = Array.isArray(order.items) ? order.items : [];
      
      items.forEach((it, idx) => {
        // Page break check
        if (y > 700) {
          doc.addPage();
          y = 40;
          y = drawTableHeader(y);
        }

        const bg = idx % 2 === 0 ? LIGHT_BG : '#FFFFFF';
        const rowHeight = 24;
        doc.rect(40, y, 515, rowHeight).fill(bg);
        doc.rect(40, y, 515, rowHeight).strokeColor(BORDER_COLOR).lineWidth(0.5).stroke();

        const itemTitle = it.name || 'Jewellery Item';
        const itemSku = (companyConfig.showSku !== false && (it.sku || it.id)) ? `SKU: ${it.sku || it.id.slice(0, 8)}` : '';
        const hsnText = companyConfig.showHsn ? `HSN: ${it.hsn || companyConfig.hsnCode || '7113'}` : '';
        const tags = [itemSku, hsnText].filter(Boolean).join('  |  ');
        const displayDesc = tags ? `${itemTitle} (${tags})` : itemTitle;

        doc.fillColor(DARK).font('Helvetica').fontSize(8.5)
          .text(String(idx + 1), 48, y + 7, { width: 20, align: 'left' })
          .text(displayDesc, 75, y + 7, { width: 240, ellipsis: true })
          .text(String(it.qty || 1), 320, y + 7, { width: 45, align: 'center' })
          .text(inr(it.price || 0), 370, y + 7, { width: 85, align: 'right' })
          .font('Helvetica-Bold').text(inr((it.price || 0) * (it.qty || 1)), 460, y + 7, { width: 85, align: 'right' });

        y += rowHeight;
      });

      y += 15;

      // Check page break before summary
      if (y > 660) {
        doc.addPage();
        y = 40;
      }

      // ============ 4. FINANCIAL SUMMARY BREAKDOWN ============
      const amts = order.amounts || {};
      const subtotal = amts.subtotal || items.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0);
      const discount = amts.discount || 0;
      const shipping = amts.shipping || 0;
      const tax = amts.tax || 0;
      const cgst = Math.round(tax / 2);
      const sgst = tax - cgst;
      const giftWrap = amts.giftWrap || 0;
      const grandTotal = amts.total || Math.max(0, subtotal - discount + shipping + tax + giftWrap);
      const paidAmount = (paymentStatus === 'PAID' || order.payment === 'razorpay') ? grandTotal : 0;
      const balanceDue = Math.max(0, grandTotal - paidAmount);

      const summaryStartX = 310;
      const summaryWidth = 245;
      const summaryTopY = y;

      // Summary Header Box
      doc.rect(summaryStartX, y, summaryWidth, 18).fill('#F4F4F5');
      doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8).text('PAYMENT & FINANCIAL SUMMARY', summaryStartX + 10, y + 5);
      y += 24;

      const renderSummaryRow = (label, valStr, isBold = false, isGold = false) => {
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
          .fillColor(isBold ? DARK : MUTED)
          .text(label, summaryStartX + 10, y, { width: 130, align: 'left' })
          .fillColor(isGold ? GOLD : (isBold ? DARK : MUTED))
          .text(valStr, summaryStartX + 140, y, { width: 95, align: 'right' });
        y += 15;
      };

      renderSummaryRow('Subtotal', inr(subtotal));
      if (discount > 0) renderSummaryRow('Discount', `- ${inr(discount)}`);
      renderSummaryRow('Shipping Charges', shipping === 0 ? 'FREE' : inr(shipping));
      if (cgst > 0) renderSummaryRow('CGST (1.5%)', inr(cgst));
      if (sgst > 0) renderSummaryRow('SGST (1.5%)', inr(sgst));
      if (tax > 0 && cgst === 0) renderSummaryRow('GST (3%)', inr(tax));
      if (giftWrap > 0) renderSummaryRow('Gift Wrap Charge', inr(giftWrap));

      doc.moveTo(summaryStartX + 10, y).lineTo(summaryStartX + 235, y).lineWidth(0.8).strokeColor(GOLD).stroke();
      y += 6;

      renderSummaryRow('Grand Total', inr(grandTotal), true, true);
      renderSummaryRow('Payment Method', paymentMethod);
      renderSummaryRow('Amount Paid', inr(paidAmount), true);

      if (balanceDue > 0) {
        renderSummaryRow('Balance Due', inr(balanceDue), true);
      }

      // Optional left side column opposite financial summary
      let leftY = summaryTopY;
      const bInfo = companyConfig.bankDetails;
      if (companyConfig.showBankDetails !== false && bInfo && (bInfo.bankName || bInfo.accountNumber)) {
        doc.rect(40, leftY, 245, 18).fill('#F4F4F5');
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8).text('BANK PAYMENT / WIRE DETAILS', 50, leftY + 5);
        leftY += 24;
        if (bInfo.bankName) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('Bank Name: ', 50, leftY, { width: 80 })
             .font('Helvetica').fillColor(DARK).text(bInfo.bankName, 130, leftY, { width: 145 });
          leftY += 12;
        }
        if (bInfo.accountName || bInfo.beneficiaryName) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('Beneficiary: ', 50, leftY, { width: 80 })
             .font('Helvetica').fillColor(DARK).text(bInfo.accountName || bInfo.beneficiaryName, 130, leftY, { width: 145 });
          leftY += 12;
        }
        if (bInfo.accountNumber) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('Account No: ', 50, leftY, { width: 80 })
             .font('Helvetica').fillColor(DARK).text(bInfo.accountNumber, 130, leftY, { width: 145 });
          leftY += 12;
        }
        if (bInfo.ifsc) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('IFSC Code: ', 50, leftY, { width: 80 })
             .font('Helvetica').fillColor(DARK).text(bInfo.ifsc, 130, leftY, { width: 145 });
          leftY += 12;
        }
        if (bInfo.branch) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('Branch: ', 50, leftY, { width: 80 })
             .font('Helvetica').fillColor(DARK).text(bInfo.branch, 130, leftY, { width: 145 });
          leftY += 12;
        }
        if (bInfo.accountType) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('Account Type: ', 50, leftY, { width: 80 })
             .font('Helvetica').fillColor(DARK).text(bInfo.accountType, 130, leftY, { width: 145 });
          leftY += 12;
        }
        if (bInfo.upiId) {
          doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('UPI ID: ', 50, leftY, { width: 80 })
             .font('Helvetica').fillColor(DARK).text(bInfo.upiId, 130, leftY, { width: 145 });
          leftY += 12;
        }
        leftY += 6;
      }

      if (companyConfig.notes) {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(GOLD).text('Note: ', 40, leftY, { width: 35 });
        const noteH = doc.heightOfString(companyConfig.notes, { width: 200, lineGap: 1 });
        doc.font('Helvetica').fontSize(7.5).fillColor(MUTED).text(companyConfig.notes, 75, leftY, { width: 200, lineGap: 1 });
        leftY += noteH + 8;
      }

      if (companyConfig.showSignatory !== false && (companyConfig.authorizedSignatory || companyConfig.signatoryCompany)) {
        const signY = Math.max(leftY + 10, y - 25);
        const signatoryEntity = companyConfig.signatoryCompany || ('For ' + (companyConfig.name || 'MikuMantra Fine Jewellery'));
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(DARK).text(signatoryEntity.startsWith('For ') ? signatoryEntity : ('For ' + signatoryEntity), 40, signY);
        if (companyConfig.authorizedSignatory) {
          doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(companyConfig.authorizedSignatory, 40, signY + 10);
        }
        leftY = signY + 22;
      }

      y = Math.max(y, leftY) + 20;

      // ============ 5. TERMS & FOOTER ============
      let footerY = Math.max(y + 20, 735);
      if (footerY > 770) {
        doc.addPage();
        footerY = 740;
      }

      if (companyConfig.showTerms !== false) {
        doc.moveTo(40, footerY).lineTo(555, footerY).lineWidth(0.5).strokeColor('#E0E0E0').stroke();
        footerY += 8;

        const termsText = companyConfig.invoiceTerms || 'All jewellery items are BIS Hallmarked and SGL/GIA certified. Returns accepted within 15 days.';
        doc.font('Helvetica').fontSize(7.5).fillColor(MUTED);
        const termsH = doc.heightOfString(`Terms & Conditions: ${termsText}`, { width: 515, align: 'center', lineGap: 1.5 });
        doc.text(`Terms & Conditions: ${termsText}`, 40, footerY, { width: 515, align: 'center', lineGap: 1.5 });
        footerY += termsH + 4;
      }

      const regFooter = [
        companyConfig.name || 'MikuMantra Fine Jewellery',
        companyConfig.registeredAddress || companyConfig.address,
        companyConfig.email ? `Support: ${companyConfig.email}` : '',
        companyConfig.phone ? `Phone: ${companyConfig.phone}` : ''
      ].filter(Boolean).join('  ·  ');

      if (regFooter) {
        doc.fillColor(GOLD).fontSize(7).text(regFooter, 40, footerY, { width: 515, align: 'center' });
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function inr(n) {
  const num = Number(n || 0);
  return 'INR ' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

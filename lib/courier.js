/**
 * Courier partner configurations and tracking URL generators for Indian & international logistics.
 */

export const POPULAR_COURIERS = [
  {
    id: 'bluedart',
    name: 'Blue Dart',
    urlTemplate: 'https://www.bluedart.com/tracking?trackNumber={AWB}',
    placeholder: 'e.g. 12345678901'
  },
  {
    id: 'delhivery',
    name: 'Delhivery',
    urlTemplate: 'https://www.delhivery.com/track/package/{AWB}',
    placeholder: 'e.g. 1490211029348'
  },
  {
    id: 'dtdc',
    name: 'DTDC',
    urlTemplate: 'https://www.dtdc.in/tracking/shipment-tracking.asp?awb={AWB}',
    placeholder: 'e.g. D12345678'
  },
  {
    id: 'indiapost',
    name: 'India Post (Speed Post)',
    urlTemplate: 'https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx',
    placeholder: 'e.g. EM123456789IN'
  },
  {
    id: 'shiprocket',
    name: 'Shiprocket',
    urlTemplate: 'https://shiprocket.co/tracking/{AWB}',
    placeholder: 'e.g. SR123456789'
  },
  {
    id: 'fedex',
    name: 'FedEx',
    urlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={AWB}',
    placeholder: 'e.g. 789012345678'
  },
  {
    id: 'ekart',
    name: 'Ekart Logistics',
    urlTemplate: 'https://ekartlogistics.com/shipmenttrack/{AWB}',
    placeholder: 'e.g. FMPC123456789'
  },
  {
    id: 'other',
    name: 'Other Courier',
    urlTemplate: '',
    placeholder: 'AWB / Tracking Number'
  }
];

/**
 * Returns tracking URL for a given carrier and tracking number.
 * If trackingUrl is already provided, it returns that.
 */
export function getTrackingUrl(carrierName = '', trackingNumber = '', customUrl = '') {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim()) {
    return customUrl.trim();
  }
  const cleanAwb = (trackingNumber || '').trim();
  if (!cleanAwb) return '';

  const cleanCarrier = (carrierName || '').trim().toLowerCase();
  const matched = POPULAR_COURIERS.find(c => 
    c.name.toLowerCase() === cleanCarrier ||
    c.id === cleanCarrier ||
    cleanCarrier.includes(c.id) ||
    c.name.toLowerCase().includes(cleanCarrier)
  );

  if (matched && matched.urlTemplate) {
    return matched.urlTemplate.replace('{AWB}', encodeURIComponent(cleanAwb));
  }

  return '';
}

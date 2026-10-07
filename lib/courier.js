/**
 * Courier Tracking Presets & Tracking URL Generator for MikuMantra Fine Jewellery
 */

export const COURIER_PRESETS = [
  { 
    name: 'Blue Dart', 
    template: 'https://www.bluedart.com/tracking?trackNumber={AWB}' 
  },
  { 
    name: 'Delhivery', 
    template: 'https://www.delhivery.com/track/package/{AWB}' 
  },
  { 
    name: 'DTDC', 
    template: 'https://www.dtdc.in/tracking/shipment-tracking.asp?awb={AWB}' 
  },
  { 
    name: 'India Post (Speed Post)', 
    template: 'https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx' 
  },
  { 
    name: 'Shiprocket', 
    template: 'https://shiprocket.co/tracking/{AWB}' 
  },
  { 
    name: 'FedEx', 
    template: 'https://www.fedex.com/fedextrack/?trknbr={AWB}' 
  },
  { 
    name: 'Ekart Logistics', 
    template: 'https://ekartlogistics.com/shipmenttrack/{AWB}' 
  },
  { 
    name: 'Custom / Other', 
    template: '' 
  }
];

/**
 * Returns preset courier by name or case-insensitive match
 */
export function getCourierPreset(carrierName) {
  if (!carrierName) return null;
  const lower = carrierName.trim().toLowerCase();
  return COURIER_PRESETS.find(p => p.name.toLowerCase() === lower) || null;
}

/**
 * Generates tracking portal URL from carrier name and AWB number
 */
export function generateTrackingUrl(carrierName, awb) {
  if (!carrierName) return '';
  const cleanAwb = (awb || '').trim();
  const preset = getCourierPreset(carrierName);
  
  if (preset && preset.template) {
    if (preset.template.includes('{AWB}')) {
      return cleanAwb ? preset.template.replace('{AWB}', encodeURIComponent(cleanAwb)) : '';
    }
    return preset.template;
  }
  return '';
}

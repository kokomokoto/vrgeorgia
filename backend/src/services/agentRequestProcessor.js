/**
 * ავტომატური ობიექტების ძებნა გამორთულია.
 * მოთხოვნებს ადამიანი-მაძებარი ამუშავებს (პასუხები / კომენტარები).
 */

export function parseAgentPrompt() {
  return {
    rooms: null,
    district: '',
    city: '',
    propertyType: '',
    dealType: '',
    keywords: [],
  };
}

export async function processAgentRequest() {
  return null;
}

export function scheduleAgentRequestProcessing() {
  /* no-op — ადამიანი-მაძებარი */
}

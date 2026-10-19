import { getBotConnection } from '../db/botConnection.js';

let AgentRequestPrefsModel = null;

export async function getAgentRequestPrefsModel() {
  if (AgentRequestPrefsModel) return AgentRequestPrefsModel;
  const conn = await getBotConnection();
  if (conn.models.AgentRequestPrefs) {
    AgentRequestPrefsModel = conn.models.AgentRequestPrefs;
    return AgentRequestPrefsModel;
  }

  const schema = new conn.base.Schema(
    {
      agentUserId: { type: String, required: true, unique: true, index: true },
      /** ორი სასურველი დრო (HH:mm) ინფორმაციის მისაღებად */
      notifyTime1: { type: String, default: '' },
      notifyTime2: { type: String, default: '' },
      contacts: {
        whatsapp: { type: String, default: '' },
        facebook: { type: String, default: '' },
        viber: { type: String, default: '' },
        telegram: { type: String, default: '' },
        other: { type: String, default: '' },
      },
      /** აგენტის მოთხოვნების მიმდინარე ნომერი */
      nextRequestNumber: { type: Number, default: 1 },
    },
    { timestamps: true, collection: 'agent_request_prefs' }
  );

  AgentRequestPrefsModel = conn.model('AgentRequestPrefs', schema);
  return AgentRequestPrefsModel;
}

export function serializePrefs(doc) {
  const o = typeof doc?.toObject === 'function' ? doc.toObject() : doc || {};
  return {
    notifyTime1: o.notifyTime1 || '',
    notifyTime2: o.notifyTime2 || '',
    contacts: {
      whatsapp: o.contacts?.whatsapp || '',
      facebook: o.contacts?.facebook || '',
      viber: o.contacts?.viber || '',
      telegram: o.contacts?.telegram || '',
      other: o.contacts?.other || '',
    },
  };
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

export function normalizeTimeInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const m = raw.match(TIME_RE);
  if (!m) return null;
  return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
}

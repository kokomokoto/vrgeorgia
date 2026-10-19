import { getBotConnection } from '../db/botConnection.js';

const resultItemSchema = {
  propertyId: { type: String, default: null },
  numericId: { type: Number, default: null },
  title: { type: String, default: '' },
  summary: { type: String, default: '' },
  city: { type: String, default: '' },
  district: { type: String, default: '' },
  rooms: { type: Number, default: null },
  price: { type: Number, default: null },
  priceCurrency: { type: String, default: 'USD' },
  dealType: { type: String, default: '' },
  type: { type: String, default: '' },
  photo: { type: String, default: '' },
  source: { type: String, default: 'vhome' },
  sourceUrl: { type: String, default: '' },
};

const commentSchema = {
  authorUserId: { type: String, default: '' },
  authorName: { type: String, default: '' },
  authorRole: { type: String, default: '' },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
  /** მაძებარმა მონიშნა — ობიექტი უკვე გაყიდულია / ბაზაში აღარ ჩანს */
  sold: { type: Boolean, default: false },
  soldAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
};

let AgentRequestModel = null;

function schemaNeedsRefresh(model) {
  try {
    const hasSoldOnComment = Boolean(
      model?.schema?.path('comments')?.schema?.path('sold')
    );
    const hasPublic = Boolean(model?.schema?.path('isPublic'));
    return !hasSoldOnComment || !hasPublic;
  } catch {
    return true;
  }
}

export async function getAgentRequestModel() {
  const conn = await getBotConnection();
  if (conn.models.AgentRequest) {
    const existing = conn.models.AgentRequest;
    // schema განახლებისას (comment.sold / isPublic) ძველი cache გავასუფთაოთ
    if (schemaNeedsRefresh(existing)) {
      delete conn.models.AgentRequest;
      if (conn.base?.models?.AgentRequest) delete conn.base.models.AgentRequest;
      AgentRequestModel = null;
    } else {
      AgentRequestModel = existing;
      return AgentRequestModel;
    }
  }
  if (AgentRequestModel) return AgentRequestModel;

  const schema = new conn.base.Schema(
    {
      agentUserId: { type: String, required: true, index: true },
      agentName: { type: String, default: '' },
      agentEmail: { type: String, default: '' },
      prompt: { type: String, required: true, trim: true, maxlength: 4000 },
      requestNumber: { type: Number, default: null, index: true },
      status: {
        type: String,
        enum: ['pending', 'processing', 'done', 'failed', 'sold'],
        default: 'pending',
        index: true,
      },
      /** აგენტმა დაპაუზა — ახალი ძებნა/შეტყობინება არ მიდის */
      paused: { type: Boolean, default: false, index: true },
      /** საჯარო — სხვა აგენტებსაც ჩანს; ნაგულისხმევი პირადია */
      isPublic: { type: Boolean, default: false, index: true },
      /** მაძებარმა მონიშნა გაყიდულად */
      sold: { type: Boolean, default: false, index: true },
      soldAt: { type: Date, default: null },
      soldByUserId: { type: String, default: '' },
      parsedFilters: {
        rooms: { type: Number, default: null },
        district: { type: String, default: '' },
        city: { type: String, default: '' },
        propertyType: { type: String, default: '' },
        dealType: { type: String, default: '' },
        keywords: [{ type: String }],
      },
      results: [resultItemSchema],
      resultCount: { type: Number, default: 0 },
      comments: [commentSchema],
      botMessage: { type: String, default: '' },
      errorMessage: { type: String, default: '' },
      /** აგენტმა გახსნა/წაიკითხა თუ არა პასუხი */
      agentNotifiedAt: { type: Date, default: null },
      agentReadAt: { type: Date, default: null },
      processedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'agent_requests' }
  );

  schema.index({ agentUserId: 1, createdAt: -1 });
  schema.index({ status: 1, createdAt: 1 });
  schema.index({ isPublic: 1, createdAt: -1 });

  AgentRequestModel = conn.model('AgentRequest', schema);
  return AgentRequestModel;
}

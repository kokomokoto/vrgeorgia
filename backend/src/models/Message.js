import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  // მესიჯის ტიპი - განცხადებაზე ან პირდაპირ
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    default: null
  },
  // გამგზავნი და მიმღები
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // მესიჯის შინაარსი
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  // წაკითხვის სტატუსი
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// ინდექსები სწრაფი ძიებისთვის
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });
messageSchema.index({ property: 1 });

export default mongoose.model('Message', messageSchema);

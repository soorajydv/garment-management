import { Schema, model } from 'mongoose';
import { PAYMENT_METHODS } from '../lib/constants';

const paymentSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    reference: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    receivedAt: { type: Date, default: Date.now },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export const Payment = model('Payment', paymentSchema);

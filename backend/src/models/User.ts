import { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';
import { ROLES } from '../lib/constants';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    /** Set only for customer accounts: the customer record they may access. */
    customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    phone: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const User = model('User', userSchema);

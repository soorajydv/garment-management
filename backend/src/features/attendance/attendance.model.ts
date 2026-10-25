import { Schema, model } from 'mongoose';

export const ATTENDANCE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

const attendanceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    checkInAt: { type: Date, required: true, default: Date.now },
    checkOutAt: { type: Date, default: null },
    status: { type: String, enum: ATTENDANCE_STATUSES, required: true, default: 'pending', index: true },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rejectionReason: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

attendanceSchema.index({ user: 1, checkInAt: -1 });

export const Attendance = model('Attendance', attendanceSchema);

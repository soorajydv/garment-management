import { Types } from 'mongoose';
import { audit } from '../../lib/audit';
import { badRequest, conflict, escapeRegex, notFound, pagination } from '../../lib/http';
import { User } from '../../models/user.model';
import type { AuthUser } from '../../middleware/auth';
import { Attendance, type AttendanceStatus } from './attendance.model';

function toDto(record: Record<string, any>) {
  const user = record.user && typeof record.user === 'object' ? record.user : null;
  const approver = record.approvedBy && typeof record.approvedBy === 'object' ? record.approvedBy : null;
  return {
    id: String(record._id),
    user: {
      id: String(user?._id ?? record.user),
      name: user?.name ?? 'Unknown user',
      email: user?.email ?? '',
      role: user?.role ?? '',
    },
    checkInAt: record.checkInAt,
    checkOutAt: record.checkOutAt,
    status: record.status as AttendanceStatus,
    approvedAt: record.approvedAt,
    approvedBy: approver ? { id: String(approver._id), name: approver.name } : null,
    rejectionReason: record.rejectionReason ?? '',
    createdAt: record.createdAt,
  };
}

export async function listAttendance(user: AuthUser, query: Record<string, unknown>) {
  const canReviewAll = user.permissions.includes('attendance.approve');
  const { page, limit, skip } = pagination(query, canReviewAll ? 50 : 30);
  const q = query as Record<string, string | undefined>;
  const filter: Record<string, unknown> = canReviewAll ? {} : { user: user.id };
  if (q.status && ['pending', 'approved', 'rejected'].includes(q.status)) filter.status = q.status;
  if (q.search?.trim() && canReviewAll) {
    const rx = { $regex: escapeRegex(q.search.trim()), $options: 'i' };
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] }).select('_id').limit(200).lean();
    filter.user = { $in: users.map((item) => item._id) };
  }
  const [records, total] = await Promise.all([
    Attendance.find(filter).populate('user', 'name email role').populate('approvedBy', 'name').sort({ checkInAt: -1 }).skip(skip).limit(limit).lean(),
    Attendance.countDocuments(filter),
  ]);
  return { records: records.map(toDto), total, page, limit };
}

export async function checkIn(user: AuthUser) {
  const openRecord = await Attendance.exists({ user: user.id, checkOutAt: null, status: { $in: ['pending', 'approved'] } });
  if (openRecord) throw conflict('You already have an open attendance record');

  const record = await Attendance.create({ user: user.id, status: 'pending' });
  await audit(user, 'attendance.checkin_requested', 'Attendance', String(record._id), `${user.name} requested check-in approval`);
  const saved = await Attendance.findById(record._id).populate('user', 'name email role').lean();
  return toDto(saved!);
}

export async function checkOut(user: AuthUser) {
  const record = await Attendance.findOne({ user: user.id, status: 'approved', checkOutAt: null }).sort({ checkInAt: -1 });
  if (!record) {
    const pending = await Attendance.exists({ user: user.id, status: 'pending', checkOutAt: null });
    if (pending) throw badRequest('Your check-in is waiting for admin approval');
    throw badRequest('You do not have an approved check-in to check out from');
  }
  record.checkOutAt = new Date();
  await record.save();
  await audit(user, 'attendance.checkout', 'Attendance', String(record._id), `${user.name} checked out`);
  const saved = await Attendance.findById(record._id).populate('user', 'name email role').populate('approvedBy', 'name').lean();
  return toDto(saved!);
}

export async function approveCheckIn(admin: AuthUser, id: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Attendance record not found');
  const record = await Attendance.findById(id);
  if (!record) throw notFound('Attendance record not found');
  if (record.status !== 'pending') throw badRequest('Only pending check-ins can be approved');
  record.status = 'approved';
  record.approvedAt = new Date();
  record.approvedBy = new Types.ObjectId(admin.id);
  record.rejectionReason = '';
  await record.save();
  const employee = await User.findById(record.user).select('name').lean();
  await audit(admin, 'attendance.checkin_approved', 'Attendance', id, `Approved check-in for ${employee?.name ?? 'user'}`);
  const saved = await Attendance.findById(id).populate('user', 'name email role').populate('approvedBy', 'name').lean();
  return toDto(saved!);
}

export async function rejectCheckIn(admin: AuthUser, id: string, reason: string) {
  if (!Types.ObjectId.isValid(id)) throw notFound('Attendance record not found');
  const record = await Attendance.findById(id);
  if (!record) throw notFound('Attendance record not found');
  if (record.status !== 'pending') throw badRequest('Only pending check-ins can be rejected');
  record.status = 'rejected';
  record.rejectionReason = reason;
  await record.save();
  const employee = await User.findById(record.user).select('name').lean();
  await audit(admin, 'attendance.checkin_rejected', 'Attendance', id, `Rejected check-in for ${employee?.name ?? 'user'}`);
  const saved = await Attendance.findById(id).populate('user', 'name email role').populate('approvedBy', 'name').lean();
  return toDto(saved!);
}

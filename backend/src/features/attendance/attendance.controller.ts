import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth';
import { parse } from '../../lib/http';
import { approveCheckIn, checkIn, checkOut, listAttendance, rejectCheckIn } from './attendance.service';
import { rejectionSchema } from './attendance.validation';

export async function listAttendanceController(req: Request, res: Response) {
  const result = await listAttendance(currentUser(req), req.query as Record<string, unknown>);
  res.json({ attendance: result.records, total: result.total, page: result.page, limit: result.limit });
}

export async function checkInController(req: Request, res: Response) {
  res.status(201).json({ attendance: await checkIn(currentUser(req)) });
}

export async function checkOutController(req: Request, res: Response) {
  res.json({ attendance: await checkOut(currentUser(req)) });
}

export async function approveCheckInController(req: Request, res: Response) {
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  res.json({ attendance: await approveCheckIn(currentUser(req), id) });
}

export async function rejectCheckInController(req: Request, res: Response) {
  const { reason } = parse(rejectionSchema, req.body);
  const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  res.json({ attendance: await rejectCheckIn(currentUser(req), id, reason) });
}

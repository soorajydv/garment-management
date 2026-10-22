export const ROLES = ['owner', 'design', 'printing', 'stitching', 'finishing', 'accounts', 'customer'] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES: Role[] = ROLES.filter((r) => r !== 'customer');

/** Roles allowed to see prices, payments and invoices (customers see only their own). */
export const FINANCE_ROLES: Role[] = ['owner', 'accounts', 'customer'];

export const STAGES = ['design', 'printing', 'stitching', 'finishing', 'ready', 'delivered'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  design: 'Design & confirmation',
  printing: 'Printing',
  stitching: 'Stitching',
  finishing: 'Finishing',
  ready: 'Ready to dispatch',
  delivered: 'Delivered',
};

/** The department that is allowed to complete each stage (owner can always act). */
export const STAGE_DEPARTMENT: Partial<Record<Stage, Role>> = {
  design: 'design',
  printing: 'printing',
  stitching: 'stitching',
  finishing: 'finishing',
};

/** Production roles only see the queues they work on. */
export const ROLE_STAGES: Partial<Record<Role, Stage[]>> = {
  design: ['design'],
  printing: ['printing'],
  stitching: ['stitching'],
  finishing: ['finishing', 'ready'],
};

export const PRODUCT_CONFIGS = [
  'Front sublimation jersey with plain shorts',
  'Front + back sublimation jersey with plain shorts',
  'Full sublimation jersey with plain shorts',
  'Full sublimation jersey and full sublimation shorts',
  'Front sublimation jersey with plain trouser',
  'Front + back sublimation jersey with plain trouser',
  'Full sublimation jersey with plain trouser',
  'Full sublimation jersey and full sublimation trouser',
  'Jersey only — front sublimation',
  'Jersey only — front + back sublimation',
  'Jersey only — full sublimation',
] as const;

export const NECK_TYPES = ['Round neck', 'V neck', 'Polo neck', 'IPL neck', 'Band neck'] as const;
export const SLEEVES = ['Half sleeve', 'Full sleeve'] as const;
export const SIZES = ['', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'] as const;
export const PAYMENT_METHODS = ['Cash', 'Bank transfer', 'Cheque', 'eSewa', 'Khalti', 'Fonepay', 'Other'] as const;
export const DELIVERY_METHODS = ['Customer pickup', 'Own vehicle', 'Courier', 'Bus cargo', 'Other'] as const;

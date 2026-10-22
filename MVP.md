# S & S Textiles Factory OS: MVP

## MVP goal

> **Run every sportswear kit order from first request to delivery in one system: one order record, a customer artwork-approval gate before printing, each department moving only its own jobs, payments tracked against the order, and every critical action audited.**

The MVP replaces the prototype's in-memory sample data with a real backend. Every rule the prototype only showed in the browser (approval gate, department queues, owner-only dispatch, customer isolation) is now **enforced by the API**.

## In scope (built)

| Area | What's included |
|---|---|
| **Auth & roles** | Email/password login, httpOnly JWT cookie, 7 roles (owner, design, printing, stitching, finishing, accounts, customer), login rate limiting, change password, deactivation takes effect immediately |
| **Orders** | Server-generated order numbers (`SS-26125…`), 11 product configurations, neck type, shorts colour, quantity, delivery date, unit rate → total, advance payment at registration, comments, jersey image and reference file uploads, player roster (name, number, sleeve, jersey/shorts/trouser size) with spreadsheet paste, size summary |
| **Artwork approval** | Versioned artwork uploads (design/owner), customer approves or requests changes, owner can record approval on the customer's behalf (flagged in the audit log), uploading a new version resets approval |
| **Production workflow** | Stages: Design → Printing → Stitching → Finishing → Ready → Delivered. **Design cannot advance without approval of the latest artwork.** Each department completes only its own stage. Owner can send a job back for rework with a reason. Full stage history |
| **Production board** | Kanban per stage, filtered to the signed-in department's queue |
| **Customers** | Directory with contact details, PAN, order count, value, paid, outstanding, order history |
| **Billing** | Payment ledger (cash, bank, cheque, eSewa, Khalti, Fonepay…), overpayment guard, sequential server-side invoice numbers (`INV-2026-0001`), printable quotation/invoice (print → PDF) |
| **Delivery** | Owner-only dispatch confirmation with packed quantity (short/over), recipient, method, tracking ref; on-time tracking |
| **Inventory** | Materials with SKU, category, unit, reorder level; stock in / issue (optionally against an order) / owner count adjustments; negative stock prevented; movement history; low-stock alerts |
| **Dashboard** | Role-aware KPIs, workload by stage, approvals and due-soon follow-ups, recent activity |
| **Reports** | Monthly order value vs collections, orders by stage, receivables by customer, on-time delivery %, lead time, product mix, CSV export |
| **Admin** | User management (create, role, link customer login, deactivate, reset password), business settings (name, PAN, prefixes, due-soon window, invoice footer), audit log viewer |
| **Customer portal** | Customers see only their own orders, place new orders (priced later by staff), approve artwork / request changes, see balances and invoices |

## Acceptance checks (verified)

All of these pass against the running API (`backend` smoke test plus a browser-path test through the Next.js proxy):

- Customer sees only their own orders, dashboard and payments; staff-only endpoints return 403
- Production roles see only their queue and **never see prices**
- Advancing from Design without approved artwork is refused (409)
- Printing team cannot upload artwork or act on stitching jobs
- Customer request-changes → status *Changes requested*; approval → *Design approved*
- Only owner can confirm delivery; accounts cannot
- Payment greater than outstanding balance is refused
- Invoice numbers are sequential and server-generated
- Stock issue larger than on-hand is refused
- Customer-placed orders are forced to the customer's own account and ignore any price sent
- Private files are only served to users who can see the order; SVGs and unknown types download instead of rendering
- 3 MB artwork upload works through the Next.js proxy

## Deliberately out of MVP (next features)

Ordered roughly by business value:

1. **Notifications**: SMS/WhatsApp/email to customers when artwork is ready for approval and when an order is dispatched
2. **Edit roster & spec after creation** (currently: price, due date, team name and comments are editable; spec is fixed after creation)
3. **Material requirements**: fabric consumption per size, wastage %, reserve stock on order confirmation, purchase requests/suppliers
4. **Tax/VAT on invoices**, discounts, credit notes, Nepal IRD-compliant invoice format (confirm with accountant)
5. **Per-player progress** (printed/stitched counts per stage), QC defect log and rework reasons by department
6. **Worker assignment & piece-rate payroll** for stitching operators
7. **MFA for owner/accounts**, password reset by email, session list/revoke
8. **Cloud file storage** (S3/R2) instead of local disk, image thumbnails
9. **Nepali date (BS) support**, Nepali language UI
10. Automated test suite in CI, Docker compose, backups with restore testing

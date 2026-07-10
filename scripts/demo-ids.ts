/**
 * Fixed demo identity constants — the single source of truth for auth UUIDs.
 *
 * supabase/migrations/0005_reset_demo.sql hardcodes these same UUIDs for
 * `profiles` rows; change them in both places or not at all.
 */

export const DEMO_COMPANY_ID = 'c0000000-0000-4000-8000-000000000001';

/** One shared password for every demo account (documented in the phase report). */
export const DEMO_PASSWORD = 'RosterBayDemo1!';

export type DemoRole = 'admin' | 'supervisor' | 'worker';

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  role: DemoRole;
  jobTitle: string;
}

export const DEMO_USERS: readonly DemoUser[] = [
  { id: '10000000-0000-4000-8000-000000000001', email: 'marcus@rosterbay.demo', fullName: 'Marcus Webb',        role: 'admin',      jobTitle: 'Operations Manager' },
  { id: '10000000-0000-4000-8000-000000000002', email: 'sofia@rosterbay.demo',  fullName: 'Sofia Marino',       role: 'supervisor', jobTitle: 'Site Supervisor' },
  { id: '20000000-0000-4000-8000-000000000001', email: 'liam@rosterbay.demo',   fullName: 'Liam Nguyen',        role: 'worker',     jobTitle: 'Security Guard' },
  { id: '20000000-0000-4000-8000-000000000002', email: 'priya@rosterbay.demo',  fullName: 'Priya Sharma',       role: 'worker',     jobTitle: 'Cleaner' },
  { id: '20000000-0000-4000-8000-000000000003', email: 'jack@rosterbay.demo',   fullName: "Jack O'Connell",     role: 'worker',     jobTitle: 'Cleaner' },
  { id: '20000000-0000-4000-8000-000000000004', email: 'fatima@rosterbay.demo', fullName: 'Fatima Hassan',      role: 'worker',     jobTitle: 'Cleaner' },
  { id: '20000000-0000-4000-8000-000000000005', email: 'ethan@rosterbay.demo',  fullName: 'Ethan Walker',       role: 'worker',     jobTitle: 'Security Guard' },
  { id: '20000000-0000-4000-8000-000000000006', email: 'mei@rosterbay.demo',    fullName: 'Mei Chen',           role: 'worker',     jobTitle: 'Cleaner' },
  { id: '20000000-0000-4000-8000-000000000007', email: 'noah@rosterbay.demo',   fullName: 'Noah Taylor',        role: 'worker',     jobTitle: 'Security Guard' },
  { id: '20000000-0000-4000-8000-000000000008', email: 'aisha@rosterbay.demo',  fullName: 'Aisha Okafor',       role: 'worker',     jobTitle: 'Cleaner' },
  { id: '20000000-0000-4000-8000-000000000009', email: 'dylan@rosterbay.demo',  fullName: 'Dylan Murphy',       role: 'worker',     jobTitle: 'Security Guard' },
  { id: '20000000-0000-4000-8000-000000000010', email: 'hannah@rosterbay.demo', fullName: 'Hannah Kim',         role: 'worker',     jobTitle: 'Cleaner' },
  { id: '20000000-0000-4000-8000-000000000011', email: 'marco@rosterbay.demo',  fullName: 'Marco Rossi',        role: 'worker',     jobTitle: 'Security Guard' },
  { id: '20000000-0000-4000-8000-000000000012', email: 'grace@rosterbay.demo',  fullName: 'Grace Papadopoulos', role: 'worker',     jobTitle: 'Cleaner' },
  { id: '20000000-0000-4000-8000-000000000013', email: 'raj@rosterbay.demo',    fullName: 'Raj Patel',          role: 'worker',     jobTitle: 'Cleaner' },
  { id: '20000000-0000-4000-8000-000000000014', email: 'sarah@rosterbay.demo',  fullName: 'Sarah Bennett',      role: 'worker',     jobTitle: 'Security Guard' },
] as const;

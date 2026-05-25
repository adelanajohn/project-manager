import { z } from 'zod';

export const CreateOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
});

export const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  logoUrl: z.string().url().optional().nullable(),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['tenant_admin', 'tenant_manager', 'tenant_member', 'tenant_viewer', 'tenant_guest']),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['tenant_admin', 'tenant_manager', 'tenant_member', 'tenant_viewer', 'tenant_guest']),
});

export type CreateOrgInput = z.infer<typeof CreateOrgSchema>;
export type UpdateOrgInput = z.infer<typeof UpdateOrgSchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

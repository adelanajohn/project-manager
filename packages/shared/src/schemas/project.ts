import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  identifier: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z]+$/, 'Identifier must be uppercase letters only'),
  type: z.enum(['scrum', 'kanban']).default('scrum'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366F1'),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  defaultAssigneeId: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'archived']).optional(),
});

export const CreateStatusSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  category: z.enum(['backlog', 'todo', 'in_progress', 'done', 'canceled']),
  position: z.number().int().min(0),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type CreateStatusInput = z.infer<typeof CreateStatusSchema>;

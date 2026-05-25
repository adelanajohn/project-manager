import { z } from 'zod';

export const CreateSprintSchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.string().max(500).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const UpdateSprintSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export const CompleteSprintSchema = z.object({
  incompleteIssueAction: z.enum(['backlog', 'next_sprint']),
  nextSprintId: z.string().uuid().optional(),
});

export type CreateSprintInput = z.infer<typeof CreateSprintSchema>;
export type UpdateSprintInput = z.infer<typeof UpdateSprintSchema>;
export type CompleteSprintInput = z.infer<typeof CompleteSprintSchema>;

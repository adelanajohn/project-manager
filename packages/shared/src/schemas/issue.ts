import { z } from 'zod';

export const CreateIssueSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.any().optional(),
  type: z.enum(['epic', 'story', 'task', 'bug', 'subtask']).default('task'),
  statusId: z.string().uuid().optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).default('medium'),
  assigneeId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sprintId: z.string().uuid().optional().nullable(),
  milestoneId: z.string().uuid().optional().nullable(),
  epicId: z.string().uuid().optional().nullable(),
  estimate: z.number().positive().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  templateId: z.string().uuid().optional(),
});

export const UpdateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.any().optional(),
  type: z.enum(['epic', 'story', 'task', 'bug', 'subtask']).optional(),
  statusId: z.string().uuid().optional().nullable(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sprintId: z.string().uuid().optional().nullable(),
  milestoneId: z.string().uuid().optional().nullable(),
  epicId: z.string().uuid().optional().nullable(),
  estimate: z.number().positive().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  deletedAt: z.string().datetime().optional().nullable(),
});

export const UpdateIssueRankSchema = z.object({
  rank: z.number(),
  statusId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional().nullable(),
});

export const CreateCommentSchema = z.object({
  body: z.any(),
  parentId: z.string().uuid().optional().nullable(),
});

export const BulkUpdateIssuesSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1),
  assigneeId: z.string().uuid().optional().nullable(),
  statusId: z.string().uuid().optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low', 'none']).optional(),
  sprintId: z.string().uuid().optional().nullable(),
  labelIds: z.array(z.string().uuid()).optional(),
});

export type CreateIssueInput = z.infer<typeof CreateIssueSchema>;
export type UpdateIssueInput = z.infer<typeof UpdateIssueSchema>;
export type UpdateIssueRankInput = z.infer<typeof UpdateIssueRankSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type BulkUpdateIssuesInput = z.infer<typeof BulkUpdateIssuesSchema>;

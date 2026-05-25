import { PrismaClient, PlatformRole, TenantRole, IssueType, IssuePriority, SprintStatus, StatusCategory, OrgPlan } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create platform admin
  const platformAdminPassword = await bcrypt.hash('Password123!', 12);
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'admin@platform.dev' },
    update: {},
    create: {
      email: 'admin@platform.dev',
      passwordHash: platformAdminPassword,
      fullName: 'Platform Admin',
      platformRole: PlatformRole.platform_admin,
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Platform admin created:', platformAdmin.email);

  // Create demo tenant admin
  const demoAdminPassword = await bcrypt.hash('Password123!', 12);
  const demoAdmin = await prisma.user.upsert({
    where: { email: 'demo@acme.dev' },
    update: {},
    create: {
      email: 'demo@acme.dev',
      passwordHash: demoAdminPassword,
      fullName: 'Demo Admin',
      emailVerifiedAt: new Date(),
    },
  });

  // Create demo team member
  const memberPassword = await bcrypt.hash('Password123!', 12);
  const demoMember = await prisma.user.upsert({
    where: { email: 'member@acme.dev' },
    update: {},
    create: {
      email: 'member@acme.dev',
      passwordHash: memberPassword,
      fullName: 'Jane Developer',
      emailVerifiedAt: new Date(),
    },
  });

  console.log('✅ Demo users created');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme',
      plan: OrgPlan.pro,
    },
  });

  // Add members to org
  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: demoAdmin.id } },
    update: {},
    create: { orgId: org.id, userId: demoAdmin.id, role: TenantRole.tenant_admin },
  });
  await prisma.orgMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: demoMember.id } },
    update: {},
    create: { orgId: org.id, userId: demoMember.id, role: TenantRole.tenant_member },
  });

  // Create subscription
  await prisma.subscription.upsert({
    where: { orgId: org.id },
    update: {},
    create: {
      orgId: org.id,
      plan: OrgPlan.pro,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      quantity: 2,
    },
  });

  console.log('✅ Organization and members created:', org.slug);

  // Create project
  const project = await prisma.project.upsert({
    where: { orgId_identifier: { orgId: org.id, identifier: 'ENG' } },
    update: {},
    create: {
      orgId: org.id,
      name: 'Engineering',
      description: 'Main engineering project',
      identifier: 'ENG',
      type: 'scrum',
      color: '#6366F1',
    },
  });

  // Create default statuses
  const statusData = [
    { name: 'Backlog', color: '#64748B', category: StatusCategory.backlog, position: 0 },
    { name: 'Todo', color: '#6366F1', category: StatusCategory.todo, position: 1 },
    { name: 'In Progress', color: '#06B6D4', category: StatusCategory.in_progress, position: 2 },
    { name: 'In Review', color: '#8B5CF6', category: StatusCategory.in_progress, position: 3 },
    { name: 'Done', color: '#10B981', category: StatusCategory.done, position: 4 },
    { name: 'Canceled', color: '#EF4444', category: StatusCategory.canceled, position: 5 },
  ];

  const statuses: Record<string, string> = {};
  for (const s of statusData) {
    const existing = await prisma.projectStatusConfig.findFirst({
      where: { projectId: project.id, name: s.name },
    });
    const status = existing || await prisma.projectStatusConfig.create({
      data: { projectId: project.id, ...s },
    });
    statuses[s.name] = status.id;
  }

  console.log('✅ Project statuses created');

  // Create labels
  const labelData = [
    { name: 'frontend', color: '#06B6D4' },
    { name: 'backend', color: '#6366F1' },
    { name: 'bug', color: '#F43F5E' },
    { name: 'feature', color: '#10B981' },
    { name: 'docs', color: '#F59E0B' },
  ];

  for (const l of labelData) {
    await prisma.label.upsert({
      where: { id: `label-${org.id}-${l.name}` },
      update: {},
      create: { id: `label-${org.id}-${l.name}`, orgId: org.id, projectId: project.id, ...l },
    });
  }

  // Create completed sprint
  const completedSprint = await prisma.sprint.create({
    data: {
      projectId: project.id,
      orgId: org.id,
      name: 'Sprint 1',
      goal: 'Set up the foundation',
      startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: SprintStatus.completed,
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  // Create active sprint
  const activeSprint = await prisma.sprint.create({
    data: {
      projectId: project.id,
      orgId: org.id,
      name: 'Sprint 2',
      goal: 'Build the core features',
      startDate: new Date(),
      endDate: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
      status: SprintStatus.active,
    },
  });

  // Create sample issues
  const issueData = [
    {
      issueKey: 'ENG-1',
      title: 'Set up monorepo structure',
      type: IssueType.task,
      priority: IssuePriority.high,
      statusName: 'Done',
      sprintId: completedSprint.id,
      estimate: 3,
    },
    {
      issueKey: 'ENG-2',
      title: 'Design database schema',
      type: IssueType.task,
      priority: IssuePriority.high,
      statusName: 'Done',
      sprintId: completedSprint.id,
      estimate: 5,
    },
    {
      issueKey: 'ENG-3',
      title: 'Implement authentication',
      type: IssueType.story,
      priority: IssuePriority.urgent,
      statusName: 'In Progress',
      sprintId: activeSprint.id,
      estimate: 8,
      assigneeId: demoMember.id,
    },
    {
      issueKey: 'ENG-4',
      title: 'Build Kanban board UI',
      type: IssueType.story,
      priority: IssuePriority.high,
      statusName: 'Todo',
      sprintId: activeSprint.id,
      estimate: 13,
      assigneeId: demoAdmin.id,
    },
    {
      issueKey: 'ENG-5',
      title: 'Fix: Login page not responsive on mobile',
      type: IssueType.bug,
      priority: IssuePriority.medium,
      statusName: 'Backlog',
      estimate: 2,
    },
    {
      issueKey: 'ENG-6',
      title: 'Add real-time notifications',
      type: IssueType.story,
      priority: IssuePriority.medium,
      statusName: 'Backlog',
      estimate: 5,
    },
    {
      issueKey: 'ENG-7',
      title: 'Integrate S3 file uploads',
      type: IssueType.task,
      priority: IssuePriority.low,
      statusName: 'Backlog',
      estimate: 3,
    },
  ];

  for (let i = 0; i < issueData.length; i++) {
    const d = issueData[i];
    await prisma.issue.upsert({
      where: { orgId_issueKey: { orgId: org.id, issueKey: d.issueKey } },
      update: {},
      create: {
        orgId: org.id,
        projectId: project.id,
        issueKey: d.issueKey,
        title: d.title,
        type: d.type,
        priority: d.priority,
        statusId: statuses[d.statusName],
        sprintId: d.sprintId,
        assigneeId: (d as any).assigneeId,
        reporterId: demoAdmin.id,
        estimate: d.estimate,
        rank: (i + 1) * 1000,
      },
    });
  }

  console.log('✅ Sample issues created');

  // Create feature flags
  const flags = [
    { key: 'gantt_view', description: 'Gantt/Roadmap view' },
    { key: 'automations', description: 'Automation engine' },
    { key: 'custom_fields', description: 'Custom issue fields' },
    { key: 'saml_sso', description: 'SAML SSO' },
    { key: 'retro_board', description: 'Retrospective board' },
    { key: 'report_builder', description: 'Report builder' },
    { key: 'push_notifications', description: 'Push notifications' },
    { key: 'product_analytics', description: 'Product analytics (PostHog)' },
  ];

  for (const f of flags) {
    await prisma.featureFlag.upsert({
      where: { key: f.key },
      update: {},
      create: { ...f, enabled: true },
    });
  }

  console.log('✅ Feature flags created');
  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Credentials:');
  console.log('  Platform Admin: admin@platform.dev / Password123!');
  console.log('  Demo Admin:     demo@acme.dev / Password123!');
  console.log('  Demo Member:    member@acme.dev / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

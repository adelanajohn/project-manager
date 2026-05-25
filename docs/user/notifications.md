# Notifications

## The Notification Bell

The bell icon in the top header shows a badge with the count of unread notifications. Click it to open the notification panel.

## Types of Notifications

You receive a notification when:

| Event | Who gets notified |
|-------|------------------|
| Issue assigned to you | You |
| Issue you created is updated | You (if you are not the updater) |
| Comment added to an issue you reported or are assigned to | You |
| You are mentioned (`@username`) in a comment | You |
| Sprint you have issues in is started or completed | All members with issues in that sprint |
| You are invited to an org | You |
| Your role in an org is changed | You |

## The Inbox Page

The **Inbox** page (`/:orgSlug/inbox`) shows your full notification feed for the current org, newest first.

- Unread notifications have a blue dot on the left
- Click any notification to navigate to the related issue, sprint, or project
- Click **Mark all read** to dismiss all at once

## Marking Individual Notifications as Read

Click the notification row in the panel or inbox. The notification is marked as read automatically when you navigate to the linked resource.

## Email Notifications

The system can send email notifications for key events. This is powered by the `email` BullMQ queue.

> Email delivery requires `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS` to be configured. If these are not set, emails are silently dropped in development.

Currently supported email types:
- Account verification
- Password reset
- Team invitation

Issue activity emails (daily digest or per-event) are planned but not yet implemented.

## Real-Time Updates

Notifications are delivered in real-time via Socket.IO if you have the app open. You do not need to refresh the page — the badge count and notification panel update automatically.

## Notification Preferences

Per-project and per-event notification preferences are planned for a future release. Currently all applicable events generate notifications.

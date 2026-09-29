# Alfred: Outreach + Replies in one page

No new packages. No database changes.

## Apply (Windows, from the project root)
robocopy .\alfred-inbox . /E
Then delete the extracted folder. These REPLACE yours:
  app\(app)\outreach\page.tsx
  app\(app)\replies\page.tsx            (now a redirect)
  app\(app)\replies\[id]\page.tsx       (now a redirect)
  app\api\google\callback\route.ts
  components\SidebarNav.tsx

## Delete these three, they moved into outreach\
  app\(app)\replies\actions.ts
  app\(app)\replies\CheckRepliesButton.tsx
  app\(app)\replies\[id]\MarkRead.tsx

## Optional, dashboard links
In app\(app)\dashboard\page.tsx change the two href values that point at
"/leads" for replies to "/outreach?tab=replies":
  the item with key: "replies", and the metric "Replies to review".

## How it behaves
Outreach has three tabs: Write | Replies (unread count) | Sent.
- Opens on Replies when something is unread, otherwise Write.
- "Write an email" from a lead or client opens Write with them ticked.
- Clicking a tab always opens that tab.
- Unread count shows on the Outreach nav item (dot on the phone tab).
- Old /replies links redirect here.

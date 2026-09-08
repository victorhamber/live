import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageEditor } from "@/components/admin/PageEditor";
import { dropOrphanAgentReplies } from "@/lib/scripted-replies";
import { ensureLeadWebhookSecret } from "@/lib/leads";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await dropOrphanAgentReplies(id);
  const page = await db.page.findUnique({
    where: { id },
    include: {
      agent: true,
      knowledgeBase: true,
      settings: true,
      links: true,
      actions: true,
      transcript: { orderBy: { timestampSec: "asc" } },
      commentEvents: { orderBy: { timestampSec: "asc" } },
    },
  });
  if (!page) notFound();
  const leadWebhookSecret = await ensureLeadWebhookSecret(page.id, page.leadWebhookSecret);
  return <PageEditor initial={{ ...page, leadWebhookSecret }} />;
}

import { redirect } from "next/navigation";

export default function ReplyMoved({ params }: { params: { id: string } }) {
  redirect(`/outreach/replies/${params.id}`);
}

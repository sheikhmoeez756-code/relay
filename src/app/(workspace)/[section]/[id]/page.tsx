import { notFound } from 'next/navigation';
import { isEntity } from '@/lib/validation';
import { RecordDetail } from '@/components/record-detail';
import { Forbidden, canView } from '@/components/forbidden';
export default async function DetailPage({
  params,
}: {
  params: Promise<{ section: string; id: string }>;
}) {
  const { section, id } = await params;
  if (!isEntity(section)) notFound();
  if (!(await canView(section))) return <Forbidden />;
  return <RecordDetail entity={section} id={id} />;
}

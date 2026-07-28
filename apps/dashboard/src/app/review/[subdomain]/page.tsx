import type { Metadata } from 'next';
import { ReviewChrome } from './review-chrome';

type Props = Readonly<{
  params: Promise<{ subdomain: string }>;
}>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain } = await params;
  return {
    title: `Review · ${subdomain} · ShipLocal`,
    description: 'Leave feedback on a ShipLocal preview without installing anything.',
    robots: { index: false, follow: false },
  };
}

export default async function ReviewPage({ params }: Props) {
  const { subdomain } = await params;
  return <ReviewChrome subdomain={subdomain.toLowerCase()} />;
}

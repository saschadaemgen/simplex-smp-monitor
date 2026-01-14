import { useParams } from 'react-router-dom';
import { TrafficCaptureCard } from '../../../components/chutneX/traffic';

export default function CaptureDetailPage() {
  const { id: networkId, captureId } = useParams<{ id: string; captureId?: string }>();
  return <TrafficCaptureCard networkId={networkId!} captureId={captureId} />;
}

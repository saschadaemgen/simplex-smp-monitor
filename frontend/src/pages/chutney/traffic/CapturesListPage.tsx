import { useParams } from 'react-router-dom';
import { TrafficCapturesList } from '../../../components/chutneX/traffic';

export default function CapturesListPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <TrafficCapturesList networkId={networkId!} />;
}

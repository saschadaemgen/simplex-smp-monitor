import { useParams } from 'react-router-dom';
import { BandwidthHeatmap } from '../../../components/chutneX/visualization';

export default function HeatmapPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <BandwidthHeatmap networkId={networkId!} />;
}

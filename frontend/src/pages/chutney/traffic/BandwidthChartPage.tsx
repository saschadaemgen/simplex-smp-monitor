import { useParams } from 'react-router-dom';
import { BandwidthChart } from '../../../components/chutneX/traffic';

export default function BandwidthChartPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <BandwidthChart networkId={networkId!} />;
}

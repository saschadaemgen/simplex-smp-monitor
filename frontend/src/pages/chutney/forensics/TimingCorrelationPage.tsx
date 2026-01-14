import { useParams } from 'react-router-dom';
import { TimingCorrelation } from '../../../components/chutneX/forensics';

export default function TimingCorrelationPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <TimingCorrelation networkId={networkId!} />;
}

import { useParams } from 'react-router-dom';
import { ReportGenerator } from '../../../components/chutneX/reports';

export default function ReportGeneratorPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <ReportGenerator networkId={networkId!} />;
}

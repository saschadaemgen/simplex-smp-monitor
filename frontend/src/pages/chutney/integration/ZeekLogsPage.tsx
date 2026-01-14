import { useParams } from 'react-router-dom';
import { ZeekLogs } from '../../../components/chutneX/integration';

export default function ZeekLogsPage() {
  const { id: networkId } = useParams<{ id: string }>();
  return <ZeekLogs networkId={networkId!} />;
}

import LeftPanel from './components/LeftPanel';
import ChatArea from './components/ChatArea';

export default function Home(): React.JSX.Element {
  return (
    <main className="flex h-screen">
      <LeftPanel />
      <ChatArea />
    </main>
  );
}

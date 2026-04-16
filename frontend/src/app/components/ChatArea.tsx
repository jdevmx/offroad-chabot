import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatArea(): React.JSX.Element {
  return (
    <section className="flex flex-1 flex-col">
      <MessageList />
      <MessageInput />
    </section>
  );
}

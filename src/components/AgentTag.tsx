interface AgentTagProps {
  name: string;
}

export default function AgentTag({ name }: AgentTagProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded font-medium whitespace-nowrap"
      style={{
        backgroundColor: '#eff6ff',
        color: '#1d4ed8',
        padding: '2px 7px',
        fontSize: '11px',
        border: '1px solid #bfdbfe',
      }}
    >
      <span className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
      {name}
    </span>
  );
}

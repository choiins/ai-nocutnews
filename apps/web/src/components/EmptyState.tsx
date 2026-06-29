export default function EmptyState({ message }: { message: string }) {
  return (
    <p style={{ color: "var(--text-secondary)", padding: "40px 0", fontSize: 14, lineHeight: 1.6 }}>
      {message}
    </p>
  );
}

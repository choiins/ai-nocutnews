import EmptyState from "@/components/EmptyState";

// Me — 로그인·구독·설정. 인증/구독 단계에서 구현.
export default function MePage() {
  return (
    <main>
      <EmptyState message="로그인하면 구독 관리와 관심사 설정을 할 수 있습니다. (인증·구독 기능은 다음 단계에서 추가됩니다)" />
    </main>
  );
}

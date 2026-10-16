import SwRegister from "@/components/SwRegister";
import TabBar from "@/components/TabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SwRegister />
      <div className="mx-auto w-full max-w-lg flex-1 px-4 pt-3 pb-24">{children}</div>
      <TabBar />
    </>
  );
}

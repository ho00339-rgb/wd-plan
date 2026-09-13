import Sidebar from "./Sidebar";
import Chat from "./Chat";

type NavItem = { slug: string; title: string };

export default function Shell({
  nav,
  children,
}: {
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="site-header">
        <h1>
          결혼 준비 <span className="heart">♥</span> 호연 &amp; 예준
        </h1>
      </header>
      <div className="layout">
        <Sidebar items={nav} />
        <main className="content">{children}</main>
      </div>
      <Chat />
    </>
  );
}

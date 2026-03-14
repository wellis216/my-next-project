import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1 className="text-4xl font-bold">首頁</h1>
      <br />
      {/* 點擊這個連結會快速切換到 /about 頁面 */}
      <Link href="/about">前往關於我們頁面</Link> 
      <br />
      <Link href="/mpage">前往主程式</Link> 
    </main>
  );
}
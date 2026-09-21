import Link from "next/link";

export function Header() {
  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <span className="mark" />
        LIZER
      </Link>
      <nav>
        <Link href="/configurator">Конфигуратор</Link>
        <Link href="/checkout">Заказ</Link>
      </nav>
      <span className="pill">Каталог материалов</span>
    </header>
  );
}

export function Footer() {
  return <footer className="foot">LIZER · лазерная резка металла</footer>;
}

import { Footer, Header } from "@/components/site/Chrome";
import Link from "next/link";

const flow = [
  {
    n: "01",
    t: "Модель",
    d: "Загрузите STL / DXF / STEP или соберите узор в конфигураторе.",
  },
  {
    n: "02",
    t: "Части",
    d: "Сборка раскладывается на контуры и количества одинаковых деталей.",
  },
  {
    n: "03",
    t: "Цена",
    d: "Считаем материал, резку и подготовку программы по каталогу.",
  },
  {
    n: "04",
    t: "Оформление",
    d: "Если цена подходит — заполните данные заказчика и переходите к оплате.",
  },
  {
    n: "05",
    t: "Оплата",
    d: "Оплатите заказ — он уйдёт в раскрой и производство.",
  },
];

const stack = [
  {
    title: "Конфигуратор",
    body: "Соберите форму заготовки и узор или загрузите чертёж. Деталь сразу видно в 3D.",
  },
  {
    title: "Разбор модели",
    body: "STL раскладывается на тела, DXF — на замкнутые контуры. Одинаковые детали схлопываются в количество.",
  },
  {
    title: "Раскрой",
    body: "Контуры укладываются на лист 2500×1250, видно отход и сколько листов понадобится.",
  },
  {
    title: "Заказ",
    body: "После оплаты в производство уходят состав, количество и спецификация резки.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">Лазерная резка по модели</p>
            <h1>
              Загрузите узор.
              <br />
              Соберём раскрой и заказ.
            </h1>
            <p className="lead">
              Конфигуратор лазерной резки: модель или чертёж, разбор на детали, стоимость
              и оформление заказа.
            </p>
            <div className="hero-actions">
              <Link className="primary" href="/configurator">
                Открыть конфигуратор
              </Link>
              <a className="ghost" href="#stack">
                Как это устроено
              </a>
            </div>
          </div>
          <div className="hero-panel" aria-hidden>
            <svg viewBox="0 0 800 600" className="ornament">
              <rect x="20" y="20" width="760" height="560" rx="8" fill="#161b12" stroke="#8f9a63" />
              {Array.from({ length: 6 }).map((_, row) =>
                Array.from({ length: 8 }).map((__, col) => {
                  const cx = 90 + col * 90;
                  const cy = 90 + row * 85;
                  return (
                    <path
                      key={`${row}-${col}`}
                      d={`M ${cx} ${cy - 24}
                         C ${cx + 16} ${cy - 24}, ${cx + 24} ${cy - 16}, ${cx + 24} ${cy}
                         C ${cx + 24} ${cy + 16}, ${cx + 16} ${cy + 24}, ${cx} ${cy + 24}
                         C ${cx - 16} ${cy + 24}, ${cx - 24} ${cy + 16}, ${cx - 24} ${cy}
                         C ${cx - 24} ${cy - 16}, ${cx - 16} ${cy - 24}, ${cx} ${cy - 24}
                         Z`}
                      fill="none"
                      stroke="#c4cc9c"
                      strokeWidth="2"
                    />
                  );
                }),
              )}
            </svg>
          </div>
        </section>

        <section className="flow">
          {flow.map((item) => (
            <article key={item.n}>
              <span>{item.n}</span>
              <h2>{item.t}</h2>
              <p>{item.d}</p>
            </article>
          ))}
        </section>

        <section id="stack" className="stack-grid">
          {stack.map((item) => (
            <article key={item.title} className="card">
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}

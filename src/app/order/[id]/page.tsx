"use client";

import { Footer, Header } from "@/components/site/Chrome";
import { useProject } from "@/lib/project-store";
import { useParams } from "next/navigation";

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const project = useProject();
  const docs = project.documents;

  return (
    <>
      <Header />
      <main className="page">
        <section className="card">
          <p className="eyebrow">Оплата успешна</p>
          <h1>Заказ в работе</h1>
          <p className="muted">
            {docs?.message ?? "Оплата успешна, заказ в работе"}. Номер{" "}
            {docs?.siteOrderNumber ?? params.id}.
          </p>
          {docs ? (
            <div className="docs">
              <div>
                <span>Заказ клиента</span>
                <strong>{docs.customerOrderNumber}</strong>
              </div>
              <div>
                <span>Номер сайта</span>
                <strong>{docs.siteOrderNumber}</strong>
              </div>
              {docs.specifications?.map((spec) => (
                <div key={spec.specificationId || spec.nomenclatureName}>
                  <span>{spec.reused ? "Существующая спецификация" : "Новая спецификация"}</span>
                  <strong>
                    {spec.nomenclatureName}
                    {spec.specificationNumber ? ` · ${spec.specificationNumber}` : ""}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <p>Откройте заказ из того же браузера, где проходила оплата.</p>
          )}
          <a className="primary" href="/configurator">
            Новый расчёт
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}

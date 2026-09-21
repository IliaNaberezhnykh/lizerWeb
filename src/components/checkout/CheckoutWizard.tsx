"use client";

import { formatMoney, formatNumber } from "@/lib/format";
import { setCheckout, setDocuments, useProject } from "@/lib/project-store";
import type { CheckoutInfo } from "@/types/domain";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const steps = ["Цена", "Оформление", "Оплата"] as const;

const defaultFields: Array<{
  name: keyof CheckoutInfo;
  title: string;
  required: boolean;
  type: "string" | "text";
}> = [
  { name: "partnerName", title: "Партнер", required: true, type: "string" },
  { name: "counterpartyName", title: "Контрагент", required: true, type: "string" },
  { name: "inn", title: "ИНН", required: false, type: "string" },
  { name: "kpp", title: "КПП", required: false, type: "string" },
  { name: "phone", title: "Телефон", required: true, type: "string" },
  { name: "email", title: "Email", required: false, type: "string" },
  { name: "comment", title: "Комментарий", required: false, type: "text" },
];

export function CheckoutWizard() {
  const project = useProject();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState(defaultFields);

  useEffect(() => {
    void fetch("/api/onec/order-form")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.fields) && data.fields.length) {
          setFields(data.fields);
        }
      })
      .catch(() => undefined);
  }, []);

  if (!project.quote) {
    return (
      <div className="card narrow">
        <h1>Сначала соберите модель</h1>
        <p>Расчёт цены появляется после разбора деталей в конфигураторе.</p>
        <a className="primary" href="/configurator">
          К конфигуратору
        </a>
      </div>
    );
  }

  function patchCheckout(patch: Partial<CheckoutInfo>) {
    setCheckout({ ...project.checkout, ...patch });
  }

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote: project.quote,
          groups: project.groups,
          params: project.params,
          checkout: project.checkout,
          fileName: project.fileName,
          source: project.source,
          nesting: project.nesting,
          payment: { method: "stub", stub: true },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Оплата не прошла");
      setDocuments(data.order.documents);
      router.push(`/order/${data.order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка оплаты");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="checkout">
      <ol className="steps">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? "active" : index < step ? "done" : ""}>
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="card">
          <h1>Подтверждение цены</h1>
          <p className="muted">
            Котировка {project.quote.id}. Стоимость по себестоимости материалов
            {project.quote.validUntil
              ? ` действует до ${new Date(project.quote.validUntil).toLocaleDateString("ru-RU")}`
              : ""}
            .
          </p>
          <table>
            <thead>
              <tr>
                <th>Код</th>
                <th>Позиция</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {project.quote.lines.map((line) => (
                <tr key={`${line.nomenclatureCode}-${line.quantity}`}>
                  <td>{line.nomenclatureCode}</td>
                  <td>{line.nomenclatureName}</td>
                  <td>
                    {formatNumber(line.quantity, 3)} {line.unit}
                  </td>
                  <td>{formatMoney(line.price)}</td>
                  <td>{formatMoney(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="totals">
            <div>
              <span>Материал</span>
              <strong>{formatMoney(project.quote.materialAmount)}</strong>
            </div>
            <div>
              <span>Итого</span>
              <strong>{formatMoney(project.quote.total)}</strong>
            </div>
          </div>
          <p className="muted tiny">
            Листов: {project.quote.sheetCount}. Отход при раскрое: {project.quote.wastePercent}%.
          </p>
          <button className="primary" type="button" onClick={() => setStep(1)}>
            Согласен с ценой
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="card">
          <h1>Оформление</h1>
          <p className="muted">
            Данные уходят в заказ клиента. Номер заказа сайта будет записан в комментарий.
          </p>
          {fields.map((field) => {
            const value = project.checkout[field.name] ?? "";
            return (
              <label key={field.name}>
                {field.title}
                {field.required ? " *" : ""}
                {field.type === "text" ? (
                  <textarea
                    rows={3}
                    value={value}
                    onChange={(e) => patchCheckout({ [field.name]: e.target.value })}
                  />
                ) : (
                  <input
                    value={value}
                    onChange={(e) => patchCheckout({ [field.name]: e.target.value })}
                  />
                )}
              </label>
            );
          })}
          {error ? <p className="error">{error}</p> : null}
          <div className="row-actions">
            <button type="button" className="ghost" onClick={() => setStep(0)}>
              Назад к цене
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (!project.checkout.partnerName || !project.checkout.phone) {
                  setError("Заполните партнера и телефон");
                  return;
                }
                if (!project.checkout.counterpartyName) {
                  setError("Заполните контрагента");
                  return;
                }
                setError(null);
                setStep(2);
              }}
            >
              К оплате {formatMoney(project.quote.total)}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="card">
          <h1>Оплата</h1>
          <p className="muted">
            Подключение платёжного сервиса будет позже. Сейчас это заглушка: после
            подтверждения заказ уходит в производство.
          </p>
          <div className="totals">
            <div>
              <span>К оплате</span>
              <strong>{formatMoney(project.quote.total)}</strong>
            </div>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <div className="row-actions">
            <button type="button" className="ghost" onClick={() => setStep(1)}>
              Назад
            </button>
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={() => void pay()}
            >
              {busy ? "Оформляем заказ…" : `Оплатить ${formatMoney(project.quote.total)}`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

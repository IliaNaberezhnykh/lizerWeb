# LIZER

Скелет сайта лазерной резки: конфигуратор → разбор на части → цена из 1С → логистика → оплата → заказ клиента и ресурсная спецификация.

## Запуск

Нужен Node.js (`C:\Program Files\nodejs` должен быть в PATH).

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000), затем `/configurator`.

## Поток пользователя

1. Смоделировать узор или загрузить `STL` / `DXF` / `DTF` / `STEP`.
2. Модель раскладывается на контуры и количества.
3. Бэкенд считает цену по номенклатуре 1С (`/api/quote`).
4. Подтверждение цены, логистика, оплата.
5. `/api/orders` создаёт документы 1С (сейчас mock).

## Что заимствовано, что заглушка

| Слой | Сейчас | Следующий шаг |
| --- | --- | --- |
| 3D-витрина | `@react-three/fiber`, `@react-three/drei`, `three` | — |
| Параметрика | `THREE.Shape` + отверстия + `ExtrudeGeometry` | replicad |
| STL | свой parser + union-find связных тел | OpenCascade mesh repair |
| DXF / DTF | `dxf-parser`, замкнутые контуры | CAM-слои, kerf |
| STEP | заготовка + слот ядра | `opencascade.js` worker |
| Нестинг | полочный раскрой 2500×1250 | SVGNest / cad-n |
| 1С | демо-каталог в `src/lib/onec` | HTTP-сервис / OData |
| Оплата | заглушка карты | ЮKassa / CloudPayments |

Цены и коды номенклатуры живут в каталоге 1С. Бэкенд не хранит прайс как источник истины: при появлении `ONEC_BASE_URL` `oneCClient` ходит в 1С.

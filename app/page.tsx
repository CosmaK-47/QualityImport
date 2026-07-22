"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getWebsiteProducts } from "@/lib/inventory";

type Language = "RO" | "RU" | "EN";
type Category = "all" | "outerwear" | "tops" | "bottoms" | "shoes";
type Availability = "all" | "stock" | "preorder";

const products = getWebsiteProducts();

const copy = {
  RO: {
    announcement: "Livrare în toată Moldova · Produse în stoc și precomenzi selectate",
    navCollection: "Colecție",
    navNew: "Noutăți",
    navResellers: "Pentru reselleri",
    account: "Cont",
    bag: "Coș",
    eyebrow: "SELECTAT PENTRU MOLDOVA",
    heroTitle: "Modă autentică, selectată cu grijă.",
    heroBody: "Produse verificate pentru clienți și reselleri din întreaga Moldovă.",
    heroPrimary: "Explorează colecția",
    heroSecondary: "Pentru reselleri",
    trustQuality: "Calitate verificată de QI",
    trustPrice: "Preț final transparent",
    trustDelivery: "Livrare în toată Moldova",
    collectionEyebrow: "PRIMA SELECȚIE",
    collectionTitle: "Piese alese, nu un catalog fără sfârșit.",
    collectionBody: "Fiecare produs este verificat înainte de publicare pentru calitate, cost complet și disponibilitate realistă.",
    all: "Toate",
    outerwear: "Jachete",
    tops: "Topuri",
    bottoms: "Pantaloni",
    shoes: "Încălțăminte",
    stockFilter: "În stoc",
    preorderFilter: "Precomandă",
    stock: "În stoc · 1–3 zile",
    preorder: "Precomandă selectată",
    inspected: "VERIFICAT QI",
    add: "Adaugă în coș",
    empty: "Nu există produse pentru filtrele selectate.",
    reset: "Resetează filtrele",
    processEyebrow: "DE LA SURSĂ LA TINE",
    processTitle: "Un proces clar, fără promisiuni imposibile.",
    step1Title: "Selectăm",
    step1Body: "QI publică doar produse care trec verificarea internă de calitate, cost și origine.",
    step2Title: "Confirmăm",
    step2Body: "Pentru precomenzi confirmăm prețul și disponibilitatea înainte de plată.",
    step3Title: "Livrăm",
    step3Body: "Urmărești etapele comenzii în cont, fără expunerea rutelor noastre confidențiale.",
    resellerEyebrow: "QI PENTRU AFACERI",
    resellerTitle: "O selecție mai bună pentru boutique-ul tău.",
    resellerBody: "Resellerii aprobați primesc prețuri pe nivel, cereri de ofertă și suport pentru sourcing—în aceeași platformă QI.",
    resellerMinimum: "Comandă wholesale minimă",
    resellerMinimumValue: "6 000 MDL",
    resellerPrice: "Prețuri",
    resellerPriceValue: "Starter → Strategic",
    resellerQuote: "Oferte",
    resellerQuoteValue: "24–72 ore",
    apply: "Solicită cont reseller",
    learn: "Vezi cum funcționează",
    qualityEyebrow: "STANDARDUL QI",
    qualityTitle: "Încrederea începe înainte de checkout.",
    qualityBody: "Statutul de autenticitate, compoziția, mărimile și condițiile de livrare rămân informații factuale. Nu le schimbăm pentru marketing.",
    qualityLink: "Descoperă standardul nostru",
    support: "Suport în RO · RU · EN",
    footerLine: "Modă selectată și importată responsabil pentru Moldova.",
    footerShop: "Magazin",
    footerBusiness: "Business",
    footerHelp: "Ajutor",
    footerLegal: "Legal",
    termsLink: "Termeni și condiții",
    privacyLink: "Confidențialitate",
    rights: "© 2026 Quality Imports. Toate drepturile rezervate.",
    added: "Produs adăugat în coș.",
    checkoutTitle: "Finalizează comanda",
    checkoutSection: "LIVRARE",
    deliveryDetails: "Date de contact și livrare",
    checkoutHelp: "Completează datele de mai jos, iar echipa noastră îți va confirma comanda.",
    fullName: "Nume complet",
    fullNamePlaceholder: "Ex: Maria Popescu",
    emailLabel: "Email",
    phoneLabel: "Telefon",
    deliveryLabel: "Adresă de livrare sau detalii pentru ridicare",
    deliveryPlaceholder: "Oraș, stradă, număr și apartament sau punct de ridicare",
    placeOrder: "Plasează comanda",
    placingOrder: "Se plasează…",
    secureCheckout: "Prețul și stocul sunt verificate înainte de confirmare.",
    emptyBag: "Coșul este gol.",
    continueShopping: "Continuă cumpărăturile",
    redirectingPayment: "Te redirecționăm către plata securizată…",
    reservationTitle: "Rezervarea a fost primită",
    reservationBody: "Echipa QI va confirma disponibilitatea și îți va trimite instrucțiunile de plată. Produsul nu va fi expediat înainte de confirmarea plății.",
    marketingConsent: "Sunt de acord să primesc prin email noutăți și oferte QI. Opțional; datele comenzii sunt păstrate separat pentru procesarea acesteia.",
    viewDetails: "Vezi detalii",
    productDetails: "Detalii produs",
    photos: "Fotografii",
    video: "Video",
    certifiedVideo: "Video certificat QI",
    spin360: "Vizualizare 360°",
    spinHelp: "Trage stânga sau dreapta pentru a roti produsul.",
    materials: "Materiale și îngrijire",
    sizes: "Mărimi disponibile",
    close: "Închide",
    quantityAvailable: "bucăți disponibile",
    videoPending: "Videoclipul certificat QI va fi disponibil în curând.",
    spinPending: "Vizualizarea 360° va fi disponibilă după încărcarea cadrelor produsului.",
  },
  RU: {
    announcement: "Доставка по всей Молдове · Товары в наличии и избранный предзаказ",
    navCollection: "Коллекция",
    navNew: "Новинки",
    navResellers: "Для реселлеров",
    account: "Аккаунт",
    bag: "Корзина",
    eyebrow: "ОТОБРАНО ДЛЯ МОЛДОВЫ",
    heroTitle: "Аутентичная мода, отобранная с вниманием.",
    heroBody: "Проверенные товары для покупателей и реселлеров по всей Молдове.",
    heroPrimary: "Смотреть коллекцию",
    heroSecondary: "Для реселлеров",
    trustQuality: "Качество проверено QI",
    trustPrice: "Прозрачная итоговая цена",
    trustDelivery: "Доставка по всей Молдове",
    collectionEyebrow: "ПЕРВЫЙ ОТБОР",
    collectionTitle: "Отборные вещи, а не бесконечный каталог.",
    collectionBody: "До публикации мы проверяем качество, полную стоимость и реальную доступность каждого товара.",
    all: "Все",
    outerwear: "Куртки",
    tops: "Верх",
    bottoms: "Брюки",
    shoes: "Обувь",
    stockFilter: "В наличии",
    preorderFilter: "Предзаказ",
    stock: "В наличии · 1–3 дня",
    preorder: "Избранный предзаказ",
    inspected: "ПРОВЕРЕНО QI",
    add: "Добавить в корзину",
    empty: "Нет товаров по выбранным фильтрам.",
    reset: "Сбросить фильтры",
    processEyebrow: "ОТ ИСТОЧНИКА ДО ВАС",
    processTitle: "Понятный процесс без невозможных обещаний.",
    step1Title: "Отбираем",
    step1Body: "QI публикует только товары, прошедшие внутреннюю проверку качества, стоимости и происхождения.",
    step2Title: "Подтверждаем",
    step2Body: "Для предзаказа мы подтверждаем цену и наличие до оплаты.",
    step3Title: "Доставляем",
    step3Body: "Этапы заказа видны в аккаунте без раскрытия наших конфиденциальных маршрутов.",
    resellerEyebrow: "QI ДЛЯ БИЗНЕСА",
    resellerTitle: "Более сильный ассортимент для вашего бутика.",
    resellerBody: "Одобренные реселлеры получают уровневые цены, запросы предложений и sourcing-поддержку в одной платформе QI.",
    resellerMinimum: "Минимальный wholesale-заказ",
    resellerMinimumValue: "6 000 MDL",
    resellerPrice: "Цены",
    resellerPriceValue: "Starter → Strategic",
    resellerQuote: "Предложения",
    resellerQuoteValue: "24–72 часа",
    apply: "Подать заявку реселлера",
    learn: "Как это работает",
    qualityEyebrow: "СТАНДАРТ QI",
    qualityTitle: "Доверие начинается до оформления заказа.",
    qualityBody: "Подлинность, состав, размеры и условия доставки остаются фактическими данными. Мы не меняем их ради маркетинга.",
    qualityLink: "Изучить наш стандарт",
    support: "Поддержка на RO · RU · EN",
    footerLine: "Ответственно отобранная и импортированная мода для Молдовы.",
    footerShop: "Магазин",
    footerBusiness: "Бизнес",
    footerHelp: "Помощь",
    footerLegal: "Правовая информация",
    termsLink: "Условия",
    privacyLink: "Конфиденциальность",
    rights: "© 2026 Quality Imports. Все права защищены.",
    added: "Товар добавлен в корзину.",
    checkoutTitle: "Оформление заказа",
    checkoutSection: "ДОСТАВКА",
    deliveryDetails: "Контактные данные и доставка",
    checkoutHelp: "Заполните данные ниже, и наша команда подтвердит ваш заказ.",
    fullName: "Имя и фамилия",
    fullNamePlaceholder: "Например: Мария Попеску",
    emailLabel: "Электронная почта",
    phoneLabel: "Телефон",
    deliveryLabel: "Адрес доставки или информация для самовывоза",
    deliveryPlaceholder: "Город, улица, дом, квартира или пункт самовывоза",
    placeOrder: "Оформить заказ",
    placingOrder: "Оформляем…",
    secureCheckout: "Цена и наличие проверяются перед подтверждением.",
    emptyBag: "Корзина пуста.",
    continueShopping: "Продолжить покупки",
    redirectingPayment: "Перенаправляем на защищённую оплату…",
    reservationTitle: "Заявка на резервирование получена",
    reservationBody: "Команда QI подтвердит наличие и отправит инструкции для оплаты. Товар не будет отправлен до подтверждения оплаты.",
    marketingConsent: "Я согласен получать новости и предложения QI по электронной почте. Необязательно; данные заказа хранятся отдельно для его обработки.",
    viewDetails: "Подробнее",
    productDetails: "Описание товара",
    photos: "Фотографии",
    video: "Видео",
    certifiedVideo: "Сертифицированное видео QI",
    spin360: "Обзор 360°",
    spinHelp: "Проведите влево или вправо, чтобы повернуть товар.",
    materials: "Материалы и уход",
    sizes: "Доступные размеры",
    close: "Закрыть",
    quantityAvailable: "штук в наличии",
    videoPending: "Сертифицированное видео QI скоро будет доступно.",
    spinPending: "Обзор 360° появится после загрузки кадров товара.",
  },
  EN: {
    announcement: "Delivery across Moldova · In-stock and selected preorder",
    navCollection: "Collection",
    navNew: "New arrivals",
    navResellers: "For resellers",
    account: "Account",
    bag: "Bag",
    eyebrow: "CURATED FOR MOLDOVA",
    heroTitle: "Authentic fashion, carefully selected.",
    heroBody: "Quality-verified products for customers and resellers across Moldova.",
    heroPrimary: "Explore the collection",
    heroSecondary: "For resellers",
    trustQuality: "QI quality inspected",
    trustPrice: "Clear landed prices",
    trustDelivery: "Delivery across Moldova",
    collectionEyebrow: "THE FIRST SELECTION",
    collectionTitle: "Considered pieces, not an endless catalogue.",
    collectionBody: "Every product is reviewed before publication for quality, complete cost and realistic availability.",
    all: "All",
    outerwear: "Outerwear",
    tops: "Tops",
    bottoms: "Trousers",
    shoes: "Shoes",
    stockFilter: "In stock",
    preorderFilter: "Preorder",
    stock: "In stock · 1–3 days",
    preorder: "Selected preorder",
    inspected: "QI INSPECTED",
    add: "Add to bag",
    empty: "No products match the selected filters.",
    reset: "Reset filters",
    processEyebrow: "FROM SOURCE TO YOU",
    processTitle: "A clear process without impossible promises.",
    step1Title: "We select",
    step1Body: "QI publishes only products that pass our internal quality, cost and origin review.",
    step2Title: "We confirm",
    step2Body: "For preorders, we confirm price and availability before payment.",
    step3Title: "We deliver",
    step3Body: "Follow each order milestone in your account without exposing our confidential routes.",
    resellerEyebrow: "QI FOR BUSINESS",
    resellerTitle: "A stronger selection for your boutique.",
    resellerBody: "Approved resellers receive tiered prices, quotation tools and sourcing support in the same QI platform.",
    resellerMinimum: "Minimum wholesale order",
    resellerMinimumValue: "6 000 MDL",
    resellerPrice: "Pricing",
    resellerPriceValue: "Starter → Strategic",
    resellerQuote: "Quotations",
    resellerQuoteValue: "24–72 hours",
    apply: "Apply for reseller access",
    learn: "See how it works",
    qualityEyebrow: "THE QI STANDARD",
    qualityTitle: "Trust begins before checkout.",
    qualityBody: "Authenticity status, composition, sizing and delivery terms remain factual product information. We never rewrite them for marketing.",
    qualityLink: "Discover our standard",
    support: "Support in RO · RU · EN",
    footerLine: "Fashion selected and responsibly imported for Moldova.",
    footerShop: "Shop",
    footerBusiness: "Business",
    footerHelp: "Help",
    footerLegal: "Legal",
    termsLink: "Terms and conditions",
    privacyLink: "Privacy",
    rights: "© 2026 Quality Imports. All rights reserved.",
    added: "Product added to bag.",
    checkoutTitle: "Complete your order",
    checkoutSection: "DELIVERY",
    deliveryDetails: "Contact and delivery details",
    checkoutHelp: "Complete the details below and our team will confirm your order.",
    fullName: "Full name",
    fullNamePlaceholder: "Example: Maria Popescu",
    emailLabel: "Email",
    phoneLabel: "Phone",
    deliveryLabel: "Delivery address or pickup details",
    deliveryPlaceholder: "City, street, building, apartment or pickup point",
    placeOrder: "Place order",
    placingOrder: "Placing order…",
    secureCheckout: "Price and stock are verified before confirmation.",
    emptyBag: "Your bag is empty.",
    continueShopping: "Continue shopping",
    redirectingPayment: "Redirecting you to secure payment…",
    reservationTitle: "Reservation received",
    reservationBody: "The QI team will confirm availability and send payment instructions. The product will not be shipped before payment is confirmed.",
    marketingConsent: "I agree to receive QI news and offers by email. Optional; order details are stored separately to process the order.",
    viewDetails: "View details",
    productDetails: "Product details",
    photos: "Photos",
    video: "Video",
    certifiedVideo: "QI Certified Video",
    spin360: "360° view",
    spinHelp: "Drag left or right to rotate the product.",
    materials: "Materials and care",
    sizes: "Available sizes",
    close: "Close",
    quantityAvailable: "pieces available",
    videoPending: "The QI Certified Video will be available soon.",
    spinPending: "The 360° view will appear after the product frames are uploaded.",
  },
} as const;

const categoryKeys: Category[] = ["all", "outerwear", "tops", "bottoms", "shoes"];
const BAG_STORAGE_KEY = "qi-shopping-bag-v1";

export default function Home() {
  const [language, setLanguage] = useState<Language>("RO");
  const [category, setCategory] = useState<Category>("all");
  const [availability, setAvailability] = useState<Availability>("all");
  const [bagItems, setBagItems] = useState<Record<string, number>>({});
  const [bagStorageReady, setBagStorageReady] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState("");
  const [completedOrder, setCompletedOrder] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productMedia, setProductMedia] = useState<"photos" | "video" | "spin">("photos");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [spinFrame, setSpinFrame] = useState(0);
  const spinDrag = useRef<{ x: number; frame: number } | null>(null);
  const t = copy[language];
  const selectedProduct = selectedProductId ? products.find((product) => product.id === selectedProductId) ?? null : null;
  const bagCount = useMemo(
    () => Object.values(bagItems).reduce((sum, quantity) => sum + quantity, 0),
    [bagItems],
  );

  useEffect(() => {
    try {
      const savedBag = JSON.parse(window.localStorage.getItem(BAG_STORAGE_KEY) ?? "{}") as Record<string, unknown>;
      const availableProductIds = new Set(products.map((product) => product.id));
      const restoredBag = Object.fromEntries(
        Object.entries(savedBag).filter(
          ([productId, quantity]) =>
            availableProductIds.has(productId) &&
            typeof quantity === "number" &&
            Number.isInteger(quantity) &&
            quantity > 0 &&
            quantity <= 99,
        ),
      ) as Record<string, number>;
      // Restoring device-local cart state is the synchronization performed by this effect.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBagItems(restoredBag);
    } catch {
      window.localStorage.removeItem(BAG_STORAGE_KEY);
    } finally {
      setBagStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!bagStorageReady) return;
    try {
      window.localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(bagItems));
    } catch {
      // The bag still works for this visit if browser storage is unavailable.
    }
  }, [bagItems, bagStorageReady]);

  useEffect(() => {
    if (!selectedProduct) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedProductId(null); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKeyDown); };
  }, [selectedProduct]);

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          (category === "all" || product.category === category) &&
          (availability === "all" || product.availability === availability),
      ),
    [category, availability],
  );

  function addToBag(productId: string) {
    setBagItems((items) => ({ ...items, [productId]: (items[productId] ?? 0) + 1 }));
    setStatusMessage(t.added);
    window.setTimeout(() => setStatusMessage(""), 1800);
  }

  function openProduct(productId: string) {
    setSelectedProductId(productId);
    setProductMedia("photos");
    setPhotoIndex(0);
    setSpinFrame(0);
  }

  function changeQuantity(productId: string, change: number) {
    setBagItems((items) => {
      const next = Math.max(0, (items[productId] ?? 0) + change);
      const updated = { ...items };
      if (next === 0) delete updated[productId]; else updated[productId] = next;
      return updated;
    });
  }

  const selectedBagItems = products.filter((product) => bagItems[product.id]).map((product) => ({ ...product, quantity: bagItems[product.id] }));

  async function submitCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCheckoutBusy(true); setCheckoutResult("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/orders/website", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerName: form.get("customerName"), email: form.get("email"), phone: form.get("phone"),
        delivery: form.get("delivery"), company: form.get("company"),
        marketingConsent: form.get("marketingConsent") === "on",
        items: selectedBagItems.map((item) => ({ sku: item.sku, quantity: item.quantity })),
      }),
    });
    const result = await response.json();
    if (response.ok) {
      if (result.checkoutUrl) {
        setCheckoutResult(t.redirectingPayment);
        setBagItems({}); formElement.reset();
        window.location.assign(result.checkoutUrl);
        return;
      }
      setBagItems({}); formElement.reset(); setCompletedOrder(String(result.orderNumber));
    } else setCheckoutResult(result.error ?? "The order could not be placed.");
    setCheckoutBusy(false);
  }

  function closeBag() {
    setBagOpen(false);
    if (completedOrder) setCompletedOrder("");
  }

  return (
    <main>
      <a className="skip-link" href="#collection">
        {t.heroPrimary}
      </a>

      <div className="announcement">{t.announcement}</div>

      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="QI Quality Imports">
          <span className="brand-monogram">QI</span>
          <span className="brand-name">Quality Imports</span>
        </a>

        <nav className={`primary-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
          <a href="#collection" onClick={() => setMenuOpen(false)}>{t.navCollection}</a>
          <a href="#collection" onClick={() => setMenuOpen(false)}>{t.navNew}</a>
          <a href="#resellers" onClick={() => setMenuOpen(false)}>{t.navResellers}</a>
        </nav>

        <div className="header-actions">
          <div className="language-switcher" aria-label="Website language">
            {(["RO", "RU", "EN"] as Language[]).map((item) => (
              <button
                className={language === item ? "active" : ""}
                key={item}
                onClick={() => setLanguage(item)}
                aria-pressed={language === item}
              >
                {item}
              </button>
            ))}
          </div>
          <button className="text-action" type="button">{t.account}</button>
          <button className="bag-action" type="button" aria-label={`${t.bag}: ${bagCount}`} onClick={() => setBagOpen(true)}>
            {t.bag} <span>{String(bagCount).padStart(2, "0")}</span>
          </button>
          <button
            className="menu-toggle"
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.heroTitle}</h1>
          <p className="hero-body">{t.heroBody}</p>
          <div className="hero-actions">
            <a className="button button-light" href="#collection">{t.heroPrimary}</a>
            <a className="text-link" href="#resellers">{t.heroSecondary}<span aria-hidden="true">↗</span></a>
          </div>
        </div>

        <div className="hero-stage" aria-label="QI curated fashion presentation">
          <div className="stage-grid" />
          <span className="stage-label stage-label-top">QI INSPECTED</span>
          <span className="stage-label stage-label-right">IN STOCK</span>
          <span className="stage-label stage-label-bottom">SELECTED PREORDER</span>
          <div className="garment garment-jacket" aria-hidden="true">
            <span className="garment-body" />
            <span className="garment-sleeve garment-sleeve-left" />
            <span className="garment-sleeve garment-sleeve-right" />
            <span className="garment-zip" />
            <span className="garment-tag">QI</span>
          </div>
          <span className="stage-number">01</span>
          <span className="stage-orbit" />
        </div>
      </section>

      <section className="trust-strip" aria-label="QI benefits">
        <div><span className="trust-mark">◇</span>{t.trustQuality}</div>
        <div><span className="trust-mark">◇</span>{t.trustPrice}</div>
        <div><span className="trust-mark">◇</span>{t.trustDelivery}</div>
      </section>

      <section className="collection-section" id="collection">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.collectionEyebrow}</p>
            <h2>{t.collectionTitle}</h2>
          </div>
          <p>{t.collectionBody}</p>
        </div>

        <div className="catalogue-controls">
          <div className="filter-group" aria-label="Product category">
            {categoryKeys.map((key) => (
              <button
                key={key}
                type="button"
                className={category === key ? "active" : ""}
                onClick={() => setCategory(key)}
                aria-pressed={category === key}
              >
                {t[key]}
              </button>
            ))}
          </div>
          <div className="filter-group filter-group-availability" aria-label="Availability">
            <button
              type="button"
              className={availability === "stock" ? "active" : ""}
              onClick={() => setAvailability(availability === "stock" ? "all" : "stock")}
              aria-pressed={availability === "stock"}
            >
              {t.stockFilter}
            </button>
            <button
              type="button"
              className={availability === "preorder" ? "active" : ""}
              onClick={() => setAvailability(availability === "preorder" ? "all" : "preorder")}
              aria-pressed={availability === "preorder"}
            >
              {t.preorderFilter}
            </button>
          </div>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="product-grid">
            {visibleProducts.map((product, index) => (
              <article className="product-card" key={product.id}>
                <button type="button" className={`product-art art-${product.art} tone-${product.tone} ${product.image ? "has-product-image" : ""}`} style={product.image ? { backgroundImage: `url(${product.image})` } : undefined} onClick={() => openProduct(product.id)} aria-label={`${t.viewDetails}: ${product.name}`}>
                  <span className="product-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="product-badge">{t.inspected}</span>
                  <span className="product-shape" aria-hidden="true" />
                  <span className="product-line" aria-hidden="true" />
                </button>
                <div className="product-info">
                  <div>
                    <h3><button type="button" className="product-title-button" onClick={() => openProduct(product.id)}>{product.name}</button></h3>
                    <p className={`availability availability-${product.availability}`}>
                      {product.availability === "stock" ? t.stock : t.preorder}
                    </p>
                  </div>
                  <div className="product-purchase">
                    <strong>{product.price}</strong>
                    <button type="button" onClick={() => addToBag(product.id)} aria-label={`${t.add}: ${product.name}`}>+</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>{t.empty}</p>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setCategory("all");
                setAvailability("all");
              }}
            >
              {t.reset}
            </button>
          </div>
        )}
      </section>

      <section className="process-section" id="process">
        <div className="process-intro">
          <p className="eyebrow">{t.processEyebrow}</p>
          <h2>{t.processTitle}</h2>
        </div>
        <div className="process-steps">
          {[
            ["01", t.step1Title, t.step1Body],
            ["02", t.step2Title, t.step2Body],
            ["03", t.step3Title, t.step3Body],
          ].map(([number, title, body]) => (
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reseller-section" id="resellers">
        <div className="reseller-copy">
          <p className="eyebrow">{t.resellerEyebrow}</p>
          <h2>{t.resellerTitle}</h2>
          <p>{t.resellerBody}</p>
          <div className="reseller-actions">
            <a className="button button-dark" href="#contact">{t.apply}</a>
            <a className="text-link text-link-dark" href="#process">{t.learn}<span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <dl className="reseller-stats">
          <div><dt>{t.resellerMinimum}</dt><dd>{t.resellerMinimumValue}</dd></div>
          <div><dt>{t.resellerPrice}</dt><dd>{t.resellerPriceValue}</dd></div>
          <div><dt>{t.resellerQuote}</dt><dd>{t.resellerQuoteValue}</dd></div>
        </dl>
      </section>

      <section className="quality-section">
        <div className="quality-art" aria-hidden="true">
          <span className="quality-ring" />
          <span className="quality-card"><b>QI</b><small>QUALITY / ORIGIN / COST</small></span>
          <span className="quality-stamp">VERIFIED<br />WITH CARE</span>
        </div>
        <div className="quality-copy">
          <p className="eyebrow">{t.qualityEyebrow}</p>
          <h2>{t.qualityTitle}</h2>
          <p>{t.qualityBody}</p>
          <a className="text-link" href="#process">{t.qualityLink}<span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <footer className="site-footer" id="contact">
        <div className="footer-top">
          <a className="brand-lockup footer-brand" href="#top" aria-label="QI Quality Imports">
            <span className="brand-monogram">QI</span>
            <span className="brand-name">Quality Imports</span>
          </a>
          <p>{t.footerLine}</p>
          <span className="support-pill">{t.support}</span>
        </div>
        <div className="footer-grid">
          <div><h3>{t.footerShop}</h3><a href="#collection">{t.navCollection}</a><a href="#collection">{t.navNew}</a></div>
          <div><h3>{t.footerBusiness}</h3><a href="#resellers">{t.navResellers}</a><a href="#resellers">Affiliate</a></div>
          <div><h3>{t.footerHelp}</h3><a href="#contact">Website chat</a><a href="#contact">Telegram / WhatsApp</a></div>
          <div><h3>{t.footerLegal}</h3><a href="/terms">{t.termsLink}</a><a href="/privacy">{t.privacyLink}</a></div>
        </div>
        <div className="footer-bottom"><span>{t.rights}</span><span>Chișinău · Moldova</span></div>
      </footer>

      {selectedProduct && <div className="product-modal-backdrop" role="presentation" onMouseDown={() => setSelectedProductId(null)}>
        <section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title" onMouseDown={(event) => event.stopPropagation()}>
          <button className="product-modal-close" type="button" onClick={() => setSelectedProductId(null)} aria-label={t.close}>×</button>
          <div className="product-modal-visual">
            <div className="product-media-tabs" role="tablist" aria-label={t.productDetails}>
              <button className={productMedia === "photos" ? "active" : ""} type="button" onClick={() => setProductMedia("photos")}>{t.photos}</button>
              <button className={productMedia === "video" ? "active" : ""} type="button" onClick={() => setProductMedia("video")}>{t.certifiedVideo}</button>
              <button className={productMedia === "spin" ? "active" : ""} type="button" onClick={() => setProductMedia("spin")}>{t.spin360}</button>
            </div>
            {productMedia === "video" ? selectedProduct.video ? <video className="product-video" src={selectedProduct.video} controls playsInline preload="metadata" /> : <div className="product-media-empty"><span>QI</span><b>{t.certifiedVideo}</b><p>{t.videoPending}</p></div> : productMedia === "spin" ? selectedProduct.spin360.length > 1 ? <>
              <div className="product-spin" role="img" aria-label={`${selectedProduct.name} ${t.spin360}`} style={{ backgroundImage: `url(${selectedProduct.spin360[spinFrame]})` }} onPointerDown={(event) => { spinDrag.current = { x: event.clientX, frame: spinFrame }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!spinDrag.current) return; const movement = Math.round((event.clientX - spinDrag.current.x) / 14); const count = selectedProduct.spin360.length; setSpinFrame((spinDrag.current.frame - movement % count + count) % count); }} onPointerUp={(event) => { spinDrag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} />
              <p className="spin-help">↔ {t.spinHelp}</p>
              <input className="spin-range" type="range" min="0" max={selectedProduct.spin360.length - 1} value={spinFrame} onChange={(event) => setSpinFrame(Number(event.target.value))} aria-label={t.spin360} />
            </> : <div className="product-media-empty"><span>360°</span><b>{t.spin360}</b><p>{t.spinPending}</p></div> : selectedProduct.gallery.length ? <>
              <div className="product-photo" role="img" aria-label={`${selectedProduct.name} ${photoIndex + 1}`} style={{ backgroundImage: `url(${selectedProduct.gallery[photoIndex]})` }} />
              {selectedProduct.gallery.length > 1 && <div className="product-thumbnails">{selectedProduct.gallery.map((image, index) => <button type="button" key={`${image}-${index}`} className={photoIndex === index ? "active" : ""} style={{ backgroundImage: `url(${image})` }} onClick={() => setPhotoIndex(index)} aria-label={`${t.photos} ${index + 1}`} />)}</div>}
            </> : <div className={`product-modal-art art-${selectedProduct.art} tone-${selectedProduct.tone}`}><span className="product-shape"/><span className="product-line"/></div>}
          </div>
          <div className="product-modal-copy">
            <p className="eyebrow">QI / {selectedProduct.sku}</p>
            <h2 id="product-modal-title">{selectedProduct.name}</h2>
            <p className={`availability availability-${selectedProduct.availability}`}>{selectedProduct.availability === "stock" ? t.stock : t.preorder}</p>
            <p className="product-modal-description">{selectedProduct.details}</p>
            {selectedProduct.materials && <div className="product-detail-block"><h3>{t.materials}</h3><p>{selectedProduct.materials}</p></div>}
            {selectedProduct.sizes && <div className="product-detail-block"><h3>{t.sizes}</h3><p>{selectedProduct.sizes}</p></div>}
            {selectedProduct.availability === "stock" && <p className="product-stock-count">{selectedProduct.stockQuantity} {t.quantityAvailable}</p>}
            <div className="product-modal-buy"><strong>{selectedProduct.price}</strong><button type="button" onClick={() => { addToBag(selectedProduct.id); setSelectedProductId(null); setBagOpen(true); }}>{t.add}</button></div>
          </div>
        </section>
      </div>}

      <div className={`toast ${statusMessage ? "visible" : ""}`} role="status" aria-live="polite">
        {statusMessage}
      </div>

      <div className={`bag-backdrop ${bagOpen ? "visible" : ""}`} onClick={closeBag} />
      <aside className={`bag-drawer ${bagOpen ? "open" : ""}`} aria-hidden={!bagOpen} aria-label="Shopping bag">
        <div className="bag-drawer-head"><div><p>QI / CHECKOUT</p><h2>{t.checkoutTitle}</h2></div><button type="button" onClick={closeBag} aria-label="Close bag">×</button></div>
        {completedOrder ? <div className="bag-empty bag-complete"><span>✓ RESERVED</span><h3>{t.reservationTitle}</h3><b>{completedOrder}</b><p>{t.reservationBody}</p><button type="button" onClick={closeBag}>{t.continueShopping}</button></div> : selectedBagItems.length === 0 ? <div className="bag-empty"><span>00</span><h3>{t.emptyBag}</h3><button type="button" onClick={closeBag}>{t.continueShopping}</button></div> : <>
          <div className="bag-lines">{selectedBagItems.map((item) => <article key={item.id}><div><b>{item.name}</b><small>{item.sku} · {item.price}</small></div><div className="bag-quantity"><button type="button" onClick={() => changeQuantity(item.id, -1)}>−</button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)}>+</button></div></article>)}</div>
          <form className="checkout-form" onSubmit={submitCheckout}>
            <div className="checkout-intro"><span>01 / {t.checkoutSection}</span><h3>{t.deliveryDetails}</h3><p>{t.checkoutHelp}</p></div>
            <label>{t.fullName}<input name="customerName" required minLength={2} autoComplete="name" placeholder={t.fullNamePlaceholder} /></label>
            <div><label>{t.emailLabel}<input name="email" type="email" required autoComplete="email" placeholder="name@example.com" /></label><label>{t.phoneLabel}<input name="phone" required minLength={6} autoComplete="tel" placeholder="+373 60 000 000" /></label></div>
            <label>{t.deliveryLabel}<textarea name="delivery" required minLength={4} rows={2} placeholder={t.deliveryPlaceholder} /></label>
            <label className="checkout-consent"><input name="marketingConsent" type="checkbox" /> <span>{t.marketingConsent}</span></label>
            <label className="checkout-trap" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
            {checkoutResult && <p className="checkout-result" role="status">{checkoutResult}</p>}
            <button className="checkout-submit" disabled={checkoutBusy}>{checkoutBusy ? t.placingOrder : t.placeOrder}</button>
            <small>✓ {t.secureCheckout}</small>
          </form>
        </>}
      </aside>
    </main>
  );
}

import { useState, useEffect, useRef, Fragment } from "react";
import "../Karwan.css";
import { translations } from "../mocks/karwanTranslations.js"; // adjust the path to where you put the file
import BrandLogo from "../components/BrandLogo.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { useLanguage } from "../lib/i18n.jsx";

const heroImages = [
  "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=1600&q=72",
  "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1600&q=72",
  "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1600&q=72",
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1600&q=72",
  "https://images.unsplash.com/photo-1594708767771-a7502209ff51?auto=format&fit=crop&w=1600&q=72",
];

/* "|" = line break, "*text*" = highlighted span */
const rich = (s) =>
  s.split("|").map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line
        .split(/\*(.+?)\*/)
        .map((part, j) => (j % 2 ? <span key={j}>{part}</span> : part))}
    </Fragment>
  ));

const serviceIcons = [
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="10" y="7" width="28" height="34" rx="4" />
    <path d="M17 17h14M17 24h14M17 31h9" />
  </svg>,
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="m24 5 17 9-17 9-17-9 17-9Z" />
    <path d="M7 14v20l17 9 17-9V14M24 23v20M15 10l17 9" />
  </svg>,
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="18" />
    <circle cx="24" cy="24" r="11" />
    <circle cx="24" cy="24" r="4" />
    <path d="m27 21 12-12" />
  </svg>,
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 7v34M14 12h20M8 41h32M14 12 5 29h18L14 12ZM34 12l-9 17h18L34 12Z" />
    <path d="M5 29c1 5 17 5 18 0M25 29c1 5 17 5 18 0" />
  </svg>,
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M4 12h25v22H4zM29 20h8l7 8v6H29z" />
    <circle cx="13" cy="36" r="4" />
    <circle cx="36" cy="36" r="4" />
    <path d="M34 20v8h10" />
  </svg>,
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M39 17A16 16 0 0 0 11 12L7 17" />
    <path d="M7 8v9h9M9 31a16 16 0 0 0 28 5l4-5" />
    <path d="M41 40v-9h-9" />
  </svg>,
];
const serviceLinks = [
  "#how",
  "#dashboard",
  "#simulator",
  "#simulator",
  "#dashboard",
  "#simulator",
];

const flowIcons = [
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M39 20c0 11-15 24-15 24S9 31 9 20a15 15 0 1 1 30 0Z" />
    <circle cx="24" cy="20" r="5" />
  </svg>,
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <rect x="9" y="5" width="30" height="38" rx="4" />
    <path d="M15 12h18M16 21h3m5 0h3m5 0h1M16 29h3m5 0h3m5 0h1M16 36h3m5 0h3m5 0h1" />
  </svg>,
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path d="M4 12h25v22H4zM29 20h8l7 8v6H29z" />
    <circle cx="13" cy="36" r="4" />
    <circle cx="36" cy="36" r="4" />
    <path d="M34 20v8h10" />
  </svg>,
];

const URGENCY_KEYS = ["Critical", "High", "Medium", "Low"];
const NEED_KEYS = ["Water", "Food", "Medicine", "Shelter kits"];

/**
 * Karwan landing page.
 *
 * Props:
 *  - onSubmitRequest: called whenever any "Submit a request" button/link is clicked.
 *    If you don't pass it, the popup form opens instead.
 */
export default function Karwan({ onSubmitRequest, demoButton = null }) {
  const rootRef = useRef(null);
  const areaRef = useRef(null);
  const toastTimer = useRef(null);
  const loadedHeroSlides = useRef(new Set([0]));

  /* ---------- language: one shared choice (English / Urdu / Sindhi), remembered between visits ---------- */
  const { lang } = useLanguage();
  const t = translations[lang] ?? translations.en;
  const isUr = lang !== "en"; // right-to-left layout (Urdu and Sindhi)

  const [scrolled, setScrolled] = useState(false);
  const [current, setCurrent] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [navDisplay, setNavDisplay] = useState("");
  const [toast, setToast] = useState({ msg: "", show: false });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    area: "",
    urgency: "Critical",
    need: "Water",
  });
  const [demand, setDemand] = useState(10);
  const [stock, setStock] = useState(75);
  const [capacity, setCapacity] = useState(80);

  /* ---------- page title (follows language, restored on unmount) ---------- */
  useEffect(() => {
    const prev = document.title;
    document.title = t.pageTitle;
    return () => {
      document.title = prev;
    };
  }, [t.pageTitle]);

  /* ---------- nav / hero brand visibility on scroll ---------- */
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 70);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  /* ---------- hero slideshow (3s) ---------- */
  useEffect(() => {
    const timer = setTimeout(
      () => setCurrent((c) => (c + 1) % t.slides.length),
      3000,
    );
    return () => clearTimeout(timer);
  }, [current, timerKey, t.slides.length]);

  // Fetch only the next hero while the browser is idle. Keeping URLs off the
  // other slide elements prevents five large photos downloading at once.
  useEffect(() => {
    const nextIndex = (current + 1) % heroImages.length;
    const warm = () => {
      const next = new Image();
      next.src = heroImages[nextIndex];
      loadedHeroSlides.current.add(nextIndex);
    };
    const id = window.requestIdleCallback
      ? window.requestIdleCallback(warm, { timeout: 2200 })
      : window.setTimeout(warm, 1200);
    return () => window.requestIdleCallback
      ? window.cancelIdleCallback(id)
      : window.clearTimeout(id);
  }, [current]);

  const goToSlide = (i) => {
    setCurrent(i);
    setTimerKey((k) => k + 1);
  };

  /* ---------- scroll reveal ---------- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    rootRef.current
      .querySelectorAll(".reveal")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* ---------- toast ---------- */
  const showToast = (msg) => {
    setToast({ msg, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(
      () => setToast((x) => ({ ...x, show: false })),
      3000,
    );
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ---------- modal ---------- */
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  useEffect(() => {
    if (modalOpen && areaRef.current) areaRef.current.focus();
  }, [modalOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleSubmitRequest = () => {
    if (onSubmitRequest) onSubmitRequest();
    else openModal();
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    const { area, urgency, need } = form;
    closeModal();
    showToast(
      t.sampleToast(t.urgencyOptions[urgency], t.needOptions[need], area),
    );
    setForm({ area: "", urgency: "Critical", need: "Water" });
  };

  /* ---------- simulator ---------- */
  const f = Math.max(
    18,
    Math.min(
      96,
      Math.round(stock * 0.58 + capacity * 0.27 + (100 - demand) * 0.15),
    ),
  );
  const simMessage =
    f >= 78 ? t.sim.msgOk : f >= 60 ? t.sim.msgMid : t.sim.msgLow;
  loadedHeroSlides.current.add(current);

  const resetSim = () => {
    setDemand(10);
    setStock(75);
    setCapacity(80);
    showToast(t.sim.resetToast);
  };

  const navLinksOpen = navDisplay === "flex";
  const slide = t.slides[current];
  const L = t.dashboard.legend;

  return (
    <div ref={rootRef} dir={t.dir} lang={lang} className={`karwan-landing${isUr ? " rtl" : ""}`}>
      <header className={`nav${scrolled ? " visible" : ""}`}>
        <a className="brand" href="#home" aria-label={t.brandLabel}>
          <BrandLogo variant="ink" height={34} iconOnly={isUr} text={t.brand} />
          <span
            style={{
              fontSize: 9,
              letterSpacing: ".1em",
              marginInlineStart: -5,
              alignSelf: "flex-start",
              marginTop: 4,
            }}
          >
            {t.tag}
          </span>
        </a>
        <nav
          className={`navlinks${navLinksOpen ? " mobileOpen" : ""}`}
          style={navDisplay ? { display: navDisplay } : undefined}
        >
          <a href="#platform">{t.nav.platform}</a>
          <a href="#how">{t.nav.how}</a>
          <a href="#impact">{t.nav.impact}</a>
          <a href="#simulator">{t.nav.demo}</a>
        </nav>
        <div className="navactions">
          <LanguageToggle unstyled className="pill outline urdu langMenu" />
          <button className="pill dark" onClick={handleSubmitRequest}>
            {t.submit} <span>↗</span>
          </button>
          <button
            className="menu"
            aria-label={t.openMenu}
            onClick={() =>
              setNavDisplay((d) => (d === "flex" ? "none" : "flex"))
            }
          >
            ☰
          </button>
        </div>
      </header>
      <main>
        <section className="hero" id="home">
          <div
            className={`heroTopBrand${scrolled ? " hidden" : ""}`}
            id="heroTopBrand"
          >
            <a className="brand" href="#home" aria-label={t.brandLabel}>
              <BrandLogo
                variant="white"
                height={38}
                iconOnly={isUr}
                text={t.brand}
              />
            </a>
            <LanguageToggle unstyled className="pill outline urdu langMenu" />
          </div>
          <div className="heroSlides">
            {heroImages.map((img, i) => (
              <div
                key={i}
                className={`heroSlide${current === i ? " active" : ""}`}
                style={loadedHeroSlides.current.has(i) ? { backgroundImage: `url('${img}')` } : undefined}
              ></div>
            ))}
          </div>
          <div className="wrap heroContent">
            <h1 id="heroTitle">{rich(slide.title)}</h1>
            <p id="heroDesc">{slide.desc}</p>
            <div className="heroCtas">
              <button className="pill lime" onClick={handleSubmitRequest}>
                {t.submitHero}
              </button>
              {demoButton}
            </div>
          </div>
          <div className="heroBadge">
            <strong id="heroStat">{slide.stat}</strong>
            <small id="heroStatLabel">{slide.label}</small>
          </div>
          <div className="wrap heroBottom">
            <div className="slideDots" aria-label={t.heroSlides}>
              {t.slides.map((_, i) => (
                <button
                  key={i}
                  className={`slideDot${current === i ? " active" : ""}`}
                  aria-label={t.slideN(i + 1)}
                  onClick={() => goToSlide(i)}
                ></button>
              ))}
            </div>
          </div>
        </section>

        <div className="ticker">
          <div className="tickerTrack">
            {[0, 1].map((k) => (
              <span key={k}>
                {t.ticker.map((item, i) => (
                  <Fragment key={i}>
                    {item} <b>✳</b>{" "}
                  </Fragment>
                ))}
              </span>
            ))}
          </div>
        </div>

        <section className="section" id="platform">
          <div className="wrap">
            <div className="sectionHead reveal">
              <div>
                <div className="kicker">{t.platform.kicker}</div>
                <h2>{rich(t.platform.title)}</h2>
              </div>
              <p>{t.platform.desc}</p>
            </div>
            <div className="serviceGrid">
              {t.services.map((s, i) => (
                <article className="service reveal" key={i}>
                  <div className="serviceNum">{s.num}</div>
                  <div className="serviceIcon">{serviceIcons[i]}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  <a
                    className="arrowCircle"
                    href={serviceLinks[i]}
                    aria-label={s.title}
                  >
                    ↗
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="safety" id="how">
          <div className="wrap">
            <div className="safetyPanel reveal">
              <div
                className="safetyImage"
                role="img"
                aria-label={t.safety.imageLabel}
              ></div>
              <div className="safetyText">
                <h2>{t.safety.title}</h2>
                <p>{t.safety.desc}</p>
                <a href="#dashboard" className="pill dark">
                  {t.safety.button}
                </a>
                <div className="metrics">
                  {["5", "4", "3", "1"].map((n, i) => (
                    <div className="metric" key={i}>
                      <strong>{n}</strong>
                      <span>{t.safety.metrics[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="dashboard" style={{ paddingTop: 20 }}>
          <div className="wrap">
            <div className="sectionHead reveal">
              <div>
                <div className="kicker">{t.dashboard.kicker}</div>
                <h2>{rich(t.dashboard.title)}</h2>
              </div>
              <p>{t.dashboard.desc}</p>
            </div>
            <div className="dashboard reveal">
              <div>
                <div className="dashTop">
                  <h3>{t.dashboard.overview}</h3>
                  <span className="live">{t.dashboard.live}</span>
                </div>
                <div className="map" aria-label={t.dashboard.mapLabel}>
                  <div className="river"></div>
                  <div className="route"></div>
                  <div className="mapLabel" style={{ left: "7%", top: "15%" }}>
                    {t.dashboard.sukkur}
                  </div>
                  <div className="mapLabel" style={{ right: "6%", top: "22%" }}>
                    {t.dashboard.dadu}
                  </div>
                  <div
                    className="mapLabel"
                    style={{ left: "35%", bottom: "18%" }}
                  >
                    {t.dashboard.hyderabad}
                  </div>
                  <div
                    className="mapLabel"
                    style={{ right: "7%", bottom: "18%" }}
                  >
                    {t.dashboard.badin}
                  </div>
                  <div
                    className="pin red"
                    style={{ left: "73%", top: "33%" }}
                  ></div>
                  <div
                    className="pin orange"
                    style={{ left: "61%", top: "56%" }}
                  ></div>
                  <div
                    className="pin green"
                    style={{ left: "28%", top: "60%" }}
                  ></div>
                  <div
                    className="pin blue"
                    style={{ left: "45%", top: "30%" }}
                  ></div>
                  <div className="truck" aria-label={t.dashboard.truck}>
                    <svg
                      viewBox="0 0 32 32"
                      width="25"
                      height="25"
                      fill="none"
                      stroke="#171914"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8h17v15H3zM20 13h5l4 5v5h-9z" />
                      <circle cx="9" cy="25" r="2.5" />
                      <circle cx="24" cy="25" r="2.5" />
                    </svg>
                  </div>
                  <div className="mapLegend">
                    <span>
                      <i
                        className="legendDot"
                        style={{ background: "var(--red)" }}
                      ></i>
                      {L.critical}
                    </span>
                    <span>
                      <i
                        className="legendDot"
                        style={{ background: "var(--orange)" }}
                      ></i>
                      {L.high}
                    </span>
                    <span>
                      <i
                        className="legendDot"
                        style={{ background: "var(--blue)" }}
                      ></i>
                      {L.transit}
                    </span>
                    <span>
                      <i
                        className="legendDot"
                        style={{ background: "var(--green)" }}
                      ></i>
                      {L.delivered}
                    </span>
                  </div>
                </div>
                <div className="dashActions">
                  <small>{t.dashboard.note}</small>
                  <button
                    className="pill dark"
                    onClick={() => showToast(t.dashboard.refreshToast)}
                  >
                    {t.dashboard.refresh}
                  </button>
                </div>
              </div>
              <div className="dashSide">
                <div className="miniKpis">
                  {t.dashboard.kpis.map(([label, value], i) => (
                    <div className="miniKpi" key={i}>
                      <span>{label}</span>
                      <strong
                        style={i === 3 ? { color: "var(--red)" } : undefined}
                      >
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="requestList">
                  <h4>
                    {t.dashboard.queue}{" "}
                    <span
                      style={{
                        float: isUr ? "left" : "right",
                        color: "#8a8c7f",
                        fontWeight: 500,
                      }}
                    >
                      {t.dashboard.demoData}
                    </span>
                  </h4>
                  {t.dashboard.requests.map((r, i) => (
                    <div className="request" key={i}>
                      <div
                        className={`priority${i === 1 ? " high" : i === 2 ? " medium" : ""}`}
                      ></div>
                      <div>
                        <strong>{r.title}</strong>
                        <small>{r.sub}</small>
                      </div>
                      <span
                        className="status"
                        style={
                          i === 2
                            ? { background: "#f7f3d8", color: "#8d7614" }
                            : undefined
                        }
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="impact" id="impact">
          <div className="wrap">
            <div className="sectionHead reveal">
              <div>
                <div className="kicker">{t.impact.kicker}</div>
                <h2>{rich(t.impact.title)}</h2>
              </div>
              <p>{t.impact.desc}</p>
            </div>
            <div className="impactGrid reveal">
              <article className="storyFeature">
                <img
                  src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=85"
                  alt={t.impact.storyAlt}
                  loading="lazy"
                  decoding="async"
                />
                <div className="storyCopy">
                  <div className="kicker">{t.impact.storyKicker}</div>
                  <h3>{t.impact.storyTitle}</h3>
                  <p>{t.impact.storyDesc}</p>
                  <a href="#simulator" className="pill lime">
                    {t.impact.storyButton}
                  </a>
                </div>
              </article>
              <div className="impactSide">
                <article className="impactCard">
                  <div>
                    <div className="kicker">{t.impact.card1.kicker}</div>
                    <div className="impactStat">100%</div>
                    <h3>{t.impact.card1.title}</h3>
                    <p>{t.impact.card1.desc}</p>
                  </div>
                  <a className="pill dark" href="#simulator">
                    {t.impact.card1.button}
                  </a>
                </article>
                <article className="impactCard">
                  <div>
                    <div className="kicker">{t.impact.card2.kicker}</div>
                    <h3>{t.impact.card2.title}</h3>
                    <p>{t.impact.card2.desc}</p>
                  </div>
                  <a className="pill outline" href="#simulator">
                    {t.impact.card2.button}
                  </a>
                </article>
              </div>
            </div>
            <div className="newsGrid">
              {[
                "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=800&q=80",
                "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80",
              ].map((src, i) => (
                <article className="newsCard reveal" key={i}>
                  <img src={src} alt={t.impact.news[i].alt} loading="lazy" decoding="async" />
                  <div>
                    <small>{t.impact.news[i].tag}</small>
                    <h3>{t.impact.news[i].title}</h3>
                    <p>{t.impact.news[i].desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="simulator">
          <div className="wrap">
            <div className="simulator reveal">
              <div>
                <div className="eyebrow">
                  <span className="dot"></span> {t.sim.eyebrow}
                </div>
                <h2>{t.sim.title}</h2>
                <p>{t.sim.desc}</p>
                <div className="baseline">
                  <span>{t.sim.baseline}</span>
                  <span>{t.sim.fcfs}</span>
                  <span style={{ background: "var(--lime)", color: "#171914" }}>
                    {t.sim.karwan}
                  </span>
                </div>
              </div>
              <div className="simControl">
                <div className="dashTop">
                  <h3 style={{ margin: 0 }}>{t.sim.panel}</h3>
                  <span className="live">{t.sim.interactive}</span>
                </div>
                <label htmlFor="demand">
                  {t.sim.demand}{" "}
                  <strong id="demandVal" dir="ltr">
                    +{demand}%
                  </strong>
                </label>
                <input
                  id="demand"
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={demand}
                  onChange={(e) => setDemand(+e.target.value)}
                />
                <label htmlFor="stock">
                  {t.sim.stock}{" "}
                  <strong id="stockVal" dir="ltr">
                    {stock}%
                  </strong>
                </label>
                <input
                  id="stock"
                  type="range"
                  min="25"
                  max="100"
                  step="5"
                  value={stock}
                  onChange={(e) => setStock(+e.target.value)}
                />
                <label htmlFor="capacity">
                  {t.sim.capacity}{" "}
                  <strong id="capacityVal" dir="ltr">
                    {capacity}%
                  </strong>
                </label>
                <input
                  id="capacity"
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={capacity}
                  onChange={(e) => setCapacity(+e.target.value)}
                />
                <div className="simNumbers">
                  <div className="simNumber">
                    <small>{t.sim.fulfilment}</small>
                    <strong className="limeText" id="fulfilment">
                      {f}%
                    </strong>
                  </div>
                  <div className="simNumber">
                    <small>{t.sim.gap}</small>
                    <strong id="gap">{100 - f}%</strong>
                  </div>
                </div>
                <p className="simNote" id="simMessage">
                  {simMessage}
                </p>
                <button className="pill lime" onClick={resetSim}>
                  {t.sim.reset}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="sectionHead reveal">
              <div>
                <div className="kicker">{t.flow.kicker}</div>
                <h2>{t.flow.title}</h2>
              </div>
              <p>{t.flow.desc}</p>
            </div>
            <div className="serviceGrid">
              {t.flow.steps.map((s, i) => (
                <article className="service reveal" key={i}>
                  <div className="serviceNum">{s.num}</div>
                  <div className="serviceIcon">{flowIcons[i]}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                  {i === 0 ? (
                    <a
                      href="#"
                      className="arrowCircle"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSubmitRequest();
                      }}
                    >
                      ↗
                    </a>
                  ) : (
                    <a
                      href={i === 1 ? "#simulator" : "#dashboard"}
                      className="arrowCircle"
                    >
                      ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="footerTop">
            <div className="footerBrand">
              <a className="brand" href="#home">
                <BrandLogo
                  variant="ink"
                  height={38}
                  iconOnly={isUr}
                  text={t.brand}
                />
              </a>
              <p>{t.footer.tagline}</p>
            </div>
            <div className="footerLinks">
              <div>
                <h4>{t.footer.explore}</h4>
                <a href="#platform">{t.footer.platform}</a>
                <a href="#dashboard">{t.footer.ops}</a>
                <a href="#simulator">{t.footer.sim}</a>
              </div>
              <div>
                <h4>{t.footer.workflows}</h4>
                <a href="#how">{t.footer.reqPriority}</a>
                <a href="#dashboard">{t.footer.invRoutes}</a>
                <a href="#impact">{t.footer.human}</a>
              </div>
              <div>
                <h4>{t.footer.prototype}</h4>
                <a href="#home">{t.footer.top}</a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    showToast(t.footer.aboutToast);
                  }}
                >
                  {t.footer.about}
                </a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmitRequest();
                  }}
                >
                  {t.footer.sample}
                </a>
              </div>
            </div>
          </div>
          <div className="footerBottom">
            <span>{t.footer.copyright}</span>
            <span>{t.footer.disclaimer}</span>
          </div>
        </div>
      </footer>

      <div
        className={`toast${toast.show ? " show" : ""}`}
        id="toast"
        role="status"
        aria-live="polite"
      >
        {toast.msg}
      </div>

      <div
        className={`modalBack${modalOpen ? " open" : ""}`}
        id="modalBack"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        onClick={(e) => {
          if (e.target.id === "modalBack") closeModal();
        }}
      >
        <div className="modal">
          <button
            className="modalClose"
            aria-label={t.modal.close}
            onClick={closeModal}
          >
            ×
          </button>
          <div className="kicker">{t.modal.kicker}</div>
          <h2 id="modalTitle">{t.modal.title}</h2>
          <p>{t.modal.desc}</p>
          <form id="requestForm" onSubmit={onFormSubmit}>
            <label htmlFor="area">{t.modal.area}</label>
            <input
              id="area"
              ref={areaRef}
              required
              placeholder={t.modal.areaPlaceholder}
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />
            <label htmlFor="urgency">{t.modal.urgency}</label>
            <select
              id="urgency"
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
            >
              {URGENCY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t.urgencyOptions[k]}
                </option>
              ))}
            </select>
            <label htmlFor="need">{t.modal.need}</label>
            <select
              id="need"
              value={form.need}
              onChange={(e) => setForm({ ...form, need: e.target.value })}
            >
              {NEED_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t.needOptions[k]}
                </option>
              ))}
            </select>
            <button className="pill dark" type="submit">
              {t.modal.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

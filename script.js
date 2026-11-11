/* ===== EnzoBiryani — script.js ===== */

/* ---------- Settings ----------
   FORM_ENDPOINT / NEWSLETTER_ENDPOINT: leave empty to run in DEMO mode
   (nothing is sent anywhere; GA4 gets "demo_form_submit").
   If you later set up a real form service (e.g. Formspree) paste its URL
   here. Then GA4 gets generate_lead / sign_up ONLY after the service
   confirms success. */
const FORM_ENDPOINT = "";
const NEWSLETTER_ENDPOINT = "";

/* Safe wrapper: never breaks the site if GA is blocked or not loaded */
function track(eventName, params) {
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params || {});
  }
  console.log("[GA4 event]", eventName, params || {});
}

document.addEventListener("DOMContentLoaded", () => {
  /* Footer year */
  document.querySelectorAll(".year").forEach(el => (el.textContent = new Date().getFullYear()));

  /* Mobile nav toggle */
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
  }

  /* Image fallback: if a photo fails to load, show a saffron gradient + emoji */
  document.querySelectorAll(".card-img img, .img-box img").forEach(img => {
    const markBroken = () => { img.classList.add("broken"); img.parentElement.classList.add("img-fallback"); };
    img.addEventListener("error", markBroken);
    if (img.complete && img.naturalWidth === 0) markBroken();
  });

  /* Scroll reveal */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("visible"));
  }

  /* Product category filter */
  const filterBtns = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll("[data-category]");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => { b.classList.remove("active"); b.setAttribute("aria-pressed", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      const cat = btn.dataset.filter;
      cards.forEach(card => card.classList.toggle("hide", cat !== "all" && card.dataset.category !== cat));
    });
  });

  /* Product buttons -> GA4 select_item  (+ details dialog) */
  const dialog = document.getElementById("product-dialog");
  function itemFrom(card) {
    return {
      item_id: card.dataset.id,
      item_name: card.dataset.name,
      item_category: card.dataset.category,
      price: Number(card.dataset.price),
      currency: "INR"
    };
  }
  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest("[data-id]");
      if (!card) return;
      const item = itemFrom(card);
      track("select_item", {
        item_list_name: btn.dataset.list || "Products",
        button_action: btn.dataset.action,
        items: [item]
      });
      if (btn.dataset.action === "view_details" && dialog && dialog.showModal) {
        dialog.querySelector("h3").textContent = item.item_name;
        dialog.querySelector(".d-desc").textContent = card.dataset.desc;
        dialog.querySelector(".price").textContent = "₹" + item.price;
        dialog.showModal();
      }
    });
  });
  if (dialog) {
    dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  }

  /* ---------- Validation helpers ---------- */
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  function setError(input, msg) {
    const err = document.getElementById(input.id + "-error");
    if (err) err.textContent = msg;
    input.classList.toggle("invalid", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  async function postTo(endpoint, formEl) {
    const res = await fetch(endpoint, {
      method: "POST",
      body: new FormData(formEl),
      headers: { Accept: "application/json" }
    });
    return res.ok;
  }

  /* ---------- Contact form ---------- */
  const form = document.getElementById("contact-form");
  if (form) {
    const status = document.getElementById("form-status");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const name = form.elements.name, email = form.elements.email,
            subject = form.elements.subject, message = form.elements.message;
      let valid = true;
      setError(name, name.value.trim().length < 2 ? "Please enter your name (min 2 characters)." : "");
      setError(email, !emailOk(email.value.trim()) ? "Please enter a valid email address." : "");
      setError(subject, subject.value.trim().length < 3 ? "Please enter a subject (min 3 characters)." : "");
      setError(message, message.value.trim().length < 10 ? "Message should be at least 10 characters." : "");
      [name, email, subject, message].forEach(f => { if (f.classList.contains("invalid")) valid = false; });
      if (!valid) return;

      if (FORM_ENDPOINT) {
        try {
          const ok = await postTo(FORM_ENDPOINT, form);
          if (ok) {
            track("generate_lead", { form_name: "contact_form", subject: subject.value.trim() });
            status.textContent = "Thank you! Your message has been sent. We'll reply within 24 hours.";
            status.classList.add("show");
            form.reset();
          } else { throw new Error("Server error"); }
        } catch (err) {
          status.textContent = "Sorry, something went wrong. Please try again later.";
          status.classList.add("show");
        }
      } else {
        track("demo_form_submit", { form_name: "contact_form" });
        status.textContent = "Demo mode: your form passed validation, but no message was sent because this site has no form service connected.";
        status.classList.add("show");
        form.reset();
      }
    });
  }

  /* ---------- Newsletter ---------- */
  const news = document.getElementById("newsletter-form");
  if (news) {
    const nStatus = document.getElementById("newsletter-status");
    news.addEventListener("submit", async e => {
      e.preventDefault();
      const email = news.elements.newsletter_email;
      if (!emailOk(email.value.trim())) { setError(email, "Please enter a valid email address."); return; }
      setError(email, "");

      if (NEWSLETTER_ENDPOINT) {
        try {
          const ok = await postTo(NEWSLETTER_ENDPOINT, news);
          if (ok) {
            track("sign_up", { method: "newsletter" });
            nStatus.textContent = "You're subscribed! Watch your inbox for offers.";
            nStatus.classList.add("show");
            news.reset();
          } else { throw new Error("Server error"); }
        } catch (err) {
          nStatus.textContent = "Sorry, subscription failed. Please try again later.";
          nStatus.classList.add("show");
        }
      } else {
        track("demo_form_submit", { form_name: "newsletter_form" });
        nStatus.textContent = "Demo mode: email looks valid, but no subscription was created (no service connected).";
        nStatus.classList.add("show");
        news.reset();
      }
    });
  }
});

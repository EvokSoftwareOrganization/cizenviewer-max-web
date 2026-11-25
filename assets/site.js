/* ÇİZEN Viewer Max — site behaviour. No dependencies, no tracking. */
(() => {
  "use strict";

  // Store links. Leave empty while the app is not live: the buttons then say "Coming soon".
  // When the app is published, paste the store URLs here; every store button on every page updates.
  const STORE_LINKS = {
    ios: "https://apps.apple.com/app/id6835437347",
    android: "", // e.g. "https://play.google.com/store/apps/details?id=com.example.app"
  };

  const root = document.documentElement;
  const THEME_KEY = "cizen-theme";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const prefs = {
    get() {
      try {
        return localStorage.getItem(THEME_KEY);
      } catch (e) {
        return null;
      }
    },
    set(value) {
      try {
        localStorage.setItem(THEME_KEY, value);
      } catch (e) {
        /* storage blocked: the choice lasts for this page view only */
      }
    },
  };

  /* ---------- Theme ---------- */
  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    const color = theme === "dark" ? "#0a0b0e" : "#fbfaf8";
    $$('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
    $$("[data-theme-toggle]").forEach((b) => b.setAttribute("aria-pressed", String(theme === "dark")));
  };

  applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

  $$("[data-theme-toggle]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      prefs.set(next);
      if (!reduceMotion) {
        root.classList.add("theme-switching");
        window.setTimeout(() => root.classList.remove("theme-switching"), 350);
      }
      applyTheme(next);
    })
  );

  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = (e) => {
    const saved = prefs.get();
    if (saved !== "light" && saved !== "dark") applyTheme(e.matches ? "dark" : "light");
  };
  if (systemDark.addEventListener) systemDark.addEventListener("change", onSystemChange);
  else if (systemDark.addListener) systemDark.addListener(onSystemChange);

  /* ---------- Header ---------- */
  const nav = document.querySelector("[data-nav]");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const toggle = nav.querySelector("[data-menu-toggle]");
    const menu = toggle && document.getElementById(toggle.getAttribute("aria-controls"));
    if (toggle && menu) {
      const setMenu = (open) => {
        nav.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));
      };
      toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
      menu.addEventListener("click", (e) => {
        if (e.target.closest("a")) setMenu(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && nav.classList.contains("is-open")) {
          setMenu(false);
          toggle.focus();
        }
      });
      const wide = window.matchMedia("(min-width: 921px)");
      const onWide = (e) => {
        if (e.matches) setMenu(false);
      };
      if (wide.addEventListener) wide.addEventListener("change", onWide);
    }
  }

  /* ---------- Store buttons ---------- */
  $$("[data-store]").forEach((el) => {
    const url = STORE_LINKS[el.getAttribute("data-store")];
    if (!url) return;
    el.setAttribute("href", url);
    el.setAttribute("rel", "noopener");
    el.classList.add("is-live");
  });

  /* ---------- Tabs ---------- */
  $$("[data-tabs]").forEach((wrap) => {
    const list = wrap.querySelector('[role="tablist"]');
    const tabs = $$('[role="tab"]', wrap);
    if (!tabs.length) return;

    const select = (tab, { focus = false, scroll = false } = {}) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus({ preventScroll: true });
      if (scroll && list && list.scrollWidth > list.clientWidth) {
        const left = tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2;
        list.scrollTo({ left, behavior: reduceMotion ? "auto" : "smooth" });
      }
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab, { scroll: true }));
      tab.addEventListener("keydown", (e) => {
        let next = null;
        if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
        else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        select(tabs[next], { focus: true, scroll: true });
      });
    });

    select(tabs.find((t) => t.getAttribute("aria-selected") === "true") || tabs[0]);
  });

  /* ---------- Command box demo ---------- */
  const typer = document.querySelector("[data-typer]");
  const typerResult = document.querySelector("[data-typer-result]");
  if (typer && typerResult) {
    let pairs = null;
    try {
      pairs = JSON.parse(typer.getAttribute("data-typer"));
    } catch (e) {
      pairs = null;
    }

    if (Array.isArray(pairs) && pairs.length) {
      const resultText = typerResult.querySelector("span");
      const box = typerResult.parentElement;
      const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));
      let onScreen = true;
      let wake = null;

      if ("IntersectionObserver" in window) {
        new IntersectionObserver((entries) => {
          onScreen = entries[0].isIntersecting;
          if (onScreen && wake) {
            wake();
            wake = null;
          }
        }).observe(box);
      }
      const whenVisible = () => (onScreen ? Promise.resolve() : new Promise((r) => (wake = r)));

      const run = async () => {
        let i = 0;
        typerResult.classList.add("is-on");
        for (;;) {
          await sleep(reduceMotion ? 3200 : 2600);
          await whenVisible();
          i = (i + 1) % pairs.length;
          const [cmd, res] = pairs[i];
          typerResult.classList.remove("is-on");

          if (reduceMotion) {
            typer.textContent = cmd;
          } else {
            const prev = typer.textContent;
            for (let n = prev.length; n >= 0; n--) {
              typer.textContent = prev.slice(0, n);
              await sleep(16);
            }
            await sleep(220);
            for (let n = 1; n <= cmd.length; n++) {
              typer.textContent = cmd.slice(0, n);
              await sleep(38 + Math.random() * 46);
            }
            await sleep(380);
          }
          resultText.textContent = res;
          typerResult.classList.add("is-on");
        }
      };
      run();
    }
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }),
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Formats strip: drifts on its own, can be dragged or swiped ---------- */
  // The strip is a horizontally scrollable box. It advances by itself and stops while the
  // pointer is over it, while it is dragged or swiped and for a moment after. The list holds
  // the formats twice; more copies are added when needed so the box is always wide enough to
  // jump back by one copy without a visible change, which makes the strip endless both ways.
  // With reduced motion the CSS shows the formats as a static, wrapped list instead.
  $$(".marquee").forEach((box) => {
    const track = box.querySelector(".marquee-track");
    if (!track || reduceMotion) return;
    const items = [...track.children];
    const count = items.length / 2;
    if (!count) return;
    const SECONDS_PER_LOOP = 48;
    const RESUME_MS = 2500;

    let period = 0;
    let pos = 0;
    let hovering = false;
    let dragging = false;
    let touching = false;
    let visible = true;
    let pausedUntil = 0;
    let startX = 0;
    let startLeft = 0;
    let last = 0;

    const measure = () => {
      period = items[count].offsetLeft - items[0].offsetLeft;
      while (period > 0 && track.scrollWidth < 2 * period + box.clientWidth) {
        items.slice(0, count).forEach((li) => {
          const copy = li.cloneNode(true);
          copy.setAttribute("aria-hidden", "true");
          track.appendChild(copy);
        });
      }
    };

    // Keeps the position in the second copy; jumping by one copy looks identical.
    const wrap = () => {
      if (period <= 0) return;
      let shift = 0;
      if (box.scrollLeft < period) shift = period;
      else if (box.scrollLeft >= 2 * period) shift = -period;
      if (!shift) return;
      box.scrollLeft += shift;
      pos += shift;
      startLeft += shift;
    };

    const hold = () => {
      pausedUntil = performance.now() + RESUME_MS;
    };

    const tick = (now) => {
      const dt = last ? Math.min(now - last, 100) / 1000 : 0;
      last = now;
      // The user moved the strip (touch, wheel, keys): continue from where it is.
      if (Math.abs(box.scrollLeft - pos) > 2) pos = box.scrollLeft;
      if (visible && !hovering && !dragging && !touching && now > pausedUntil && period > 0) {
        pos += (period / SECONDS_PER_LOOP) * dt;
        box.scrollLeft = pos;
        wrap();
      }
      window.requestAnimationFrame(tick);
    };

    measure();
    box.scrollLeft = pos = period;
    box.tabIndex = 0; // the arrow keys scroll it once focused

    box.addEventListener("scroll", wrap, { passive: true });
    box.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") hovering = true;
    });
    box.addEventListener("pointerleave", () => {
      hovering = false;
    });
    box.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return; // touch: the browser scrolls
      dragging = true;
      startX = e.clientX;
      startLeft = box.scrollLeft;
      box.setPointerCapture(e.pointerId);
      box.classList.add("is-dragging");
    });
    box.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      box.scrollLeft = startLeft - (e.clientX - startX);
      pos = box.scrollLeft;
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      box.classList.remove("is-dragging");
      hold();
    };
    box.addEventListener("pointerup", endDrag);
    box.addEventListener("pointercancel", endDrag);
    box.addEventListener("touchstart", () => {
      touching = true;
    }, { passive: true });
    const endTouch = () => {
      touching = false;
      hold();
    };
    box.addEventListener("touchend", endTouch, { passive: true });
    box.addEventListener("touchcancel", endTouch, { passive: true });
    box.addEventListener("wheel", hold, { passive: true });
    box.addEventListener("focusin", hold);
    box.addEventListener("keydown", hold);

    window.addEventListener("resize", () => {
      measure();
      wrap();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
      }).observe(box);
    }
    window.requestAnimationFrame(tick);
  });

  /* ---------- Legal pages: table of contents ---------- */
  const toc = document.querySelector("[data-toc]");
  if (toc) {
    const narrow = window.matchMedia("(max-width: 960px)");
    const syncOpen = () => {
      toc.open = !narrow.matches;
    };
    syncOpen();
    if (narrow.addEventListener) narrow.addEventListener("change", syncOpen);

    const links = new Map($$('a[href^="#"]', toc).map((a) => [a.getAttribute("href").slice(1), a]));
    const heads = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    let current = null;
    let ticking = false;

    const update = () => {
      ticking = false;
      let id = heads.length ? heads[0].id : null;
      for (const h of heads) {
        if (h.getBoundingClientRect().top < 160) id = h.id;
        else break;
      }
      if (id === current) return;
      current = id;
      links.forEach((a, key) => a.classList.toggle("is-active", key === id));
    };

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();

    toc.addEventListener("click", (e) => {
      if (e.target.closest("a") && narrow.matches) toc.open = false;
    });
  }
})();

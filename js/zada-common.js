/* Common UI behavior for ZADA STUDIO styling */

// Immediate Theme Setup to prevent FOUC (Flash of Unstyled Content)
(function applyInitialTheme() {
  try {
    const savedTheme = localStorage.getItem("zada_theme");
    // Default is 'light' (tema biasa) as requested by user
    if (savedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();

function createThemeToggleBtn(idSuffix) {
  const btn = document.createElement("button");
  btn.id = idSuffix ? `themeToggle_${idSuffix}` : "themeToggle";
  btn.className = "theme-toggle";
  btn.setAttribute("type", "button");
  btn.setAttribute("aria-label", "Toggle Light / Dark Mode");
  btn.innerHTML = `
    <span class="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    </span>
    <span class="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    </span>
    <span class="theme-toggle__label">Light</span>
  `;
  return btn;
}

function updateToggleButtonsState(currentTheme) {
  const isDark = currentTheme === "dark";
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    const label = btn.querySelector(".theme-toggle__label");
    if (label) {
      label.textContent = isDark ? "Dark" : "Light";
    }
    btn.setAttribute("title", isDark ? "Mode Dark aktif (Klik untuk Light)" : "Mode Light aktif (Klik untuk Dark)");
  });
}

function initThemeToggle() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";

  // Desktop Nav Inject
  const navContainers = document.querySelectorAll(".navbar__links, .nav-links");
  navContainers.forEach((container, idx) => {
    if (!container.querySelector(".theme-toggle")) {
      const btn = createThemeToggleBtn(`desktop_${idx}`);
      container.appendChild(btn);
    }
  });

  // Mobile Nav Inject
  const mobileNavs = document.querySelectorAll(".navbar__mobile");
  mobileNavs.forEach((mNav, idx) => {
    if (!mNav.querySelector(".theme-toggle")) {
      const btn = createThemeToggleBtn(`mobile_${idx}`);
      mNav.appendChild(btn);
    }
  });

  // Also standalone container if header has no links
  const siteNavs = document.querySelectorAll(".site-nav .container, .navbar__inner");
  siteNavs.forEach((inner, idx) => {
    if (!inner.querySelector(".theme-toggle") && !inner.querySelector(".navbar__links") && !inner.querySelector(".nav-links")) {
      const btn = createThemeToggleBtn(`standalone_${idx}`);
      inner.appendChild(btn);
    }
  });

  updateToggleButtonsState(currentTheme);

  // Bind click handlers
  document.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest(".theme-toggle");
    if (toggleBtn) {
      e.preventDefault();
      const activeTheme = document.documentElement.getAttribute("data-theme") || "light";
      const nextTheme = activeTheme === "dark" ? "light" : "dark";

      document.documentElement.setAttribute("data-theme", nextTheme);
      try {
        localStorage.setItem("zada_theme", nextTheme);
      } catch (err) {}
      
      updateToggleButtonsState(nextTheme);
      triggerTypewriterThemeTransition();
    }
  });
}

function triggerTypewriterThemeTransition() {
  const targetBody = document.body || document.documentElement;
  targetBody.classList.remove("theme-typewriter-active");
  // Force reflow
  void targetBody.offsetWidth;
  targetBody.classList.add("theme-typewriter-active");

  if (window._typewriterTimer) {
    clearTimeout(window._typewriterTimer);
  }
  window._typewriterTimer = setTimeout(() => {
    targetBody.classList.remove("theme-typewriter-active");
  }, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Theme Toggle
  initThemeToggle();

  // Trigger Typewriter effect on initial page load
  triggerTypewriterThemeTransition();

  // 1. Hide Loader
  const loader = document.getElementById("loader");
  if (loader) {
    setTimeout(() => {
      loader.classList.add("is-hidden");
    }, 500);
  }

  // 2. Scroll Progress
  const scrollProgress = document.getElementById("scrollProgress");
  if (scrollProgress) {
    window.addEventListener("scroll", () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      scrollProgress.style.width = `${progress}%`;
    }, { passive: true });
  }

  // 3. Navbar scroll state & mobile drawer
  const navbar = document.getElementById("navbar");
  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        navbar.classList.add("is-scrolled");
      } else {
        navbar.classList.remove("is-scrolled");
      }
    }, { passive: true });
  }

  const navToggle = document.getElementById("navToggle");
  const navMobile = document.getElementById("navMobile");
  const navMobileClose = document.getElementById("navMobileClose");

  if (navToggle && navMobile) {
    navToggle.addEventListener("click", () => {
      navMobile.classList.add("is-open");
    });
    navMobileClose?.addEventListener("click", () => {
      navMobile.classList.remove("is-open");
    });
    navMobile.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => navMobile.classList.remove("is-open"));
    });
  }

  // 4. Custom cursor
  const dot = document.getElementById("cursorDot");
  const ring = document.getElementById("cursorRing");
  if (dot && ring && window.matchMedia("(hover: hover)").matches) {
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.2;
      ringY += (mouseY - ringY) * 0.2;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateRing);
    }
    animateRing();

    document.querySelectorAll("a, button, input, select").forEach((el) => {
      el.addEventListener("mouseenter", () => ring.classList.add("is-active"));
      el.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
    });
  }

  // 5. Back to top button
  const backToTop = document.getElementById("backToTop");
  if (backToTop) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 400) {
        backToTop.classList.add("is-visible");
      } else {
        backToTop.classList.remove("is-visible");
      }
    }, { passive: true });

    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // 6. Page transition loader when clicking internal page links (.html)
  document.querySelectorAll('a[href$=".html"], a[href*="studio.html"], a[href*="photobooth.html"], a[href*="yearbook.html"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetUrl = link.getAttribute("href");
      if (!targetUrl || targetUrl.startsWith("#") || e.ctrlKey || e.metaKey || link.target === "_blank") return;

      const currentFile = (window.location.pathname.split("/").pop() || "index.html").split("#")[0].split("?")[0];
      const targetFile = (targetUrl.split("#")[0].split("?")[0].split("/").pop() || "index.html");

      // Same page anchor navigation (e.g. index.html#services when already on index.html)
      if (targetFile === currentFile) {
        if (targetUrl.includes("#")) {
          const hash = targetUrl.split("#")[1];
          const targetEl = document.getElementById(hash);
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: "smooth" });
            window.history.pushState(null, "", `#${hash}`);
          }
        }
        return;
      }

      // Different page navigation -> show smooth transition
      if (loader) {
        e.preventDefault();
        loader.classList.remove("is-hidden");
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 350);
      }
    });
  });

  // 7. Scroll Reveal Animations (Eye-pleasing IntersectionObserver with staggered delays)
  function initScrollReveal() {
    const autoTargets = [
      ".section-head",
      ".service-card",
      ".feature-card",
      ".pricing-card",
      ".stat-card",
      ".stage-step",
      ".faq-item",
      ".card",
      ".sewa-card",
      ".price-card",
      ".pkg-card",
      ".about-card",
      ".gallery-item",
      ".footer__col",
      ".footer-grid > div"
    ];

    autoTargets.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        if (!el.classList.contains("reveal") && !el.hasAttribute("data-reveal")) {
          el.classList.add("reveal");
        }
      });
    });

    const containers = document.querySelectorAll(
      ".services__grid, #portfolio-grid, .grid, .feature-grid, .pricing-grid, .stat-cards, .stage-options, .footer-grid"
    );
    containers.forEach((container) => {
      const children = Array.from(container.children).filter(
        (c) => c.classList.contains("reveal") || c.hasAttribute("data-reveal")
      );
      children.forEach((child, index) => {
        const delay = (index % 6) * 110;
        child.style.transitionDelay = `${delay}ms`;
      });
    });

    const elementsToReveal = document.querySelectorAll(".reveal, [data-reveal]");
    if (!elementsToReveal.length) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              observer.unobserve(entry.target);
            }
          });
        },
        {
          root: null,
          rootMargin: "0px 0px -40px 0px",
          threshold: 0.08
        }
      );

      elementsToReveal.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.95 && rect.bottom >= 0) {
          el.classList.add("is-revealed");
        } else {
          observer.observe(el);
        }
      });
    } else {
      elementsToReveal.forEach((el) => el.classList.add("is-revealed"));
    }
  }

  window.ZadaReveal = {
    scan: initScrollReveal
  };

  initScrollReveal();

  // 8. Magnetic Sliding Underline Indicator & Scrollspy with CSS Transforms
  function initNavbarActiveState() {
    const desktopNavs = document.querySelectorAll(".navbar__links, .nav-links");
    const allNavLinks = document.querySelectorAll(".navbar__links a, .nav-links a, .navbar__mobile a");
    if (!allNavLinks.length) return;

    const currentPath = window.location.pathname.split("/").pop() || "index.html";

    // Mapping subsections on index.html and other pages to their main navbar anchor target
    const sectionToNavTarget = {
      "home": "#home",
      "about": "#home",
      "services": "#services",
      "why-us": "#services",
      "workflow": "#services",
      "contact": "#contact",
      "galeri-foto": "#galeri-foto",
      "pricelist": "#pricelist",
      "sewa-studio": "#sewa-studio",
      "paket": "#paket",
      "katalog": "#katalog",
      "project-progress": "#project-progress"
    };

    // Setup sliding indicator for each desktop nav
    desktopNavs.forEach((navContainer) => {
      let indicator = navContainer.querySelector(".nav-indicator");
      if (!indicator) {
        indicator = document.createElement("span");
        indicator.className = "nav-indicator";
        indicator.setAttribute("aria-hidden", "true");
        navContainer.appendChild(indicator);
      }

      function moveIndicator(link, immediate = false) {
        if (!link || link.classList.contains("nav-cta") || link.classList.contains("theme-toggle") || link.classList.contains("btn")) {
          indicator.style.opacity = "0";
          return;
        }

        const navRect = navContainer.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();

        if (linkRect.width === 0) {
          indicator.style.opacity = "0";
          return;
        }

        const left = linkRect.left - navRect.left;
        const width = linkRect.width;

        if (immediate) {
          indicator.style.transition = "none";
        } else {
          indicator.style.transition = "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), width 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease";
        }

        indicator.style.transform = `translateX(${Math.round(left)}px)`;
        indicator.style.width = `${Math.round(width)}px`;
        indicator.style.opacity = "1";

        if (immediate) {
          indicator.offsetHeight; // trigger reflow
          indicator.style.transition = "transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), width 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease";
        }
      }

      navContainer._moveIndicator = moveIndicator;

      // Hover interaction: glide to hovered link, snap back to active link
      const links = navContainer.querySelectorAll("a:not(.nav-cta):not(.btn)");
      links.forEach((l) => {
        l.addEventListener("mouseenter", () => {
          moveIndicator(l);
        });
        l.addEventListener("mouseleave", () => {
          const activeL = navContainer.querySelector("a.is-active, a.active");
          if (activeL) {
            moveIndicator(activeL);
          } else {
            indicator.style.opacity = "0";
          }
        });
      });
    });

    function updateAllIndicators(activeHref, immediate = false) {
      desktopNavs.forEach((navContainer) => {
        let activeLink = null;
        if (activeHref) {
          activeLink = navContainer.querySelector(`a[href="${activeHref}"]`);
        }
        if (!activeLink) {
          activeLink = navContainer.querySelector("a.is-active, a.active");
        }
        if (navContainer._moveIndicator) {
          navContainer._moveIndicator(activeLink, immediate);
        }
      });
    }

    // 1. Live Scrollspy for in-page anchors
    const anchorLinks = Array.from(allNavLinks).filter((link) => {
      const href = link.getAttribute("href");
      return href && href.startsWith("#") && href.length > 1;
    });

    if (anchorLinks.length > 0) {
      // Find all sections on the current page to observe
      const trackedElements = [];
      Object.keys(sectionToNavTarget).forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          trackedElements.push({ id, targetHref: sectionToNavTarget[id], element: el });
        }
      });

      // Also include any other element with an id matching any anchor link
      anchorLinks.forEach((link) => {
        const id = link.getAttribute("href").slice(1);
        const el = document.getElementById(id);
        if (el && !trackedElements.some((item) => item.id === id)) {
          trackedElements.push({ id, targetHref: `#${id}`, element: el });
        }
      });

      function setActiveNav(targetHref, immediate = false) {
        if (!targetHref) return;
        allNavLinks.forEach((l) => {
          const href = l.getAttribute("href");
          if (href === targetHref) {
            l.classList.add("is-active", "active");
          } else if (href && href.startsWith("#")) {
            l.classList.remove("is-active", "active");
          }
        });
        updateAllIndicators(targetHref, immediate);
      }

      function onScroll() {
        if (!trackedElements.length) return;

        // Bottom of page: activate contact / last section
        if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 60)) {
          const last = trackedElements[trackedElements.length - 1];
          setActiveNav(last.targetHref);
          return;
        }

        // Top of page: activate top section
        if (window.scrollY < 100) {
          setActiveNav(trackedElements[0].targetHref);
          return;
        }

        const scrollMid = window.scrollY + (window.innerHeight * 0.35);
        let currentTarget = trackedElements[0].targetHref;

        for (let i = 0; i < trackedElements.length; i++) {
          const item = trackedElements[i];
          const rect = item.element.getBoundingClientRect();
          const elemTop = rect.top + window.scrollY;
          const elemHeight = rect.height;

          if (scrollMid >= elemTop && scrollMid < (elemTop + elemHeight)) {
            currentTarget = item.targetHref;
            break;
          }
        }

        setActiveNav(currentTarget);
      }

      window.addEventListener("scroll", onScroll, { passive: true });

      // Click listener for instant active state update and indicator glide
      anchorLinks.forEach((link) => {
        link.addEventListener("click", () => {
          const targetHref = link.getAttribute("href");
          if (targetHref && targetHref.startsWith("#")) {
            setActiveNav(targetHref);
          }
        });
      });

      // Initial alignment
      const runInit = (immediate = true) => {
        onScroll();
        const activeLink = document.querySelector(".navbar__links a.is-active, .nav-links a.active");
        if (activeLink) {
          updateAllIndicators(activeLink.getAttribute("href"), immediate);
        }
      };

      setTimeout(() => runInit(true), 60);
      setTimeout(() => runInit(true), 250);
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => runInit(true));
      }
    } else {
      // 2. Multi-page link matching (studio.html, yearbook.html, photobooth.html, etc.)
      allNavLinks.forEach((link) => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || link.classList.contains("nav-cta")) return;
        const cleanHref = href.split("#")[0].split("?")[0].split("/").pop();
        if (cleanHref === currentPath || (currentPath === "" && cleanHref === "index.html") || (currentPath === "index.html" && cleanHref === "index.html")) {
          link.classList.add("is-active", "active");
        } else {
          link.classList.remove("is-active", "active");
        }
      });

      const alignPageNav = () => {
        const activeLink = document.querySelector(".navbar__links a.is-active, .nav-links a.active");
        if (activeLink) {
          updateAllIndicators(activeLink.getAttribute("href"), true);
        }
      };

      setTimeout(alignPageNav, 60);
      setTimeout(alignPageNav, 250);
      if (document.fonts?.ready) {
        document.fonts.ready.then(alignPageNav);
      }
    }

    // Window resize recalibration
    window.addEventListener("resize", () => {
      const activeLink = document.querySelector(".navbar__links a.is-active, .nav-links a.active");
      if (activeLink) {
        updateAllIndicators(activeLink.getAttribute("href"), true);
      }
    }, { passive: true });
  }

  initNavbarActiveState();
});


(() => {
  "use strict";

  // Portfolio demo only. Real accounts, trusted balances, and payments need a server.
  const STORAGE_KEY = "blokcode-demo-v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const SECRET_CARDS = $$(".secret-card[data-secret]");
  const SECRET_IDS = new Set(SECRET_CARDS.map((card) => card.dataset.secret).filter(Boolean));
  let state = readState();
  let toastTimer;
  const accountDialog = $("#accountDialog");
  const purchaseDialog = $("#purchaseDialog");
  const toast = $("#toast");

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return emptyState();
      return {
        profile: saved.profile && typeof saved.profile.name === "string" ? saved.profile : null,
        tokens: Number.isFinite(Number(saved.tokens)) ? Math.max(0, Number(saved.tokens)) : 0,
        lastClaimDate: typeof saved.lastClaimDate === "string" ? saved.lastClaimDate : null,
        unlocked: Array.isArray(saved.unlocked)
          ? Array.from(new Set(saved.unlocked.filter((id) => SECRET_IDS.has(id))))
          : []
      };
    } catch (_) {
      return emptyState();
    }
  }

  function emptyState() {
    return { profile: null, tokens: 0, lastClaimDate: null, unlocked: [] };
  }

  function syncStateFromStorage() {
    state = readState();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      showToast("مرورگر اجازه‌ی ذخیره‌ی نمونه را نداد.");
    }
  }

  function tehranDateKey() {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const part = (type) => parts.find((item) => item.type === type).value;
    return part("year") + "-" + part("month") + "-" + part("day");
  }

  function numberFa(value) {
    return new Intl.NumberFormat("fa-IR").format(value);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function openDialog(dialog) {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function openAccountDialog() {
    syncStateFromStorage();
    render();
    $("#signupView").hidden = Boolean(state.profile);
    $("#profileView").hidden = !state.profile;
    if (state.profile) {
      $("#profileGreeting").textContent = "سلام، " + state.profile.name + "!";
      $("#dialogTokenCount").textContent = numberFa(state.tokens);
    }
    openDialog(accountDialog);
  }

  function render() {
    const balance = numberFa(state.tokens);
    $("#headerTokenCount").textContent = balance;
    $("#dashboardTokenCount").textContent = balance;
    $("#dialogTokenCount").textContent = balance;
    $("#accountButtonLabel").textContent = state.profile ? state.profile.name : "ورود / ثبت‌نام";
    $("#signupView").hidden = Boolean(state.profile);
    $("#profileView").hidden = !state.profile;
    if (state.profile) $("#profileGreeting").textContent = "سلام، " + state.profile.name + "!";

    const progress = Math.min(state.tokens, 10);
    $("#tokenProgress").style.width = (progress * 10) + "%";
    $("#progressLabel").textContent = numberFa(progress) + " از ۱۰";

    const claimedToday = state.lastClaimDate === tehranDateKey();
    $("#dailyButton").disabled = claimedToday;
    $("#dailyButtonLabel").textContent = claimedToday ? "توکن امروز گرفته شد" : "گرفتن توکن امروز";

    $$(".secret-card").forEach((card) => {
      const unlocked = state.unlocked.includes(card.dataset.secret);
      card.classList.toggle("unlocked", unlocked);
      $(".secret-copy", card).hidden = !unlocked;
      $(".lock-label", card).hidden = unlocked;
      const button = $(".unlock-button", card);
      button.textContent = unlocked ? "راز باز شده — فرمان را کپی کن" : "بازکردن راز با ۱۰ توکن";
      button.disabled = unlocked;
    });

    const commandCards = $$(".command-card");
    $$("[data-filter-count]").forEach((badge) => {
      const filter = badge.dataset.filterCount;
      const count = filter === "all"
        ? commandCards.length
        : commandCards.filter((card) => card.dataset.category === filter).length;
      badge.textContent = numberFa(count);
    });
  }

  function register(name) {
    syncStateFromStorage();
    state.profile = { name: name.trim() };
    saveState();
    closeDialog(accountDialog);
    render();
    showToast("حساب آزمایشی ساخته شد. خوش اومدی " + state.profile.name + "!");
  }

  function claimDailyToken() {
    syncStateFromStorage();
    if (!state.profile) {
      showToast("برای گرفتن توکن، اول حساب آزمایشی بساز.");
      openAccountDialog();
      return;
    }
    if (state.lastClaimDate === tehranDateKey()) {
      showToast("توکن امروزت را قبلاً گرفتی؛ فردا دوباره سر بزن.");
      return;
    }
    state.tokens += 1;
    state.lastClaimDate = tehranDateKey();
    saveState();
    render();
    showToast("یک توکن تازه به کیفت اضافه شد!");
  }

  function unlockSecret(id) {
    syncStateFromStorage();
    if (!SECRET_IDS.has(id)) {
      showToast("این راز در فهرست سایت پیدا نشد.");
      return;
    }
    if (!state.profile) {
      showToast("برای بازکردن راز، اول حساب آزمایشی بساز.");
      openAccountDialog();
      return;
    }
    if (state.unlocked.includes(id)) {
      showToast("این راز از قبل برایت باز شده.");
      return;
    }
    if (state.tokens < 10) {
      showToast("برای این راز به ۱۰ توکن نیاز داری.");
      return;
    }
    state.tokens -= 10;
    state.unlocked.push(id);
    saveState();
    render();
    showToast("راز باز شد؛ فرمان را کپی کن!");
  }

  async function copyCommand(command, button) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(command);
        showToast("فرمان کپی شد: " + command);
        return;
      } catch (_) {
        // Select the visible code below when clipboard access is unavailable.
      }
    }

    const card = button.closest(".command-card, .secret-card");
    const code = card ? card.querySelector("code") : null;
    if (!code || typeof window.getSelection !== "function" || typeof document.createRange !== "function") {
      showToast("کپی خودکار در این مرورگر در دسترس نیست؛ فرمان را دستی انتخاب کن.");
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      showToast("کپی خودکار در این مرورگر در دسترس نیست؛ فرمان را دستی انتخاب کن.");
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(code);
    selection.removeAllRanges();
    selection.addRange(range);
    showToast("فرمان انتخاب شد؛ با Ctrl+C یا گزینهٔ کپی آن را بردار.");
  }

  $("#signupForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#nicknameInput").value.trim();
    if (name.length < 2) {
      showToast("اسم بازیکن باید دست‌کم دو حرف داشته باشد.");
      return;
    }
    register(name);
  });

  $("#accountButton").addEventListener("click", openAccountDialog);
  $$("[data-open-account]").forEach((button) => button.addEventListener("click", openAccountDialog));
  $("#dailyButton").addEventListener("click", claimDailyToken);

  $("#logoutButton").addEventListener("click", () => {
    syncStateFromStorage();
    state.profile = null;
    saveState();
    closeDialog(accountDialog);
    render();
    showToast("از حساب آزمایشی خارج شدی.");
  });

  $("#buyButton").addEventListener("click", () => {
    if (!state.profile) {
      showToast("اول حساب آزمایشی بساز.");
      openAccountDialog();
      return;
    }
    openDialog(purchaseDialog);
  });

  $("#demoPurchaseButton").addEventListener("click", () => {
    syncStateFromStorage();
    if (!state.profile) {
      closeDialog(purchaseDialog);
      showToast("برای افزودن توکن تستی، اول وارد حساب آزمایشی شو.");
      openAccountDialog();
      return;
    }
    state.tokens += 10;
    saveState();
    closeDialog(purchaseDialog);
    render();
    showToast("۱۰ توکن تستی اضافه شد؛ پولی دریافت نشد.");
  });

  $$(".unlock-button").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".secret-card[data-secret]");
      if (card) unlockSecret(card.dataset.secret);
    });
  });
  $$(".copy-button").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".command-card, .secret-card");
      const code = card ? card.querySelector("code") : null;
      if (code) copyCommand(code.textContent.trim(), button);
    });
  });
  $$("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.closest("dialog")));
  });

  [accountDialog, purchaseDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
  });

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      syncStateFromStorage();
      render();
    }
  });
  window.addEventListener("focus", () => {
    syncStateFromStorage();
    render();
  });

  $$(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".filter").forEach((item) => item.classList.toggle("active", item === button));
      const filter = button.dataset.filter;
      $$(".command-card").forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.category !== filter;
      });
    });
  });

  const menuButton = $("#menuButton");
  const mainNav = $("#mainNav");
  menuButton.addEventListener("click", () => {
    const expanded = mainNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(expanded));
  });
  $$("#mainNav a").forEach((link) => link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }));

  render();
})();

// Damla'nın Tatlı Köşesi ✨
// - ToDo: add/remove/toggle, progress mood + confetti, localStorage
// - Timeline: period select, photo add/remove (URL), localStorage

const LS_TODO = "damla_todos_v1";
const LS_TL = "damla_timeline_v1";
const LS_PERIOD = "damla_period_v1";
const LS_MILESTONE = "damla_last_milestone_v1";

const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

/* ----------------------- Tabs (views) ----------------------- */
const tabs = $$(".tab");
const viewTodo = $("#viewTodo");
const viewTimeline = $("#viewTimeline");

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    btn.classList.add("active");

    const view = btn.dataset.view;
    if (view === "todo") {
      viewTodo.classList.remove("hidden");
      viewTimeline.classList.add("hidden");
      btn.setAttribute("aria-selected", "true");
      tabs.find(t=>t.dataset.view==="timeline")?.setAttribute("aria-selected","false");
    } else {
      viewTimeline.classList.remove("hidden");
      viewTodo.classList.add("hidden");
      btn.setAttribute("aria-selected", "true");
      tabs.find(t=>t.dataset.view==="todo")?.setAttribute("aria-selected","false");
      renderTimeline(); // ensure up-to-date
    }
  });
});

/* ----------------------- ToDo ----------------------- */
let todos = loadJSON(LS_TODO, []);

// Migration: older saved todos may not have per-item progress.
// We normalize here so UI can show intermediate progress values (0..100).
todos = (todos || []).map(t => {
  const hasProgress = typeof t.progress === "number";
  const progress = hasProgress ? clamp(t.progress, 0, 100) : (t.done ? 100 : 0);
  return {
    ...t,
    progress,
    done: progress === 100,
  };
});
saveJSON(LS_TODO, todos);

const todoForm = $("#todoForm");
const todoInput = $("#todoInput");
const todoList = $("#todoList");
const btnClearDone = $("#btnClearDone");
const btnClearAll = $("#btnClearAll");
const btnSeed = $("#btnSeed");

todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = (todoInput.value || "").trim();
  if (!text) return;
  todos.unshift({
    id: cryptoId(),
    text,
    progress: 0,
    done: false,
    createdAt: Date.now()
  });
  todoInput.value = "";
  saveJSON(LS_TODO, todos);
  renderTodos();
});

btnClearDone.addEventListener("click", () => {
  // remove fully completed items
  todos = todos.filter(t => (t.progress !== 100));
  saveJSON(LS_TODO, todos);
  renderTodos();
});

btnClearAll.addEventListener("click", () => {
  if (!todos.length) return;
  // küçük tatlı bir koruma: 2. kez basınca sil
  const ok = confirm("Hepsini silmek istediğine emin misin? 🥺");
  if (!ok) return;
  todos = [];
  saveJSON(LS_TODO, todos);
  renderTodos();
});

btnSeed.addEventListener("click", () => {
  if (todos.length) {
    const ok = confirm("Mevcut liste varken örnek ekleyeyim mi? (Üste ekler) 🌱");
    if (!ok) return;
  }
  const seeds = [
    "Bugün 10 dk yürüyüş",
    "Bir bardak ekstra su iç",
    "Damla playlist’inden 1 şarkı aç 🎧",
    "Kendime güzel bir şey söyle 💖",
    "5 dk oda toparla",
  ].map(text => ({ id: cryptoId(), text, progress: 0, done: false, createdAt: Date.now() }));

  todos = [...seeds, ...todos];
  saveJSON(LS_TODO, todos);
  renderTodos();
});

function renderTodos() {
  todoList.innerHTML = "";
  if (!todos.length) {
    todoList.innerHTML = `
      <li class="todo-item" style="justify-content:center; color: rgba(255,255,255,.72)">
        Liste boş. Damla için minicik bir hedef ekleyelim 🌸
      </li>
    `;
    updateProgress();
    return;
  }

  for (const t of todos) {
    const li = document.createElement("li");
    li.className = `todo-item ${t.progress === 100 ? "done" : ""}`;

    const left = document.createElement("div");
    left.className = "todo-left";
    left.title = "Tamamlandı / geri al";

    const check = document.createElement("div");
    check.className = "check";
    check.textContent = (t.progress === 100) ? "✓" : "";

    const text = document.createElement("div");
    text.className = "todo-text";
    text.textContent = t.text;

    // Wrap text + per-item progress controls
    const textWrap = document.createElement("div");
    textWrap.style.display = "grid";
    textWrap.style.gap = "6px";
    textWrap.style.flex = "1";

    const row1 = document.createElement("div");
    row1.style.display = "flex";
    row1.style.alignItems = "center";
    row1.style.gap = "10px";
    row1.append(check, text);

    const controls = document.createElement("div");
    controls.className = "todo-progress";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.className = "mini-btn";
    minus.textContent = "−10";

    const plus = document.createElement("button");
    plus.type = "button";
    plus.className = "mini-btn";
    plus.textContent = "+10";

    const pctText = document.createElement("span");
    pctText.className = "mini-pct";
    pctText.textContent = `${t.progress}%`;

    const bar = document.createElement("div");
    bar.className = "mini-bar";
    const fill = document.createElement("div");
    fill.className = "mini-fill";
    fill.style.width = `${t.progress}%`;
    bar.appendChild(fill);

    minus.addEventListener("click", (ev) => {
      ev.stopPropagation();
      t.progress = clamp((t.progress || 0) - 10, 0, 100);
      t.done = (t.progress === 100);
      saveJSON(LS_TODO, todos);
      renderTodos();
    });

    plus.addEventListener("click", (ev) => {
      ev.stopPropagation();
      t.progress = clamp((t.progress || 0) + 10, 0, 100);
      t.done = (t.progress === 100);
      saveJSON(LS_TODO, todos);
      renderTodos();
    });

    controls.append(minus, plus, pctText);
    textWrap.append(row1, controls, bar);
    left.appendChild(textWrap);

    left.addEventListener("click", () => {
      // Toggle: incomplete -> 100%, completed -> 0%
      if ((t.progress || 0) < 100) {
        t.progress = 100;
        t.done = true;
        confettiBurst(28);
      } else {
        t.progress = 0;
        t.done = false;
      }
      saveJSON(LS_TODO, todos);
      renderTodos();
    });

    const del = document.createElement("button");
    del.className = "icon-btn";
    del.type = "button";
    del.title = "Sil";
    del.textContent = "🗑️";
    del.addEventListener("click", () => {
      todos = todos.filter(x => x.id !== t.id);
      saveJSON(LS_TODO, todos);
      renderTodos();
    });

    li.append(left, del);
    todoList.append(li);
  }

  updateProgress();
}

function updateProgress() {
    const total = todos.length || 0;
    const sum = total
      ? todos.reduce((a, t) => a + (typeof t.progress === "number" ? t.progress : (t.done ? 100 : 0)), 0)
      : 0;
    const pct = total ? Math.round(sum / total) : 0;
    const done = total ? todos.filter(t => (t.progress === 100)).length : 0;
  
    $("#progressText").textContent = `${pct}%`;
    $("#meterFill").style.width = `${pct}%`;
  
    const moodTitle = $("#moodTitle");
    const moodDesc = $("#moodDesc");
    const moodFace = $("#moodFace");
    const moodBadge = $("#moodBadge");
  
    const mood = pickMood(pct);
    moodFace.textContent = mood.face;
    moodTitle.textContent = mood.title;
  
    // desc’yi daha “yüzde” odaklı yapalım:
    if (total === 0) {
      moodDesc.textContent = mood.desc;
    } else {
      const left = total - done;
      const extra = left === 0
        ? "Hepsi tamam! 🎉"
        : `Kalan: ${left} görev.`;
      moodDesc.textContent = `${done}/${total} tamamlandı. ${extra} ${mood.desc}`;
    }
  
    if (moodBadge) moodBadge.textContent = mood.badge;
  
    // milestone tetikle
    if (total > 0) checkMilestones(pct);
  
    // 100% zaten milestone’da patlıyor, ayrıca burada tekrar patlatma gerekmez
  }
  

function pickMood(pct) {
    if (pct === 0) return {
      face: "🙂",
      badge: "Başlangıç modu",
      title: "Bugün Damla gibi parlıyoruz ✨",
      desc: "Küçük adımlar = büyük mutluluk. Hadi bir şeyleri tamamlayalım!"
    };
    if (pct > 0 && pct < 35) return {
      face: "😌",
      badge: "Isınma turu",
      title: "Tatlı tatlı gidiyoruz 🌸",
      desc: "Az da olsa ilerleme var. Devam Damla!"
    };
    if (pct >= 35 && pct < 70) return {
      face: "😄",
      badge: "Ritim yakalandı",
      title: "Hızlandık bile! 🚀",
      desc: "Bu tempo harika. Bir görevi daha ‘✓’ yapalım."
    };
    if (pct >= 70 && pct < 100) return {
      face: "🤩",
      badge: "Final modu",
      title: "Neredeyse bitti! ⭐",
      desc: "Biraz daha… Son düzlüktesin!"
    };
    return {
      face: "🥳",
      badge: "Şampiyon Damla",
      title: "TAMAMDIR! Damla kazanıyor 🎉",
      desc: "Hepsi bitti. Kendine küçük bir ödül ver (kahve + tatlı? 😄)."
    };
  }
  

/* ----------------------- Timeline ----------------------- */
const periodButtons = $$(".period");
const periodTitle = $("#periodTitle");
const periodDesc = $("#periodDesc");
const photoGrid = $("#photoGrid");

const photoUrl = $("#photoUrl");
const photoNote = $("#photoNote");
const btnAddPhoto = $("#btnAddPhoto");

const PERIOD_META = {
  cocukluk: { title: "Çocukluk", desc: "Minik Damla’nın tatlı anıları 🥹" },
  genclik: { title: "Gençlik", desc: "Okul yolları, maceralar, anılar 🎒" },
  bugun: { title: "Bugün", desc: "Şu anın güzelliği burada 🌸" },
};

// timeline data: { periodKey: [{id,url,note,ts}, ...] }
let timeline = loadJSON(LS_TL, null);
if (!timeline) {
  // başlangıç için minik placeholder (istersen silebilirsin)
  timeline = {
    cocukluk: [
      {
        id: cryptoId(),
        url: "https://images.unsplash.com/photo-1503455637927-730bce8583c0?auto=format&fit=crop&w=900&q=60",
        note: "Minik anlar ✨",
        ts: Date.now(),
      }
    ],
    genclik: [
      {
        id: cryptoId(),
        url: "https://images.unsplash.com/photo-1520975958225-11a71c4f6f33?auto=format&fit=crop&w=900&q=60",
        note: "Güzel günler 💫",
        ts: Date.now(),
      }
    ],
    bugun: [
      {
        id: cryptoId(),
        url: "https://images.unsplash.com/photo-1520975682070-7dd9a7f4d92f?auto=format&fit=crop&w=900&q=60",
        note: "Şimdi 🌸",
        ts: Date.now(),
      }
    ],
  };
  saveJSON(LS_TL, timeline);
}

let currentPeriod = loadJSON(LS_PERIOD, "cocukluk");

periodButtons.forEach(b => {
  b.addEventListener("click", () => {
    periodButtons.forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    currentPeriod = b.dataset.period;
    saveJSON(LS_PERIOD, currentPeriod);
    renderTimeline();
  });
});

btnAddPhoto.addEventListener("click", () => {
  const url = (photoUrl.value || "").trim();
  const note = (photoNote.value || "").trim() || "Anı 💖";

  if (!url) {
    alert("Bir foto URL girer misin? 🙂");
    return;
  }

  // basic URL check
  try { new URL(url); } catch {
    alert("URL formatı yanlış görünüyor. https://... şeklinde olmalı.");
    return;
  }

  timeline[currentPeriod] = timeline[currentPeriod] || [];
  timeline[currentPeriod].unshift({
    id: cryptoId(),
    url,
    note,
    ts: Date.now()
  });

  saveJSON(LS_TL, timeline);
  photoUrl.value = "";
  photoNote.value = "";
  renderTimeline();
  confettiBurst(18);
});

function renderTimeline() {
  // active state sync
  periodButtons.forEach(x => x.classList.toggle("active", x.dataset.period === currentPeriod));

  const meta = PERIOD_META[currentPeriod] || { title: "Timeline", desc: "" };
  periodTitle.textContent = meta.title;
  periodDesc.textContent = meta.desc;

  const items = (timeline[currentPeriod] || []);
  photoGrid.innerHTML = "";

  if (!items.length) {
    photoGrid.innerHTML = `
      <div class="photo" style="grid-column:1/-1; padding:16px; text-align:center; color: rgba(255,255,255,.72)">
        Bu dönemde foto yok. Damla için bir anı ekleyelim 📸
      </div>
    `;
    return;
  }

  for (const it of items) {
    const card = document.createElement("div");
    card.className = "photo";

    const img = document.createElement("img");
    img.src = it.url;
    img.alt = it.note || "Damla'nın fotoğrafı";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";

    const cap = document.createElement("div");
    cap.className = "caption";

    const left = document.createElement("div");
    left.style.display = "grid";
    left.style.gap = "2px";

    const note = document.createElement("span");
    note.textContent = it.note || "Anı";

    const date = document.createElement("small");
    date.className = "muted";
    date.textContent = formatDate(it.ts);

    left.append(note, date);

    const del = document.createElement("button");
    del.title = "Kaldır";
    del.textContent = "✖";
    del.addEventListener("click", () => {
      timeline[currentPeriod] = (timeline[currentPeriod] || []).filter(x => x.id !== it.id);
      saveJSON(LS_TL, timeline);
      renderTimeline();
    });

    cap.append(left, del);
    card.append(img, cap);
    photoGrid.append(card);
  }
}

/* ----------------------- Confetti ----------------------- */
function confettiBurst(n = 24) {
  const root = $("#confetti");
  const w = window.innerWidth;
  for (let i = 0; i < n; i++) {
    const piece = document.createElement("i");
    // random gradient-ish via backgroundColor variations
    const hue = Math.floor(Math.random() * 360);
    piece.style.backgroundColor = `hsl(${hue} 90% 65%)`;
    piece.style.left = `${Math.random() * w}px`;
    piece.style.transform = `translateY(0) rotate(${Math.random() * 360}deg)`;
    piece.style.animationDuration = `${700 + Math.random() * 600}ms`;
    piece.style.width = `${8 + Math.random() * 8}px`;
    piece.style.height = `${10 + Math.random() * 10}px`;
    root.appendChild(piece);

    piece.addEventListener("animationend", () => piece.remove());
  }
}

/* ----------------------- Utils ----------------------- */

function showToast(message) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 1600);
  }

  function checkMilestones(pct) {
    const milestones = [
      { at: 10, msg: "Başladık! %10 tamam 💪", confetti: 16 },
      { at: 25, msg: "Çeyrek yol! %25 🌸", confetti: 18 },
      { at: 50, msg: "Yarı yoldayız! %50 ⭐", confetti: 24 },
      { at: 75, msg: "Son düzlüktesin! %75 🚀", confetti: 28 },
      { at: 100, msg: "Tamamlandı! Damla kazandı 🥳", confetti: 70 },
    ];
  
    const last = loadJSON(LS_MILESTONE, 0);
  
    // pct hangi eşiği geçtiyse en büyüğünü seç
    const hit = milestones
      .filter(m => pct >= m.at)
      .sort((a,b) => b.at - a.at)[0];
  
    if (!hit) return;
  
    // aynı milestone'u tekrar tetikleme
    if (hit.at > last) {
      saveJSON(LS_MILESTONE, hit.at);
      showToast(hit.msg);
      confettiBurst(hit.confetti);
    }
  
    // geri düşerse (örn done geri alındı) milestone state’i güncelle
    // böylece tekrar yükselince tekrar kutlayabilir
    if (pct < last) {
      const back = milestones.filter(m => pct >= m.at).sort((a,b)=>b.at-a.at)[0];
      saveJSON(LS_MILESTONE, back ? back.at : 0);
    }
  }

  
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function loadJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
function cryptoId() {
  // no external deps, ok for static site
  return (crypto?.randomUUID?.() || `id_${Math.random().toString(16).slice(2)}_${Date.now()}`);
}
function formatDate(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString("tr-TR", { year:"numeric", month:"short", day:"2-digit" });
  } catch {
    return "";
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/* ----------------------- Init ----------------------- */
renderTodos();
renderTimeline();
updateProgress();

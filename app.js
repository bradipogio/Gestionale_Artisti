const STORAGE_KEY = "gestionale-artisti-state-v1";
const SESSION_KEY = "gestionale-artisti-session-v1";

const seedState = {
  users: [
    { id: "admin-1", name: "Admin", role: "admin" },
    { id: "artist-1", name: "Giulia Serra", role: "artist", specialty: "Violinista" },
    { id: "artist-2", name: "Lorenzo Ferri", role: "artist", specialty: "Violoncellista" },
    { id: "artist-3", name: "Elisa Conti", role: "artist", specialty: "Cantante lirica" },
    { id: "artist-4", name: "Matteo Valli", role: "artist", specialty: "Pianista" },
  ],
  events: [
    {
      id: crypto.randomUUID(),
      clientName: "Wedding Martini",
      date: "2026-06-06",
      location: "Villa Aurelia, Roma",
      requestedActs: "String duo + cantante lirica",
      notes: "Cerimonia ore 17:30, repertorio classico e ingresso sposi.",
      assignments: [
        {
          id: crypto.randomUUID(),
          artistId: "artist-1",
          status: "accettata",
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          artistId: "artist-2",
          status: "inviata",
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          artistId: "artist-3",
          status: "confermata",
          updatedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      clientName: "Ricevimento Villa Blu",
      date: "2026-07-12",
      location: "Lago di Garda",
      requestedActs: "Pianoforte solo aperitivo",
      notes: "Setup entro le 18:00, service gia incluso.",
      assignments: [
        {
          id: crypto.randomUUID(),
          artistId: "artist-4",
          status: "inviata",
          updatedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    },
  ],
};

function cloneSeedState() {
  return JSON.parse(JSON.stringify(seedState));
}

const state = loadState();
let sessionUserId = localStorage.getItem(SESSION_KEY) || "";

const elements = {
  app: document.querySelector("#app"),
  loginForm: document.querySelector("#loginForm"),
  loginUserId: document.querySelector("#loginUserId"),
  logoutButton: document.querySelector("#logoutButton"),
  sessionInfo: document.querySelector("#sessionInfo"),
  dashboardSection: document.querySelector("#dashboardSection"),
  adminSection: document.querySelector("#adminSection"),
  artistForm: document.querySelector("#artistForm"),
  artistId: document.querySelector("#artistId"),
  artistName: document.querySelector("#artistName"),
  artistSpecialty: document.querySelector("#artistSpecialty"),
  artistFormTitle: document.querySelector("#artistFormTitle"),
  artistSubmitButton: document.querySelector("#artistSubmitButton"),
  cancelArtistEdit: document.querySelector("#cancelArtistEdit"),
  artistsAdminList: document.querySelector("#artistsAdminList"),
  eventForm: document.querySelector("#eventForm"),
  artistCheckboxes: document.querySelector("#artistCheckboxes"),
  eventsList: document.querySelector("#eventsList"),
  resultsCount: document.querySelector("#resultsCount"),
  eventsTitle: document.querySelector("#eventsTitle"),
  filterFrom: document.querySelector("#filterFrom"),
  filterTo: document.querySelector("#filterTo"),
  filterText: document.querySelector("#filterText"),
  resetFilters: document.querySelector("#resetFilters"),
  statCardTemplate: document.querySelector("#statCardTemplate"),
};

bootstrap();

function bootstrap() {
  populateLoginUsers();
  renderArtistOptions();
  bindEvents();
  renderApp();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
    return cloneSeedState();
  }

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
    return cloneSeedState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.artistForm.addEventListener("submit", handleArtistSubmit);
  elements.cancelArtistEdit.addEventListener("click", resetArtistForm);
  elements.artistsAdminList.addEventListener("click", handleArtistAdminClick);
  elements.eventForm.addEventListener("submit", handleCreateEvent);
  elements.eventsList.addEventListener("click", handleEventsClick);
  elements.eventsList.addEventListener("change", handleStatusChange);
  elements.resetFilters.addEventListener("click", resetFilters);
  elements.filterFrom.addEventListener("input", renderApp);
  elements.filterTo.addEventListener("input", renderApp);
  elements.filterText.addEventListener("input", renderApp);
}

function handleLogin(event) {
  event.preventDefault();
  sessionUserId = elements.loginUserId.value;
  localStorage.setItem(SESSION_KEY, sessionUserId);
  renderApp();
}

function handleLogout() {
  sessionUserId = "";
  localStorage.removeItem(SESSION_KEY);
  renderApp();
}

function handleCreateEvent(event) {
  event.preventDefault();
  const formData = new FormData(elements.eventForm);
  const clientName = String(formData.get("clientName")).trim();
  const eventDate = String(formData.get("eventDate"));
  const location = String(formData.get("location")).trim();
  const requestedActs = String(formData.get("requestedActs")).trim();
  const notes = String(formData.get("eventNotes")).trim();
  const selectedArtists = state.users
    .filter((user) => user.role === "artist")
    .filter((artist) => formData.getAll("artistIds").includes(artist.id));

  if (!clientName || !eventDate || !location || !requestedActs) {
    alert("Compila cliente, data, location e richiesta musicale.");
    return;
  }

  if (!selectedArtists.length) {
    alert("Seleziona almeno un artista da contattare.");
    return;
  }

  state.events.unshift({
    id: crypto.randomUUID(),
    clientName,
    date: eventDate,
    location,
    requestedActs,
    notes,
    assignments: selectedArtists.map((artist) => ({
      id: crypto.randomUUID(),
      artistId: artist.id,
      status: "inviata",
      updatedAt: new Date().toISOString(),
    })),
    createdAt: new Date().toISOString(),
  });

  saveState();
  elements.eventForm.reset();
  renderApp();
}

function handleArtistSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.artistForm);
  const artistId = String(formData.get("artistId") || "").trim();
  const name = String(formData.get("artistName") || "").trim();
  const specialty = String(formData.get("artistSpecialty") || "").trim();

  if (!name || !specialty) {
    alert("Compila nome e specialita dell'artista.");
    return;
  }

  if (artistId) {
    const artist = getArtistById(artistId);
    if (!artist) return;
    artist.name = name;
    artist.specialty = specialty;
  } else {
    state.users.push({
      id: crypto.randomUUID(),
      name,
      role: "artist",
      specialty,
    });
  }

  saveState();
  populateLoginUsers();
  renderArtistOptions();
  resetArtistForm();
  renderApp();
}

function handleArtistAdminClick(event) {
  const button = event.target.closest("[data-edit-artist]");
  if (!button) return;

  const artist = getArtistById(button.dataset.artistId);
  if (!artist || artist.role !== "artist") return;

  elements.artistId.value = artist.id;
  elements.artistName.value = artist.name;
  elements.artistSpecialty.value = artist.specialty || "";
  elements.artistFormTitle.textContent = "Modifica artista";
  elements.artistSubmitButton.textContent = "Salva modifica";
  elements.cancelArtistEdit.classList.remove("hidden");
  elements.artistName.focus();
}

function handleEventsClick(event) {
  const action = event.target.closest("[data-action]");
  if (!action) return;

  const eventId = action.dataset.eventId;
  const assignmentId = action.dataset.assignmentId;
  const eventItem = state.events.find((item) => item.id === eventId);
  const assignment = eventItem?.assignments.find((item) => item.id === assignmentId);

  if (!eventItem || !assignment) return;

  if (action.dataset.action === "artist-accept") {
    assignment.status = "accettata";
    assignment.updatedAt = new Date().toISOString();
    saveState();
    renderApp();
  }
}

function handleStatusChange(event) {
  const select = event.target.closest("[data-assignment-status]");
  if (!select) return;

  const eventId = select.dataset.eventId;
  const assignmentId = select.dataset.assignmentId;
  const eventItem = state.events.find((item) => item.id === eventId);
  const assignment = eventItem?.assignments.find((item) => item.id === assignmentId);

  if (!eventItem || !assignment) return;

  assignment.status = select.value;
  assignment.updatedAt = new Date().toISOString();
  saveState();
  renderApp();
}

function resetFilters() {
  elements.filterFrom.value = "";
  elements.filterTo.value = "";
  elements.filterText.value = "";
  renderApp();
}

function resetArtistForm() {
  elements.artistForm.reset();
  elements.artistId.value = "";
  elements.artistFormTitle.textContent = "Nuovo artista";
  elements.artistSubmitButton.textContent = "Aggiungi artista";
  elements.cancelArtistEdit.classList.add("hidden");
}

function populateLoginUsers() {
  elements.loginUserId.innerHTML = state.users
    .map(
      (user) => `
        <option value="${user.id}">
          ${user.name} · ${user.role === "admin" ? "Admin" : user.specialty}
        </option>
      `,
    )
    .join("");

  if (!sessionUserId) {
    elements.loginUserId.value = state.users[0].id;
  } else {
    elements.loginUserId.value = sessionUserId;
  }
}

function renderArtistOptions() {
  const artists = state.users.filter((user) => user.role === "artist");
  elements.artistCheckboxes.innerHTML = artists
    .map(
      (artist) => `
        <div class="artist-option">
          <label>
            <input type="checkbox" name="artistIds" value="${artist.id}" />
            <span>
              <strong>${artist.name}</strong>
              <span class="artist-role">${artist.specialty}</span>
            </span>
          </label>
        </div>
      `,
    )
    .join("");
}

function renderApp() {
  const currentUser = state.users.find((user) => user.id === sessionUserId) || null;

  elements.app.classList.toggle("hidden", !currentUser);
  elements.logoutButton.classList.toggle("hidden", !currentUser);
  elements.sessionInfo.classList.toggle("hidden", !currentUser);
  elements.loginForm.classList.toggle("hidden", Boolean(currentUser));

  if (!currentUser) {
    elements.sessionInfo.textContent = "";
    return;
  }

  elements.sessionInfo.innerHTML = `
    <strong>${currentUser.name}</strong><br />
    ${currentUser.role === "admin" ? "Vista completa amministratore" : currentUser.specialty}
  `;

  const visibleEvents = getVisibleEvents(currentUser);
  const filteredEvents = filterEvents(visibleEvents);
  const summary = getSummary(filteredEvents);

  elements.adminSection.classList.toggle("hidden", currentUser.role !== "admin");
  elements.eventsTitle.textContent =
    currentUser.role === "admin" ? "Eventi e richieste" : "Le tue richieste";
  elements.resultsCount.textContent = `${filteredEvents.length} eventi visibili`;

  renderArtistsAdminList();
  renderDashboard(summary, currentUser.role);
  renderEvents(filteredEvents, currentUser);
}

function renderArtistsAdminList() {
  const artists = state.users.filter((user) => user.role === "artist");

  if (!artists.length) {
    elements.artistsAdminList.innerHTML = `
      <p class="empty-state">Nessun artista registrato.</p>
    `;
    return;
  }

  elements.artistsAdminList.innerHTML = artists
    .map(
      (artist) => `
        <div class="artist-option artist-option--admin">
          <div>
            <strong>${artist.name}</strong>
            <span class="artist-role">${artist.specialty}</span>
          </div>
          <button
            class="button button--ghost"
            type="button"
            data-edit-artist="true"
            data-artist-id="${artist.id}"
          >
            Modifica
          </button>
        </div>
      `,
    )
    .join("");
}

function getVisibleEvents(currentUser) {
  const sortedEvents = [...state.events].sort((first, second) =>
    first.date.localeCompare(second.date),
  );

  if (currentUser.role === "admin") {
    return sortedEvents;
  }

  return sortedEvents
    .map((eventItem) => ({
      ...eventItem,
      assignments: eventItem.assignments.filter(
        (assignment) => assignment.artistId === currentUser.id,
      ),
    }))
    .filter((eventItem) => eventItem.assignments.length > 0);
}

function filterEvents(events) {
  const from = elements.filterFrom.value;
  const to = elements.filterTo.value;
  const text = elements.filterText.value.trim().toLowerCase();

  return events.filter((eventItem) => {
    const matchesFrom = !from || eventItem.date >= from;
    const matchesTo = !to || eventItem.date <= to;
    const haystack = [
      eventItem.clientName,
      eventItem.location,
      eventItem.requestedActs,
      eventItem.notes,
      ...eventItem.assignments.map((assignment) => getArtistById(assignment.artistId)?.name || ""),
      ...eventItem.assignments.map(
        (assignment) => getArtistById(assignment.artistId)?.specialty || "",
      ),
    ]
      .join(" ")
      .toLowerCase();
    const matchesText = !text || haystack.includes(text);
    return matchesFrom && matchesTo && matchesText;
  });
}

function getSummary(events) {
  const assignments = events.flatMap((eventItem) => eventItem.assignments);
  return {
    totalEvents: events.length,
    inviati: assignments.filter((item) => item.status === "inviata").length,
    accettati: assignments.filter((item) => item.status === "accettata").length,
    confermati: assignments.filter((item) => item.status === "confermata").length,
  };
}

function renderDashboard(summary, role) {
  const items =
    role === "admin"
      ? [
          {
            label: "Eventi aperti",
            value: summary.totalEvents,
            hint: "Tutte le date attualmente visibili con i filtri attivi.",
          },
          {
            label: "Da confermare dagli artisti",
            value: summary.inviati,
            hint: "Richieste inviate ma non ancora accettate.",
          },
          {
            label: "Accettati in attesa cliente",
            value: summary.accettati,
            hint: "Artisti disponibili, manca la conferma finale del cliente.",
          },
          {
            label: "Date confermate",
            value: summary.confermati,
            hint: "Richieste chiuse e confermate definitivamente.",
          },
        ]
      : [
          {
            label: "Le tue richieste",
            value: summary.totalEvents,
            hint: "Eventi in cui sei stato coinvolto.",
          },
          {
            label: "Da rispondere",
            value: summary.inviati,
            hint: "Richieste che aspettano ancora la tua disponibilita.",
          },
          {
            label: "Da chiudere",
            value: summary.accettati,
            hint: "Hai accettato, ma il cliente non ha ancora confermato.",
          },
          {
            label: "Confermati",
            value: summary.confermati,
            hint: "Date confermate dal cliente.",
          },
        ];

  elements.dashboardSection.innerHTML = "";
  items.forEach((item) => {
    const fragment = elements.statCardTemplate.content.cloneNode(true);
    fragment.querySelector(".stat-card__label").textContent = item.label;
    fragment.querySelector(".stat-card__value").textContent = item.value;
    fragment.querySelector(".stat-card__hint").textContent = item.hint;
    elements.dashboardSection.appendChild(fragment);
  });
}

function renderEvents(events, currentUser) {
  if (!events.length) {
    elements.eventsList.innerHTML = `
      <p class="empty-state">
        Nessun evento trovato con i filtri correnti.
      </p>
    `;
    return;
  }

  elements.eventsList.innerHTML = events
    .map((eventItem) => {
      const counts = getStatusCounts(eventItem.assignments);
      const assignments = eventItem.assignments
        .map((assignment) => renderAssignment(eventItem, assignment, currentUser))
        .join("");

      return `
        <article class="event-card">
          <div class="event-card__top">
            <div>
              <p class="section-kicker">Evento</p>
              <h3 class="event-title">${eventItem.clientName}</h3>
            </div>
            <span class="pill pill--accent">${formatDate(eventItem.date)}</span>
          </div>
          <div class="event-meta">
            <span><strong>Location:</strong> ${eventItem.location}</span>
            <span><strong>Richiesta:</strong> ${eventItem.requestedActs}</span>
            <span>
              <strong>Stato richieste:</strong>
              ${counts.inviata} inviate · ${counts.accettata} accettate · ${counts.confermata} confermate
            </span>
          </div>
          ${eventItem.notes ? `<p class="event-meta"><strong>Note:</strong> ${eventItem.notes}</p>` : ""}
          <div class="assignment-list">${assignments}</div>
        </article>
      `;
    })
    .join("");
}

function renderAssignment(eventItem, assignment, currentUser) {
  const artist = getArtistById(assignment.artistId);
  const isAdmin = currentUser.role === "admin";
  const statusLabel = assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1);
  const controls = isAdmin
    ? `
      <select
        class="status-select"
        data-assignment-status="true"
        data-event-id="${eventItem.id}"
        data-assignment-id="${assignment.id}"
      >
        ${["inviata", "accettata", "confermata"]
          .map(
            (status) => `
              <option value="${status}" ${assignment.status === status ? "selected" : ""}>
                ${capitalize(status)}
              </option>
            `,
          )
          .join("")}
      </select>
    `
    : assignment.status === "inviata"
      ? `
        <button
          class="button"
          type="button"
          data-action="artist-accept"
          data-event-id="${eventItem.id}"
          data-assignment-id="${assignment.id}"
        >
          Confermo disponibilita
        </button>
      `
      : "";

  return `
    <div class="assignment">
      <div class="assignment__identity">
        <strong>${artist?.name || "Artista"}</strong>
        <span>${artist?.specialty || ""}</span>
      </div>
      <div class="assignment__controls">
        <span class="status-badge status--${assignment.status}">${statusLabel}</span>
        ${controls}
      </div>
    </div>
  `;
}

function getArtistById(artistId) {
  return state.users.find((user) => user.id === artistId);
}

function getStatusCounts(assignments) {
  return assignments.reduce(
    (accumulator, assignment) => {
      accumulator[assignment.status] += 1;
      return accumulator;
    },
    { inviata: 0, accettata: 0, confermata: 0 },
  );
}

function formatDate(date) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "long",
  }).format(new Date(`${date}T12:00:00`));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

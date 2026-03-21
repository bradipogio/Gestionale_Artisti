const STORAGE_KEY = "gestionale-artisti-state-v1";
const SESSION_KEY = "gestionale-artisti-session-v1";
const AGENDA_VIEW_KEY = "gestionale-artisti-agenda-view-v1";

const ASSIGNMENT_STATUSES = {
  pending: "inviata",
  accepted: "accettata",
  declined: "non_accettata",
  confirmed: "confermata",
  cancelled: "cancellata",
};

const STATUS_META = {
  [ASSIGNMENT_STATUSES.pending]: { label: "In attesa", final: false },
  [ASSIGNMENT_STATUSES.accepted]: { label: "Accettata", final: false },
  [ASSIGNMENT_STATUSES.declined]: { label: "Non accettata", final: false },
  [ASSIGNMENT_STATUSES.confirmed]: { label: "Confermata", final: true },
  [ASSIGNMENT_STATUSES.cancelled]: { label: "Cancellata", final: true },
};

const ADMIN_STATUS_OPTIONS = [
  ASSIGNMENT_STATUSES.pending,
  ASSIGNMENT_STATUSES.accepted,
  ASSIGNMENT_STATUSES.declined,
  ASSIGNMENT_STATUSES.confirmed,
  ASSIGNMENT_STATUSES.cancelled,
];

const ARTIST_RESPONSE_OPTIONS = [
  ASSIGNMENT_STATUSES.accepted,
  ASSIGNMENT_STATUSES.declined,
];

const seedLocations = [
  {
    id: crypto.randomUUID(),
    name: "Villa Aurelia, Roma",
    mapsUrl: "https://maps.google.com/?q=Villa+Aurelia+Roma",
  },
  {
    id: crypto.randomUUID(),
    name: "Lago di Garda",
    mapsUrl: "https://maps.google.com/?q=Lago+di+Garda",
  },
];

const seedState = {
  users: [
    { id: "admin-1", name: "Admin", role: "admin" },
    { id: "artist-1", name: "Giulia Serra", role: "artist", specialty: "Violinista" },
    { id: "artist-2", name: "Lorenzo Ferri", role: "artist", specialty: "Violoncellista" },
    { id: "artist-3", name: "Elisa Conti", role: "artist", specialty: "Cantante lirica" },
    { id: "artist-4", name: "Matteo Valli", role: "artist", specialty: "Pianista" },
  ],
  locations: seedLocations,
  events: [
    {
      id: crypto.randomUUID(),
      title: "Wedding Martini",
      date: "2026-06-06",
      locationId: seedLocations[0].id,
      locationName: seedLocations[0].name,
      info: "Cerimonia ore 17:30, repertorio classico e ingresso sposi.",
      assignments: [
        {
          id: crypto.randomUUID(),
          artistId: "artist-1",
          status: ASSIGNMENT_STATUSES.accepted,
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          artistId: "artist-2",
          status: ASSIGNMENT_STATUSES.pending,
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          artistId: "artist-3",
          status: ASSIGNMENT_STATUSES.confirmed,
          updatedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: "Ricevimento Villa Blu",
      date: "2026-07-12",
      locationId: seedLocations[1].id,
      locationName: seedLocations[1].name,
      info: "Setup entro le 18:00, service gia incluso.",
      assignments: [
        {
          id: crypto.randomUUID(),
          artistId: "artist-4",
          status: ASSIGNMENT_STATUSES.pending,
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

function normalizeState(rawState) {
  const fallbackState = cloneSeedState();
  const users = Array.isArray(rawState?.users) ? rawState.users : fallbackState.users;
  const locations = Array.isArray(rawState?.locations)
    ? rawState.locations.map((location) => normalizeLocation(location))
    : fallbackState.locations;
  const events = Array.isArray(rawState?.events)
    ? rawState.events.map((eventItem) => normalizeEvent(eventItem, locations))
    : fallbackState.events;

  return { users, locations, events };
}

function normalizeAssignmentStatus(status) {
  if (status === "non accettata") {
    return ASSIGNMENT_STATUSES.declined;
  }

  return STATUS_META[status] ? status : ASSIGNMENT_STATUSES.pending;
}

function normalizeLocation(location) {
  return {
    id: location.id || crypto.randomUUID(),
    name: String(location.name || "").trim(),
    mapsUrl: String(location.mapsUrl || "").trim(),
  };
}

function normalizeEvent(eventItem, locations) {
  const locationName = String(
    eventItem.locationName || eventItem.location || "",
  ).trim();
  const matchedLocation = getLocationByName(locations, locationName);
  const infoParts = [eventItem.info, eventItem.requestedActs, eventItem.notes]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return {
    id: eventItem.id || crypto.randomUUID(),
    title: String(eventItem.title || eventItem.clientName || "").trim(),
    date: String(eventItem.date || ""),
    locationId: String(eventItem.locationId || matchedLocation?.id || ""),
    locationName: matchedLocation?.name || locationName,
    info: infoParts.join(infoParts.length > 1 ? " · " : ""),
    assignments: Array.isArray(eventItem.assignments)
      ? eventItem.assignments.map((assignment) => ({
          ...assignment,
          status: normalizeAssignmentStatus(assignment.status),
          updatedAt: assignment.updatedAt || new Date().toISOString(),
        }))
      : [],
    createdAt: eventItem.createdAt || new Date().toISOString(),
  };
}

const state = loadState();
let sessionUserId = localStorage.getItem(SESSION_KEY) || "";
let eventArtistSelection = [];
let activeModal = "";
let openEventId = "";
let agendaViewMode = localStorage.getItem(AGENDA_VIEW_KEY) === "calendar" ? "calendar" : "list";
let calendarMonthCursor = null;
let selectedCalendarEventId = "";

const elements = {
  app: document.querySelector("#app"),
  loginForm: document.querySelector("#loginForm"),
  loginUserId: document.querySelector("#loginUserId"),
  loginButton: document.querySelector("#loginButton"),
  accountForm: document.querySelector("#accountForm"),
  accountUserId: document.querySelector("#accountUserId"),
  accountMenu: document.querySelector("#accountMenu"),
  accountMenuLabel: document.querySelector("#accountMenuLabel"),
  logoutButton: document.querySelector("#logoutButton"),
  toggleSearchBar: document.querySelector("#toggleSearchBar"),
  searchBar: document.querySelector("#searchBar"),
  dashboardPanel: document.querySelector("#dashboardPanel"),
  agendaPanel: document.querySelector("#agendaPanel"),
  dashboardSection: document.querySelector("#dashboardSection"),
  quickActions: document.querySelector("#quickActions"),
  quickActionsToggle: document.querySelector("#quickActionsToggle"),
  quickActionsMenu: document.querySelector("#quickActionsMenu"),
  openEventModal: document.querySelector("#openEventModal"),
  openArtistModal: document.querySelector("#openArtistModal"),
  openLocationModal: document.querySelector("#openLocationModal"),
  modalOverlay: document.querySelector("#modalOverlay"),
  eventModal: document.querySelector("#eventModal"),
  artistModal: document.querySelector("#artistModal"),
  locationModal: document.querySelector("#locationModal"),
  artistForm: document.querySelector("#artistForm"),
  artistId: document.querySelector("#artistId"),
  artistName: document.querySelector("#artistName"),
  artistSpecialty: document.querySelector("#artistSpecialty"),
  artistFormTitle: document.querySelector("#artistFormTitle"),
  artistSubmitButton: document.querySelector("#artistSubmitButton"),
  artistFeedback: document.querySelector("#artistFeedback"),
  cancelArtistEdit: document.querySelector("#cancelArtistEdit"),
  artistsAdminList: document.querySelector("#artistsAdminList"),
  locationForm: document.querySelector("#locationForm"),
  locationId: document.querySelector("#locationId"),
  locationName: document.querySelector("#locationName"),
  locationMapsUrl: document.querySelector("#locationMapsUrl"),
  locationFormTitle: document.querySelector("#locationFormTitle"),
  locationSubmitButton: document.querySelector("#locationSubmitButton"),
  locationFeedback: document.querySelector("#locationFeedback"),
  cancelLocationEdit: document.querySelector("#cancelLocationEdit"),
  locationsAdminList: document.querySelector("#locationsAdminList"),
  eventForm: document.querySelector("#eventForm"),
  eventId: document.querySelector("#eventId"),
  eventModalTitle: document.querySelector("#eventModalTitle"),
  eventSubmitButton: document.querySelector("#eventSubmitButton"),
  cancelEventEdit: document.querySelector("#cancelEventEdit"),
  eventArtistSelect: document.querySelector("#eventArtistSelect"),
  addEventArtist: document.querySelector("#addEventArtist"),
  selectedEventArtists: document.querySelector("#selectedEventArtists"),
  eventsList: document.querySelector("#eventsList"),
  agendaListViewButton: document.querySelector("#agendaListViewButton"),
  agendaCalendarViewButton: document.querySelector("#agendaCalendarViewButton"),
  calendarToolbar: document.querySelector("#calendarToolbar"),
  calendarPrevButton: document.querySelector("#calendarPrevButton"),
  calendarNextButton: document.querySelector("#calendarNextButton"),
  calendarLabel: document.querySelector("#calendarLabel"),
  calendarView: document.querySelector("#calendarView"),
  filterText: document.querySelector("#filterText"),
  resetFilters: document.querySelector("#resetFilters"),
  savedLocationsList: document.querySelector("#savedLocationsList"),
  statCardTemplate: document.querySelector("#statCardTemplate"),
};

bootstrap();

function bootstrap() {
  populateLoginUsers();
  renderLocationOptions();
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
    return normalizeState(JSON.parse(saved));
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
    return cloneSeedState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", handleSessionSubmit);
  elements.accountForm.addEventListener("submit", handleSessionSubmit);
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.toggleSearchBar.addEventListener("click", toggleSearchBar);
  elements.quickActionsToggle.addEventListener("click", toggleQuickActionsMenu);
  elements.openEventModal.addEventListener("click", () => {
    resetEventForm();
    openModal("event");
  });
  elements.openArtistModal.addEventListener("click", () => {
    resetArtistForm();
    openModal("artist");
  });
  elements.openLocationModal.addEventListener("click", () => {
    resetLocationForm();
    openModal("location");
  });
  elements.modalOverlay.addEventListener("click", handleModalOverlayClick);
  elements.artistForm.addEventListener("submit", handleArtistSubmit);
  elements.locationForm.addEventListener("submit", handleLocationSubmit);
  elements.cancelArtistEdit.addEventListener("click", resetArtistForm);
  elements.cancelLocationEdit.addEventListener("click", resetLocationForm);
  elements.cancelEventEdit.addEventListener("click", resetEventForm);
  elements.artistsAdminList.addEventListener("click", handleArtistAdminClick);
  elements.locationsAdminList.addEventListener("click", handleLocationAdminClick);
  elements.addEventArtist.addEventListener("click", handleAddEventArtist);
  elements.eventForm.addEventListener("submit", handleCreateEvent);
  elements.selectedEventArtists.addEventListener("click", handleSelectedEventArtistsClick);
  elements.eventsList.addEventListener("pointerdown", handleSummaryControlPointer, true);
  elements.eventsList.addEventListener("click", handleSummaryControlPointer, true);
  elements.eventsList.addEventListener("click", handleEventsClick);
  elements.eventsList.addEventListener("change", handleStatusChange);
  elements.eventsList.addEventListener("toggle", handleEventCardToggle, true);
  elements.agendaListViewButton.addEventListener("click", () => setAgendaViewMode("list"));
  elements.agendaCalendarViewButton.addEventListener("click", () => setAgendaViewMode("calendar"));
  elements.calendarPrevButton.addEventListener("click", () => shiftCalendarMonth(-1));
  elements.calendarNextButton.addEventListener("click", () => shiftCalendarMonth(1));
  elements.calendarView.addEventListener("click", handleCalendarClick);
  elements.resetFilters.addEventListener("click", resetFilters);
  elements.filterText.addEventListener("input", renderApp);
  document.addEventListener("click", handleDocumentClick);
}

function handleSessionSubmit(event) {
  event.preventDefault();
  const nextUserId =
    event.currentTarget === elements.accountForm
      ? elements.accountUserId.value
      : elements.loginUserId.value;
  updateSessionUser(nextUserId);
}

function handleLogout() {
  sessionUserId = "";
  localStorage.removeItem(SESSION_KEY);
  populateLoginUsers();
  elements.accountMenu.open = false;
  closeSearchBar();
  closeModal();
  renderApp();
}

function handleCreateEvent(event) {
  event.preventDefault();
  const formData = new FormData(elements.eventForm);
  const eventId = String(formData.get("eventId") || "").trim();
  const title = String(formData.get("eventName")).trim();
  const eventDate = String(formData.get("eventDate"));
  const locationInput = String(formData.get("location")).trim();
  const info = String(formData.get("eventInfo")).trim();
  const selectedArtists = state.users
    .filter((user) => user.role === "artist")
    .filter((artist) => eventArtistSelection.includes(artist.id));
  const matchedLocation = getLocationByName(state.locations, locationInput);
  const locationId = matchedLocation?.id || "";
  const locationName = matchedLocation?.name || locationInput;

  if (!title || !eventDate || !locationName) {
    alert("Compila evento, data e location.");
    return;
  }

  if (!selectedArtists.length) {
    alert("Seleziona almeno un artista da contattare.");
    return;
  }

  if (eventId) {
    const eventItem = state.events.find((item) => item.id === eventId);
    if (!eventItem) return;

    eventItem.title = title;
    eventItem.date = eventDate;
    eventItem.locationId = locationId;
    eventItem.locationName = locationName;
    eventItem.info = info;

    const existingAssignments = new Map(
      eventItem.assignments.map((assignment) => [assignment.artistId, assignment]),
    );

    eventItem.assignments = selectedArtists.map((artist) => {
      const existingAssignment = existingAssignments.get(artist.id);
      return (
        existingAssignment || {
          id: crypto.randomUUID(),
          artistId: artist.id,
          status: ASSIGNMENT_STATUSES.pending,
          updatedAt: new Date().toISOString(),
        }
      );
    });
  } else {
    state.events.unshift({
      id: crypto.randomUUID(),
      title,
      date: eventDate,
      locationId,
      locationName,
      info,
      assignments: selectedArtists.map((artist) => ({
        id: crypto.randomUUID(),
        artistId: artist.id,
        status: ASSIGNMENT_STATUSES.pending,
        updatedAt: new Date().toISOString(),
      })),
      createdAt: new Date().toISOString(),
    });
  }

  saveState();
  resetEventForm();
  closeModal();
  renderApp();
}

function handleArtistSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.artistForm);
  const artistId = String(formData.get("artistId") || "").trim();
  const name = String(formData.get("artistName") || "").trim();
  const specialty = String(formData.get("artistSpecialty") || "").trim();
  const isEditing = Boolean(artistId);

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
  elements.artistFeedback.textContent = isEditing
    ? `${name} aggiornato. Lo trovi nel roster e nel menu Utente.`
    : `${name} aggiunto. Lo trovi nel roster, nel menu Utente e in "Artisti da contattare".`;
  elements.artistFeedback.classList.remove("hidden");
  resetArtistForm();
  closeModal();
  renderApp();
}

function handleLocationSubmit(event) {
  event.preventDefault();
  const formData = new FormData(elements.locationForm);
  const locationId = String(formData.get("locationId") || "").trim();
  const name = String(formData.get("locationName") || "").trim();
  const mapsUrl = String(formData.get("locationMapsUrl") || "").trim();
  const isEditing = Boolean(locationId);
  const duplicateLocation = state.locations.find(
    (location) =>
      location.name.toLowerCase() === name.toLowerCase() && location.id !== locationId,
  );

  if (!name) {
    alert("Inserisci il nome della location.");
    return;
  }

  if (duplicateLocation) {
    alert("Questa location e gia presente.");
    return;
  }

  if (locationId) {
    const location = getLocationById(locationId);
    if (!location) return;
    const previousName = location.name;
    location.name = name;
    location.mapsUrl = mapsUrl;
    syncEventsWithLocationRename(location.id, previousName, name);
  } else {
    state.locations.push({
      id: crypto.randomUUID(),
      name,
      mapsUrl,
    });
  }

  saveState();
  renderLocationOptions();
  elements.locationFeedback.textContent = isEditing
    ? `${name} aggiornata.`
    : `${name} salvata nelle location.`;
  elements.locationFeedback.classList.remove("hidden");
  resetLocationForm();
  closeModal();
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
  openModal("artist");
  elements.artistName.focus();
}

function handleLocationAdminClick(event) {
  const button = event.target.closest("[data-edit-location]");
  if (!button) return;

  const location = getLocationById(button.dataset.locationId);
  if (!location) return;

  elements.locationId.value = location.id;
  elements.locationName.value = location.name;
  elements.locationMapsUrl.value = location.mapsUrl || "";
  elements.locationFormTitle.textContent = "Modifica location";
  elements.locationSubmitButton.textContent = "Salva modifica";
  elements.cancelLocationEdit.classList.remove("hidden");
  openModal("location");
  elements.locationName.focus();
}

function toggleQuickActionsMenu() {
  elements.accountMenu.open = false;
  const isOpen = !elements.quickActionsMenu.classList.contains("hidden");
  elements.quickActionsMenu.classList.toggle("hidden", isOpen);
  elements.quickActionsToggle.setAttribute("aria-expanded", String(!isOpen));
}

function toggleSearchBar() {
  const isHidden = elements.searchBar.classList.contains("hidden");
  elements.searchBar.classList.toggle("hidden", !isHidden);
  elements.toggleSearchBar.classList.toggle("utility-button--active", isHidden);
  elements.toggleSearchBar.setAttribute("aria-pressed", String(isHidden));

  if (isHidden) {
    elements.filterText.focus();
  }
}

function closeSearchBar() {
  elements.searchBar.classList.add("hidden");
  elements.toggleSearchBar.classList.remove("utility-button--active");
  elements.toggleSearchBar.setAttribute("aria-pressed", "false");
}

function handleDocumentClick(event) {
  if (
    !event.target.closest("#quickActions") &&
    !elements.quickActionsMenu.classList.contains("hidden")
  ) {
    elements.quickActionsMenu.classList.add("hidden");
    elements.quickActionsToggle.setAttribute("aria-expanded", "false");
  }

  if (!event.target.closest("#accountMenu")) {
    elements.accountMenu.open = false;
  }

  if (!event.target.closest(".utility-search")) {
    closeSearchBar();
  }
}

function openModal(type) {
  activeModal = type;
  elements.quickActionsMenu.classList.add("hidden");
  elements.quickActionsToggle.setAttribute("aria-expanded", "false");
  elements.modalOverlay.classList.remove("hidden");
  elements.eventModal.classList.toggle("hidden", type !== "event");
  elements.artistModal.classList.toggle("hidden", type !== "artist");
  elements.locationModal.classList.toggle("hidden", type !== "location");

  if (type === "event") {
    elements.eventModal.querySelector("input, textarea, select")?.focus();
  }

  if (type === "artist") {
    elements.artistName.focus();
  }

  if (type === "location") {
    elements.locationName.focus();
  }
}

function closeModal() {
  activeModal = "";
  elements.modalOverlay.classList.add("hidden");
  elements.eventModal.classList.add("hidden");
  elements.artistModal.classList.add("hidden");
  elements.locationModal.classList.add("hidden");
  elements.quickActionsMenu.classList.add("hidden");
  elements.quickActionsToggle?.setAttribute("aria-expanded", "false");
}

function handleModalOverlayClick(event) {
  if (event.target === elements.modalOverlay || event.target.closest("[data-close-modal]")) {
    closeModal();
  }
}

function handleAddEventArtist() {
  const artistId = elements.eventArtistSelect.value;
  if (!artistId) return;

  if (eventArtistSelection.includes(artistId)) {
    alert("Questo artista e gia stato selezionato.");
    return;
  }

  eventArtistSelection.push(artistId);
  renderArtistOptions();
}

function handleSelectedEventArtistsClick(event) {
  const button = event.target.closest("[data-remove-selected-artist]");
  if (!button) return;

  eventArtistSelection = eventArtistSelection.filter((artistId) => artistId !== button.dataset.artistId);
  renderArtistOptions();
}

function handleEventsClick(event) {
  const editButton = event.target.closest("[data-edit-event]");
  if (editButton) {
    const eventItem = state.events.find((item) => item.id === editButton.dataset.eventId);
    if (!eventItem) return;

    startEventEdit(eventItem);
    return;
  }
}

function handleCalendarClick(event) {
  const eventButton = event.target.closest("[data-calendar-event-id]");
  if (!eventButton) return;

  selectedCalendarEventId = eventButton.dataset.calendarEventId;
  openEventId = selectedCalendarEventId;
  renderApp();
}

function handleStatusChange(event) {
  const select = event.target.closest("[data-assignment-status]");
  if (!select) return;
  if (!select.value) return;

  const eventId = select.dataset.eventId;
  const assignmentId = select.dataset.assignmentId;
  const eventItem = state.events.find((item) => item.id === eventId);
  const assignment = eventItem?.assignments.find((item) => item.id === assignmentId);

  if (!eventItem || !assignment) return;
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  if (!canUserSetAssignmentStatus(currentUser, assignment.status, select.value)) {
    renderApp();
    return;
  }

  assignment.status = select.value;
  assignment.updatedAt = new Date().toISOString();
  saveState();
  renderApp();
}

function handleSummaryControlPointer(event) {
  if (event.target.closest(".status-pill-select") || event.target.closest(".meta-pill--status-control")) {
    event.stopPropagation();
  }
}

function handleEventCardToggle(event) {
  const card = event.target.closest(".event-card[data-event-id]");
  if (!card) return;

  if (card.open) {
    openEventId = card.dataset.eventId;
    document.querySelectorAll(".event-card[open]").forEach((openCard) => {
      if (openCard !== card) {
        openCard.removeAttribute("open");
      }
    });
  } else {
    if (openEventId === card.dataset.eventId) {
      openEventId = "";
    }
  }
}

function resetFilters() {
  elements.filterText.value = "";
  renderApp();
}

function setAgendaViewMode(nextMode) {
  if (agendaViewMode === nextMode) return;

  agendaViewMode = nextMode;
  localStorage.setItem(AGENDA_VIEW_KEY, agendaViewMode);

  if (agendaViewMode === "calendar") {
    const currentUser = getCurrentUser();
    const visibleEvents = currentUser ? filterEvents(getVisibleEvents(currentUser)) : [];
    ensureCalendarMonthCursor(visibleEvents);
  }

  renderApp();
}

function shiftCalendarMonth(offset) {
  calendarMonthCursor = createShiftedMonthCursor(calendarMonthCursor, offset);
  selectedCalendarEventId = "";
  renderApp();
}

function resetArtistForm() {
  elements.artistForm.reset();
  elements.artistId.value = "";
  elements.artistFormTitle.textContent = "Nuovo artista";
  elements.artistSubmitButton.textContent = "Aggiungi artista";
  elements.cancelArtistEdit.classList.add("hidden");
  elements.artistFeedback.classList.add("hidden");
}

function resetLocationForm() {
  elements.locationForm.reset();
  elements.locationId.value = "";
  elements.locationFormTitle.textContent = "Nuova location";
  elements.locationSubmitButton.textContent = "Salva location";
  elements.cancelLocationEdit.classList.add("hidden");
  elements.locationFeedback.classList.add("hidden");
}

function resetEventForm() {
  elements.eventForm.reset();
  elements.eventId.value = "";
  elements.eventModalTitle.textContent = "Nuovo evento";
  elements.eventSubmitButton.textContent = "Crea evento e invia richieste";
  elements.cancelEventEdit.classList.add("hidden");
  eventArtistSelection = [];
  renderArtistOptions();
}

function startEventEdit(eventItem) {
  resetEventForm();
  elements.eventId.value = eventItem.id;
  elements.eventModalTitle.textContent = "Modifica evento";
  elements.eventSubmitButton.textContent = "Salva modifiche";
  elements.cancelEventEdit.classList.remove("hidden");
  elements.eventForm.elements.eventName.value = eventItem.title;
  elements.eventForm.elements.eventDate.value = eventItem.date;
  elements.eventForm.elements.location.value = eventItem.locationName;
  elements.eventForm.elements.eventInfo.value = eventItem.info || "";
  eventArtistSelection = eventItem.assignments.map((assignment) => assignment.artistId);
  renderArtistOptions();
  openModal("event");
}

function populateLoginUsers() {
  const optionsMarkup = state.users
    .map(
      (user) => `
        <option value="${user.id}">
          ${user.name} · ${user.role === "admin" ? "Admin" : user.specialty}
        </option>
      `,
    )
    .join("");

  elements.loginUserId.innerHTML = optionsMarkup;
  elements.accountUserId.innerHTML = optionsMarkup;

  if (!sessionUserId) {
    elements.loginUserId.value = state.users[0].id;
    elements.accountUserId.value = state.users[0].id;
  } else {
    elements.loginUserId.value = sessionUserId;
    elements.accountUserId.value = sessionUserId;
  }
}

function renderArtistOptions() {
  const artists = state.users.filter((user) => user.role === "artist");
  const availableArtists = artists.filter((artist) => !eventArtistSelection.includes(artist.id));

  elements.eventArtistSelect.innerHTML = `
    <option value="">Scegli un artista</option>
    ${availableArtists
      .map(
        (artist) => `
          <option value="${artist.id}">
            ${artist.name} · ${artist.specialty}
          </option>
        `,
      )
      .join("")}
  `;

  if (!eventArtistSelection.length) {
    elements.selectedEventArtists.innerHTML = `
      <p class="empty-state">Nessun artista selezionato.</p>
    `;
    return;
  }

  elements.selectedEventArtists.innerHTML = eventArtistSelection
    .map(
      (artistId) => {
        const artist = getArtistById(artistId);
        if (!artist) return "";

        return `
        <div class="selected-artist">
          <div>
            <strong>${artist.name}</strong>
            <span class="artist-role">${artist.specialty}</span>
          </div>
          <button
            class="button button--ghost"
            type="button"
            data-remove-selected-artist="true"
            data-artist-id="${artist.id}"
          >
            Rimuovi
          </button>
        </div>
      `;
      },
    )
    .join("");
}

function renderLocationOptions() {
  elements.savedLocationsList.innerHTML = state.locations
    .slice()
    .sort((first, second) => first.name.localeCompare(second.name, "it"))
    .map((location) => `<option value="${location.name}"></option>`)
    .join("");
}

function renderApp() {
  const currentUser = state.users.find((user) => user.id === sessionUserId) || null;

  elements.app.classList.toggle("hidden", !currentUser);
  document.body.classList.toggle("app-mode", Boolean(currentUser));
  elements.loginButton.textContent = "Entra nella webapp";

  if (!currentUser) {
    elements.accountMenu.open = false;
    elements.accountMenuLabel.textContent = "Profilo";
    closeSearchBar();
    elements.calendarToolbar.classList.add("hidden");
    elements.calendarView.classList.add("hidden");
    elements.calendarView.innerHTML = "";
    return;
  }

  elements.accountMenuLabel.textContent = currentUser.name;
  elements.accountUserId.value = currentUser.id;

  const visibleEvents = getVisibleEvents(currentUser);
  const filteredEvents = filterEvents(visibleEvents);
  const summary = getSummary(filteredEvents);

  elements.quickActions.classList.toggle("hidden", currentUser.role !== "admin");

  renderArtistsAdminList();
  renderLocationsAdminList();
  renderDashboard(summary, currentUser.role);
  renderAgenda(filteredEvents, currentUser);
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

function renderLocationsAdminList() {
  if (!state.locations.length) {
    elements.locationsAdminList.innerHTML = `
      <p class="empty-state">Nessuna location salvata.</p>
    `;
    return;
  }

  elements.locationsAdminList.innerHTML = state.locations
    .slice()
    .sort((first, second) => first.name.localeCompare(second.name, "it"))
    .map(
      (location) => `
        <div class="artist-option artist-option--admin">
          <div>
            <strong>${location.name}</strong>
            <span class="artist-role">
              ${location.mapsUrl
                ? `<a href="${location.mapsUrl}" target="_blank" rel="noreferrer">Apri Google Maps</a>`
                : "Nessun link Maps"}
            </span>
          </div>
          <button
            class="button button--ghost"
            type="button"
            data-edit-location="true"
            data-location-id="${location.id}"
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
  const text = elements.filterText.value.trim().toLowerCase();

  return events.filter((eventItem) => {
    const haystack = [
      eventItem.title,
      eventItem.locationName,
      getEventLocation(eventItem)?.mapsUrl || "",
      eventItem.info,
      ...eventItem.assignments.map((assignment) => getArtistById(assignment.artistId)?.name || ""),
      ...eventItem.assignments.map(
        (assignment) => getArtistById(assignment.artistId)?.specialty || "",
      ),
    ]
      .join(" ")
      .toLowerCase();
    const matchesText = !text || haystack.includes(text);
    return matchesText;
  });
}

function getSummary(events) {
  const assignments = events.flatMap((eventItem) => eventItem.assignments);
  return {
    totalEvents: events.length,
    totalRequests: assignments.length,
    openRequests: assignments.filter(
      (item) =>
        item.status !== ASSIGNMENT_STATUSES.confirmed &&
        item.status !== ASSIGNMENT_STATUSES.cancelled,
    ).length,
    waitingArtist: assignments.filter((item) => item.status === ASSIGNMENT_STATUSES.pending).length,
    waitingClient: assignments.filter((item) => item.status === ASSIGNMENT_STATUSES.accepted)
      .length,
    confirmed: assignments.filter((item) => item.status === ASSIGNMENT_STATUSES.confirmed).length,
    cancelled: assignments.filter((item) => item.status === ASSIGNMENT_STATUSES.cancelled).length,
  };
}

function renderDashboard(summary, role) {
  const items =
    role === "admin"
      ? [
          {
            label: "Tot eventi",
            value: summary.totalEvents,
          },
          {
            label: "Tot richieste",
            value: summary.totalRequests,
          },
          {
            label: "Aperte",
            value: summary.openRequests,
          },
          {
            label: "Attesa artista",
            value: summary.waitingArtist,
          },
          {
            label: "Attesa cliente",
            value: summary.waitingClient,
          },
          {
            label: "Confermate",
            value: summary.confirmed,
          },
          {
            label: "Cancellate",
            value: summary.cancelled,
          },
        ]
      : [
          {
            label: "Tutte le richieste",
            value: summary.totalRequests,
          },
          {
            label: "Da confermare",
            value: summary.waitingArtist,
          },
          {
            label: "Attesa cliente",
            value: summary.waitingClient,
          },
          {
            label: "Confermate",
            value: summary.confirmed,
          },
          {
            label: "Cancellate",
            value: summary.cancelled,
          },
        ];

  elements.dashboardSection.innerHTML = "";
  items.forEach((item) => {
    const fragment = elements.statCardTemplate.content.cloneNode(true);
    fragment.querySelector(".stat-card__label").textContent = item.label;
    fragment.querySelector(".stat-card__value").textContent = item.value;
    elements.dashboardSection.appendChild(fragment);
  });
}

function renderAgenda(events, currentUser) {
  syncAgendaViewControls();

  if (!events.length) {
    elements.calendarToolbar.classList.add("hidden");
    elements.calendarView.classList.add("hidden");
    elements.calendarView.innerHTML = "";
    elements.eventsList.classList.remove("hidden");
    elements.eventsList.innerHTML = `
      <p class="empty-state">
        Nessun evento trovato con la ricerca corrente.
      </p>
    `;
    return;
  }

  if (agendaViewMode === "calendar") {
    renderCalendarAgenda(events, currentUser);
    return;
  }

  elements.calendarToolbar.classList.add("hidden");
  elements.calendarView.classList.add("hidden");
  elements.calendarView.innerHTML = "";
  elements.eventsList.classList.remove("hidden");
  renderEvents(events, currentUser);
}

function renderEvents(events, currentUser) {
  elements.eventsList.innerHTML = events
    .map((eventItem) =>
      currentUser.role === "admin"
        ? renderAdminEventCard(eventItem, currentUser)
        : renderArtistEventCard(eventItem, currentUser),
    )
    .join("");
}

function renderCalendarAgenda(events, currentUser) {
  ensureCalendarMonthCursor(events);
  const monthEvents = getMonthEvents(events, calendarMonthCursor);

  if (!monthEvents.some((eventItem) => eventItem.id === selectedCalendarEventId)) {
    selectedCalendarEventId = monthEvents[0]?.id || "";
  }

  elements.calendarToolbar.classList.remove("hidden");
  elements.calendarView.classList.remove("hidden");
  elements.eventsList.classList.remove("hidden");
  elements.calendarLabel.textContent = formatCalendarMonth(calendarMonthCursor);
  elements.calendarView.innerHTML = renderCalendarMonth(events, calendarMonthCursor);

  if (!selectedCalendarEventId) {
    elements.eventsList.innerHTML = `
      <p class="empty-state">
        Nessun evento in ${formatCalendarMonth(calendarMonthCursor).toLowerCase()}.
      </p>
    `;
    return;
  }

  const selectedEvent = monthEvents.find((eventItem) => eventItem.id === selectedCalendarEventId);
  if (!selectedEvent) {
    elements.eventsList.innerHTML = `
      <p class="empty-state">
        Nessun dettaglio disponibile per il mese selezionato.
      </p>
    `;
    return;
  }

  elements.eventsList.innerHTML =
    currentUser.role === "admin"
      ? renderAdminEventCard(selectedEvent, currentUser, true)
      : renderArtistEventCard(selectedEvent, currentUser, true);
}

function renderAdminEventCard(eventItem, currentUser, forceOpen = false) {
  const assignments = eventItem.assignments
    .map((assignment) => renderAssignment(eventItem, assignment, currentUser))
    .join("");
  const statusDotsMarkup = renderStatusDots(eventItem.assignments);
  const infoMarkup = eventItem.info
    ? `
      <div class="event-body-block">
        <p class="event-body-label">Informazioni</p>
        <p class="event-body-copy">${eventItem.info}</p>
      </div>
    `
    : "";

  return `
    <details class="event-card" data-event-id="${eventItem.id}" ${forceOpen || openEventId === eventItem.id ? "open" : ""}>
      <summary class="event-card__summary">
        <div class="event-card__summary-row">
          <div>
            <h3 class="event-title">${eventItem.title}</h3>
          </div>
          <div class="event-card__summary-side event-card__summary-side--admin">
            <div class="event-status-dots" aria-label="Stato richieste">
              ${statusDotsMarkup}
            </div>
            <span class="pill pill--accent event-date-pill">${formatDate(eventItem.date)}</span>
            <span class="event-card__chevron" aria-hidden="true"></span>
          </div>
        </div>
      </summary>
      <div class="event-card__body">
        <div class="event-body-top event-body-top--admin">
          <button
            class="icon-button"
            type="button"
            data-edit-event="true"
            data-event-id="${eventItem.id}"
            aria-label="Modifica evento"
            title="Modifica evento"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20l4.2-1 9-9a1.6 1.6 0 0 0 0-2.3l-1.9-1.9a1.6 1.6 0 0 0-2.3 0l-9 9L4 20z"></path>
              <path d="M12 6l6 6"></path>
            </svg>
          </button>
        </div>
        <div class="event-card__summary-meta">
          ${renderLocationMeta(eventItem)}
        </div>
        ${infoMarkup}
        <div class="assignment-list">${assignments}</div>
      </div>
    </details>
  `;
}

function renderArtistEventCard(eventItem, currentUser, forceOpen = false) {
  const assignment = eventItem.assignments[0];
  const statusDotsMarkup = renderStatusDots(eventItem.assignments);
  const artistStatusControl = renderArtistStatusControl(eventItem, assignment);
  const infoMarkup = eventItem.info
    ? `
      <div class="event-body-block">
        <p class="event-body-label">Informazioni</p>
        <p class="event-body-copy">${eventItem.info}</p>
      </div>
    `
    : "";

  return `
    <details class="event-card event-card--artist" data-event-id="${eventItem.id}" ${forceOpen || openEventId === eventItem.id ? "open" : ""}>
      <summary class="event-card__summary">
        <div class="event-card__summary-row">
          <div>
            <h3 class="event-title">${eventItem.title}</h3>
          </div>
          <div class="event-card__summary-side event-card__summary-side--artist">
            <div class="event-status-dots" aria-label="Stato richieste">
              ${statusDotsMarkup}
            </div>
            <span class="pill pill--accent">${formatDate(eventItem.date)}</span>
            <span class="event-card__chevron" aria-hidden="true"></span>
          </div>
        </div>
      </summary>
      <div class="event-card__body">
        <div class="event-card__summary-meta">
          ${renderLocationMeta(eventItem)}
          ${artistStatusControl}
        </div>
        ${infoMarkup}
      </div>
    </details>
  `;
}

function renderAssignment(eventItem, assignment, currentUser) {
  const artist = getArtistById(assignment.artistId);
  const isAdmin = currentUser.role === "admin";
  const statusLabel = getStatusLabel(assignment.status);
  const controls = isAdmin
    ? `
      <select
        class="status-select"
        data-assignment-status="true"
        data-event-id="${eventItem.id}"
        data-assignment-id="${assignment.id}"
      >
        ${renderStatusOptions(ADMIN_STATUS_OPTIONS, assignment.status)}
      </select>
    `
    : !isFinalStatus(assignment.status)
      ? `
      <select
        class="status-select status-select--response"
        data-assignment-status="true"
        data-event-id="${eventItem.id}"
        data-assignment-id="${assignment.id}"
      >
        <option value="" ${assignment.status === ASSIGNMENT_STATUSES.pending ? "selected" : ""} disabled hidden>
          In attesa
        </option>
        ${renderStatusOptions(ARTIST_RESPONSE_OPTIONS, assignment.status)}
      </select>
      ${assignment.status === ASSIGNMENT_STATUSES.pending ? `
        <span class="assignment__hint">Scegli se accettare o non accettare.</span>
      ` : ""}
    `
    : `
        <span class="assignment__hint assignment__hint--final">
          Richiesta chiusa definitivamente.
        </span>
      `;

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

function renderArtistStatusControl(eventItem, assignment) {
  if (isFinalStatus(assignment.status)) {
    return `
      <span class="meta-pill meta-pill--status-control">
        <strong>Stato</strong>
        <span class="status-badge status--${assignment.status}">${getStatusLabel(assignment.status)}</span>
      </span>
    `;
  }

  return `
    <label class="meta-pill meta-pill--status-control">
      <strong>Stato</strong>
      <select
        class="status-pill-select status-pill-select--${assignment.status}"
        data-assignment-status="true"
        data-event-id="${eventItem.id}"
        data-assignment-id="${assignment.id}"
      >
        <option value="" ${assignment.status === ASSIGNMENT_STATUSES.pending ? "selected" : ""} disabled hidden>
          ${getStatusLabel(ASSIGNMENT_STATUSES.pending)}
        </option>
        ${renderStatusOptions(ARTIST_RESPONSE_OPTIONS, assignment.status)}
      </select>
    </label>
  `;
}

function updateSessionUser(nextUserId) {
  sessionUserId = nextUserId;
  localStorage.setItem(SESSION_KEY, sessionUserId);
  populateLoginUsers();
  elements.accountMenu.open = false;
  closeSearchBar();
  closeModal();
  renderApp();
}

function getCurrentUser() {
  return state.users.find((user) => user.id === sessionUserId) || null;
}

function syncAgendaViewControls() {
  const isListView = agendaViewMode === "list";
  elements.agendaListViewButton.classList.toggle("view-toggle--active", isListView);
  elements.agendaCalendarViewButton.classList.toggle("view-toggle--active", !isListView);
  elements.agendaListViewButton.setAttribute("aria-pressed", String(isListView));
  elements.agendaCalendarViewButton.setAttribute("aria-pressed", String(!isListView));
}

function getStatusLabel(status) {
  return STATUS_META[status]?.label || capitalize(status.replaceAll("_", " "));
}

function isFinalStatus(status) {
  return Boolean(STATUS_META[status]?.final);
}

function canUserSetAssignmentStatus(user, currentStatus, nextStatus) {
  if (!STATUS_META[nextStatus]) return false;

  if (user.role === "admin") {
    return true;
  }

  if (isFinalStatus(currentStatus)) {
    return false;
  }

  return ARTIST_RESPONSE_OPTIONS.includes(nextStatus);
}

function renderStatusOptions(statuses, currentStatus) {
  return statuses
    .map(
      (status) => `
        <option value="${status}" ${currentStatus === status ? "selected" : ""}>
          ${getStatusLabel(status)}
        </option>
      `,
    )
    .join("");
}

function getArtistById(artistId) {
  return state.users.find((user) => user.id === artistId);
}

function getLocationById(locationId) {
  return state.locations.find((location) => location.id === locationId) || null;
}

function getLocationByName(locations, locationName) {
  const normalizedName = String(locationName || "").trim().toLowerCase();
  if (!normalizedName) return null;

  return (
    locations.find((location) => location.name.trim().toLowerCase() === normalizedName) || null
  );
}

function getEventLocation(eventItem) {
  return (
    getLocationById(eventItem.locationId) ||
    getLocationByName(state.locations, eventItem.locationName)
  );
}

function renderLocationMeta(eventItem) {
  const location = getEventLocation(eventItem);
  const locationLabel = location?.name || eventItem.locationName;

  if (!locationLabel) {
    return "";
  }

  return `
    <span class="meta-pill">
      <strong>Location</strong>
      ${
        location?.mapsUrl
          ? `<a class="location-link" href="${location.mapsUrl}" target="_blank" rel="noreferrer">${locationLabel}</a>`
          : locationLabel
      }
    </span>
  `;
}

function syncEventsWithLocationRename(locationId, previousName, nextName) {
  state.events.forEach((eventItem) => {
    if (
      eventItem.locationId === locationId ||
      eventItem.locationName.trim().toLowerCase() === previousName.trim().toLowerCase()
    ) {
      eventItem.locationId = locationId;
      eventItem.locationName = nextName;
    }
  });
}

function ensureCalendarMonthCursor(events) {
  if (calendarMonthCursor) return;

  const todayKey = formatMonthKey(new Date());
  const currentMonthEvent = events.find((eventItem) => eventItem.date.startsWith(todayKey));
  const fallbackDate = currentMonthEvent?.date || events[0]?.date;
  calendarMonthCursor = getMonthCursorFromDateString(fallbackDate);
}

function getMonthEvents(events, monthCursor) {
  const monthKey = formatMonthKey(monthCursor);
  return events.filter((eventItem) => eventItem.date.startsWith(monthKey));
}

function renderCalendarMonth(events, monthCursor) {
  const monthEvents = getMonthEvents(events, monthCursor);
  const eventsByDate = monthEvents.reduce((accumulator, eventItem) => {
    accumulator[eventItem.date] ||= [];
    accumulator[eventItem.date].push(eventItem);
    return accumulator;
  }, {});
  const monthStart = getMonthStart(monthCursor);
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
  const startOffset = (monthStart.getDay() + 6) % 7;
  const cells = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push(`<div class="calendar-cell calendar-cell--empty" aria-hidden="true"></div>`);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = formatDateKey(monthStart.getFullYear(), monthStart.getMonth(), day);
    const dayEvents = eventsByDate[dateKey] || [];

    cells.push(`
      <div class="calendar-cell ${dayEvents.length ? "" : "calendar-cell--quiet"}">
        <div class="calendar-cell__day">${day}</div>
        <div class="calendar-cell__events">
          ${dayEvents
            .map(
              (eventItem) => `
                <button
                  class="calendar-event ${selectedCalendarEventId === eventItem.id ? "calendar-event--active" : ""}"
                  type="button"
                  data-calendar-event-id="${eventItem.id}"
                >
                  <span class="calendar-event__name">${eventItem.title}</span>
                  <span class="event-status-dots" aria-label="Stato richieste">
                    ${renderStatusDots(eventItem.assignments)}
                  </span>
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    `);
  }

  return `
    <div class="calendar-grid" role="grid" aria-label="${formatCalendarMonth(monthCursor)}">
      ${["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
        .map((label) => `<div class="calendar-grid__weekday">${label}</div>`)
        .join("")}
      ${cells.join("")}
    </div>
  `;
}

function createShiftedMonthCursor(monthCursor, offset) {
  const baseDate = getMonthStart(monthCursor);
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + offset, 1);
}

function getMonthCursorFromDateString(dateString) {
  if (!dateString) {
    return getMonthStart(new Date());
  }

  const [year, month] = dateString.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function getMonthStart(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatMonthKey(dateValue) {
  const date = getMonthStart(dateValue);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function formatDateKey(year, monthIndex, day) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const date = String(day).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

function formatCalendarMonth(dateValue) {
  return new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(getMonthStart(dateValue));
}

function renderStatusDots(assignments) {
  return assignments
    .map(
      (assignment) => `
        <span
          class="status-dot status-dot--${assignment.status}"
          title="${getStatusLabel(assignment.status)}"
          aria-label="${getStatusLabel(assignment.status)}"
        ></span>
      `,
    )
    .join("");
}

function formatDate(date) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "long",
  }).format(new Date(`${date}T12:00:00`));
}

function formatCount(value, singularLabel, pluralLabel) {
  return value === 1 ? singularLabel : pluralLabel;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

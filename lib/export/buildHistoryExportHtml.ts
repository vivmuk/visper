import type { Entry } from "@/types";

type ExportableEntry = Entry & Record<string, any>;

interface MonthGroup {
  anchor: string;
  label: string;
  entries: ExportableEntry[];
}

interface YearGroup {
  year: string;
  months: MonthGroup[];
}

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });
const readableDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeStyle: "short",
});
const dateBadgeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const SENTIMENTS = ["positive", "neutral", "negative"] as const;

export function buildHistoryExportHtml(
  entries: ExportableEntry[],
  exportDate: Date,
  includeImages: boolean = true
): string {
  const grouped = groupEntriesByYearMonth(entries);
  const tagStats = collectTagStats(entries);
  const typeCounts = collectTypeCounts(entries);
  const sentimentCounts = collectSentimentCounts(entries);

  const topTagsPreview = tagStats.sorted
    .slice(0, 4)
    .map((tag) => `#${tag.tag}`)
    .join(" &bull; ");

  const filtersSection = buildFiltersSection(
    entries.length,
    tagStats.sorted.map((item) => item.tag)
  );
  const timeline = buildTimeline(grouped, includeImages);
  const navigation = buildSidebarNavigation(grouped);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Visper History Export</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
      href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #f7fafc;
        --card: #ffffff;
        --deep-slate: #0f172a;
        --teal: #0f766e;
        --teal-light: #14b8a6;
        --purple: #7c3aed;
        --pink: #ec4899;
        --muted: #475569;
        --border: rgba(15, 23, 42, 0.1);
        --shadow: 0 15px 30px rgba(15, 23, 42, 0.12);
      }
      * {
        box-sizing: border-box;
      }
      html {
        scroll-behavior: smooth;
      }
      body {
        margin: 0;
        font-family: "Outfit", "Segoe UI", system-ui, -apple-system, sans-serif;
        background: linear-gradient(180deg, #f8fbff 0%, #f4f1fb 50%, #fdf2f8 100%);
        color: var(--deep-slate);
        min-height: 100vh;
      }
      .layout {
        display: flex;
      }
      aside.sidebar {
        width: 280px;
        background: linear-gradient(195deg, #0f172a, #0f766e 40%, #7c3aed 75%, #ec4899);
        color: white;
        min-height: 100vh;
        position: sticky;
        top: 0;
        padding: 2rem 1.5rem;
        box-shadow: 0 25px 55px rgba(15, 23, 42, 0.35);
      }
      .sidebar__logo {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 2rem;
      }
      .sidebar__logo span:first-child {
        font-size: 1.1rem;
        text-transform: uppercase;
        letter-spacing: 0.35rem;
        opacity: 0.8;
      }
      .sidebar__logo h1 {
        margin: 0;
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: 0.05em;
      }
      .sidebar__label {
        font-size: 0.8rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        opacity: 0.8;
        margin-bottom: 1rem;
      }
      .nav-group {
        margin-bottom: 1.5rem;
      }
      .nav-year {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }
      .nav-months {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding-left: 0.5rem;
      }
      .month-link {
        color: rgba(255,255,255,0.9);
        text-decoration: none;
        padding: 0.4rem 0.75rem;
        border-radius: 999px;
        display: flex;
        justify-content: space-between;
        font-size: 0.9rem;
        transition: background 0.2s, transform 0.2s;
      }
      .month-link span {
        font-size: 0.75rem;
        opacity: 0.85;
      }
      .month-link:hover {
        background: rgba(255,255,255,0.12);
        transform: translateX(4px);
      }
      .month-link.active {
        background: rgba(255,255,255,0.2);
        color: white;
      }
      .sidebar__empty {
        background: rgba(255,255,255,0.12);
        border-radius: 1rem;
        padding: 1rem;
        font-size: 0.9rem;
        line-height: 1.5;
      }
      main.content {
        flex: 1;
        padding: 2.5rem 3rem 3rem;
        max-width: 960px;
        margin: 0 auto;
      }
      .hero {
        background: linear-gradient(120deg, rgba(13,148,136,0.15), rgba(124,58,237,0.15));
        border-radius: 1.75rem;
        padding: 2.5rem;
        border: 1px solid rgba(14,116,144,0.2);
        box-shadow: var(--shadow);
        margin-bottom: 2rem;
      }
      .hero h2 {
        margin: 0;
        font-size: 2.4rem;
        background: linear-gradient(120deg, var(--teal), var(--purple), var(--pink));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .hero p {
        margin-top: 0.5rem;
        color: var(--muted);
        font-size: 1rem;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1.25rem;
        margin-bottom: 2rem;
      }
      .summary-card {
        border-radius: 1.5rem;
        padding: 1.4rem;
        background: var(--card);
        border: 1px solid rgba(15, 23, 42, 0.06);
        box-shadow: 0 20px 35px rgba(15, 23, 42, 0.08);
      }
      .summary-card.gradient {
        background: linear-gradient(120deg, rgba(20,184,166,0.95), rgba(124,58,237,0.95));
        color: white;
        border: none;
      }
      .summary-card h3 {
        margin: 0;
        font-size: 0.95rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.8;
      }
      .summary-card strong {
        display: block;
        font-size: 2rem;
        margin-top: 0.35rem;
        font-weight: 700;
      }
      .summary-meta {
        margin-top: 0.8rem;
        font-size: 0.9rem;
        line-height: 1.5;
      }
      .summary-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-top: 0.8rem;
      }
      .summary-tag {
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
        background: rgba(15, 118, 110, 0.12);
        color: var(--teal);
        font-size: 0.85rem;
      }
      .filters {
        background: var(--card);
        border-radius: 1.25rem;
        padding: 1.2rem;
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        display: flex;
        flex-wrap: wrap;
        gap: 0.8rem;
        margin-bottom: 2rem;
        align-items: center;
      }
      .filters label {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--muted);
        display: block;
        margin-bottom: 0.35rem;
      }
      .input-wrapper {
        flex: 1;
        min-width: 200px;
      }
      .filters input,
      .filters select {
        width: 100%;
        padding: 0.75rem 1rem;
        border-radius: 999px;
        border: 1px solid var(--border);
        font-size: 0.95rem;
        background: rgba(248,250,252,0.8);
      }
      .filters button {
        border: none;
        border-radius: 999px;
        padding: 0.85rem 1.25rem;
        background: linear-gradient(120deg, var(--teal), var(--purple));
        color: white;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 12px 25px rgba(14,116,144,0.35);
      }
      .filters__results {
        font-size: 0.85rem;
        color: var(--muted);
        margin-left: auto;
      }
      .timeline {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }
      .year-group-label {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--muted);
        letter-spacing: 0.25em;
        text-transform: uppercase;
        margin-bottom: 1rem;
      }
      .month-group {
        background: rgba(255, 255, 255, 0.92);
        border-radius: 1.25rem;
        border: 1px solid rgba(15, 23, 42, 0.05);
        box-shadow: 0 25px 45px rgba(15, 23, 42, 0.08);
        padding: 1.5rem;
      }
      .month-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        padding-bottom: 0.8rem;
      }
      .month-header h3 {
        margin: 0;
        font-size: 1.5rem;
      }
      .month-header span {
        font-size: 0.95rem;
        color: var(--muted);
      }
      .entry-card {
        border-radius: 1.1rem;
        border: 1px solid rgba(15, 23, 42, 0.08);
        padding: 1.25rem;
        margin-bottom: 1rem;
        background: #ffffff;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
      }
      .entry-card:last-child {
        margin-bottom: 0;
      }
      .entry-card__header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
      }
      .entry-date {
        font-size: 0.95rem;
        color: var(--muted);
        margin: 0;
      }
      .entry-source {
        font-size: 0.85rem;
        color: rgba(15, 23, 42, 0.6);
      }
      .entry-type-pill {
        padding: 0.35rem 0.9rem;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        border: 1px solid rgba(15, 23, 42, 0.1);
        background: rgba(20, 184, 166, 0.1);
        color: var(--teal);
        text-transform: capitalize;
      }
      .entry-type-pill.url {
        background: rgba(124, 58, 237, 0.1);
        color: var(--purple);
      }
      .entry-type-pill.image {
        background: rgba(236, 72, 153, 0.1);
        color: var(--pink);
      }
      .entry-title {
        font-size: 1.25rem;
        margin: 0.85rem 0 0.35rem;
      }
      .entry-title a {
        color: var(--purple);
        text-decoration: none;
      }
      .entry-content {
        white-space: pre-line;
        line-height: 1.6;
        color: rgba(15, 23, 42, 0.9);
      }
      .entry-meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.6rem;
        margin-top: 1rem;
        font-size: 0.9rem;
        color: var(--muted);
      }
      .entry-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-top: 0.9rem;
      }
      .entry-tag {
        padding: 0.25rem 0.65rem;
        border-radius: 999px;
        background: rgba(14,116,144,0.12);
        color: var(--teal);
        font-size: 0.85rem;
      }
      .entry-list {
        margin-top: 1rem;
        padding-left: 1.2rem;
        color: rgba(15, 23, 42, 0.95);
      }
      .entry-list li {
        margin-bottom: 0.4rem;
      }
      .entry-section-title {
        font-size: 0.95rem;
        font-weight: 600;
        margin-top: 1rem;
        color: var(--deep-slate);
      }
      .entry-image {
        margin-top: 1rem;
        border-radius: 0.75rem;
        overflow: hidden;
        border: 1px solid rgba(15, 23, 42, 0.1);
        box-shadow: 0 8px 16px rgba(15, 23, 42, 0.08);
      }
      .entry-image img {
        width: 100%;
        height: auto;
        display: block;
        max-width: 100%;
        object-fit: contain;
      }
      .nav-toggle {
        display: none;
        position: fixed;
        left: 1rem;
        bottom: 1rem;
        padding: 0.75rem 1.1rem;
        border-radius: 999px;
        border: none;
        background: linear-gradient(120deg, var(--teal), var(--purple));
        color: white;
        font-weight: 600;
        box-shadow: 0 20px 35px rgba(15, 23, 42, 0.25);
        z-index: 50;
      }
      .nav-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.4);
        z-index: 30;
      }
      @media (max-width: 1100px) {
        .layout {
          flex-direction: column;
        }
        aside.sidebar {
          position: relative;
          width: 100%;
          border-radius: 0 0 2rem 2rem;
          min-height: auto;
        }
        main.content {
          padding: 1.75rem 1.25rem 3rem;
        }
      }
      @media (max-width: 768px) {
        aside.sidebar {
          position: fixed;
          left: -320px;
          top: 0;
          height: 100vh;
          width: 280px;
          transition: transform 0.3s ease;
          border-radius: 0;
          z-index: 40;
        }
        body.sidebar-open aside.sidebar {
          transform: translateX(320px);
        }
        .nav-toggle {
          display: block;
        }
        body.sidebar-open .nav-overlay {
          display: block;
        }
      }
      @media (max-width: 640px) {
        .filters {
          flex-direction: column;
        }
        .filters__results {
          width: 100%;
          text-align: left;
          margin-left: 0;
        }
      }
    </style>
  </head>
  <body>
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar__logo">
          <span>Visper</span>
          <h1>Timeline</h1>
        </div>
        <div class="sidebar__label">Navigate</div>
        ${navigation}
      </aside>
      <main class="content">
        <section class="hero">
          <h2>Your private Visper archive</h2>
          <p>Export generated ${readableDateFormatter.format(exportDate)} &bull; ${
    entries.length
  } entr${entries.length === 1 ? "y" : "ies"} &bull; ${topTagsPreview || "No tags yet"}</p>
        </section>
        ${buildSummaryGrid(entries.length, typeCounts, sentimentCounts, tagStats)}
        ${filtersSection}
        <section class="timeline">
          ${timeline}
        </section>
      </main>
    </div>
    <button class="nav-toggle" id="navToggle">Timeline</button>
    <div class="nav-overlay" id="navOverlay"></div>
    <script>
      (function() {
        const body = document.body;
        const navToggle = document.getElementById("navToggle");
        const navOverlay = document.getElementById("navOverlay");
        const monthLinks = Array.from(document.querySelectorAll(".month-link"));
        const entryCards = Array.from(document.querySelectorAll(".entry-card"));
        const monthSections = Array.from(document.querySelectorAll(".month-group"));
        const searchInput = document.getElementById("searchInput");
        const typeFilter = document.getElementById("typeFilter");
        const tagFilter = document.getElementById("tagFilter");
        const resetFilters = document.getElementById("resetFilters");
        const resultsCount = document.getElementById("resultsCount");

        function closeSidebar() {
          body.classList.remove("sidebar-open");
        }

        function toggleSidebar() {
          body.classList.toggle("sidebar-open");
        }

        navToggle?.addEventListener("click", toggleSidebar);
        navOverlay?.addEventListener("click", closeSidebar);
        monthLinks.forEach((link) => link.addEventListener("click", closeSidebar));

        function applyFilters() {
          const query = (searchInput?.value || "").toLowerCase();
          const type = typeFilter?.value || "";
          const tagValue = (tagFilter?.value || "").toLowerCase();
          let visibleEntries = 0;

          entryCards.forEach((card) => {
            const matchesQuery = !query || card.dataset.content?.includes(query);
            const matchesType = !type || card.dataset.type === type;
            const matchesTag =
              !tagValue || (card.dataset.tags || "").includes(tagValue);
            const isVisible = matchesQuery && matchesType && matchesTag;
            card.style.display = isVisible ? "block" : "none";
            if (isVisible) visibleEntries += 1;
          });

          monthSections.forEach((section) => {
            const cards = Array.from(section.querySelectorAll(".entry-card"));
            if (!cards.length) {
              section.style.display = "block";
              return;
            }
            const visibleChild = cards.some(
              (card) => card.style.display !== "none"
            );
            section.style.display = visibleChild ? "block" : "none";
          });

          if (resultsCount) {
            resultsCount.textContent =
              visibleEntries + " entr" + (visibleEntries === 1 ? "y" : "ies") + " shown";
          }
        }

        searchInput?.addEventListener("input", applyFilters);
        typeFilter?.addEventListener("change", applyFilters);
        tagFilter?.addEventListener("change", applyFilters);
        resetFilters?.addEventListener("click", () => {
          if (searchInput) searchInput.value = "";
          if (typeFilter) typeFilter.value = "";
          if (tagFilter) tagFilter.value = "";
          applyFilters();
        });

        if ("IntersectionObserver" in window) {
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  const id = entry.target.getAttribute("id");
                  monthLinks.forEach((link) => {
                    if (link.dataset.target === id) {
                      link.classList.add("active");
                    } else {
                      link.classList.remove("active");
                    }
                  });
                }
              });
            },
            { rootMargin: "-40% 0px -45% 0px", threshold: 0 }
          );
          monthSections.forEach((section) => observer.observe(section));
        }
      })();
    </script>
  </body>
</html>`;
}

function groupEntriesByYearMonth(entries: ExportableEntry[]): YearGroup[] {
  const grouped = new Map<string, Map<string, MonthGroup>>();

  entries.forEach((entry) => {
    const date = getEntryDate(entry);
    const year = String(date.getFullYear() || "Unknown");
    const monthIndex = date.getMonth();
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const monthLabel = monthFormatter.format(date);

    if (!grouped.has(year)) {
      grouped.set(year, new Map());
    }
    const months = grouped.get(year)!;

    if (!months.has(monthKey)) {
      months.set(monthKey, {
        anchor: `month-${monthKey}`,
        label: monthLabel,
        entries: [],
      });
    }

    months.get(monthKey)!.entries.push(entry);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, months]) => ({
      year,
      months: Array.from(months.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([, month]) => month),
    }));
}

function collectTagStats(entries: ExportableEntry[]) {
  const counts = new Map<string, number>();
  entries.forEach((entry) => {
    (entry.tags || []).forEach((tag: string) => {
      const normalized = tag.trim();
      if (!normalized) return;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
  });
  const sorted = Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return {
    unique: counts.size,
    sorted,
  };
}

function collectTypeCounts(entries: ExportableEntry[]) {
  const counts: Record<string, number> = {
    note: 0,
    url: 0,
    image: 0,
  };

  entries.forEach((entry) => {
    const type = entry.type || "note";
    counts[type] = (counts[type] || 0) + 1;
  });

  return counts;
}

function collectSentimentCounts(entries: ExportableEntry[]) {
  const counts: Record<(typeof SENTIMENTS)[number], number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  entries.forEach((entry) => {
    const sentiment = (entry.sentiment || "neutral") as
      | "positive"
      | "neutral"
      | "negative";
    counts[sentiment] += 1;
  });

  return counts;
}

function buildSummaryGrid(
  totalEntries: number,
  typeCounts: Record<string, number>,
  sentimentCounts: Record<(typeof SENTIMENTS)[number], number>,
  tagStats: ReturnType<typeof collectTagStats>
) {
  const topTags = tagStats.sorted.slice(0, 6);
  const sentimentText = SENTIMENTS.map(
    (sentiment) => `${sentimentCounts[sentiment]} ${sentiment}`
  ).join(" | ");

  return `<section class="summary-grid">
    <article class="summary-card gradient">
      <h3>Entries captured</h3>
      <strong>${totalEntries}</strong>
      <div class="summary-meta">Notes ${typeCounts.note || 0} | URLs ${
    typeCounts.url || 0
  } | Images ${typeCounts.image || 0}</div>
    </article>
    <article class="summary-card">
      <h3>Active tags</h3>
      <strong>${tagStats.unique}</strong>
      <div class="summary-tags">
        ${
          topTags.length
            ? topTags
                .map(
                  (tag) =>
                    `<span class="summary-tag">#${escapeHtml(tag.tag)}</span>`
                )
                .join("")
            : `<span>No tags captured yet</span>`
        }
      </div>
    </article>
    <article class="summary-card">
      <h3>Mood snapshot</h3>
      <strong>${sentimentCounts.positive || 0}</strong>
      <div class="summary-meta">${sentimentText}</div>
    </article>
  </section>`;
}

function buildFiltersSection(totalEntries: number, tags: string[]) {
  const tagOptions = [
    '<option value="">All tags</option>',
    ...tags.map(
      (tag) => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`
    ),
  ].join("");

  return `<section class="filters">
    <div class="input-wrapper">
      <label for="searchInput">Search</label>
      <input type="text" id="searchInput" placeholder="Find anything..." />
    </div>
    <div class="input-wrapper">
      <label for="typeFilter">Type</label>
      <select id="typeFilter">
        <option value="">All entries</option>
        <option value="note">Notes</option>
        <option value="url">URLs</option>
        <option value="image">Images</option>
      </select>
    </div>
    <div class="input-wrapper">
      <label for="tagFilter">Tag</label>
      <select id="tagFilter">
        ${tagOptions}
      </select>
    </div>
    <button id="resetFilters" type="button">Reset</button>
    <div class="filters__results" id="resultsCount">
      ${totalEntries} entr${totalEntries === 1 ? "y" : "ies"} shown
    </div>
  </section>`;
}

function buildTimeline(groups: YearGroup[], includeImages: boolean) {
  if (!groups.length) {
    return `<div class="month-group">
      <p style="margin:0;">No entries yet. Capture your first thought from Visper to see it appear here.</p>
    </div>`;
  }

  return groups
    .map(
      (group) => `
      <div>
        <div class="year-group-label">${group.year}</div>
        ${group.months
          .map(
            (month) => `
            <section class="month-group" id="${month.anchor}">
              <div class="month-header">
                <h3>${month.label} ${group.year}</h3>
                <span>${month.entries.length} entr${
              month.entries.length === 1 ? "y" : "ies"
            }</span>
              </div>
              ${month.entries.map((entry) => buildEntryCard(entry, includeImages)).join("")}
            </section>
          `
          )
          .join("")}
      </div>`
    )
    .join("");
}

function buildEntryCard(entry: ExportableEntry, includeImages: boolean = true) {
  const date = getEntryDate(entry);
  const formattedDate = readableDateFormatter.format(date);
  const shortDate = dateBadgeFormatter.format(date);
  const type = (entry.type || "note").toLowerCase();
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  const topics = Array.isArray(entry.topics) ? entry.topics : [];
  const keywords = Array.isArray(entry.keywords) ? entry.keywords : [];
  const keyPoints = Array.isArray(entry.keyPoints) ? entry.keyPoints : [];
  const quotes = Array.isArray(entry.quotes) ? entry.quotes : [];

  const content =
    entry.improvedText ||
    entry.rawText ||
    entry.summary ||
    "No content provided.";

  const searchContent = [
    formattedDate,
    entry.urlTitle,
    entry.summary,
    entry.rawText,
    entry.improvedText,
    entry.imageDescription,
    tags.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return `<article class="entry-card" data-type="${type}" data-tags="${escapeHtml(
    tags.map((tag) => tag.toLowerCase()).join(",")
  )}" data-content="${escapeHtml(searchContent)}">
    <div class="entry-card__header">
      <div>
        <p class="entry-date">${shortDate} | ${formattedDate}</p>
        <div class="entry-source">Source: ${escapeHtml(entry.source || "raw")}</div>
      </div>
      <span class="entry-type-pill ${type}">
        ${
          type === "url" ? "URL" : type === "image" ? "Image" : "Note"
        }
      </span>
    </div>
    ${
      entry.url
        ? `<h4 class="entry-title"><a href="${entry.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(
            entry.urlTitle || entry.url
          )}</a></h4>`
        : ""
    }
    ${
      entry.imageUrl && includeImages
        ? `<div class="entry-image">
            <img src="${escapeHtml(entry.imageUrl)}" alt="${escapeHtml(entry.imageDescription || "Image")}" loading="lazy" />
          </div>`
        : entry.imageUrl && !includeImages
        ? `<div class="entry-image-placeholder" style="background: linear-gradient(135deg, #f0f9ff 0%, #faf5ff 100%); border: 2px dashed #a855f7; border-radius: 0.75rem; padding: 2rem; text-align: center; color: #7c3aed; margin-top: 1rem;">
            <span style="font-size: 2rem;">🖼️</span>
            <p style="margin: 0.5rem 0 0;">Image not included in export</p>
          </div>`
        : ""
    }
    <div class="entry-content">${escapeHtml(content)}</div>
    <div class="entry-meta">
      <div><strong>Sentiment:</strong> ${escapeHtml(
        entry.sentiment || "neutral"
      )}</div>
      <div><strong>Category:</strong> ${escapeHtml(
        entry.category || "uncategorized"
      )}</div>
      <div><strong>Device:</strong> ${escapeHtml(entry.device || "unknown")}</div>
      <div><strong>Timezone:</strong> ${escapeHtml(
        entry.timezone || "unknown"
      )}</div>
    </div>
    ${
      topics.length
        ? `<div class="entry-section-title">Topics</div>
           <div>${topics.map((topic) => escapeHtml(topic)).join(", ")}</div>`
        : ""
    }
    ${
      keywords.length
        ? `<div class="entry-section-title">Keywords</div>
           <div>${keywords.map((keyword) => escapeHtml(keyword)).join(", ")}</div>`
        : ""
    }
    ${
      keyPoints.length
        ? `<div class="entry-section-title">Key points</div>
           <ul class="entry-list">
             ${keyPoints
               .map((point) => `<li>${escapeHtml(point)}</li>`)
               .join("")}
           </ul>`
        : ""
    }
    ${
      quotes.length
        ? `<div class="entry-section-title">Quotes</div>
           <ul class="entry-list">
             ${quotes
               .map(
                 (quote) =>
                   `<li>&ldquo;${escapeHtml(quote.text)}&rdquo;${
                     quote.locator ? ` &mdash; ${escapeHtml(quote.locator)}` : ""
                   }</li>`
               )
               .join("")}
           </ul>`
        : ""
    }
    ${
      entry.imageDescription
        ? `<div class="entry-section-title">Image</div>
           <div>${escapeHtml(entry.imageDescription)}</div>`
        : ""
    }
    ${
      tags.length
        ? `<div class="entry-tags">
            ${tags
              .map((tag) => `<span class="entry-tag">#${escapeHtml(tag)}</span>`)
              .join("")}
           </div>`
        : ""
    }
  </article>`;
}

function buildSidebarNavigation(groups: YearGroup[]) {
  if (!groups.length) {
    return `<div class="sidebar__empty">No entries yet. As soon as you add thoughts in Visper, quick navigation will appear here.</div>`;
  }

  return groups
    .map(
      (group) => `
      <div class="nav-group">
        <div class="nav-year">${group.year}</div>
        <div class="nav-months">
          ${group.months
            .map(
              (month) => `
              <a href="#${month.anchor}" class="month-link" data-target="${month.anchor}">
                ${month.label}
                <span>${month.entries.length}</span>
              </a>
            `
            )
            .join("")}
        </div>
      </div>
    `
    )
    .join("");
}

function getEntryDate(entry: ExportableEntry) {
  const timestamp = entry.createdAt as any;
  try {
    if (!timestamp) {
      return new Date(0);
    }
    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate();
    }
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000);
    }
    return new Date(timestamp);
  } catch {
    return new Date(0);
  }
}

function escapeHtml(value: string | undefined | null) {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function normalizeStreetName(raw) {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pageHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FR Plowed</title>
    <style>
      :root { font-family: system-ui, sans-serif; color-scheme: light dark; }
      body { margin: 0; padding: 2rem; max-width: 720px; margin-inline: auto; }
      h1 { margin-top: 0; }
      input { width: 100%; padding: 0.65rem; font-size: 1rem; }
      #results button { display:block; width: 100%; text-align:left; margin-top:.5rem; padding:.6rem; }
      .vote-row { display:flex; gap:.75rem; margin-top:1rem; }
      .vote-row button { flex:1; font-size:1rem; padding:.8rem; }
      .card { border: 1px solid #9994; border-radius: 10px; padding: 1rem; margin-top: 1rem; }
      .muted { opacity: 0.8; font-size: 0.95rem; }
    </style>
  </head>
  <body>
    <h1>Fall River Plow Check</h1>
    <p class="muted">Search your street and vote whether it is currently plowed.</p>

    <label for="street-search">Street name</label>
    <input id="street-search" type="text" placeholder="Start typing (e.g. Pleasant)" autocomplete="off" />

    <div id="results" class="card" aria-live="polite"></div>

    <div id="selected" class="card" hidden>
      <strong id="selected-name"></strong>
      <div class="vote-row">
        <button id="vote-yes" type="button">✅ Yes, plowed</button>
        <button id="vote-no" type="button">❄️ No, not plowed</button>
      </div>
      <p id="totals" class="muted"></p>
      <p id="message" role="status"></p>
    </div>

    <script>
      const searchEl = document.getElementById('street-search');
      const resultsEl = document.getElementById('results');
      const selectedWrap = document.getElementById('selected');
      const selectedNameEl = document.getElementById('selected-name');
      const totalsEl = document.getElementById('totals');
      const msgEl = document.getElementById('message');
      const voteYesEl = document.getElementById('vote-yes');
      const voteNoEl = document.getElementById('vote-no');

      let selectedStreet = null;
      let lastSearchAbort = null;

      function renderResults(items) {
        if (!items.length) {
          resultsEl.innerHTML = '<p class="muted">No streets found. Keep typing.</p>';
          return;
        }

        const frag = document.createDocumentFragment();
        items.forEach((street) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = street.name;
          btn.addEventListener('click', () => selectStreet(street));
          frag.appendChild(btn);
        });
        resultsEl.innerHTML = '';
        resultsEl.appendChild(frag);
      }

      async function fetchStreetVotes(streetId) {
        const res = await fetch('/api/votes/' + streetId);
        if (!res.ok) throw new Error('Failed to load vote totals');
        const data = await res.json();
        totalsEl.textContent = 'Votes: ' + data.yes_count + ' yes / ' + data.no_count + ' no';
      }

      async function selectStreet(street) {
        selectedStreet = street;
        selectedWrap.hidden = false;
        selectedNameEl.textContent = street.name;
        msgEl.textContent = '';
        await fetchStreetVotes(street.id);
      }

      async function runSearch(q) {
        if (lastSearchAbort) lastSearchAbort.abort();
        lastSearchAbort = new AbortController();

        const res = await fetch('/api/streets?q=' + encodeURIComponent(q), {
          signal: lastSearchAbort.signal,
        });

        if (!res.ok) {
          resultsEl.innerHTML = '<p>Search failed.</p>';
          return;
        }

        const data = await res.json();
        renderResults(data.streets || []);
      }

      searchEl.addEventListener('input', async () => {
        const q = searchEl.value.trim();
        if (q.length < 2) {
          resultsEl.innerHTML = '<p class="muted">Type at least 2 letters to search streets.</p>';
          return;
        }
        try {
          await runSearch(q);
        } catch (err) {
          if (err.name !== 'AbortError') {
            resultsEl.innerHTML = '<p>Search failed.</p>';
          }
        }
      });

      async function submitVote(isPlowed) {
        if (!selectedStreet) return;

        msgEl.textContent = 'Submitting vote...';
        const res = await fetch('/api/votes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ streetId: selectedStreet.id, isPlowed }),
        });

        if (!res.ok) {
          msgEl.textContent = 'Vote failed. Please try again.';
          return;
        }

        const data = await res.json();
        msgEl.textContent = 'Thanks! Your vote was recorded.';
        totalsEl.textContent = 'Votes: ' + data.yes_count + ' yes / ' + data.no_count + ' no';
      }

      voteYesEl.addEventListener('click', () => submitVote(true));
      voteNoEl.addEventListener('click', () => submitVote(false));

      resultsEl.innerHTML = '<p class="muted">Type at least 2 letters to search streets.</p>';
    </script>
  </body>
</html>`;
}

async function handleSearch(request, env) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const normalized = normalizeStreetName(q);

  if (normalized.length < 2) {
    return json({ streets: [] });
  }

  const query = `${normalized}%`;
  const { results } = await env.DB.prepare(
    `SELECT id, name
     FROM streets
     WHERE normalized_name LIKE ?1
     ORDER BY name ASC
     LIMIT 20`
  )
    .bind(query)
    .all();

  return json({ streets: results ?? [] });
}

async function getVoteTotals(env, streetId) {
  const row = await env.DB.prepare(
    `SELECT yes_count, no_count
     FROM street_vote_totals
     WHERE street_id = ?1`
  )
    .bind(streetId)
    .first();

  return {
    yes_count: row?.yes_count ?? 0,
    no_count: row?.no_count ?? 0,
  };
}

async function handleGetVotes(_request, env, streetId) {
  if (!Number.isInteger(streetId) || streetId <= 0) {
    return json({ error: "Invalid street id" }, 400);
  }

  const totals = await getVoteTotals(env, streetId);
  return json(totals);
}

async function handleVote(request, env) {
  const body = await request.json().catch(() => null);
  const streetId = Number(body?.streetId);
  const isPlowed = Boolean(body?.isPlowed);

  if (!Number.isInteger(streetId) || streetId <= 0) {
    return json({ error: "streetId must be a positive integer" }, 400);
  }

  const streetExists = await env.DB.prepare(
    "SELECT id FROM streets WHERE id = ?1"
  )
    .bind(streetId)
    .first();

  if (!streetExists) {
    return json({ error: "Street not found" }, 404);
  }

  const yesIncrement = isPlowed ? 1 : 0;
  const noIncrement = isPlowed ? 0 : 1;

  await env.DB.prepare(
    `INSERT INTO street_vote_totals (street_id, yes_count, no_count, updated_at)
     VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
     ON CONFLICT(street_id) DO UPDATE SET
       yes_count = yes_count + excluded.yes_count,
       no_count = no_count + excluded.no_count,
       updated_at = CURRENT_TIMESTAMP`
  )
    .bind(streetId, yesIncrement, noIncrement)
    .run();

  const totals = await getVoteTotals(env, streetId);
  return json(totals, 201);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(pageHtml(), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    if (request.method === "GET" && url.pathname === "/api/streets") {
      return handleSearch(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/votes") {
      return handleVote(request, env);
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/votes/")) {
      const id = Number(url.pathname.split("/").pop());
      return handleGetVotes(request, env, id);
    }

    return json({ error: "Not found" }, 404);
  },
};

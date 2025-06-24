const movieList = document.getElementById('movieList');
const tvList = document.getElementById('tvList');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let watchedEpisodes = JSON.parse(localStorage.getItem('watchedEpisodes')) || {};

function saveWatchlist() {
  localStorage.setItem('watchlist', JSON.stringify(watchlist));
  localStorage.setItem('watchedEpisodes', JSON.stringify(watchedEpisodes));
}

function createStars(imdbRating) {
  const ratingOutOf10 = parseFloat(imdbRating);
  const stars = Math.round(ratingOutOf10);
  return '⭐'.repeat(stars) + ` (${ratingOutOf10}/10)`;
}

async function fetchShowEpisodes(title) {
  const res = await fetch(`https://www.omdbapi.com/?apikey=d9e07c32&t=${encodeURIComponent(title)}&type=series`);
  const data = await res.json();
  const totalSeasons = parseInt(data.totalSeasons) || 1;
  const seasons = [];

  for (let s = 1; s <= totalSeasons; s++) {
    const seasonRes = await fetch(`https://www.omdbapi.com/?apikey=d9e07c32&t=${encodeURIComponent(title)}&Season=${s}`);
    const seasonData = await seasonRes.json();
    if (seasonData.Response === 'True') {
      seasons.push(seasonData);
    }
  }

  return seasons;
}

function renderEpisodes(container, title, seasons) {
  seasons.forEach(season => {
    const seasonDiv = document.createElement('div');
    seasonDiv.classList.add('season');

    const header = document.createElement('button');
    header.textContent = `Season ${season.Season}`;
    header.classList.add('season-toggle');
    header.addEventListener('click', () => {
      episodeList.classList.toggle('hidden');
    });

    const episodeList = document.createElement('div');
    episodeList.classList.add('episode-list');

    season.Episodes.forEach(ep => {
      const epId = `${title}-S${season.Season}E${ep.Episode}`;
      const isChecked = watchedEpisodes[epId];

      const label = document.createElement('label');
      label.classList.add('episode-item');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isChecked || false;

      const episodeTitle = document.createElement('span');
      episodeTitle.textContent = `Ep ${ep.Episode}: ${ep.Title}`;
      if (isChecked) {
        episodeTitle.classList.add('watched');
      }

      checkbox.addEventListener('change', () => {
        watchedEpisodes[epId] = checkbox.checked;
        episodeTitle.classList.toggle('watched', checkbox.checked);
        saveWatchlist();
      });

      label.appendChild(checkbox);
      label.appendChild(episodeTitle);
      episodeList.appendChild(label);
    });

    seasonDiv.appendChild(header);
    seasonDiv.appendChild(episodeList);
    container.appendChild(seasonDiv);
  });
}

async function renderList() {
  movieList.innerHTML = '';
  tvList.innerHTML = '';

  for (const item of watchlist) {
    const li = document.createElement('li');
    li.classList.add('watchlist-item');

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('watchlist-content');

    const posterContainer = document.createElement('div');
    posterContainer.classList.add('poster-container');

    const img = document.createElement('img');
    img.src = item.poster || 'https://via.placeholder.com/100x150?text=No+Image';
    img.alt = item.title;

    const title = document.createElement('h3');
    title.textContent = item.title;

    posterContainer.appendChild(img);
    posterContainer.appendChild(title);
    contentDiv.appendChild(posterContainer);

    const plot = document.createElement('p');
    plot.textContent = item.plot;
    contentDiv.appendChild(plot);

    const director = document.createElement('p');
    director.innerHTML = `<strong>Director:</strong> ${item.director}`;
    contentDiv.appendChild(director);

    const actors = document.createElement('p');
    actors.innerHTML = `<strong>Actors:</strong> ${item.actors}`;
    contentDiv.appendChild(actors);

    const ratingsContainer = document.createElement('div');
    ratingsContainer.classList.add('ratings');

    if (item.ratings && item.ratings.length > 0) {
      item.ratings.forEach(rating => {
        const ratingDiv = document.createElement('div');
        ratingDiv.classList.add('rating');

        if (rating.Source === 'Internet Movie Database') {
          ratingDiv.innerHTML = `<strong>IMDb:</strong> ${createStars(rating.Value.split('/')[0])}`;
        } else {
          ratingDiv.innerHTML = `<strong>${rating.Source}:</strong> ${rating.Value}`;
        }

        ratingsContainer.appendChild(ratingDiv);
      });
    }

    contentDiv.appendChild(ratingsContainer);

    const runtime = document.createElement('p');
    runtime.innerHTML = `<strong>Runtime:</strong> ${item.runtime || 'N/A'}`;
    contentDiv.appendChild(runtime);

    li.appendChild(contentDiv);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.classList.add('remove-btn');
    removeBtn.addEventListener('click', () => {
      watchlist = watchlist.filter(w => w.title !== item.title);
      saveWatchlist();
      renderList();
    });
    li.appendChild(removeBtn);

    // Episode tracker toggle for series
    if (item.type === 'series') {
      const episodeContainer = document.createElement('div');
      episodeContainer.classList.add('episode-container', 'hidden');

      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = '📺 Show Episodes';
      toggleBtn.classList.add('episode-toggle');

      let hasLoadedEpisodes = false;

      toggleBtn.addEventListener('click', async () => {
        if (!hasLoadedEpisodes) {
          const seasons = await fetchShowEpisodes(item.title);
          renderEpisodes(episodeContainer, item.title, seasons);
          hasLoadedEpisodes = true;
        }
        episodeContainer.classList.toggle('hidden');
        toggleBtn.textContent = episodeContainer.classList.contains('hidden')
          ? '📺 Show Episodes'
          : '📺 Hide Episodes';
      });

      li.appendChild(toggleBtn);
      li.appendChild(episodeContainer);
    }

    if (item.type === 'series') {
      tvList.appendChild(li);
    } else {
      movieList.appendChild(li);
    }
  }
}

async function addToWatchlist(title) {
  const res = await fetch(`https://www.omdbapi.com/?apikey=d9e07c32&t=${encodeURIComponent(title)}`);
  const data = await res.json();
  if (data.Response === 'True') {
    watchlist.push({
      title: data.Title,
      year: data.Year,
      poster: data.Poster,
      plot: data.Plot,
      ratings: data.Ratings,
      director: data.Director,
      actors: data.Actors,
      runtime: data.Runtime,
      type: data.Type
    });
    saveWatchlist();
    renderList();
  } else {
    alert('Movie or show not found.');
  }
}

searchInput.addEventListener('input', async () => {
  const query = searchInput.value.trim();
  if (query.length < 3) {
    searchResults.innerHTML = '';
    return;
  }

  const res = await fetch(`https://www.omdbapi.com/?apikey=d9e07c32&s=${encodeURIComponent(query)}`);
  const data = await res.json();

  if (data.Response === 'True') {
    searchResults.innerHTML = '';
    data.Search.forEach(item => {
      const option = document.createElement('div');
      option.classList.add('search-result');
      option.textContent = `${item.Title} (${item.Year})`;
      option.addEventListener('click', () => {
        addToWatchlist(item.Title);
        searchInput.value = '';
        searchResults.innerHTML = '';
      });
      searchResults.appendChild(option);
    });
  } else {
    searchResults.innerHTML = '<div class="search-result">No results found.</div>';
  }
});

document.getElementById('refreshButton').addEventListener('click', async () => {
  const updatedWatchlist = [];

  for (const item of watchlist) {
    const data = await fetch(`https://www.omdbapi.com/?apikey=d9e07c32&t=${encodeURIComponent(item.title)}`);
    if (data.Response === 'True') {
      updatedWatchlist.push({
        title: data.Title,
        year: data.Year,
        poster: data.Poster,
        plot: data.Plot,
        ratings: data.Ratings,
        director: data.Director,
        actors: data.Actors,
        runtime: data.Runtime,
        type: data.Type
      });
    } else {
      updatedWatchlist.push(item);
    }
  }

  watchlist = updatedWatchlist;
  saveWatchlist();
  renderList();
});

document.getElementById('darkToggle').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
});

renderList();

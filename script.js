const movieList = document.getElementById('movieList');
const tvList = document.getElementById('tvList');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const userNameInput = document.getElementById('userName');
const movieCount = document.getElementById('movieCount');
const tvCount = document.getElementById('tvCount');
const episodeCount = document.getElementById('episodeCount');
const resetDataBtn = document.getElementById('resetDataBtn');
const recommendationsList = document.getElementById('recommendations');

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

    const headerWrapper = document.createElement('div');
    headerWrapper.classList.add('season-header');

    const header = document.createElement('button');
    header.textContent = `Season ${season.Season}`;
    header.classList.add('season-toggle');

    const episodeList = document.createElement('div');
    episodeList.classList.add('episode-list', 'hidden');

    header.addEventListener('click', () => {
      episodeList.classList.toggle('hidden');
    });

    const markAllBtn = document.createElement('button');
    markAllBtn.classList.add('mark-season');

    const checkAllWatched = () => {
      return season.Episodes.every(ep => {
        const epId = `${title}-S${season.Season}E${ep.Episode}`;
        return watchedEpisodes[epId];
      });
    };

    const updateButtonText = () => {
      markAllBtn.textContent = checkAllWatched() ? '✗ Unmark Season Watched' : '✓ Mark Season Watched';
    };

    updateButtonText();

    markAllBtn.addEventListener('click', () => {
      const checkboxes = episodeList.querySelectorAll('input[type="checkbox"]');
      const spans = episodeList.querySelectorAll('span');

      const shouldUnmark = checkAllWatched();

      checkboxes.forEach((cb, index) => {
        cb.checked = !shouldUnmark;
        spans[index].classList.toggle('watched', !shouldUnmark);

        const epNum = spans[index].textContent.match(/Ep (\d+):/)[1];
        const epId = `${title}-S${season.Season}E${epNum}`;
        watchedEpisodes[epId] = !shouldUnmark;
      });

      updateButtonText();
      saveWatchlist();
      loadProfile();
    });

    headerWrapper.appendChild(header);
    headerWrapper.appendChild(markAllBtn);
    seasonDiv.appendChild(headerWrapper);

    season.Episodes.forEach(ep => {
      const epId = `${title}-S${season.Season}E${ep.Episode}`;
      const isChecked = watchedEpisodes[epId];

      const label = document.createElement('label');
      label.classList.add('episode-item');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isChecked || false;

      const episodeTitle = document.createElement('span');
      const episodeName = ep.Title ? ep.Title : `Episode ${ep.Episode}`;
      episodeTitle.textContent = `Ep ${ep.Episode}: ${episodeName}`;
      if (isChecked) {
        episodeTitle.classList.add('watched');
      }

      checkbox.addEventListener('change', () => {
        watchedEpisodes[epId] = checkbox.checked;
        episodeTitle.classList.toggle('watched', checkbox.checked);
        saveWatchlist();
        loadProfile();
      });

      label.appendChild(checkbox);
      label.appendChild(episodeTitle);
      episodeList.appendChild(label);
    });

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

    // PERSONAL RATING
    const personalRatingContainer = document.createElement('div');
    personalRatingContainer.classList.add('personal-rating');

    const personalRatingLabel = document.createElement('span');
    personalRatingLabel.textContent = 'Your Rating: ';
    personalRatingContainer.appendChild(personalRatingLabel);

    const starsContainer = document.createElement('div');
    starsContainer.classList.add('stars-container');

    let storedRating = localStorage.getItem(`rating_${item.title}`) || 0;
    storedRating = parseInt(storedRating);

    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.classList.add('star');
      if (i <= storedRating) star.classList.add('filled');
      star.textContent = '★';
      star.style.cursor = 'pointer';

      star.addEventListener('click', () => {
        if (storedRating === i) {
          localStorage.setItem(`rating_${item.title}`, 0); // clear rating on repeat click
        } else {
          localStorage.setItem(`rating_${item.title}`, i);
        }
        renderList();
      });

      starsContainer.appendChild(star);
    }

    personalRatingContainer.appendChild(starsContainer);
    contentDiv.appendChild(personalRatingContainer);

    li.appendChild(contentDiv);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.classList.add('remove-btn');
    removeBtn.addEventListener('click', () => {
      watchlist = watchlist.filter(w => w.title !== item.title);
      localStorage.removeItem(`rating_${item.title}`); // also remove personal rating
      saveWatchlist();
      renderList();
      loadProfile();
    });
    li.appendChild(removeBtn);

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

      const markAllEpisodesBtn = document.createElement('button');
      markAllEpisodesBtn.textContent = '✅ Mark All Episodes Watched';
      markAllEpisodesBtn.classList.add('mark-season');

      markAllEpisodesBtn.addEventListener('click', async () => {
        if (!hasLoadedEpisodes) {
          const seasons = await fetchShowEpisodes(item.title);
          renderEpisodes(episodeContainer, item.title, seasons);
          hasLoadedEpisodes = true;
        }

        const checkboxes = episodeContainer.querySelectorAll('input[type="checkbox"]');
        const spans = episodeContainer.querySelectorAll('span');

        checkboxes.forEach((cb, index) => {
          cb.checked = true;
          spans[index].classList.add('watched');
          const epNum = spans[index].textContent.match(/Ep (\d+):/)[1];
          const seasonMatch = spans[index].closest('.season').querySelector('.season-toggle').textContent.match(/Season (\d+)/);
          const epId = `${item.title}-S${seasonMatch[1]}E${epNum}`;
          watchedEpisodes[epId] = true;
        });

        saveWatchlist();
        loadProfile();
      });

      li.appendChild(toggleBtn);
      li.appendChild(markAllEpisodesBtn);
      li.appendChild(episodeContainer);
    }

    if (item.type === 'series') {
      tvList.appendChild(li);
    } else {
      movieList.appendChild(li);
    }
  }

  await fetchRecommendations(); // call recommendations after list render
  loadProfile();
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

document.getElementById('refreshButton').addEventListener('click', renderList);
document.getElementById('darkToggle').addEventListener('change', (e) => {
  document.body.classList.toggle('dark', e.target.checked);
});

userNameInput.addEventListener('input', () => {
  localStorage.setItem('userName', userNameInput.value.trim());
});

resetDataBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear all data?')) {
    localStorage.clear();
    location.reload();
  }
});

function loadProfile() {
  const savedName = localStorage.getItem('userName');
  if (savedName) userNameInput.value = savedName;

  const movieTotal = watchlist.filter(item => item.type !== 'series').length;
  const tvTotal = watchlist.filter(item => item.type === 'series').length;
  const episodeWatched = Object.values(watchedEpisodes).filter(v => v).length;

  movieCount.textContent = movieTotal;
  tvCount.textContent = tvTotal;
  episodeCount.textContent = episodeWatched;
}

async function fetchRecommendations() {
  recommendationsList.innerHTML = '';

  // Titles rated 4 or 5 stars
  const highlyRatedTitles = watchlist.filter(item => {
    const rating = parseInt(localStorage.getItem(`rating_${item.title}`)) || 0;
    return rating >= 4;
  });

  if (highlyRatedTitles.length === 0) {
    recommendationsList.innerHTML = '<li>No recommendations yet. Rate some movies or shows!</li>';
    return;
  }

  const genresCount = {};

  async function fetchDetails(title) {
    const res = await fetch(`https://www.omdbapi.com/?apikey=d9e07c32&t=${encodeURIComponent(title)}`);
    const data = await res.json();
    return data;
  }

  for (const item of highlyRatedTitles) {
    const details = await fetchDetails(item.title);
    if (details.Genre) {
      details.Genre.split(',').map(g => g.trim()).forEach(genre => {
        genresCount[genre] = (genresCount[genre] || 0) + 1;
      });
    }
  }

  const sortedGenres = Object.entries(genresCount).sort((a,b) => b[1] - a[1]);
  if (sortedGenres.length === 0) {
    recommendationsList.innerHTML = '<li>No genres found for recommendations.</li>';
    return;
  }

  const topGenre = sortedGenres[0][0];
  const searchRes = await fetch(`https://www.omdbapi.com/?apikey=d9e07c32&s=${encodeURIComponent(topGenre)}&type=movie`);
  const searchData = await searchRes.json();

  if (searchData.Response !== 'True') {
    recommendationsList.innerHTML = '<li>No recommendations found.</li>';
    return;
  }

  const existingTitles = new Set(watchlist.map(item => item.title.toLowerCase()));
  const recs = searchData.Search.filter(item => !existingTitles.has(item.Title.toLowerCase())).slice(0,5);

  if (recs.length === 0) {
    recommendationsList.innerHTML = '<li>No new recommendations found.</li>';
    return;
  }

  recs.forEach(rec => {
    const li = document.createElement('li');
    li.textContent = `${rec.Title} (${rec.Year})`;

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.style.marginLeft = '10px';
    addBtn.addEventListener('click', () => {
      addToWatchlist(rec.Title);
    });

    li.appendChild(addBtn);
    recommendationsList.appendChild(li);
  });
}

renderList();

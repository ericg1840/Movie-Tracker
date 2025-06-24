const list = document.getElementById('watchlist');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];

async function fetchMovieData(title) {
  const res = await fetch(`https://www.omdbapi.com/?apikey=d9e07c32&t=${encodeURIComponent(title)}`);
  const data = await res.json();
  return data;
}

function saveWatchlist() {
  localStorage.setItem('watchlist', JSON.stringify(watchlist));
}

function createStars(imdbRating) {
  const ratingOutOf10 = parseFloat(imdbRating);
  const stars = Math.round(ratingOutOf10);
  return '⭐'.repeat(stars) + ` (${ratingOutOf10}/10)`;
}

async function renderList() {
  list.innerHTML = '';

  for (const item of watchlist) {
    const li = document.createElement('li');
    li.classList.add('watchlist-item');

    const posterContainer = document.createElement('div');
    posterContainer.classList.add('poster-container');

    const img = document.createElement('img');
    img.src = item.poster || 'https://via.placeholder.com/100x150?text=No+Image';
    img.alt = item.title;

    const title = document.createElement('h3');
    title.textContent = item.title;

    posterContainer.appendChild(img);
    posterContainer.appendChild(title);
    li.appendChild(posterContainer);

    const plot = document.createElement('p');
    plot.textContent = item.plot;
    li.appendChild(plot);

    const director = document.createElement('p');
    director.innerHTML = `<strong>Director:</strong> ${item.director}`;
    li.appendChild(director);

    const actors = document.createElement('p');
    actors.innerHTML = `<strong>Actors:</strong> ${item.actors}`;
    li.appendChild(actors);

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
    } else {
      ratingsContainer.textContent = 'No ratings available';
    }

    li.appendChild(ratingsContainer);
    list.appendChild(li);
  }
}

async function addToWatchlist(title) {
  const data = await fetchMovieData(title);
  if (data.Response === 'True') {
    watchlist.push({
      title: data.Title,
      year: data.Year,
      poster: data.Poster,
      plot: data.Plot,
      ratings: data.Ratings,
      director: data.Director,
      actors: data.Actors
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
    const data = await fetchMovieData(item.title);
    if (data.Response === 'True') {
      updatedWatchlist.push({
        title: data.Title,
        year: data.Year,
        poster: data.Poster,
        plot: data.Plot,
        ratings: data.Ratings,
        director: data.Director,
        actors: data.Actors
      });
    } else {
      updatedWatchlist.push(item);
    }
  }

  watchlist = updatedWatchlist;
  saveWatchlist();
  renderList();
});

renderList();
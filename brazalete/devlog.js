// Dev-log video library under the brazalete (added 2026-11-11).
// The list of videos lives on the website in /assets/brazalete-videos.js, so NZ can add an episode
// by editing that one file. This script turns the list into cards on the two shelves.
// Videos are YouTube uploads. Nothing from YouTube loads until a visitor presses play on a card,
// apart from the card's preview picture.
(() => {
  'use strict';

  // What each shelf shows if the website list is missing (for example in the local preview): one placeholder.
  const fallback = {
    episodes: [{ title: 'Episode 1', youtube: null }],
    process: [{ title: 'Design sessions', youtube: null }],
  };
  // Use the website's list when it loaded; otherwise the fallback.
  const list = window.BRAZALETE_VIDEOS || fallback;

  // A YouTube video ID is 11 letters, digits, "-" or "_". Anything else is ignored, so a typo can't break the page.
  const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id);

  // Build one card. Coming-soon cards are plain; real videos get a play button showing YouTube's preview picture.
  function card(video) {
    const item = document.createElement('article');
    item.className = 'video-card';

    const title = document.createElement('h4');
    title.textContent = video.title || 'Untitled';

    // Optional one-line description under the title.
    const note = document.createElement('p');
    note.className = 'video-note';
    note.textContent = video.note || '';

    if (!validId(video.youtube)) {
      // Not uploaded yet: a blank frame with a "Coming soon" label instead of a picture.
      item.classList.add('is-soon');
      const frame = document.createElement('div');
      frame.className = 'video-frame';
      frame.innerHTML = '<span class="soon-tag">Coming soon</span>';
      item.append(frame, title);
      if (video.note) item.append(note);
      return item;
    }

    // Uploaded: a button the size of the video, with YouTube's preview picture and a play symbol.
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'video-frame video-play';
    play.setAttribute('aria-label', 'Play video: ' + (video.title || 'dev log'));
    const thumb = document.createElement('img');
    thumb.src = 'https://i.ytimg.com/vi/' + video.youtube + '/hqdefault.jpg';
    thumb.alt = '';
    thumb.loading = 'lazy';
    play.append(thumb);
    play.insertAdjacentHTML('beforeend', '<span class="play-mark" aria-hidden="true">▶</span>');

    // Pressing play swaps the picture for the real player. "youtube-nocookie" is YouTube's privacy-friendlier
    // address: it doesn't set tracking cookies until the video actually plays.
    play.addEventListener('click', () => {
      const player = document.createElement('iframe');
      player.className = 'video-frame';
      player.src = 'https://www.youtube-nocookie.com/embed/' + video.youtube + '?autoplay=1&rel=0';
      player.title = video.title || 'Dev log video';
      player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      player.allowFullscreen = true;
      play.replaceWith(player);
      player.focus();
    });

    item.append(play, title);
    if (video.note) item.append(note);
    return item;
  }

  // Fill each shelf on the page ("episodes" and "process") from the matching part of the list.
  function fill() {
    document.querySelectorAll('[data-shelf]').forEach(row => {
      const videos = Array.isArray(list[row.dataset.shelf]) ? list[row.dataset.shelf] : [];
      // An empty shelf still shows one placeholder, so the section never looks broken.
      const shown = videos.length ? videos : fallback[row.dataset.shelf] || [];
      row.replaceChildren(...shown.map(card));
    });
  }

  // Wait for the page to finish loading before filling the shelves.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
  else fill();
})();

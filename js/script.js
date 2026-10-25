// Find our date picker inputs and gallery elements on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.getElementById('getImagesButton');
const gallery = document.getElementById('gallery');
const imageModal = document.getElementById('imageModal');
const closeModalButton = document.getElementById('closeModalButton');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');
const randomFact = document.getElementById('randomFact');

let currentSpaceImages = [];

const spaceFacts = [
  'Sunlight takes about 8 minutes and 20 seconds to reach Earth.',
  'One million Earths could fit inside the Sun.',
  'A day on Venus is longer than a year on Venus.',
  'Neutron stars can spin hundreds of times every second.',
  'There may be more trees on Earth than stars in the Milky Way.',
  'Footprints on the Moon can remain for millions of years because there is almost no wind.',
  'Jupiter is so large that more than 1,300 Earths could fit inside it.',
  'The James Webb Space Telescope can observe some of the most distant galaxies in the universe.'
];

const randomIndex = Math.floor(Math.random() * spaceFacts.length);
randomFact.textContent = spaceFacts[randomIndex];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Connect the button to the function that gets images from NASA
getImagesButton.addEventListener('click', getSpaceImages);

// Close the modal when the close button is clicked
closeModalButton.addEventListener('click', () => {
  imageModal.close();
});

// Open the selected image when its gallery card is clicked
gallery.addEventListener('click', (event) => {
  const galleryItem = event.target.closest('.gallery-item');

  if (galleryItem) {
    const imageIndex = Number(galleryItem.dataset.index);
    openImageModal(currentSpaceImages[imageIndex]);
  }
});

// Allow keyboard users to open a card with Enter
 gallery.addEventListener('keydown', (event) => {
  const galleryItem = event.target.closest('.gallery-item');

  if (galleryItem && event.key === 'Enter') {
    const imageIndex = Number(galleryItem.dataset.index);
    openImageModal(currentSpaceImages[imageIndex]);
  }
});

function getYouTubeId(videoUrl) {
  const match = videoUrl.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return match ? match[1] : '';
}

function openImageModal(item) {
  modalMedia.innerHTML = '';

  if (item.media_type === 'video') {
    const youtubeId = getYouTubeId(item.url);

    if (youtubeId) {
      modalMedia.innerHTML = `<iframe class="video-player" src="https://www.youtube.com/embed/${youtubeId}" title="${item.title}" allowfullscreen></iframe>`;
    } else {
      modalMedia.innerHTML = `<a class="video-link" href="${item.url}" target="_blank">Open the APOD video</a>`;
    }
  } else {
    modalMedia.innerHTML = `<img class="modal-image" src="${item.url}" alt="${item.title}" />`;
  }

  modalTitle.textContent = item.title;
  modalDate.textContent = item.date;
  modalExplanation.textContent = item.explanation;
  imageModal.showModal();
}

async function getSpaceImages() {
  // Use the dates selected by the user
  const startDate = startInput.value;
  const endDate = endInput.value;

  // Build the NASA APOD API URL
  const apiKey = '8WnBzLhBkMtRbndfbPCMCfk8gmJzwBrPdCLtNFbz';
  const apiUrl = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&start_date=${startDate}&end_date=${endDate}`;

  // Tell the user that NASA's data is loading
  gallery.innerHTML = '<div class="placeholder"><p>Loading space images...</p></div>';

  try {
    // Fetch data from NASA and wait for the response
    const response = await fetch(apiUrl);

    // NASA returns an error response if the request fails
    if (!response.ok) {
      throw new Error(`NASA API request failed with status ${response.status}`);
    }

    // Convert the API response from JSON into a JavaScript array
    const apodEntries = await response.json();
    currentSpaceImages = apodEntries.filter((item) => item.media_type === 'image' || item.media_type === 'video');

    // Clear the loading message before adding the results
    gallery.innerHTML = '';

    // Display each APOD image or video in the gallery
    currentSpaceImages.forEach((item, index) => {
      let mediaContent = '';

      if (item.media_type === 'video') {
        mediaContent = '<div class="video-card"><span class="play-icon">&#9654;</span><span>Watch video</span></div>';
      } else {
        mediaContent = `<img src="${item.url}" alt="${item.title}" />`;
      }

      gallery.innerHTML += `
        <article class="gallery-item" data-index="${index}" tabindex="0">
          ${mediaContent}
          <p><strong>${item.title}</strong></p>
          <p>${item.date}</p>
        </article>
      `;
    });

    // Show a message when NASA returns no images
    if (gallery.innerHTML === '') {
      gallery.innerHTML = '<div class="placeholder"><p>No images were found for this date range.</p></div>';
    }
  } catch (error) {
    // Let the user know if something went wrong
    gallery.innerHTML = '<div class="placeholder"><p>Unable to load images. Please try again.</p></div>';
    console.error(error);
  }
}

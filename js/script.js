// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');
const modalVideoLink = document.getElementById('modalVideoLink');
const spaceFact = document.getElementById('spaceFact');
const spaceFacts = [
	'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
	'A day on Venus is longer than its year.',
	'Mars is home to Olympus Mons, the tallest known volcano in the solar system.',
	'Saturn has a lower average density than water.',
	'Mercury takes 88 Earth days to orbit the Sun.'
];

// Pick a random space fact whenever the page loads
const randomFactIndex = Math.floor(Math.random() * spaceFacts.length);
spaceFact.textContent = spaceFacts[randomFactIndex];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// Fetch the APOD entries between the selected dates when the button is clicked
getImagesButton.addEventListener('click', getSpaceImages);
document.getElementById('closeModal').addEventListener('click', () => imageModal.close());

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate || startDate > endDate) {
		gallery.innerHTML = '<div class="placeholder"><p>Please choose a valid date range.</p></div>';
		return;
	}

	gallery.innerHTML = '<div class="placeholder" role="status" aria-live="polite"><p>🔄 Loading space photos...</p></div>';
	getImagesButton.disabled = true;

	// NASA's APOD endpoint is returning placeholder logos, so use NASA's article API
	const firstQueryDate = new Date(`${startDate}T00:00:00Z`);
	firstQueryDate.setUTCDate(firstQueryDate.getUTCDate() - 1);
	const lastQueryDate = new Date(`${endDate}T00:00:00Z`);
	lastQueryDate.setUTCDate(lastQueryDate.getUTCDate() + 1);

	const apiUrl = new URL('https://science.nasa.gov/wp-json/wp/v2/image-article');
	apiUrl.searchParams.set('after', `${firstQueryDate.toISOString().split('T')[0]}T00:00:00`);
	apiUrl.searchParams.set('before', `${lastQueryDate.toISOString().split('T')[0]}T00:00:00`);
	apiUrl.searchParams.set('per_page', '100');

	try {
		const response = await fetch(apiUrl);

		if (!response.ok) {
			throw new Error('NASA API request failed. Please try again later.');
		}

		const apodArticles = await response.json();
		const spaceImages = apodArticles
			.filter((article) => article.slug.startsWith('apod-'))
			.filter((article) => {
				const articleDate = article.date.slice(0, 10);
				return articleDate >= startDate && articleDate <= endDate;
			})
			.map(convertNASAArticle);
		gallery.innerHTML = '';

		if (spaceImages.length === 0) {
			gallery.innerHTML = '<div class="placeholder"><p>No space images were found for those dates.</p></div>';
			return;
		}

		// Build one gallery item for each APOD entry
		spaceImages.forEach((spaceImage) => {
			const galleryItem = document.createElement('article');
			galleryItem.className = 'gallery-item';
			galleryItem.tabIndex = 0;
			galleryItem.setAttribute('role', 'button');
			const mediaDescription = spaceImage.media_type === 'video' ? 'video' : 'image';
			galleryItem.setAttribute('aria-label', `View ${mediaDescription}: ${spaceImage.title}, ${spaceImage.date}`);

			if (spaceImage.media_type === 'image') {
				const image = document.createElement('img');
				image.src = spaceImage.hdurl || spaceImage.url;
				image.alt = spaceImage.title;
				galleryItem.appendChild(image);
			} else if (spaceImage.media_type === 'video') {
				if (spaceImage.thumbnail_url) {
					const thumbnail = document.createElement('img');
					thumbnail.src = spaceImage.thumbnail_url;
					thumbnail.alt = spaceImage.title;
					galleryItem.appendChild(thumbnail);
				}

				const mediaLabel = document.createElement('span');
				mediaLabel.className = 'media-label';
				mediaLabel.textContent = 'Video';
				galleryItem.appendChild(mediaLabel);
			}

			const title = document.createElement('h2');
			title.textContent = spaceImage.title;

			const date = document.createElement('p');
			date.textContent = spaceImage.date;

			const descriptionPreview = document.createElement('p');
			descriptionPreview.textContent = spaceImage.explanation.length > 180
				? `${spaceImage.explanation.slice(0, 180).trim()}...`
				: spaceImage.explanation;

			galleryItem.append(title, date, descriptionPreview);
			galleryItem.addEventListener('click', () => openImageModal(spaceImage));
			galleryItem.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					openImageModal(spaceImage);
				}
			});
			gallery.appendChild(galleryItem);
		});
	} catch (error) {
		gallery.innerHTML = '<div class="placeholder"><p>Could not load space images. Check your connection and try again.</p></div>';
		console.error(error);
	} finally {
		getImagesButton.disabled = false;
	}
}

function convertNASAArticle(article) {
	const articleContent = new DOMParser().parseFromString(article.content.rendered, 'text/html');
	const titleContent = new DOMParser().parseFromString(article.title.rendered, 'text/html');
	const explanationParagraph = Array.from(articleContent.querySelectorAll('p'))
		.find((paragraph) => paragraph.textContent.trim().startsWith('Explanation:'));
	const videoLink = articleContent.querySelector(
		'iframe[src*="youtube.com"], iframe[src*="youtu.be"], a[href*="youtube.com"], a[href*="youtu.be"]'
	);
	const videoUrl = videoLink ? videoLink.src || videoLink.href : article.link;

	return {
		title: titleContent.body.textContent.replace(/^APOD:\s*/, '').trim(),
		date: article.date.slice(0, 10),
		explanation: explanationParagraph
			? explanationParagraph.textContent.replace(/^Explanation:\s*/, '').trim()
			: 'No explanation is available for this APOD.',
		media_type: videoLink ? 'video' : 'image',
		url: videoUrl,
		hdurl: article.featured_image_url,
		thumbnail_url: article.featured_image_url
	};
}

function openImageModal(spaceImage) {
	const imageUrl = spaceImage.media_type === 'image'
		? spaceImage.hdurl || spaceImage.url
		: spaceImage.thumbnail_url;

	modalImage.hidden = !imageUrl;
	if (imageUrl) {
		modalImage.src = imageUrl;
		modalImage.alt = spaceImage.title;
	}

	modalTitle.textContent = spaceImage.title;
	modalDate.textContent = spaceImage.date;
	modalExplanation.textContent = spaceImage.explanation;
	modalVideoLink.hidden = spaceImage.media_type !== 'video';
	if (spaceImage.media_type === 'video') {
		modalVideoLink.href = spaceImage.url;
	}

	imageModal.showModal();
}

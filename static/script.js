let currentOffset = 0;
const limit = 15;
let lastQuery = '';
let minPrice = 0;
let maxPrice = 10000;
let minRating = 2;
let maxRating = 5;

let filtersEnabled = false;
let ratingFilterEnabled = false;

function toggleFilters() {
    filtersEnabled = !filtersEnabled;
    const filterOptions = document.getElementById('filterOptions');
    const toggleButton = document.getElementById('toggleFiltersButton');

    if (filtersEnabled) {
        filterOptions.style.display = 'block';
        toggleButton.textContent = 'Скрыть фильтры';
    } else {
        filterOptions.style.display = 'none';
        toggleButton.textContent = 'Показать фильтры';
    }

    resetFilters();
}

function togglePriceFilter() {
    const priceInputs = document.getElementById('priceInputs');
    const priceFilterCheckbox = document.getElementById('priceFilterCheckbox');

    if (priceFilterCheckbox.checked) {
        priceInputs.style.display = 'flex';
    } else {
        priceInputs.style.display = 'none';
        minPrice = 0;
        maxPrice = 10000;
        document.getElementById('priceMin').value = minPrice;
        document.getElementById('priceMax').value = maxPrice;
        searchPerfumes();
    }
}

function updatePriceFilterLabel() {
    const minInput = document.getElementById('priceMin');
    const maxInput = document.getElementById('priceMax');

    const min = parseInt(minInput.value) || 0;
    const max = parseInt(maxInput.value) || 10000;

    minPrice = min;
    maxPrice = max;

    searchPerfumes();
}

function toggleRatingFilter() {
    ratingFilterEnabled = !ratingFilterEnabled;
    const ratingInputs = document.getElementById('ratingInputs');

    if (ratingFilterEnabled) {
        ratingInputs.style.display = 'flex';
    } else {
        ratingInputs.style.display = 'none';
        document.getElementById('ratingMin').value = 2;
        document.getElementById('ratingMax').value = 5;
    }

    searchPerfumes();
}

function updateRatingFilterLabel() {
    if (!ratingFilterEnabled) return;

    const minInput = document.getElementById('ratingMin');
    const maxInput = document.getElementById('ratingMax');

    const min = parseFloat(minInput.value) || 2;
    const max = parseFloat(maxInput.value) || 5;

    minRating = min;
    maxRating = max;

    searchPerfumes();
}

function resetFilters() {
    const priceFilterCheckbox = document.getElementById('priceFilterCheckbox');
    priceFilterCheckbox.checked = false;

    togglePriceFilter();
    const minInput = document.getElementById('priceMin');
    const maxInput = document.getElementById('priceMax');
    minInput.value = 0;
    maxInput.value = 10000;

    const minRatingInput = document.getElementById('ratingMin');
    const maxRatingInput = document.getElementById('ratingMax');
    minRatingInput.value = 2;
    maxRatingInput.value = 5;

    const ratingFilterCheckbox = document.getElementById('ratingFilterCheckbox');
    ratingFilterCheckbox.checked = false;

    ratingFilterEnabled = false;
    const ratingInputs = document.getElementById('ratingInputs');
    ratingInputs.style.display = 'none';

    searchPerfumes();
}

async function fetchPerfumes(query, offset, limit, minPrice, maxPrice, minRating, maxRating) {
    const response = await fetch(`/api/search?query=${query}&offset=${offset}&limit=${limit}&minPrice=${minPrice}&maxPrice=${maxPrice}&minRating=${minRating}&maxRating=${maxRating}`);
    return response.json();
}

async function searchPerfumes() {
    const query = document.getElementById('searchInput').value;
    lastQuery = query;
    currentOffset = 0;

    const minRating = parseFloat(document.getElementById('ratingMin').value) || 2;
    const maxRating = parseFloat(document.getElementById('ratingMax').value) || 5;

    const products = await fetchPerfumes(query, currentOffset, limit, minPrice, maxPrice, minRating, maxRating);

    if (document.getElementById('priceFilterCheckbox').checked) {
        products.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    }

    renderProducts(products, true);
    currentOffset += products.length;
}

async function loadMorePerfumes() {
    const products = await fetchPerfumes(lastQuery, currentOffset, limit, minPrice, maxPrice, minRating, maxRating);

    if (document.getElementById('priceFilterCheckbox').checked) {
        products.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    }

    renderProducts(products, false);
    currentOffset += products.length;

    if (products.length < limit) {
        document.getElementById('loadMoreContainer').style.display = 'none';
    }
}

function renderProducts(products, reset = false) {
    const resultsContainer = document.getElementById('resultsContainer');

    if (reset) {
        resultsContainer.innerHTML = '';
    }

    if (products.length === 0 && reset) {
        resultsContainer.innerHTML = '<p>Нет результатов для вашего запроса.</p>';
        document.getElementById('loadMoreContainer').style.display = 'none';
        return;
    }

    products.forEach(product => {
        const resultDiv = document.createElement('div');
        resultDiv.classList.add('product-card');

        const imageUrl = product.image_url || '/static/images/default-image.jpg';

        const formattedPrice = `${product.price} руб.`;

        resultDiv.innerHTML = `
            <div class="product-info">
                <h3>${product.title}</h3>
                <p><strong>Цена:</strong> ${formattedPrice}</p>
                <p><strong>Рейтинг:</strong> ${product.rating}</p>
                <p><strong>Ноты:</strong> ${product.notes}</p>
                <p><strong>Объем:</strong> ${product.volume}</p>
                <p><strong>Бренд:</strong> ${product.brand}</p>
                <a href="${product.link}" target="_blank">Перейти к товару</a>
            </div>
            <div class="product-image">
                <img src="${imageUrl}" alt="${product.title}" />
            </div>
        `;

        resultsContainer.appendChild(resultDiv);
    });

    document.getElementById('loadMoreContainer').style.display = products.length < limit && !reset ? 'none' : 'block';
}

window.onload = async () => {
    const products = await fetchPerfumes('', currentOffset, limit, minPrice, maxPrice, minRating, maxRating);

    renderProducts(products, true);
    currentOffset += products.length;
};

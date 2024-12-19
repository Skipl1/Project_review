let currentOffset = 0;
const limit = 15;
let lastQuery = '';
let minPrice = 0;
let maxPrice = 10000;
let minRating = 2;
let maxRating = 5;

let filtersEnabled = false;
let ratingFilterEnabled = false;
let allProducts = [];
let selectedNotes = [];

function toggleFilters() {
    filtersEnabled = !filtersEnabled;
    const filterOptions = document.getElementById('filterOptions');
    const toggleButton = document.getElementById('toggleFiltersButton');

    if (filtersEnabled) {
        filterOptions.style.display = 'block';
        toggleButton.textContent = 'Скрыть фильтры';

        const notesFilterCheckbox = document.getElementById('notesFilterCheckbox');
        notesFilterCheckbox.checked = false;

        const notesTable = document.getElementById('notesTable');
        notesTable.style.display = 'none';

        selectedNotes = [];
    } else {
        filterOptions.style.display = 'none';
        toggleButton.textContent = 'Показать фильтры';

        resetFilters();
    }
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

    const notesFilterCheckbox = document.getElementById('notesFilterCheckbox');
    notesFilterCheckbox.checked = false;
    const notesTable = document.getElementById('notesTable');
    notesTable.style.display = 'none';

    selectedNotes = [];

    const noteCheckboxes = document.querySelectorAll('#notesTableBody input[type="checkbox"]');
    noteCheckboxes.forEach(checkbox => checkbox.checked = false);

    searchPerfumes();
}


async function fetchPerfumes(query, offset, limit, minPrice, maxPrice, minRating, maxRating, selectedNotes) {
    const response = await fetch(`/api/search?query=${query}&offset=${offset}&limit=${limit}&minPrice=${minPrice}&maxPrice=${maxPrice}&minRating=${minRating}&maxRating=${maxRating}&notes[]=${JSON.stringify(selectedNotes)}`);
    return response.json();
}


async function searchPerfumes() {
    const query = document.getElementById('searchInput').value.trim();
    lastQuery = query;
    currentOffset = 0;

    const minRating = parseFloat(document.getElementById('ratingMin').value) || 2;
    const maxRating = parseFloat(document.getElementById('ratingMax').value) || 5;

    const notesFilterEnabled = document.getElementById('notesFilterCheckbox').checked;
    const activeNotes = notesFilterEnabled ? selectedNotes : [];

    try {
        const response = await fetch(
            `/api/search?query=${encodeURIComponent(query)}&offset=0&limit=10000&minPrice=${minPrice}&maxPrice=${maxPrice}&minRating=${minRating}&maxRating=${maxRating}&notes[]=${activeNotes.map(encodeURIComponent).join('&notes[]=')}`
        );

        if (!response.ok) {
            throw new Error(`Ошибка сервера: ${response.status}`);
        }

        const products = await response.json();

        allProducts = products;

        if (document.getElementById('priceFilterCheckbox').checked) {
            allProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        }

        renderProducts(allProducts.slice(0, limit), true);
        currentOffset = limit;

        if (allProducts.length <= limit) {
            document.getElementById('loadMoreContainer').style.display = 'none';
        } else {
            document.getElementById('loadMoreContainer').style.display = 'block';
        }
    } catch (error) {
        console.error("Ошибка поиска:", error);
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '<p>Произошла ошибка при поиске. Попробуйте позже.</p>';
        document.getElementById('loadMoreContainer').style.display = 'none';
    }
}


async function loadMorePerfumes() {
    const productsToLoad = allProducts.slice(currentOffset, currentOffset + limit);

    renderProducts(productsToLoad, false);
    currentOffset += limit;

    if (currentOffset >= allProducts.length) {
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

function toggleNotesFilter() {
    const notesTable = document.getElementById('notesTable');
    const checkbox = document.getElementById('notesFilterCheckbox');

    if (checkbox.checked) {
        notesTable.style.display = 'block';
        loadNotes();
    } else {
        notesTable.style.display = 'none';
        selectedNotes = [];
    }
    searchPerfumes();
}

async function loadNotes() {
    try {
        const response = await fetch('/api/get_notes');
        const notes = await response.json();

        const notesTableBody = document.getElementById('notesTableBody');
        notesTableBody.innerHTML = '';

        const filteredNotes = notes.filter(note => note.trim() !== "");

        filteredNotes.forEach(note => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${note}</td>
                <td>
                    <input type="checkbox" value="${note}" onchange="toggleNoteSelection(event)">
                </td>
            `;

            notesTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Ошибка при загрузке нот:", error);
    }
}

function toggleNoteSelection(event) {
    const note = event.target.value;

    if (event.target.checked) {
        if (!selectedNotes.includes(note)) {
            selectedNotes.push(note);
        }
    } else {
        selectedNotes = selectedNotes.filter(n => n !== note);
    }

    console.log("Выбранные ноты:", selectedNotes);

    searchPerfumes();
}

document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
    searchPerfumes();
});

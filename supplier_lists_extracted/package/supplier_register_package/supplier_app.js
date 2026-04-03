let allSuppliers = [];
let filteredSuppliers = [];
let currentSortColumn = null;
let currentSortDirection = 'asc';

// Load all JSON files
async function loadSupplierData() {
    try {
        const [tier1Response, tier2Response, oemResponse] = await Promise.all([
            fetch('tier1.json'),
            fetch('tier2.json'),
            fetch('oem.json')
        ]);

        const tier1Data = await tier1Response.json();
        const tier2Data = await tier2Response.json();
        const oemData = await oemResponse.json();

        allSuppliers = [...tier1Data, ...tier2Data, ...oemData];
        
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        
        init();
    } catch (error) {
        console.error('Error loading supplier data:', error);
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'block';
    }
}

function init() {
    populateFilters();
    applyFilters();
    setupEventListeners();
}

function populateFilters() {
    // Tech groups
    const techGroups = [...new Set(allSuppliers.map(s => s.techGroup).filter(Boolean))].sort();
    const techGroupSelect = document.getElementById('techGroupFilter');
    techGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        techGroupSelect.appendChild(option);
    });

    // Countries
    const countries = [...new Set(allSuppliers.map(s => s.country).filter(Boolean))].sort();
    const countrySelect = document.getElementById('countryFilter');
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });
}

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('techGroupFilter').addEventListener('change', applyFilters);
    document.getElementById('countryFilter').addEventListener('change', applyFilters);

    // Segment pills
    document.querySelectorAll('.segment-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            if (this.dataset.segment === 'ALL') {
                document.querySelectorAll('.segment-pill').forEach(p => {
                    if (p.dataset.segment === 'ALL') {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });
            } else {
                document.querySelector('[data-segment="ALL"]').classList.remove('active');
                this.classList.toggle('active');
            }
            applyFilters();
        });
    });

    // Sortable headers
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', function() {
            sortTable(this.dataset.column);
        });
    });

    // Modal close on outside click
    document.getElementById('supplierModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const techGroupFilter = document.getElementById('techGroupFilter').value;
    const countryFilter = document.getElementById('countryFilter').value;

    // Get active segments
    const activeSegments = Array.from(document.querySelectorAll('.segment-pill.active'))
        .map(pill => pill.dataset.segment);
    const allSegments = activeSegments.includes('ALL');

    filteredSuppliers = allSuppliers.filter(supplier => {
        // Search filter
        if (searchTerm) {
            const searchFields = [
                supplier.name,
                supplier.country,
                supplier.techGroup,
                supplier.description,
                ...(supplier.tags || []),
                ...(supplier.technologies || []),
                ...(supplier.certifications || [])
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchTerm)) {
                return false;
            }
        }

        // Tech group filter
        if (techGroupFilter && supplier.techGroup !== techGroupFilter) {
            return false;
        }

        // Country filter
        if (countryFilter && supplier.country !== countryFilter) {
            return false;
        }

        // Segment filter
        if (!allSegments && !activeSegments.includes(supplier.segment)) {
            return false;
        }

        return true;
    });

    // Apply current sort if any
    if (currentSortColumn) {
        sortSuppliers(currentSortColumn, currentSortDirection);
    }

    renderTable();
    updateResultsInfo();
}

function sortTable(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }

    sortSuppliers(column, currentSortDirection);
    renderTable();
    updateSortIndicators();
}

function sortSuppliers(column, direction) {
    filteredSuppliers.sort((a, b) => {
        let aVal = a[column] || '';
        let bVal = b[column] || '';

        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function updateSortIndicators() {
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });

    if (currentSortColumn) {
        const th = document.querySelector(`th[data-column="${currentSortColumn}"]`);
        if (th) {
            th.classList.add(currentSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }
}

function getSegmentClass(segment) {
    const s = (segment || '').toLowerCase();
    if (s.includes('tier 1')) return 'seg-tier1';
    if (s.includes('tier 2')) return 'seg-tier2';
    if (s === 'oem') return 'seg-oem';
    return '';
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    filteredSuppliers.forEach(supplier => {
        const tr = document.createElement('tr');
        tr.onclick = () => showSupplierCard(supplier);

        const segClass = getSegmentClass(supplier.segment);
        const certs = supplier.certifications || [];
        const techs = (supplier.technologies || []).slice(0, 3);

        tr.innerHTML = `
            <td>
                ${supplier.url ? `<a href="${supplier.url}" class="supplier-link" onclick="event.stopPropagation()" target="_blank">${supplier.name}</a>` : supplier.name}
            </td>
            <td>${supplier.country || ''}</td>
            <td><span class="segment-badge ${segClass}">${supplier.segment || ''}</span></td>
            <td>${supplier.techGroup || ''}</td>
            <td>${certs.slice(0, 3).map(c => `<span class="cert-indicator"></span>${c}`).join(' ')}</td>
            <td>${techs.join(', ')}</td>
        `;

        tbody.appendChild(tr);
    });
}

function updateResultsInfo() {
    const info = document.getElementById('resultsInfo');
    info.textContent = `Showing ${filteredSuppliers.length} of ${allSuppliers.length} suppliers`;
}

function showSupplierCard(supplier) {
    document.getElementById('modalSupplierName').textContent = supplier.name;
    document.getElementById('modalSupplierCountry').textContent = supplier.country || '';

    const segClass = getSegmentClass(supplier.segment);

    let html = `
        <div class="info-section">
            <h3>Company Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Supplier Name</div>
                    <div class="info-value">${supplier.name}</div>
                </div>
                ${supplier.url ? `
                <div class="info-item">
                    <div class="info-label">Website</div>
                    <div class="info-value"><a href="${supplier.url}" target="_blank" class="supplier-link">${supplier.url}</a></div>
                </div>` : ''}
                <div class="info-item">
                    <div class="info-label">Country</div>
                    <div class="info-value">${supplier.country || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Segment</div>
                    <div class="info-value"><span class="segment-badge ${segClass}">${supplier.segment || 'N/A'}</span></div>
                </div>
                <div class="info-item">
                    <div class="info-label">Tech Group</div>
                    <div class="info-value">${supplier.techGroup || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Stage</div>
                    <div class="info-value">${supplier.stage || 'N/A'}</div>
                </div>
            </div>
        </div>
    `;

    // Certifications
    if (supplier.certifications && supplier.certifications.length > 0) {
        html += `
            <div class="info-section">
                <h3>Certifications</h3>
                <div class="certifications-list">
                    ${supplier.certifications.map(cert => `<div class="cert-badge">✓ ${cert}</div>`).join('')}
                </div>
            </div>
        `;
    }

    // Technologies
    if (supplier.technologies && supplier.technologies.length > 0) {
        html += `
            <div class="info-section">
                <h3>Technologies</h3>
                <div class="capabilities-list">
                    ${supplier.technologies.map(tech => `<div class="capability-tag">${tech}</div>`).join('')}
                </div>
            </div>
        `;
    }

    // Tags
    if (supplier.tags && supplier.tags.length > 0) {
        html += `
            <div class="info-section">
                <h3>Tags</h3>
                <div class="capabilities-list">
                    ${supplier.tags.map(tag => `<div class="capability-tag">${tag}</div>`).join('')}
                </div>
            </div>
        `;
    }

    // Description
    if (supplier.description) {
        html += `
            <div class="info-section">
                <h3>Description</h3>
                <div class="notes-box">${supplier.description}</div>
            </div>
        `;
    }

    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('supplierModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('supplierModal').style.display = 'none';
}

// Load data on page load
loadSupplierData();

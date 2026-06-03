// ── CONFIGURAÇÃO ──────────────────────────────────────────────
const GEOJSON_FILE = 'postos.geojson';   // gerado pelo geocodificar.py
const MG_CENTER    = [-18.5, -44.5];     // centro aproximado de MG
const DEFAULT_ZOOM = 7;

// ── ESTADO ────────────────────────────────────────────────────
let allPostos    = [];   // todos os features do GeoJSON
let filtered     = [];   // após busca por cidade
let userLatLng   = null; // coordenadas do usuário
let activeMarker = null; // marcador selecionado
let markers      = [];   // todos os marcadores Leaflet
let nearestId    = null; // índice do posto mais próximo

// ── MAPA ──────────────────────────────────────────────────────
const map = L.map('map', {
  center: MG_CENTER,
  zoom: DEFAULT_ZOOM,
  zoomControl: true
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

// ── ÍCONES ────────────────────────────────────────────────────
function makeIcon(nearest = false) {
  return L.divIcon({
    html: `<div class="prime-pin ${nearest ? 'nearest' : ''}"><span>⛽</span></div>`,
    className: '',
    iconSize:   nearest ? [34, 34] : [28, 28],
    iconAnchor: nearest ? [17, 34] : [14, 28],
    popupAnchor: [0, -30]
  });
}

// ── DISTÂNCIA (Haversine) ──────────────────────────────────────
function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function fmt(km) {
  return km < 1
    ? `${Math.round(km * 1000)} m de você`
    : `${km.toFixed(1)} km de você`;
}

// ── CARREGA GEOJSON ───────────────────────────────────────────
async function loadPostos() {
  const res  = await fetch(GEOJSON_FILE);
  const data = await res.json();
  allPostos  = data.features;
  filtered   = [...allPostos];
  renderList();
  renderMarkers();
  getUserLocation();
}

// ── RENDERIZA MARCADORES ──────────────────────────────────────
function renderMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  filtered.forEach((f, i) => {
    const [lon, lat] = f.geometry.coordinates;
    const isNearest  = (i === nearestId && filtered === allPostos);
    const m = L.marker([lat, lon], { icon: makeIcon(isNearest) });
    m.on('click', () => openDetail(f, m));
    m.addTo(map);
    markers.push(m);
  });
}

// ── RENDERIZA LISTA ───────────────────────────────────────────
function renderList() {
  const list = document.getElementById('list');
  const badge = document.getElementById('count-badge');
  badge.textContent = `${filtered.length} postos`;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="no-results">Nenhum posto encontrado para essa cidade.</div>';
    return;
  }

  const sorted = userLatLng
    ? [...filtered].sort((a, b) => {
        const [aLon, aLat] = a.geometry.coordinates;
        const [bLon, bLat] = b.geometry.coordinates;
        return distKm(userLatLng.lat, userLatLng.lng, aLat, aLon)
             - distKm(userLatLng.lat, userLatLng.lng, bLat, bLon);
      })
    : filtered;

  list.innerHTML = sorted.map(f => {
    const p   = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    const dist = userLatLng ? `<div class="li-dist">${fmt(distKm(userLatLng.lat, userLatLng.lng, lat, lon))}</div>` : '';
    return `
      <div class="list-item" data-id="${p.cnpj}" onclick="focusPosto(${lat},${lon},'${p.cnpj}')">
        <div class="li-name">${p.nome}</div>
        <div class="li-city">${p.cidade} · ${p.uf}</div>
        ${dist}
      </div>`;
  }).join('');
}

// ── FOCA NO POSTO  ──────────────────────────
function focusPosto(lat, lon, cnpj) {
  map.setView([lat, lon], 15, { animate: true });

  const f = allPostos.find(x => x.properties.cnpj === cnpj);
  if (!f) return;

  document.querySelectorAll('.list-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === cnpj);
  });

  openDetail(f, null);
  closeMobileDrawer();
}

// ── PAINEL DE DETALHE ─────────────────────────────────────────
function openDetail(f, _marker) {
  document.getElementById('info-btn').style.display = 'none';
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;

  document.getElementById('detail-name').textContent = p.nome;

  const fields = [
    ['Razão',    p.razao],
    ['CNPJ',     p.cnpj],
    ['Endereço', `${p.logradouro} ${p.endereco}, ${p.numero}`],
    ['Bairro',   p.bairro],
    ['Cidade',   `${p.cidade} · ${p.uf}`],
    ['Telefone', p.telefone],
  ];

  document.getElementById('detail-fields').innerHTML = fields
    .filter(([, v]) => v && v.trim())
    .map(([l, v]) => `
      <div class="detail-row">
        <span class="detail-label">${l}</span>
        <span class="detail-val">${v}</span>
      </div>`)
    .join('');

  const enderecoCompleto = encodeURIComponent(
    `${p.logradouro} ${p.endereco} ${p.numero}, ${p.bairro}, ${p.cidade}, MG, Brasil`
  );
  const gmUrl = `https://www.google.com/maps/dir/?api=1&destination=${enderecoCompleto}`;
  document.getElementById('detail-route').href = gmUrl;
  document.getElementById('detail-panel').classList.remove('hidden');
}

document.getElementById('detail-close').addEventListener('click', () => {
  document.getElementById('detail-panel').classList.add('hidden');
  document.getElementById('info-btn').style.display = 'flex';
  document.querySelectorAll('.list-item').forEach(el => el.classList.remove('active'));
});

// ── GEOLOCALIZAÇÃO ────────────────────────────────────────────
function getUserLocation() {
  if (!navigator.geolocation) {
    document.getElementById('nearest-loading').textContent = 'Geolocalização não suportada.';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      // ponto fixo
      L.circleMarker([userLatLng.lat, userLatLng.lng], {
        radius: 8, fillColor: '#1565C0', color: '#fff',
        weight: 3, fillOpacity: 1
      }).addTo(map).bindTooltip('Você está aqui', { permanent: false });

      // anel pulsante ao redor do usuário
      const userPulse = L.circleMarker([userLatLng.lat, userLatLng.lng], {
        radius: 20, color: '#1565C0', fillColor: '#1565C0',
        fillOpacity: 0.15, weight: 2, dashArray: '5,4'
      }).addTo(map);

      let uCount = 0;
      const userBlink = setInterval(() => {
        userPulse.setStyle({ fillOpacity: uCount % 2 === 0 ? 0.0 : 0.18 });
        if (++uCount >= 6) {
          clearInterval(userBlink);
          userPulse.setStyle({ fillOpacity: 0.1, dashArray: null });
        }
      }, 400);

      // zoom na localização do usuário
      map.setView([userLatLng.lat, userLatLng.lng], 13, { animate: true });

      let minDist = Infinity;
      let nearest = null;
      allPostos.forEach((f, i) => {
        const [lon, lat] = f.geometry.coordinates;
        const d = distKm(userLatLng.lat, userLatLng.lng, lat, lon);
        if (d < minDist) { minDist = d; nearest = f; nearestId = i; }
      });

      renderList();
      renderMarkers();
      renderNearest(nearest, minDist);

      // destaque pulsante no posto mais próximo
      if (nearest) {
        const [lon, lat] = nearest.geometry.coordinates;
        const pulse = L.circleMarker([lat, lon], {
          radius: 22, color: '#1565C0', fillColor: '#1565C0',
          fillOpacity: 0.15, weight: 2, dashArray: '6,4'
        }).addTo(map);

        let count = 0;
        const blink = setInterval(() => {
          pulse.setStyle({ fillOpacity: count % 2 === 0 ? 0.0 : 0.15 });
          if (++count >= 6) {
            clearInterval(blink);
            pulse.setStyle({ fillOpacity: 0.1, dashArray: null });
          }
        }, 400);
      }
    },
    () => {
      document.getElementById('nearest-loading').textContent = 'Não foi possível obter sua localização.';
    }
  );
}

function renderNearest(f, dist) {
  const p = f.properties;
  const enderecoCompleto = encodeURIComponent(
    `${p.logradouro} ${p.endereco} ${p.numero}, ${p.bairro}, ${p.cidade}, MG, Brasil`
  );
  const gmUrl = `https://www.google.com/maps/dir/?api=1&destination=${enderecoCompleto}`;

  document.getElementById('nearest-card').innerHTML = `
    <div id="nearest-card-inner">
      <div class="nc-name">${p.nome}</div>
      <div class="nc-addr">${p.logradouro} ${p.endereco}, ${p.numero} · ${p.bairro} · ${p.cidade}</div>
      <div class="nc-dist">📍 ${fmt(dist)}</div>
      <a href="${gmUrl}" target="_blank" rel="noopener noreferrer" class="btn-route">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        Abrir rota no Google Maps
      </a>
    </div>`;
}

// ── BUSCA POR CIDADE E BAIRRO ─────────────────────────────────
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');

searchInput.addEventListener('input', () => {
  const raw = searchInput.value.trim().toLowerCase();
  searchClear.classList.toggle('visible', raw.length > 0);

  if (!raw) {
    filtered = [...allPostos];
    renderList();
    renderMarkers();
    map.setView(MG_CENTER, DEFAULT_ZOOM, { animate: true });
    return;
  }

  const partes     = raw.split(',').map(s => s.trim());
  const termCidade = partes[0] || '';
  const termBairro = partes[1] || '';

  filtered = allPostos.filter(feat => {
    const cidade = feat.properties.cidade.toLowerCase();
    const bairro = feat.properties.bairro.toLowerCase();
    const cidadeOk = termCidade ? cidade.includes(termCidade) : true;
    const bairroOk = termBairro ? bairro.includes(termBairro) : true;
    return cidadeOk && bairroOk;
  });

  renderList();
  renderMarkers();

  if (filtered.length > 0) {
    const lats = filtered.map(f => f.geometry.coordinates[1]);
    const lons = filtered.map(f => f.geometry.coordinates[0]);
    map.fitBounds([
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)]
    ], { padding: [40, 40] });
  }
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  filtered = [...allPostos];
  renderList();
  renderMarkers();
  map.setView(MG_CENTER, DEFAULT_ZOOM, { animate: true });
});

// ── MOBILE DRAWER ─────────────────────────────────────────────
document.getElementById('mobile-toggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('visible');
  document.getElementById('info-btn').style.display = 'none';
});

document.getElementById('drawer-overlay').addEventListener('click', closeMobileDrawer);

function closeMobileDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('visible');
  document.getElementById('info-btn').style.display = 'flex';
}

// ── INIT ──────────────────────────────────────────────────────
loadPostos();

// ── MODAL DE INFO ─────────────────────────────────────────────
document.getElementById('info-btn').addEventListener('click', () => {
  document.getElementById('info-modal').classList.remove('hidden');
  document.getElementById('info-overlay').classList.remove('hidden');
});

function closeInfoModal() {
  document.getElementById('info-modal').classList.add('hidden');
  document.getElementById('info-overlay').classList.add('hidden');
}

document.getElementById('info-close').addEventListener('click', closeInfoModal);
document.getElementById('info-overlay').addEventListener('click', closeInfoModal);

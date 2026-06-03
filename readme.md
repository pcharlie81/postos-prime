# 🗺️ Mapa de Postos PRIME

Ferramenta web para localização de postos de combustível credenciados ao **cartão PRIME** de abastecimento das viaturas da **Polícia Civil de Minas Gerais**.

---

## ✨ Funcionalidades

- 📍 **Localização automática** — ao abrir o site, detecta sua posição e destaca o posto mais próximo
- 🏆 **Posto mais próximo** — exibido em destaque com botão de rota direta
- 🔍 **Busca por cidade e bairro** — ex: `Belo Horizonte, Centro`
- 🗺️ **Mapa interativo** — todos os 1.500+ postos de MG plotados
- 📱 **Mobile first** — otimizado para uso em campo via celular
- 🧭 **Rota no Google Maps** — abre navegação diretamente ao clicar no posto

---

## 🛠️ Tecnologias

| Tecnologia | Uso |
|---|---|
| [Leaflet.js](https://leafletjs.com/) | Mapa interativo |
| [OpenStreetMap](https://www.openstreetmap.org/) | Tiles do mapa |
| [Nominatim](https://nominatim.org/) | Geocodificação dos endereços |
| HTML / CSS / JavaScript | Frontend puro, sem framework |

---

## 📁 Estrutura

```
postos-prime/
├── index.html       # Página principal
├── style.css        # Estilos
├── app.js           # Lógica do mapa
└── postos.geojson   # Base de dados dos postos
```

---

## ⚠️ Aviso

Esta é uma ferramenta **não oficial**, desenvolvida por **Pedro Vaz** — Investigador de Polícia — para facilitar o abastecimento de viaturas da Polícia Civil de Minas Gerais. Não possui vínculo oficial com a bandeira PRIME.

📧 Contato: [pedro.vaz@policiacivil.mg.gov.br](mailto:pedro.vaz@policiacivil.mg.gov.br)
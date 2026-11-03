/*
 * Dane strony śniegołapy.pl — wszystko, co zmienia się biznesowo, jest tutaj.
 * Kolory, pokrycia, ceny i ogłoszenia komunikacji dachowej edytujesz w tym pliku,
 * bez dotykania HTML/JS.
 */
window.SNIEGOLAPY = {
  contact: {
    phone: '+48 508 392 017',
    email: 'lib_bud@wp.pl',
  },

  // Dane firmy (z eSZOK). NIP odczytany z numeru PUESC (PL + NIP + 00000) – sprawdź.
  company: {
    name: 'F.P.H.U. „LIBBUD” Liberda Tadeusz',
    street: 'Poręba Wielka 267',
    postcode: '34-735',
    post: 'Niedźwiedź',
    locality: 'Poręba Wielka',
    region: 'małopolskie',
    nip: '737-176-75-50',
    regon: '492742306',
  },

  // Jeżeli podasz adres endpointu formularza (np. Formspree, własny PHP), zapytania
  // będą wysyłane POST-em jako JSON. Pusty = otwiera się program pocztowy (mailto).
  formEndpoint: '',

  // CENY PRZYKŁADOWE — podmień na swoje lub ustaw showPrices: false,
  // wtedy konfigurator pokazuje tylko ilości i „Wycena indywidualna”.
  showPrices: true,
  prices: {
    pipe: 42,       // rura Ø25 mm, 3 m
    connector: 6,   // łącznik rur
    endcap: 3,      // zaślepka rury
    screw: 0.6,     // wkręt montażowy
  },
  pipeLength: 3, // m

  // Typy pokryć = typy mocowań (uchwytów)
  roofs: [
    {
      id: 'rabek', name: 'Blacha na rąbek stojący', kicker: 'Blacha na', title: 'Rąbek stojący', kind: 'seam',
      mount: 'Uchwyt zaciskowy na rąbek', mountDesc: 'Zaciskany na rąbku śrubami – bez przewiercania blachy.',
      screws: 0, bracketPrice: 26,
    },
    {
      id: 'dachowka', name: 'Dachówki betonowe i ceramiczne', kicker: 'Betonowa i ceramiczna', title: 'Dachówka', kind: 'tile',
      mount: 'Uchwyt hakowy pod dachówkę', mountDesc: 'Wsuwany pod dachówkę i przykręcany do krokwi.',
      screws: 2, bracketPrice: 19,
    },
    {
      id: 'karpiowka', name: 'Dachówka karpiówka', kicker: 'Dachówka', title: 'Karpiówka', kind: 'beaver',
      mount: 'Uchwyt hakowy do karpiówki', mountDesc: 'Wąski hak dopasowany do zakładu karpiówki, mocowany do łaty.',
      screws: 2, bracketPrice: 21,
    },
    {
      id: 'plaskie', name: 'Pokrycia płaskie', kicker: 'Papa, gont, łupek', title: 'Pokrycia płaskie', kind: 'flat',
      mount: 'Uchwyt płaski do deskowania', mountDesc: 'Płaska stopa przykręcana przez pokrycie do pełnego deskowania.',
      screws: 3, bracketPrice: 17,
    },
    {
      id: 'bd-330-30', name: 'Blachodachówka 330/30', kicker: 'Blachodachówka', title: '330/30', kind: 'sheet', module: 330, step: 30,
      mount: 'Uchwyt do blachodachówki 330/30', mountDesc: 'Przykręcany przez blachę do łaty, oparty o przetłoczenie.',
      screws: 2, bracketPrice: 15,
    },
    {
      id: 'bd-350-20', name: 'Blachodachówka 350/20', kicker: 'Blachodachówka', title: '350/20', kind: 'sheet', module: 350, step: 20,
      mount: 'Uchwyt do blachodachówki 350/20', mountDesc: 'Przykręcany przez blachę do łaty, oparty o przetłoczenie.',
      screws: 2, bracketPrice: 15,
    },
    {
      id: 'bd-350-30', name: 'Blachodachówka 350/30', kicker: 'Blachodachówka', title: '350/30', kind: 'sheet', module: 350, step: 30,
      mount: 'Uchwyt do blachodachówki 350/30', mountDesc: 'Przykręcany przez blachę do łaty, oparty o przetłoczenie.',
      screws: 2, bracketPrice: 15,
    },
    {
      id: 'bd-350-35', name: 'Blachodachówka 350/35', kicker: 'Blachodachówka', title: '350/35', kind: 'sheet', module: 350, step: 35,
      mount: 'Uchwyt do blachodachówki 350/35', mountDesc: 'Przykręcany przez blachę do łaty, oparty o przetłoczenie.',
      screws: 2, bracketPrice: 15,
    },
    {
      id: 'bp-380-35', name: 'Blacha panelowa 380/35', kicker: 'Blacha panelowa', title: '380/35', kind: 'panel', module: 380, step: 35,
      mount: 'Uchwyt do blachy panelowej 380/35', mountDesc: 'Przykręcany przez panel do łaty, oparty o przetłoczenie.',
      screws: 2, bracketPrice: 16,
    },
    {
      id: 'bd-400-20', name: 'Blachodachówka 400/20', kicker: 'Blachodachówka', title: '400/20', kind: 'sheet', module: 400, step: 20,
      mount: 'Uchwyt do blachodachówki 400/20', mountDesc: 'Przykręcany przez blachę do łaty, oparty o przetłoczenie.',
      screws: 2, bracketPrice: 15,
    },
  ],

  systems: [
    { id: 'r2', name: 'Płotek 2-rurowy', short: '2-rurowy', hint: 'standard', desc: 'Dwie rury Ø25 mm. Standard dla większości domów jednorodzinnych.', tubes: 2, bracketExtra: 0 },
    { id: 'r3', name: 'Płotek 3-rurowy', short: '3-rurowy', hint: 'strome dachy, strefy 3–5', desc: 'Wyższa bariera na strome dachy i strefy śniegowe 3–5.', tubes: 3, bracketExtra: 4 },
  ],

  colors: [
    { id: '9005', name: 'Czarny', ral: 'RAL 9005', hex: '#0a0a0a' },
    { id: '7021', name: 'Antracytowy', ral: 'RAL 7021', hex: '#282b2a' },
    { id: '7024', name: 'Grafitowy', ral: 'RAL 7024', hex: '#424a50' },
    { id: '8017', name: 'Czekoladowobrązowy', label: 'Czekoladowo\u00ADbrązowy', ral: 'RAL 8017', hex: '#340500' },
    { id: '8019', name: 'Ciemnobrązowy', label: 'Ciemno\u00ADbrązowy', ral: 'RAL 8019', hex: '#3f352d' },
    { id: '8004', name: 'Ceglasty', ral: 'RAL 8004', hex: '#974e32' },
    { id: '3009', name: 'Wiśniowy', ral: 'RAL 3009', hex: '#833126' },
    { id: '7045', name: 'Szary', ral: 'RAL 7045', hex: '#949e9d' },
  ],

  // Strefy obciążenia śniegiem (PN-EN 1991-1-3) — orientacyjny rozstaw uchwytów
  zones: [
    { id: 1, hint: 'Zachód i południowy zachód kraju.', spacing: 0.9 },
    { id: 2, hint: 'Centrum i północ kraju.', spacing: 0.8 },
    { id: 3, hint: 'Wschód kraju.', spacing: 0.7 },
    { id: 4, hint: 'Północny wschód (Suwalszczyzna).', spacing: 0.6 },
    { id: 5, hint: 'Tereny górskie i podgórskie.', spacing: 0.5 },
  ],

  // Ogłoszenia komunikacji dachowej. icon: bench | step | ladder | platform | hatch | bracket
  // Treści i ceny „od” są PRZYKŁADOWE — uzupełnij swoimi.
  productCategories: [
    { id: 'all', name: 'Wszystkie' },
    { id: 'lawy', name: 'Ławy i pomosty' },
    { id: 'stopnie', name: 'Stopnie' },
    { id: 'drabiny', name: 'Drabiny' },
    { id: 'wylazy', name: 'Wyłazy' },
    { id: 'akcesoria', name: 'Akcesoria' },
  ],
  products: [
    {
      id: 'lawa', cat: 'lawy', icon: 'bench', badge: 'Najczęściej wybierane',
      name: 'Ława kominiarska',
      desc: 'Bezpieczne przejście po połaci do komina i urządzeń na dachu. W komplecie uchwyty pod Twoje pokrycie.',
      variantLabel: 'Długość', variants: ['0,8 m', '1,25 m', '2,0 m', '3,0 m'], priceFrom: 149,
    },
    {
      id: 'stopien', cat: 'stopnie', icon: 'step',
      name: 'Stopień kominiarski',
      desc: 'Pojedynczy stopień do pokonania krótkich odcinków i dojścia do wyłazu.',
      variantLabel: 'Wariant', variants: ['1 szt.', 'Zestaw 3 szt.', 'Zestaw 5 szt.'], priceFrom: 59,
    },
    {
      id: 'pomost', cat: 'lawy', icon: 'platform',
      name: 'Pomost kominiarski',
      desc: 'Szeroki podest roboczy przy kominie, z miejscem na barierkę ochronną.',
      variantLabel: 'Długość', variants: ['0,8 m', '1,25 m'], priceFrom: 320,
    },
    {
      id: 'drabina', cat: 'drabiny', icon: 'ladder',
      name: 'Drabina dachowa',
      desc: 'Stała drabina mocowana do połaci – na strome i wysokie dachy.',
      variantLabel: 'Długość', variants: ['2 m', '3 m', '4 m', '5 m'], priceFrom: 390,
    },
    {
      id: 'wylaz', cat: 'wylazy', icon: 'hatch', badge: 'Nowość',
      name: 'Wyłaz dachowy',
      desc: 'Wyjście na dach z kołnierzem uszczelniającym dopasowanym do pokrycia.',
      variantLabel: 'Rozmiar', variants: ['46 × 55 cm', '46 × 75 cm'], priceFrom: 460,
    },
    {
      id: 'uchwyty', cat: 'akcesoria', icon: 'bracket',
      name: 'Uchwyty do ław i stopni',
      desc: 'Dodatkowe lub zamienne uchwyty pod każde z 10 obsługiwanych pokryć.',
      variantLabel: 'Ilość', variants: ['Para (2 szt.)', 'Komplet (4 szt.)'], priceFrom: 45,
    },
  ],
};

// Vygenerováno skriptem technika/scripts/konfigurator/priprav.py, ručně neupravovat (nastavení je v produkt.json).
window.MARIVA_KATALOG = {
  "mikina": {
    "id": "mikina",
    "nazev": "Mikina s vlastním potiskem",
    "kratce": "Mikina",
    "jenPoptavka": true,
    "poznamka": "Zatím jen pro obrázky na webu (nákres, ne fotka). Ceny a velikosti k doplnění, pak může jít do konfigurátoru.",
    "pohledy": [
      {
        "id": "predek",
        "nazev": "Přední strana"
      }
    ],
    "rozmery": {
      "sirkaCm": 56
    },
    "potisk": {
      "sirkaCm": 30,
      "vyskaCm": 40,
      "odShoraCm": 6
    },
    "typy": [
      {
        "id": "kapuce",
        "nazev": "S kapucí",
        "popis": "Klokaní kapsa a šňůrky",
        "cena": 0,
        "velikosti": [
          "S",
          "M",
          "L",
          "XL",
          "XXL"
        ],
        "pohledy": {
          "predek": {
            "zdroj": "predek",
            "oblast": {
              "x": 0.3839,
              "y": 0.4351,
              "w": 0.2321,
              "h": 0.2689,
              "sirkaCm": 26.4,
              "vyskaCm": 35.2
            }
          }
        }
      }
    ],
    "barvy": [
      {
        "id": "bila",
        "nazev": "Bílá",
        "hex": "#ffffff"
      },
      {
        "id": "cerna",
        "nazev": "Černá",
        "hex": "#1c1c1e"
      },
      {
        "id": "sedy-melir",
        "nazev": "Šedý melír",
        "hex": "#b8b8b4"
      },
      {
        "id": "namornicka",
        "nazev": "Námořní modrá",
        "hex": "#1f2840"
      },
      {
        "id": "cervena",
        "nazev": "Červená",
        "hex": "#b1232c"
      }
    ],
    "zdroje": {
      "predek": {
        "soubor": "predek.webp?v=b48744da",
        "linky": "predek-linky.webp?v=d76dfe5f",
        "sirka": 1312,
        "vyska": 1510
      }
    }
  },
  "tricko": {
    "id": "tricko",
    "nazev": "Tričko s vlastním potiskem",
    "kratce": "Tričko",
    "poznamka": "Ceny podle ceníku na tiskarnamariva.cz (vlastní barevný potisk vpředu, s DPH 21 %). Velikosti, barvy a rozměry potisku jsou návrh k ověření.",
    "pohledy": [
      {
        "id": "predek",
        "nazev": "Přední strana"
      }
    ],
    "rozmery": {
      "sirkaCm": 52
    },
    "potisk": {
      "sirkaCm": 30,
      "vyskaCm": 40,
      "odShoraCm": 7
    },
    "velkeMnozstviOd": 20,
    "typy": [
      {
        "id": "klasicke",
        "nazev": "Klasické",
        "popis": "Rovný unisex střih",
        "cena": 250,
        "velikosti": [
          "S",
          "M",
          "L",
          "XL",
          "XXL",
          "3XL"
        ],
        "pohledy": {
          "predek": {
            "zdroj": "predek",
            "oblast": {
              "x": 0.3401,
              "y": 0.2561,
              "w": 0.3189,
              "h": 0.4795,
              "sirkaCm": 30.0,
              "vyskaCm": 40.0
            }
          }
        }
      },
      {
        "id": "damske",
        "nazev": "Dámské",
        "popis": "Užší, vypasovaný střih",
        "cena": 270,
        "velikosti": [
          "XS",
          "S",
          "M",
          "L",
          "XL",
          "XXL"
        ],
        "rozmery": {
          "sirkaCm": 46
        },
        "potisk": {
          "sirkaCm": 26,
          "vyskaCm": 35,
          "odShoraCm": 6
        },
        "pohledy": {
          "predek": {
            "zdroj": "predek",
            "oblast": {
              "x": 0.3433,
              "y": 0.2533,
              "w": 0.3124,
              "h": 0.4743,
              "sirkaCm": 26.0,
              "vyskaCm": 35.0
            }
          }
        }
      },
      {
        "id": "detske",
        "nazev": "Dětské",
        "popis": "Pro děti od 3 do 12 let",
        "cena": 195,
        "velikosti": [
          "98",
          "110",
          "122",
          "134",
          "146",
          "158"
        ],
        "rozmery": {
          "sirkaCm": 38
        },
        "potisk": {
          "sirkaCm": 20,
          "vyskaCm": 27,
          "odShoraCm": 5
        },
        "pohledy": {
          "predek": {
            "zdroj": "predek",
            "oblast": {
              "x": 0.3541,
              "y": 0.2544,
              "w": 0.2909,
              "h": 0.4429,
              "sirkaCm": 20.0,
              "vyskaCm": 27.0
            }
          }
        }
      }
    ],
    "barvy": [
      {
        "id": "bila",
        "nazev": "Bílá",
        "hex": "#ffffff"
      },
      {
        "id": "cerna",
        "nazev": "Černá",
        "hex": "#1c1c1e"
      },
      {
        "id": "sedy-melir",
        "nazev": "Šedý melír",
        "hex": "#b8b8b4"
      },
      {
        "id": "namornicka",
        "nazev": "Námořní modrá",
        "hex": "#1f2840"
      },
      {
        "id": "kralovska",
        "nazev": "Královská modrá",
        "hex": "#2a4c9c"
      },
      {
        "id": "cervena",
        "nazev": "Červená",
        "hex": "#b1232c"
      },
      {
        "id": "lahvove-zelena",
        "nazev": "Lahvově zelená",
        "hex": "#1e4a38"
      },
      {
        "id": "zluta",
        "nazev": "Žlutá",
        "hex": "#efc23a"
      }
    ],
    "zdroje": {
      "predek": {
        "soubor": "predek.webp?v=817651d1",
        "linky": "predek-linky.webp?v=06556a50",
        "sirka": 2030,
        "vyska": 1800
      }
    }
  }
};

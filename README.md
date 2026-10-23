# Motiv MARIVA pro Shopify

Motiv e-shopu Tiskárny MARIVA (značka v2: magentový štítek, Archivo). Repozitář je propojený se Shopify přes GitHub. Co se změní v editoru motivu, Shopify uloží zpátky sem.

## Připojení k obchodu

1. Shopify admin > Online Store > Themes > Add theme > **Connect from GitHub**.
2. Vybrat tento repozitář a větev `main`.
3. U motivu dát **Customize** a pak **Publish**, až bude vše vyzkoušené.

## Nastavení obchodu

- **Produkty:** Products > Import > soubor `produkty-import.csv`. Tento soubor je ve složce `MARIVA/Shopify` na počítači, v repozitáři není.
- **Štítky (tags) produktů** řídí vzhled:
  - `poptavka`: místo košíku formulář poptávky
  - `konfigurator`: tlačítko „Navrhnout“ a živý náhled trička na kartě
  - `barva-magenta` / `barva-zluta` / `barva-azur` / `barva-papir`: barva dlaždice
  - `stitek:Text`: odznak na kartě
  - `ilustrace:serpa`: kreslený obrázek, dokud produkt nemá fotku
  - `pro-maturanti`, `pro-skolky`, `pro-sport`, `pro-firmy`, `pro-darky`: skupiny zákazníků
- **Kolekce:** pro každou skupinu udělat automatickou kolekci s podmínkou „Product tag = pro-…“. V úvodu u sekce Skupiny zákazníků je pak napojit.
- **Menu:** Online Store > Navigation > `main-menu` (hlavička) a další menu do patičky.
- **Stránky:** udělat stránku „Poptávka“ se šablonou `page.poptavka` a stránku „Kontakt“ se šablonou `page.contact`.
- **Filtry v kolekcích:** nainstalovat aplikaci Search & Discovery a zapnout filtry (cena, typ, štítky).
- **Nahrávání souborů v poptávce:** v Theme settings > Konfigurátor vložit veřejný klíč z Uploadcare. Bez klíče zákazník soubory pošle e-mailem.
- **Kontakt, termín dodání, barvy:** Theme settings.

## Struktura

`layout/`, `sections/`, `snippets/`, `templates/`, `config/`, `locales/` (čeština), `assets/`. Kontrola chyb: Theme Check (`technika/shopify-nastroje`).

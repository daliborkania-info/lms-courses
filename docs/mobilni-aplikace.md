# LMS jako aplikace na mobilu (krok za krokem)

Aplikaci není potřeba instalovat z App Store ani Google Play. Otevřená stránka
LMS se dá "přišpendlit" na plochu telefonu - dostane vlastní ikonu, jméno
a otevírá se přes celou obrazovku bez lišty prohlížeče, takže se od nativní
aplikace nepozná. Engine k tomu servíruje web manifest a ikony, prohlížeč
zbytek udělá sám.

## Než začneš

1. Na telefonu **zapni VPN** domů (viz [docs/vpn.md](vpn.md)) - ikona na ploše
   bude fungovat jen tehdy, když je LMS dosažitelné.
2. Otevři LMS v prohlížeči na adrese, která bude **platit dlouhodobě** -
   ideálně jméno místo IP (Tailscale MagicDNS `http://server:3000`, MikroTik
   DNS static záznam apod.). Adresa se do ikony "zapeče"; když se později
   změní, ikona přestane fungovat a přidává se znovu.
3. Ověř, že stránka funguje (přihlas profil, otevři kurz).

## iPhone / iPad

**Safari** (doporučeno, funguje na každém iOS):

1. Otevři adresu LMS v Safari.
2. Klepni na tlačítko **Sdílet** (čtvereček se šipkou nahoru, uprostřed
   spodní lišty).
3. Sjeď dolů a klepni na **Přidat na plochu** (Add to Home Screen).
4. Zkontroluj název ("Studium"), klepni na **Přidat**.
5. Na ploše je ikona LMS; otevírá se celoobrazovkově, bez adresního řádku.

**Chrome / Firefox / Edge na iOS** (iOS 16.4 a novější): stejný postup -
tlačítko Sdílet → **Přidat na plochu**. Na starším iOS to umí jen Safari.

Poznámka: iOS občas u celoobrazovkových webových aplikací po dlouhé
nečinnosti "zapomene" stav a aplikace startuje znovu od Domů. Postup v kurzu
se neztrácí, je uložený na serveru.

## Android

Android má dvě podoby téhle funkce a záleží na prohlížeči, kterou nabídne:

- **"Instalovat aplikaci"** - plnohodnotná instalace (ikona + položka
  v seznamu aplikací, celá obrazovka). Nabízí Chrome a prohlížeče na jeho
  jádru, protože LMS má web manifest.
- **"Přidat na plochu"** - jen zástupce; taky funguje, jen se někdy otevírá
  s lištou prohlížeče.

### Chrome

1. Otevři adresu LMS v Chrome.
2. Klepni na **menu ⋮** (vpravo nahoře).
3. Klepni na **Instalovat aplikaci** (starší verze: **Přidat na plochu**).
4. Potvrď **Instalovat**. Ikona se objeví na ploše i v seznamu aplikací.

### Samsung Internet

1. Otevři adresu LMS.
2. Klepni na **menu ≡** (vpravo dole).
3. Klepni na **Přidat stránku do** → **Domovská obrazovka**
   (Add page to → Home screen). Pokud se nabídne **Instalovat**, použij to.
4. Potvrď **Přidat**.

### Firefox

1. Otevři adresu LMS.
2. Klepni na **menu ⋮**.
3. Klepni na **Přidat na plochu** (Add to Home screen).
4. Potvrď **Přidat**, případně ikonu na plochu přetáhni.

### Edge

1. Otevři adresu LMS.
2. Klepni na **menu ⋯** (uprostřed spodní lišty).
3. **Přidat do telefonu** (Add to phone) nebo **Přidat na plochu**.
4. Potvrď.

### Opera

1. Otevři adresu LMS.
2. Klepni na **menu ⋮** (vpravo dole).
3. Klepni na **Přidat do** → **Plocha** (Add to → Home screen).
4. Potvrď.

## Řešení potíží

- **Ikona ukazuje chybu "stránka nedostupná":** není zapnutá VPN, nebo se
  změnila adresa serveru. Zapni VPN; při změně adresy ikonu smaž a přidej
  znovu ze správné adresy.
- **Chrome nenabízí "Instalovat aplikaci":** otevři stránku znovu (manifest
  se načítá při návštěvě) a zkontroluj, že běží aktuální verze enginu
  (manifest byl přidán v červenci 2026 - starší nasazení vyžaduje rebuild).
  "Přidat na plochu" funguje vždy.
- **Aplikace se otevírá s lištou prohlížeče:** přidal ses přes "Přidat na
  plochu" místo "Instalovat", nebo prohlížeč standalone režim neumí. Zkus
  ikonu smazat a přidat přes Chrome/Samsung Internet.
- **Po aktualizaci enginu vypadá appka postaru:** potáhni pro obnovení,
  případně aplikaci zavři (swipe pryč z posledních aplikací) a otevři znovu.

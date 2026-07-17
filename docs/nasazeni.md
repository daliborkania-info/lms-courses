# Nasazení v domácích podmínkách

Engine je jedna Next.js aplikace (port 3000) + dva adresáře: `courses/` (obsah,
read-only) a `data/` (SQLite databáze `lms.db`, vznikne při prvním startu).
Nic víc. Poběží na čemkoli, kde běží Docker nebo Node.js 20+.

**Bezpečnostní zásada předem:** aplikace nemá přihlašování (profily jsou jen
přepínač, ne autentizace). Provozuj ji **jen na domácí síti nebo přes VPN**
(viz [docs/vpn.md](vpn.md)). Nikdy nedělej port forward 3000 do internetu.

## Varianta A: Docker (doporučeno)

Funguje stejně na NAS, mini PC, Raspberry Pi 4/5 i virtuálce (Proxmox).

```bash
git clone https://github.com/daliborkania-info/lms-courses.git lms
cd lms
docker compose up -d --build
# aplikace bezi na http://<ip-zarizeni>:3000
```

Co se stane: image se postaví z `engine/` (build stage kompiluje better-sqlite3,
runtime je štíhlý standalone Next server), `courses/` se mountne read-only,
`data/` se vytvoří vedle a přežije všechny rebuildy.

Nároky: build chvíli žere CPU a ~1-2 GB místa (mezivrstvy), běžící kontejner
je skromný (řádově 150-300 MB RAM). Na slabém zařízení postav image na PC
a přenes ho:

```bash
# na PC (pozor na architekturu ciloveho zarizeni)
docker buildx build --platform linux/arm64 -t studium-lms ./engine
docker save studium-lms | gzip > studium-lms.tar.gz
# na cilovem zarizeni
docker load < studium-lms.tar.gz
# v docker-compose.yml pak misto "build: ./engine" dej "image: studium-lms"
```

### A1: Synology NAS

1. Nainstaluj balíček **Container Manager** (DSM 7.2+; dřív Docker).
2. Nahraj složku repa do sdílené složky, např. `/volume1/docker/lms`
   (File Station, nebo `git clone` přes SSH).
3. Container Manager → **Projekt** → Vytvořit → vyber složku s
   `docker-compose.yml` → Spustit. Build proběhne na NASu.
4. Alternativně přes SSH: `cd /volume1/docker/lms && sudo docker compose up -d --build`.

Záloha: `data/lms.db` přidej do Hyper Backup úlohy (viz níže kdy je kopie konzistentní).

### A2: QNAP NAS

Container Station podporuje compose: Container Station → Applications →
Create → vlož obsah `docker-compose.yml` (cesty volumes uprav na absolutní,
např. `/share/Container/lms/courses`). Nebo přes SSH stejně jako u Synology.

### A3: TrueNAS SCALE

Nejjednodušší přes vestavěný **Custom App** s compose (Apps → Discover →
Install via YAML), volumes namiř na dataset, např. `/mnt/pool/apps/lms`.

### A4: MikroTik router (RouterOS 7 kontejnery)

Jde to, ale s výhradami: potřebuješ ARM64 model s USB/NVMe diskem (RB5009,
hAP ax3, CCR2004...), balíček `container` a RouterOS neumí image stavět -
musíš ji postavit na PC (viz `docker buildx` výše, platform `linux/arm64`),
exportovat do tar a naimportovat:

```
/container/config/set registry-url="" tmpdir=usb1/tmp
/container/add file=usb1/studium-lms.tar interface=veth1 root-dir=usb1/lms \
  mounts=courses,data logging=yes
/container/mounts/add name=courses src=/usb1/lms-data/courses dst=/app/courses
/container/mounts/add name=data src=/usb1/lms-data/data dst=/app/data
```

Počítej s ~300 MB RAM pro kontejner - na routeru s 1 GB RAM to je na hraně,
router to má dělat "k tomu", ne jako hlavní práci. Pro rodinné použití je
NAS nebo mini PC lepší volba; router nech na VPN (viz docs/vpn.md).

## Varianta B: Přímo na počítači (bez Dockeru)

Hodí se na starší notebook/mini PC, který doma běží pořád, nebo na zkoušku.
Stačí **Node.js 20+** (kvůli ts-fsrs).

```bash
git clone https://github.com/daliborkania-info/lms-courses.git lms
cd lms/engine
npm install
npm run build
npm start        # bezi na http://<ip-pocitace>:3000
```

Engine hledá obsah v `../courses` a data v `../data` relativně ke složce
`engine/` (jde přepsat env proměnnými `COURSES_DIR` a `DATA_DIR`).

### B1: Linux jako služba (systemd)

`/etc/systemd/system/lms.service`:

```ini
[Unit]
Description=Studium LMS
After=network.target

[Service]
WorkingDirectory=/opt/lms/engine
ExecStart=/usr/bin/npm start
Restart=always
User=lms
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now lms
```

### B2: Windows

Nejjednodušší je správce procesů `pm2`:

```powershell
npm install -g pm2
cd C:\lms\engine
pm2 start npm --name lms -- start
pm2 save
```

Autostart po rebootu: `pm2-installer` nebo Naplánované úlohy (spustit
`pm2 resurrect` po přihlášení). Nezapomeň povolit port 3000 ve Windows
firewallu jen pro **privátní** síť.

### B3: Raspberry Pi bez Dockeru

Stejné jako B1 (Node 20 z nodesource). Pi 3 stačí, build trvá pár minut.

## Aktualizace a zálohy (obě varianty)

**Aktualizace obsahu** (nový kurz, upravený modul): jen nakopíruj/pullni
soubory do `courses/` - engine je načte do 15 s, žádný restart.

**Aktualizace enginu**: `git pull`, pak `docker compose up -d --build`
(varianta A) nebo `npm install && npm run build` + restart služby (varianta B).

**Záloha**: jediné, co nejde obnovit, je `data/lms.db` (profily, postup, XP,
historie opakování). Kopíruj ji pravidelně:

```bash
# konzistentni kopie za behu (ma-li system sqlite3)
sqlite3 data/lms.db ".backup 'zaloha/lms-$(date +%F).db'"
# nebo postaru: zastavit, zkopirovat, spustit
docker compose stop && cp data/lms.db zaloha/ && docker compose start
```

Obsah kurzů zálohu neřeší - je v gitu.

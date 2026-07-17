# Přístup zvenku: VPN do domácí sítě

LMS nemá přihlašování, takže nepatří na veřejný internet. Správný způsob, jak
se ke kurzům dostat z mobilu kdekoli, je VPN domů. Tři osvědčené cesty podle
toho, co doma máš.

**Rychlé doporučení:** nechceš-li nic studovat, použij **Tailscale** (10 minut,
zdarma, žádná konfigurace routeru). Máš-li MikroTik a chceš řešení bez třetí
strany, postav **WireGuard** přímo na routeru.

## Varianta 1: Tailscale (nejjednodušší)

Overlay síť postavená na WireGuardu. Žádné otevírání portů, funguje i za CGNAT
(což je u domácích přípojek běžné). Free plán bohatě stačí (3 uživatelé,
100 zařízení).

1. Účet na tailscale.com (přihlášení Google/Apple/GitHub účtem).
2. Nainstaluj Tailscale na stroj s LMS:
   - Linux/mini PC: `curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up`
   - Synology/QNAP: balíček Tailscale je v katalogu balíčků NASu.
3. Nainstaluj aplikaci Tailscale do telefonu, přihlas se stejným účtem.
4. Hotovo: LMS je z mobilu na `http://<tailscale-ip>:3000`, s MagicDNS
   `http://<jmeno-stroje>:3000`.

Tipy:

- **Subnet router:** chceš-li z telefonu vidět celou domácí síť (ne jen stroj
  s LMS): `sudo tailscale up --advertise-routes=192.168.1.0/24` a povolit
  routu v admin konzoli.
- V admin konzoli vypni "key expiry" pro server, ať se spojení po pár měsících
  samo nerozbije.
- **Nepoužívej Tailscale Funnel** pro LMS - ten věc naopak publikuje do
  internetu, což je přesně to, co nechceme.
- Nevýhoda: závislost na účtu třetí strany (koordinační server). Provoz samotný
  jde peer-to-peer, šifrovaný WireGuardem.

## Varianta 2: MikroTik router - WireGuard (bez třetí strany)

RouterOS 7 má WireGuard nativně. Podmínka: veřejná IP (aspoň dynamická) na
WAN. Za CGNAT tahle cesta nefunguje - použij Tailscale nebo MikroTik
Back to Home (níže).

```
# 1) WireGuard interface serveru
/interface/wireguard add name=wg-vpn listen-port=13231
/ip/address add address=10.10.10.1/24 interface=wg-vpn

# 2) peer pro telefon (verejny klic vygeneruje aplikace WireGuard v telefonu)
/interface/wireguard/peers add interface=wg-vpn name=telefon \
  public-key="<PUBLIC_KEY_TELEFONU>" allowed-address=10.10.10.2/32

# 3) firewall: pustit WireGuard z internetu a provoz z VPN do LAN
/ip/firewall/filter add chain=input action=accept protocol=udp dst-port=13231 \
  comment="wireguard in" place-before=0
/ip/firewall/filter add chain=forward action=accept src-address=10.10.10.0/24 \
  dst-address=192.168.88.0/24 comment="vpn to lan"
```

V telefonu (aplikace WireGuard → nový tunel ručně):

- Address: `10.10.10.2/32`, DNS: IP routeru
- Peer public key: public key interface `wg-vpn` (vidíš v /interface/wireguard)
- Endpoint: `<verejna-ip-nebo-ddns>:13231`
- AllowedIPs: `192.168.88.0/24, 10.10.10.0/24` (jen domácí síť; `0.0.0.0/0`
  by tunelovalo všechen provoz)

Dynamickou IP vyřeš MikroTik **IP Cloud** (`/ip/cloud set ddns-enabled=yes`,
dostaneš `xxx.sn.mynetname.net` jako endpoint).

**MikroTik Back to Home:** novější RouterOS (7.14+) umí "Back To Home" -
WireGuard VPN klikací z mobilní aplikace MikroTik, funguje i za CGNAT (relay
přes MikroTik cloud). Nejrychlejší cesta, pokud máš podporovaný router:
aplikace MikroTik → router → Back To Home → přidat zařízení QR kódem.

## Varianta 3: VPN server na NAS

- **Synology:** balíček **VPN Server** (zdarma) umí OpenVPN a L2TP/IPsec.
  Funkční, ale vyžaduje port forward na routeru a OpenVPN klienta v telefonu.
  Na DSM 7.2+ je jednodušší nainstalovat rovnou balíček **Tailscale** (varianta 1)
  a NAS použít i jako subnet router.
- **QNAP:** QVPN Service (OpenVPN, WireGuard od QTS 5). WireGuard tady je
  rozumná volba, konfigurace obdobná variantě 2 (QR kód pro telefon umí
  vygenerovat).

## Srovnání

| | Tailscale | WireGuard na MikroTiku | VPN na NAS |
|---|---|---|---|
| Náročnost | minimální | střední (CLI) | nízká-střední |
| Funguje za CGNAT | ano | ne (BTH ano) | ne (Tailscale balíček ano) |
| Závislost na 3. straně | ano (koordinace) | ne | ne |
| Rychlost | výborná (P2P) | výborná | dobrá |
| Port forward potřeba | ne | ano (UDP 13231) | ano |

Ať zvolíš cokoli: LMS pak otevíráš na privátní adrese
(`http://<ip>:3000`), do internetu nevystavuješ nic kromě UDP portu VPN
(varianty 2 a 3), a i ten je bez správného klíče němý.

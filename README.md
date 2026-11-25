# Ransomware Zero

A browser-based incident response strategy game. Protect a fictional company from a simulated ransomware outbreak. No malware, external network requests, credentials or backend are involved.

## Play locally

Use Python 3 to serve the project:

```sh
python -m http.server 8000
```

Open http://localhost:8000. The game begins paused; use **Next cycle** to play turn by turn or **Start clock** to advance automatically every five seconds.

## Gameplay

- Three difficulty levels, ten assets and fifteen simulated network links.
- Isolate compromised machines, seal backups, harden clean machines, restore or rebuild systems and reconnect services.
- Response points replenish each cycle. Active infections can spread and encrypt systems.
- Service availability is weighted by business criticality. Downtime, lost backup integrity and response actions reduce the score.
- Win after all intrusion waves have passed, the vault is sealed with 100% verified backup integrity, all services are online and the network has remained clean for two cycles.
- If the vault is compromised, rebuild it and verify a fresh recovery snapshot once every service is online. Best successful scores are stored locally per difficulty. No personal information is collected.

## Architecture

`engine.mjs` is the deterministic simulation, `app.mjs` is the browser UI, `style.css` is the responsive styling and `index.html` is the entry point. No dependencies or build step are required.

## Tests

With Node.js 22 or later:

```sh
node --test engine.test.mjs
node --check app.mjs
```

Tests cover initial state, invalid actions, containment, backup restoration, hardening, failure, deterministic outcomes, rebuilding and a winning strategy for each difficulty. The simulation is an educational abstraction, not operational incident-response guidance.

## Deploy

Serve the repository root using any static host, including GitHub Pages (Settings > Pages > Deploy from a branch > main / root). No environment variables are necessary.

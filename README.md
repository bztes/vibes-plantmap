# Plantmap

Plan where to plant trees and see how much room they need as they grow. Vibe coded.

## Setup

```sh
mkdir -p plantmap && cd plantmap
curl -fsSLO https://raw.githubusercontent.com/bztes/vibes-plantmap/main/compose.yaml
curl -fsSL https://raw.githubusercontent.com/bztes/vibes-plantmap/main/.env.example -o .env
docker compose up -d
```

Serve it over HTTPS behind a reverse proxy, or set `ORIGIN` for plain http. The first account that signs up becomes admin.

## Configuration

Settings go into `.env` next to `compose.yaml`:

| Variable   | Description                                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| `ORIGIN`   | Only for plain http: the URL Plantmap is opened with, e.g. `http://server:3000`. |
| `DATA_DIR` | Host path of Plantmap's state (SQLite database). Default `./data`.               |

## Updating

```sh
docker compose pull && docker compose up -d
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[AGPL-3.0-or-later](LICENSE)

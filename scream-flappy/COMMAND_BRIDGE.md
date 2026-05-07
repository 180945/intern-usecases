# Command Bridge

Local localhost bridge for future Superwhisper or other STT tools.

## Endpoint

`POST http://127.0.0.1:4317/command`

JSON body:

```json
{
  "text": "cat break now"
}
```

## Health check

`GET http://127.0.0.1:4317/health`

## Current behavior

Implemented command routing:
- `cat break now`
- `cat take a break`
- `cat start break`
- `hey cat break now`
- `fat cat break now`

## Example curl

```bash
curl -X POST http://127.0.0.1:4317/command \
  -H 'Content-Type: application/json' \
  -d '{"text":"cat break now"}'
```

## Intended next step

Connect Superwhisper (or another STT source) to send recognized transcripts into this endpoint.

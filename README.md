# Closer Game

Ein einfaches Schätzspiel für bis zu acht Spieler:innen. Die Teilnehmenden treten über einen zufälligen Lobby-Code einer Runde bei, beantworten Schätzfragen und sehen anschließend, wer am nächsten bzw. am weitesten von der korrekten Lösung entfernt war.

## Features

- Lobby-System ohne Accounts: Spieler:innen wählen lediglich einen Namen und einen 4-stelligen Code.
- Fragenkatalog aus einer lokalen `questions.json`.
- Gleichzeitiges Antworten aller Teilnehmenden, automatische Auswertung bei Zahlenfragen.
- Responsive Oberfläche, optimiert für Smartphones.
- Keine persistenten Daten – alles läuft nur innerhalb der aktuellen Session.
- Bereit für den Betrieb im Docker-Container.

## Entwicklung

```bash
npm install
npm run dev
```

Der Server läuft standardmäßig auf Port `3000`. Im Entwicklungsmodus startet `nodemon` den Server automatisch neu, wenn Dateien geändert werden.

## Produktion / Docker

Das mitgelieferte Docker-Image nutzt `node:20-alpine`.

```bash
docker build -t closer-game .
docker run -p 3000:3000 closer-game
```

Anschließend ist das Spiel unter `http://localhost:3000` erreichbar.

## Fragenkatalog anpassen

Die Datei [`questions.json`](./questions.json) enthält die Fragen. Jede Frage besteht aus:

```json
{
  "id": 1,
  "question": "Fragestellung als Text",
  "type": "number" | "text",
  "answer": 42 // nur bei Zahlfragen notwendig
}
```

Neue Fragen können einfach ergänzt werden. Bei `type: "text"` wird keine Auswertung vorgenommen und lediglich die Antworten angezeigt.

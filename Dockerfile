# Verwende das offizielle Node.js-Image als Basis
FROM node:14

# Erstelle ein Arbeitsverzeichnis
WORKDIR /app

# Kopiere die package.json und package-lock.json Dateien
COPY package*.json ./

# Installiere die Abhängigkeiten, einschließlich ts-node
RUN npm install

# Installiere ts-node global
RUN npm install -g ts-node

# Kopiere den Rest des Anwendungsquellcodes
COPY . .

# Kompiliere TypeScript-Dateien
RUN npx tsc

# Exponiere den Port, auf dem die App läuft
EXPOSE 3000

# Setze die Ausführungsrechte für das Startskript
RUN chmod +x ./start.sh

RUN npm rebuild

# Definiere den Befehl zum Starten der App
ENTRYPOINT ["./start.sh"]

# Utiliser une image de base Node.js
FROM node:18-alpine

# Créer et définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json dans le répertoire de travail
COPY package*.json ./

# Installer les dépendances, en incluant les dépendances de développement si nécessaire
RUN npm install --production

# Copier le reste des fichiers de l'application
COPY . .

# Exposer le port 8800
EXPOSE 8800

# Démarrer l'application
CMD ["node", "index.js"]

# Usa la imagen base de Node.js
FROM node:18-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos necesarios al contenedor
COPY package*.json ./
COPY cronjob.js ./

# Instala las dependencias
RUN npm install

# Define el comando para ejecutar el cronjob
CMD ["npm", "start"]

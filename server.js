// server.js - Chat Aleatório Avançado

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname));

let waitingUser = null;
let onlineUsers = 0;

// Lista de palavras proibidas
const bannedWords = ['palavrão1', 'palavrão2', 'palavrão3'];

io.on('connection', (socket) => {
  onlineUsers++;
  io.emit('updateOnline', onlineUsers);

  console.log('Novo usuário conectado:', socket.id);

  socket.partner = null; // parceiro atual

  // Função para conectar com outro usuário
  const connectUser = () => {
    if (waitingUser && waitingUser.id !== socket.id) {
      const room = socket.id + '#' + waitingUser.id;
      const partner = waitingUser;
      socket.partner = partner;
      partner.partner = socket;

      socket.join(room);
      partner.join(room);

      socket.emit('connected', 'Você foi conectado!');
      partner.emit('connected', 'Você foi conectado!');

      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit('connected', 'Esperando por outro usuário...');
    }
  };

  connectUser();

  // Receber mensagens
  socket.on('chat message', (msg) => {
    // Filtrar palavras proibidas
    const filtered = msg.split(' ').map(word => bannedWords.includes(word.toLowerCase()) ? '***' : word).join(' ');
    
    if (socket.partner) {
      socket.partner.emit('chat message', filtered);
    }
  });

  // Botão “Próximo”
  socket.on('next', () => {
    // Avisar parceiro antigo
    if (socket.partner) {
      socket.partner.emit('chat message', 'O outro usuário saiu.');
      socket.partner.partner = null;
    }
    socket.partner = null;

    // Colocar o usuário de volta na fila
    connectUser();
  });

  // Desconectar
  socket.on('disconnect', () => {
    onlineUsers--;
    io.emit('updateOnline', onlineUsers);

    if (socket.partner) {
      socket.partner.emit('chat message', 'O outro usuário saiu.');
      socket.partner.partner = null;
    }

    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }
  });
});

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log('Servidor rodando na porta', PORT);
});


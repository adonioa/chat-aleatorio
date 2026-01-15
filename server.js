const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let waitingUser = null;
let onlineUsers = 0;

io.on("connection", socket => {
  onlineUsers++;

  socket.on("set-nickname", nickname => {
    socket.nickname = nickname || "Anônimo";
    tryMatch(socket);
    io.emit("online-count", onlineUsers);
  });

  socket.on("message", msg => {
    if (socket.partner) {
      socket.partner.emit("message", {
        from: socket.nickname,
        text: msg
      });
    }
  });

  socket.on("next", () => {
    disconnectPair(socket);
    tryMatch(socket);
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    disconnectPair(socket);
    io.emit("online-count", onlineUsers);
  });

  function tryMatch(user) {
    if (waitingUser && waitingUser !== user) {
      user.partner = waitingUser;
      waitingUser.partner = user;

      user.emit("system", "Conectado com um estranho");
      waitingUser.emit("system", "Conectado com um estranho");

      waitingUser = null;
    } else {
      waitingUser = user;
      user.emit("system", "Procurando alguém...");
    }
  }

  function disconnectPair(user) {
    if (user.partner) {
      user.partner.emit("system", "O estranho saiu do chat");
      user.partner.partner = null;
    }
    user.partner = null;
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});

const mongoose = require('mongoose');
const dotenv = require('dotenv').config();
const colors = require('colors');
const app = require('./index');
const config = require('./config');

// database connection
mongoose
  .connect(config.database_local, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Database connection successfully'.red.bold))
  .catch(err => {
    console.log('Error connecting to the database:', err);
    process.exit(1); // Exit the application on database connection error
  });

// Create an HTTP server and attach the Express app to it
const server = require('http').createServer(app);

// server
const port = config.port || 8080;

// Attach Socket.io to the server
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
  },
});

// Socket.io logic
let activeUsers = [];

io.on('connection', socket => {
  // add new User
  socket.on('new-user-add', newUserEmail => {
    // if user is not added previously
    if (!activeUsers.some(user => user.userEmail === newUserEmail)) {
      const newUser = {
        userEmail: newUserEmail,
        socketId: socket.id,
        lastOnline: Date.now(), // Add the current timestamp
      };
      activeUsers.push(newUser);
      console.log('New User Connected', activeUsers);
    }
    // send all active users to new user
    io.emit('get-users', activeUsers);
  });

  socket.on('disconnect', () => {
    // update lastOnline timestamp for the disconnected user
    const disconnectedUser = activeUsers.find(
      user => user.socketId === socket.id,
    );
    if (disconnectedUser) {
      disconnectedUser.lastOnline = Date.now();
    }

    // remove user from active users
    activeUsers = activeUsers.filter(user => user.socketId !== socket.id);
    console.log('User Disconnected', activeUsers);

    // send all active users to all users
    io.emit('get-users', activeUsers);
  });

  // send message to a specific user
  socket.on('send-message', data => {
    const { receiverEmail } = data;
    const user = activeUsers.find(user => user.userEmail === receiverEmail);
    console.log('Sending from socket to :', receiverEmail);
    console.log('Data: ', data);
    if (user) {
      io.to(user.socketId).emit('recieve-message', data);
    }
  });
});

server.listen(port, () => {
  console.log(`App is running on port ${port}`.yellow.bold);
});

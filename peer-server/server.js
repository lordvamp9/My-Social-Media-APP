import { PeerServer } from 'peer';

const port = process.env.PORT || 9000;
const server = PeerServer({
  port: port,
  path: '/'
});

console.log(`PeerJS Server running on port ${port}`);

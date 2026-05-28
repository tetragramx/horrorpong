
# 🦇🎃 Horror Pong 🕸️🩸

Welcome to **Horror Pong** — a gothic, multiplayer Pong game with a dark twist! Play instantly as a guest, climb the leaderboard, or challenge friends in real-time. Built for chills, thrills, and competitive fun.


## 👻 Features

- ⚡ Instant guest play (no login needed)
- 🧛‍♂️ Account login/signup with JWT auth
- 🪦 MongoDB-backed persistent highscores
- 🏆 Live leaderboard with your rank
- 🕹️ Multiplayer: create/join rooms, real-time paddle & ball sync


## 🛠️ Tech Stack

**Frontend:**
- React 19 + Vite ⚡
- TypeScript
- Modern CSS (gothic/dark theme)

**Backend:**
- Node.js (Express)
- TypeScript
- Socket.IO (real-time multiplayer)
- JWT Auth + bcrypt
- MongoDB (Mongoose)


## 🏁 Getting Started

1. **Clone the repo:**
	```bash
	git clone https://github.com/YOUR_USERNAME/horror-pong.git
	cd horror-pong
	```

2. **Set up environment variables:**
	- Copy templates:
	  ```bash
	  cp server/.env.example server/.env
	  cp client/.env.example client/.env
	  ```
	- Edit `server/.env`:
	  - `MONGO_URI` = your MongoDB Atlas connection string
	  - `JWT_SECRET` = a long random string
	  - `CLIENT_ORIGIN` = your frontend URL (e.g. https://horror-pong.vercel.app)
	- Edit `client/.env`:
	  - `VITE_API_BASE_URL` = your backend URL (e.g. https://horror-pong-api.onrender.com)

3. **Install dependencies:**
	```bash
	npm install
	cd client && npm install
	cd ../server && npm install
	```

4. **Run locally:**
	```bash
	npm run dev
	```
	- Client: http://localhost:5173
	- Server: http://localhost:4000

5. **Build for production:**
	```bash
	npm run build
	```


## 📡 API Endpoints

- `POST /auth/register` — Create account
- `POST /auth/login` — Login
- `GET /auth/me` — Get current user
- `GET /leaderboard` — Top scores
- `POST /scores` — Submit score (requires Bearer token)

## 🔌 Multiplayer Socket Events

- `createRoom`, `joinRoom`, `startMatch`
- `paddleMove`, `ballSync`, `scoreUpdate`, `playerDisconnected`

---

🦇 Made with chills & code. PRs welcome!

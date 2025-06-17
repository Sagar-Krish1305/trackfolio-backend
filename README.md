# 📊 Trackfolio Backend

A high-performance backend server for **Trackfolio** – a portfolio analytics and risk management app tailored for retail investors and quant enthusiasts.

This backend powers core functionalities like fetching user portfolio data, calculating portfolio risk metrics, and optimizing performance with caching layers.

---

## 🚀 Features

- 🧠 **Risk Analytics Engine**  
  Computes:
  - Covariance Matrix  
  - Portfolio Volatility (σ)
  - Beta (β)
  - Sharpe Ratio
  - Value at Risk (VaR)

- 📈 **Historical Market Data**  
  Uses Alpaca API to fetch daily stock bars (OHLCV) and maintains a rolling window of 500 days.

- ⚡ **Redis Caching**  
  Optimized matrix computation with Redis for symmetric, pairwise caching (`cov:AAPL-MSFT`), drastically reducing redundant calculations.

- 🧪 **RESTful APIs**  
  Modular endpoints built using Express.js with support for user-defined portfolios.

- 🐳 **Dockerized Infrastructure**  
  Easily deployable with Docker and `docker-compose`.

---

## 🧰 Tech Stack

- **Node.js (ESM Modules)**
- **Express.js**
- **Redis** – for caching
- **Docker + Docker Compose**
- **Alpaca Market Data API**
- **Day.js** – for date manipulation
- **p-limit** – for controlled async concurrency

---

## 📦 Setup

```bash
# Clone the repo
git clone https://github.com/Sagar-Krish1305/trackfolio-backend.git
cd trackfolio-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Fill in your ALPACA_API_KEY and ALPACA_SECRET_KEY

# Start with Docker
docker-compose up --build

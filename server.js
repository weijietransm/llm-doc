const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Serve static files from current directory
app.use(express.static('./'));

// Create proxy for API requests
app.use('/api/packinglist', createProxyMiddleware({
  target: 'http://unstract.oncontrails.cloud/deployment/api/mock_org/packinglist/',
  changeOrigin: true,
  pathRewrite: {
    '^/api/packinglist': '', // Remove the path prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward the authorization header
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  }
}));

// Explicitly set index.html as the default file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle SPA routing - serve index.html for all routes not found
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

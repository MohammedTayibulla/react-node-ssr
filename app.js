const express = require("express");
const path = require("path");
const fs = require("fs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const { StaticRouter } = require("react-router-dom");
const { HelmetProvider } = require("react-helmet-async");

const app = express();

// Middleware and static files setup
app.use(express.static(path.join(__dirname, "build"))); // Serve static assets from "build" folder
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// SSR route for all routes
app.get("*", (req, res) => {
  const helmetContext = {};
  const appStream = ReactDOMServer.renderToNodeStream(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={req.url}>
        <App />
      </StaticRouter>
    </HelmetProvider>
  );

  // Read the index.html file
  const indexFile = path.resolve("./build/index.html");
  fs.readFile(indexFile, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading index.html:", err);
      return res.status(500).send("Internal Server Error");
    }

    // Insert rendered app stream and Helmet contents into the HTML template
    const html = data
      .replace('<div id="root"></div>', `<div id="root">${appStream}</div>`)
      .replace('</head>', `${helmetContext.helmet.title.toString()}${helmetContext.helmet.meta.toString()}${helmetContext.helmet.link.toString()}</head>`);

    // Send the modified HTML to the client
    res.status(200).send(html);
  });
});

// Error handling middleware
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: req.app.get("env") === "development" ? err : {},
  });
});

app.listen(() => {
  console.log(`Server is running`);
});

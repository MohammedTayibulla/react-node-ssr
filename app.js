var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const { StaticRouter } = require("react-router-dom/server");
const { HelmetProvider } = require("react-helmet-async");
const fs = require("fs");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Serve static assets from the "build" directory
app.use(express.static(path.join(__dirname, "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// SSR route
app.get("/*", (req, res) => {
  const helmetContext = {};

  const appStream = ReactDOMServer.renderToPipeableStream(
    React.createElement(
      HelmetProvider,
      { context: helmetContext },
      React.createElement(
        StaticRouter,
        { location: req.url },
        React.createElement(App)
      )
    ),
    {
      bootstrapScripts: ["/static/js/main.js"], // Adjust the path if necessary
      onAllReady() {
        const { helmet } = helmetContext;

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html");

        // Read the template
        const indexFile = path.resolve("./build/index.html");
        fs.readFile(indexFile, "utf8", (err, data) => {
          if (err) {
            console.error("Could not read index.html file:", err);
            res.status(500).send("Internal server error");
            return;
          }

          // Insert the rendered app into the template
          const html = data
            .replace(
              '<div id="root"></div>',
              `<div id="root">${appStream}</div>`
            )
            .replace(
              "</head>",
              `${helmet.title.toString()}${helmet.meta.toString()}${helmet.link.toString()}</head>`
            );

          res.send(html);
        });
      },
      onShellError() {
        res.statusCode = 500;
        res.send("<!doctype html><p>Loading...</p>");
      },
    }
  );
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:4001`);
});

module.exports = app;

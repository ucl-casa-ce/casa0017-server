#!/usr/bin/env node

//  FlickrData API Server
//  Author:  Steven Gray
//  Description:  This FlickrAPI server allows users to connect to the Flickr Database and return values to explore on a mpa
//                for Workshop 2 - 7 of the course.
//  Notes:        This API assumes you have an SQL function called DISTANCE defined which can be created by running the following query in MySQL:

//  CREATE FUNCTION distance(a POINT, b POINT) RETURNS double DETERMINISTIC RETURN ifnull(acos(sin(X(a)) * sin(X(b)) + cos(X(a)) * cos(X(b)) * cos(Y(b) - Y(a))) * 6380, 0)

require('dotenv').config();

var portNumber = process.env.NODE_PORT || 3000;

var mysql = require('mysql2');

// MySQL Connection Pool
var pool = mysql.createPool({
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Alias for backward compatibility
var connection = pool;

//  Setup the Express Server
var express = require('express');
var app = express();
app.set('view engine', 'ejs');

// Disable X-Powered-By header to prevent technology fingerprinting
app.disable('x-powered-by');

// Global CORS Middleware
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Lightweight in-memory rate limiter to protect database from automated flooding
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 300;     // 300 requests per minute per IP

app.use(function (req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(ip, { count: 1, startTime: now });
    return next();
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  entry.count++;
  next();
});

// Periodically clean up expired rate limiting entries every 5 minutes
setInterval(function () {
  const now = Date.now();
  for (const [ip, entry] of requestCounts.entries()) {
    if (now - entry.startTime > RATE_LIMIT_WINDOW_MS) {
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

// Provides the static folders we have added in the project to the web server.
app.use('/js', express.static(__dirname + '/js'));
app.use('/css', express.static(__dirname + '/css'));
app.use('/download', express.static(__dirname + '/download'));

// Default API Endpoint - return the index.ejs documentation and playground portal
app.get('/', function(req, res) {
  res.render('index', {
    urlHost: process.env.URL_HOST || '',
    'process.env.URL_HOST': process.env.URL_HOST || ''
  });
});

// Interactive Example Visualizers for Workshop 8 & 9
app.get('/examples/map', function(req, res) {
  res.render('map_example', {
    urlHost: process.env.URL_HOST || '',
    'process.env.URL_HOST': process.env.URL_HOST || ''
  });
});

app.get('/examples/cameras', function(req, res) {
  res.render('cameras_example', {
    urlHost: process.env.URL_HOST || '',
    'process.env.URL_HOST': process.env.URL_HOST || ''
  });
});

app.get('/examples/photo/:pid?', function(req, res) {
  res.render('photo_example', {
    pid: req.params.pid || '4279893539',
    urlHost: process.env.URL_HOST || '',
    'process.env.URL_HOST': process.env.URL_HOST || ''
  });
});

// API Endpoint to get the top 30 camera devices
app.get('/data/topCamera', function (req, res) {
  var sql = "SELECT device, count(device) as count FROM metadata GROUP BY device ORDER BY count DESC LIMIT 30";

  pool.query(sql, function (err, rows) {
    if (err) {
      console.error("Database error in /data/topCamera:", err.message);
      return res.status(500).json({ error: "Failed to retrieve camera data" });
    }
    res.json(rows || []);
  });
});

// API Endpoint to get data from specific area - e.g. /data/51.1/0.0/30
app.get('/data/:lat/:lon/:radius', function (req, res) {
  var lat = parseFloat(req.params.lat);
  var lon = parseFloat(req.params.lon);
  var radius = parseFloat(req.params.radius);

  // Validate coordinates and radius numbers
  if (isNaN(lat) || isNaN(lon) || isNaN(radius) || radius < 0) {
    return res.status(400).json({ error: "Invalid latitude, longitude, or radius parameters" });
  }

  // Parameterized query using POINT(lon, lat)
  var sql = "SELECT * FROM photo_locations WHERE DISTANCE(points, POINT(?, ?)) <= ?";

  pool.query(sql, [lon, lat, radius], function (err, rows) {
    if (err) {
      console.error("Database error in /data/:lat/:lon/:radius:", err.message);
      return res.status(500).json({ error: "Failed to retrieve photo locations" });
    }
    res.json(rows || []);
  });
});

// API Endpoint to get photos by camera type - e.g. /data/cameraType/Canon
app.get('/data/cameraType/:camera', function (req, res) {
  var camera = req.params.camera;
  if (!camera || camera.trim() === "") {
    return res.status(400).json({ error: "Camera parameter is required" });
  }

  // Parameterized query prevents SQL injection and safely searches device
  var sql = "SELECT metadata.pid, lat, lon, points FROM metadata INNER JOIN photo_locations ON metadata.pid = photo_locations.pid WHERE device LIKE ?";

  pool.query(sql, ['%' + camera + '%'], function (err, rows) {
    if (err) {
      console.error("Database error in /data/cameraType/:camera:", err.message);
      return res.status(500).json({ error: "Failed to retrieve camera data" });
    }
    res.json(rows || []);
  });
});

// API Endpoint to get data for specific photograph - e.g. /data/photoDescription/1234567
app.get('/data/photoDescription/:pid', function (req, res) {
  var pid = parseInt(req.params.pid, 10);
  if (isNaN(pid) || pid <= 0) {
    return res.status(400).json({ error: "Invalid photo ID" });
  }

  // Parameterized query for specific photo
  var sql = "SELECT * FROM metadata AS a INNER JOIN photos AS b ON a.pid = b.pid WHERE a.pid = ? LIMIT 1";

  pool.query(sql, [pid], function (err, rows) {
    if (err) {
      console.error("Database error in /data/photoDescription/:pid:", err.message);
      return res.status(500).json({ error: "Failed to retrieve photo description" });
    }
    res.json(rows || []);
  });
});

// Setup the server and print a string to the screen when server is ready
var server = app.listen(portNumber, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('App listening at http://%s:%s', host, port);
});

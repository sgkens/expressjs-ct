# Express.js Website Template

A robust, secure Express.js website template built for real men who code with raw CSS and appreciate solid architecture.

## 🚀 Features

### Core Functionality
- **Multi-Database Support**: Works with MySQL, MariaDB, PostgreSQL, and SQLite
- **Secure Authentication**: bcrypt password hashing, session management, rate limiting
- **SQL Injection Protection**: Parameterized queries and input sanitization
- **Role-Based Access Control**: Admin and user permission levels
- **Comprehensive Logging**: Dedicated logging system with console and file output

### User Management
- User registration and login
- Profile management with password updates
- Dashboard with user statistics
- Admin panel for user management
- Settings page for preferences

### Security Features
- Password complexity validation
- Session security with regeneration
- Rate limiting for sensitive operations
- Input sanitization and validation
- CSRF protection ready
- Helmet.js security headers

### UI/UX
- **Raw CSS** - No frameworks, pure CSS craftsmanship
- Responsive design
- Dark/light theme support
- Clean, professional interface
- Form validation with real-time feedback

## 📁 Project Structure

```
express-website-template/
├── server.js                 # Main application file
├── package.json              # Dependencies and scripts
├── .env                      # Environment configuration
├── database/
│   ├── db.js                 # Database abstraction layer
│   └── app.db                # SQLite database (auto-created)
├── middleware/
│   └── auth.js               # Authentication middleware
├── utils/
│   └── logger.js             # Logging utilities
├── public/
│   ├── css/
│   │   └── style.css         # Raw CSS styles
│   └── js/
│       └── main.js           # Client-side JavaScript
├── views/
│   ├── layout.ejs            # Main layout template
│   ├── index.ejs             # Home page
│   ├── login.ejs             # Login page
│   ├── register.ejs          # Registration page
│   ├── dashboard.ejs         # User dashboard
│   ├── profile.ejs           # User profile
│   ├── settings.ejs          # User settings
│   ├── admin.ejs             # Admin panel
│   ├── 404.ejs               # 404 error page
│   └── error.ejs             # General error page
└── logs/                     # Log files (auto-created)
```

## 🛠️ Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Database server (optional - SQLite works out of the box)

### Quick Start

1. **Clone or download the template files**

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Copy the environment configuration from the template and create a `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your-super-secret-key-change-this-in-production

# Database Configuration (SQLite is default)
DB_TYPE=sqlite
DB_PATH=./database/app.db

# Logging Configuration
LOG_LEVEL=INFO
ENABLE_FILE_LOGGING=true
LOG_DIRECTORY=./logs
```

4. **Start the application**
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

5. **Access the application**
Open your browser and navigate to `http://localhost:3000`

### Default Admin Account
The system automatically creates a default admin account:
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Change this password immediately in production!**

## 🗄️ Database Configuration

### SQLite (Default)
No additional setup required. The database file will be created automatically.

```env
DB_TYPE=sqlite
DB_PATH=./database/app.db
```

### MySQL/MariaDB
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
```

### PostgreSQL
```env
DB_TYPE=postgres
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=your_database_name
DB_PORT=5432
```

## 🔒 Security Features

### Password Security
- Passwords are hashed using bcrypt with 12 rounds
- Minimum 6 character requirement
- Password confirmation validation

### SQL Injection Protection
- All queries use parameterized statements
- Input sanitization on all user inputs
- Validation using express-validator

### Session Security
- Secure session configuration
- Session regeneration for security
- Configurable session timeouts

### Rate Limiting
- Login attempt rate limiting (5 attempts per 15 minutes)
- Configurable rate limiting for sensitive operations
- IP-based tracking

### Input Validation
- Server-side validation on all forms
- Client-side validation for better UX
- XSS protection through input escaping

## 📊 Logging System

The application includes a comprehensive logging system:

### Log Levels
- **ERROR**: Critical errors that need immediate attention
- **WARN**: Warning messages for potential issues
- **INFO**: General information messages
- **DEBUG**: Detailed debugging information

### Log Types
- **Security**: Authentication, authorization, and security events
- **Performance**: Timing and performance metrics
- **Database**: Database operations and queries
- **Authentication**: Login/logout events
- **Request**: HTTP request logging

### Configuration
```env
LOG_LEVEL=INFO                # Minimum log level to output
ENABLE_FILE_LOGGING=true      # Enable/disable file logging
LOG_DIRECTORY=./logs          # Directory for log files
```

### Log Features
- Console output with colors
- File logging with daily rotation
- Structured logging with metadata
- Performance timing utilities
- Error tracking and reporting

## 🎨 Styling and Theming

### CSS Architecture
The template uses pure CSS with CSS custom properties (variables) for theming:

- **No CSS frameworks** - Pure, handcrafted CSS
- **CSS Variables** for easy theming
- **Responsive design** with mobile-first approach
- **Dark/light theme** support
- **Component-based** styling approach

### Customization
Modify `/public/css/style.css` to customize:
- Colors and themes
- Typography
- Layout and spacing
- Component styles

### Theme Variables
```css
:root {
  --primary-color: #2563eb;
  --background-color: #f8fafc;
  --text-color: #1e293b;
  /* ... more variables */
}
```

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use a strong `SESSION_SECRET`
3. Configure your production database
4. Set up HTTPS and update session cookie settings
5. Configure logging for production

### Production Considerations
- Use a process manager like PM2
- Set up reverse proxy (nginx/Apache)
- Configure SSL certificates
- Set up database backups
- Configure log rotation
- Set up monitoring and alerting

### Docker Deployment
Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 API Endpoints

### Public Routes
- `GET /` - Home page
- `GET /login` - Login page
- `POST /login` - User authentication
- `GET /register` - Registration page
- `POST /register` - User registration

### Protected Routes
- `GET /dashboard` - User dashboard
- `GET /profile` - User profile
- `POST /profile` - Update profile
- `GET /settings` - User settings
- `POST /logout` - User logout

### Admin Routes
- `GET /admin` - Admin panel
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user

### Utility Routes
- `GET /health` - Health check endpoint

## 🧪 Testing

### Manual Testing
1. Register a new account
2. Login with the account
3. Test profile updates
4. Test password changes
5. Test admin functionality (if admin user)

### Security Testing
- Test SQL injection attempts
- Test XSS attempts
- Test rate limiting
- Test session security
- Test input validation

## 🤝 Contributing

This is a template designed to be customized for your specific needs. Feel free to:
- Add new features
- Modify the styling
- Extend the database schema
- Add new user roles
- Implement additional security measures

## 📝 License

This template is provided as-is for educational and commercial use. Modify as needed for your projects.

## 💪 Built by Real Developers

This template was built with:
- **Raw CSS** - No training wheels
- **Vanilla JavaScript** - No unnecessary frameworks  
- **Secure practices** - Production-ready security
- **Clean architecture** - Maintainable and scalable
- **Detailed logging** - Professional debugging and monitoring

Perfect for developers who appreciate clean, efficient code and understand that sometimes the best solutions are built from scratch.

---

**Ready to build something awesome? Get coding! 🚀**
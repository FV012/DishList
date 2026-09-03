# Culinary Recipe Cataloging Application

A full-stack web application designed for cataloging, searching, and managing culinary recipes. It allows users to easily discover recipes using multi-factor filtering, save favorites, scale serving portions, and leave ratings or comments, while providing administrators and editors with robust content management tools.



## Screenshot

<img width="2541" height="1440" alt="main-page" src="https://github.com/user-attachments/assets/164e572b-4d02-40ab-82bc-98243e9e2434" />*Application Interface Preview*

## Tech Stack

- **Frontend:** React.js, Vite, HTML5, CSS3 / SCSS
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **Authentication & Security:** JSON Web Tokens (JWT), bcryptjs


## Prerequisites
Make sure you have the following software installed on your machine before running the project:

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher (usually comes with Node.js)
- **MySQL Server**: `v8.0` or higher[cite: 1]


## Getting Started
Follow these step-by-step instructions to set up and run the project locally.

### 1. Clone the Repository

```bash
git clone [https://github.com/FV012/recipe-catalog.git](https://github.com/FV012/recipe-catalog.git)
cd recipe-catalog
```

### 2. Configure the Database
Open your MySQL client (e.g., MySQL Workbench, phpMyAdmin, or CLI).

Create and initialize the database structure using the project SQL script (usually located in the database setup folder or root directory):

```SQL
CREATE DATABASE recipe_db;
```
Run the schema and seed scripts to create tables and insert initial test data.

### 3. Configure Environment Variables

Create a `.env` file in the `server` directory and fill in your configuration settings (see the [Environment Variables](#Environment-Variables) section below).

### 4. Install Dependencies & Start Server

```bash
# Navigate to the server folder
cd server

# Install backend dependencies
npm install

# Start the backend server
npm run dev # or npm start
```

### 5. Install Dependencies & Start Client
Open a new terminal window:

```bash
# Navigate to the client folder
cd client

# Install frontend dependencies
npm install

# Start the React development server
npm run dev
``` 
The application client should now be running (typically at `http://localhost:5173`), and the backend API at `http://localhost:5000`.

## Project Structure

```
recipe-catalog/
├── client/                     # Frontend application (React)[cite: 1]
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── assets/             # Images and styles
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # App pages (Home, RecipeDetails, Admin, etc.)
│   │   ├── services/           # API integration logic
│   │   ├── App.jsx             # Main component & routing
│   │   └── main.jsx            # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend API server (Node.js & Express)[cite: 1]
│   ├── middleware/             # Auth & request validation middleware[cite: 1]
│   ├── routes/                 # Express API endpoint routes[cite: 1]
│   ├── uploads/                # Uploaded recipe images[cite: 1]
│   ├── db.js                   # MySQL connection setup[cite: 1]
│   ├── index.js                # Server entry point[cite: 1]
│   └── package.json
│
└── README.md                   # Project documentation
```

## Environment Variables
To run the backend properly, create a `.env` file inside the `server/` directory with the following variables:

```
# Server Configuration
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=recipe_db

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key
```

## License
This project was created as a university coursework project.
